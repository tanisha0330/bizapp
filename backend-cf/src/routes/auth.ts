import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { signJWT } from '../utils/jwt';
import { generateId } from '../utils/crypto';
import { authMiddleware } from '../middleware/auth';
import { authRateLimit } from '../middleware/rateLimit';

const auth = new Hono<AppEnv>();

// POST /auth/verify-otp
// Receives the Phone.Email JWT, validates it, creates user if needed, returns app JWT
auth.post('/verify-otp', authRateLimit, async (c) => {
  const { token: phoneEmailToken } = await c.req.json<{ token: string }>();
  if (!phoneEmailToken) {
    return c.json({ error: 'Phone.Email token is required' }, 400);
  }

  // Phone.Email sends a JWT whose payload contains a user_json_url
  // We need to fetch that URL to get the verified phone number
  let phone: string;
  try {
    const parts = phoneEmailToken.split('.');
    if (parts.length !== 3) throw new Error('Invalid token format');

    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));

    // Phone.Email JWT may contain the phone directly or via user_json_url
    if (payload.phone_number || payload.phone) {
      phone = payload.phone_number || payload.phone;
    } else if (payload.user_json_url) {
      // Fetch verified user data from Phone.Email API
      const userResponse = await fetch(payload.user_json_url);
      if (!userResponse.ok) throw new Error('Failed to verify with Phone.Email');
      const userData = await userResponse.json() as Record<string, any>;
      const countryCode = (userData.user_country_code || '').replace(/^\+/, '');
      const phoneNo = userData.user_phone_number || userData.phone_no || '';
      if (!phoneNo) throw new Error('No phone number returned');
      phone = countryCode ? `+${countryCode}${phoneNo}` : phoneNo;
    } else {
      // Try country_code + phone_no directly in JWT payload
      const countryCode = (payload.country_code || payload.user_country_code || '').replace(/^\+/, '');
      const phoneNo = payload.phone_no || payload.user_phone_number || '';
      if (!phoneNo) throw new Error('No phone in token');
      phone = countryCode ? `+${countryCode}${phoneNo}` : phoneNo;
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Invalid token';
    console.error('Phone.Email verification error:', msg);
    return c.json({ error: 'Invalid Phone.Email token' }, 400);
  }

  // Normalize phone (ensure +country code, strip any duplicate +)
  phone = phone.replace(/^\++/, '+');
  phone = phone.startsWith('+') ? phone : `+${phone}`;

  // Find active user or create new one (deleted users have modified phone, won't match)
  let user = await c.env.DB.prepare('SELECT * FROM users WHERE phone = ? AND is_active = 1').bind(phone).first();

  if (!user) {
    const userId = generateId();
    await c.env.DB.prepare(
      'INSERT INTO users (id, phone, created_at, updated_at) VALUES (?, ?, datetime("now"), datetime("now"))'
    ).bind(userId, phone).run();
    user = { id: userId, phone, is_new: true };
  }

  // Update last login
  await c.env.DB.prepare(
    'UPDATE users SET last_login_at = datetime("now") WHERE id = ?'
  ).bind(user.id as string).run();

  // Check if user has completed profile
  const hasProfile = !!(user as Record<string, unknown>).full_name;

  // Check if user has an organization
  const org = await c.env.DB.prepare(
    'SELECT id, name FROM organizations WHERE owner_user_id = ?'
  ).bind(user.id as string).first();

  // Sign app JWT (30-day expiry)
  const appToken = await signJWT(
    { sub: user.id as string, phone },
    c.env.JWT_SECRET,
    86400 * 30
  );

  return c.json({
    token: appToken,
    user: {
      id: user.id,
      phone,
      fullName: (user as Record<string, unknown>).full_name || null,
      email: (user as Record<string, unknown>).email || null,
      businessName: (user as Record<string, unknown>).business_name || null,
      businessCategory: (user as Record<string, unknown>).business_category || null,
    },
    hasProfile,
    hasOrganization: !!org,
    organization: org ? { id: org.id, name: org.name } : null,
  });
});

// POST /auth/profile - Create or update user profile
auth.post('/profile', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  const body = await c.req.json<{
    fullName?: string;
    email?: string;
    businessName?: string;
    businessCategory?: string;
    profilePhoto?: string;
    pushToken?: string;
  }>();

  // Build dynamic update query — only update fields that are provided
  const updates: string[] = [];
  const values: any[] = [];

  if (body.fullName !== undefined) { updates.push('full_name = ?'); values.push(body.fullName); }
  if (body.email !== undefined) { updates.push('email = ?'); values.push(body.email || null); }
  if (body.businessName !== undefined) { updates.push('business_name = ?'); values.push(body.businessName || null); }
  if (body.businessCategory !== undefined) { updates.push('business_category = ?'); values.push(body.businessCategory || null); }
  if (body.profilePhoto !== undefined) { updates.push('profile_photo = ?'); values.push(body.profilePhoto || null); }
  if (body.pushToken !== undefined) { updates.push('push_token = ?'); values.push(body.pushToken || null); }

  if (updates.length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  updates.push("updated_at = datetime('now')");
  values.push(userId);

  await c.env.DB.prepare(
    `UPDATE users SET ${updates.join(', ')} WHERE id = ?`
  ).bind(...values).run();

  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();

  return c.json({
    user: {
      id: user!.id,
      phone: user!.phone,
      fullName: user!.full_name,
      email: user!.email,
      businessName: user!.business_name,
      businessCategory: user!.business_category,
    },
  });
});

// POST /auth/organization - Create org + ad account
auth.post('/organization', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  const { name } = await c.req.json<{ name: string }>();

  if (!name) {
    return c.json({ error: 'Organization name is required' }, 400);
  }

  // Check if user already has an org
  const existing = await c.env.DB.prepare(
    'SELECT id FROM organizations WHERE owner_user_id = ?'
  ).bind(userId).first();

  if (existing) {
    return c.json({ error: 'User already has an organization' }, 409);
  }

  const orgId = generateId();
  const memberId = generateId();
  const adAccountId = generateId();

  // Create org, add owner as admin member, and create default ad account
  await c.env.DB.batch([
    c.env.DB.prepare(
      'INSERT INTO organizations (id, name, owner_user_id, created_at, updated_at) VALUES (?, ?, ?, datetime("now"), datetime("now"))'
    ).bind(orgId, name, userId),
    c.env.DB.prepare(
      'INSERT INTO org_members (id, org_id, user_id, role, joined_at) VALUES (?, ?, ?, "admin", datetime("now"))'
    ).bind(memberId, orgId, userId),
    c.env.DB.prepare(
      `INSERT INTO ad_accounts (id, org_id, name, platform, currency, timezone, status, created_at, updated_at)
       VALUES (?, ?, ?, 'meta', 'INR', 'Asia/Kolkata', 'active', datetime('now'), datetime('now'))`
    ).bind(adAccountId, orgId, `${name} - Ad Account`),
  ]);

  return c.json({
    organization: { id: orgId, name },
    adAccount: { id: adAccountId, name: `${name} - Ad Account` },
  });
});

// GET /auth/me - Get current user info
auth.get('/me', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;
  const user = await c.env.DB.prepare('SELECT * FROM users WHERE id = ?').bind(userId).first();
  if (!user) return c.json({ error: 'User not found' }, 404);

  const org = await c.env.DB.prepare(
    'SELECT o.id, o.name FROM organizations o INNER JOIN org_members om ON o.id = om.org_id WHERE om.user_id = ?'
  ).bind(userId).first();

  const metaConnection = await c.env.DB.prepare(
    'SELECT id, meta_name, meta_email, is_active FROM meta_connections WHERE user_id = ? AND is_active = 1'
  ).bind(userId).first();

  return c.json({
    user: {
      id: user.id,
      phone: user.phone,
      fullName: user.full_name,
      email: user.email,
      businessName: user.business_name,
      businessCategory: user.business_category,
    },
    organization: org ? { id: org.id, name: org.name } : null,
    facebookConnected: !!metaConnection,
    facebookProfile: metaConnection ? { name: metaConnection.meta_name, email: metaConnection.meta_email } : null,
  });
});

// DELETE /auth/account - Soft-delete: deactivate user, revoke tokens, but keep data for reference
auth.delete('/account', authMiddleware, async (c) => {
  const userId = c.get('userId') as string;

  const user = await c.env.DB.prepare('SELECT phone FROM users WHERE id = ?').bind(userId).first();
  if (!user) return c.json({ error: 'User not found' }, 404);

  // Soft-delete: mark user inactive, append _deleted to phone so the same number can re-register as a new user
  const deletedPhone = `${user.phone}_deleted_${Date.now()}`;

  await c.env.DB.batch([
    // Deactivate user — preserve all data but mark as deleted
    c.env.DB.prepare(
      "UPDATE users SET is_active = 0, phone = ?, updated_at = datetime('now') WHERE id = ?"
    ).bind(deletedPhone, userId),

    // Deactivate Meta connection (revoke access)
    c.env.DB.prepare(
      "UPDATE meta_connections SET is_active = 0, updated_at = datetime('now') WHERE user_id = ?"
    ).bind(userId),

    // Pause any active campaigns
    c.env.DB.prepare(
      "UPDATE campaigns SET status = 'paused', updated_at = datetime('now') WHERE user_id = ? AND status IN ('active', 'launching', 'draft')"
    ).bind(userId),
  ]);

  return c.json({ success: true, message: 'Account deactivated. Data retained for reference.' });
});

// POST /auth/data-deletion - Meta Data Deletion Callback (required for Facebook Login approval)
// Meta sends a signed_request when user removes app from Facebook settings
// We soft-delete the user's data and return a confirmation URL
auth.post('/data-deletion', async (c) => {
  try {
    const body = await c.req.parseBody();
    const signedRequest = body['signed_request'] as string;

    if (!signedRequest) {
      return c.json({ error: 'Missing signed_request' }, 400);
    }

    // Decode the signed request (base64url encoded)
    const [, payload] = signedRequest.split('.');
    const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
    const metaUserId = decoded.user_id as string;

    if (!metaUserId) {
      return c.json({ error: 'Invalid signed_request' }, 400);
    }

    // Find user by Meta user ID and soft-delete
    const connection = await c.env.DB.prepare(
      'SELECT user_id FROM meta_connections WHERE meta_user_id = ?'
    ).bind(metaUserId).first();

    if (connection) {
      const userId = connection.user_id as string;
      const deletedPhone = `deleted_meta_${metaUserId}_${Date.now()}`;

      await c.env.DB.batch([
        c.env.DB.prepare(
          "UPDATE users SET is_active = 0, phone = ?, updated_at = datetime('now') WHERE id = ?"
        ).bind(deletedPhone, userId),
        c.env.DB.prepare(
          "UPDATE meta_connections SET is_active = 0, updated_at = datetime('now') WHERE user_id = ?"
        ).bind(userId),
        c.env.DB.prepare(
          "UPDATE campaigns SET status = 'paused', updated_at = datetime('now') WHERE user_id = ?"
        ).bind(userId),
      ]);
    }

    // Generate a confirmation code
    const confirmationCode = `biz499_del_${metaUserId}_${Date.now()}`;

    // Meta requires: confirmation_code + status_url
    return c.json({
      url: `https://biz499-api.amitkumarsingh474.workers.dev/auth/data-deletion/status?id=${confirmationCode}`,
      confirmation_code: confirmationCode,
    });
  } catch (e) {
    console.error('Data deletion callback error:', e);
    return c.json({ error: 'Processing failed' }, 500);
  }
});

// GET /auth/data-deletion/status - Meta checks deletion status
auth.get('/data-deletion/status', (c) => {
  const id = c.req.query('id');
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>Data Deletion - Biz499</title>
<style>body{font-family:-apple-system,sans-serif;max-width:500px;margin:60px auto;padding:24px;text-align:center;}h1{color:#0F172A;}p{color:#475569;}</style>
</head>
<body>
<h1>Data Deletion Request</h1>
<p>Your Facebook data deletion request has been received and processed.</p>
<p>Confirmation ID: <strong>${id || 'N/A'}</strong></p>
<p>All your personal data associated with Biz499 has been deactivated from our systems.</p>
<p>For any queries, contact: <a href="mailto:support@biz499.com">support@biz499.com</a></p>
</body>
</html>`);
});

// GET /auth/delete-instructions - How to delete account (shareable link for users)
auth.get('/delete-instructions', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>How to Delete Your Account - Biz499</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F8FAFC; color: #1E293B; line-height: 1.7; }
.container { max-width: 600px; margin: 0 auto; padding: 40px 24px; }
.logo { font-size: 24px; font-weight: 800; color: #6C5CE7; margin-bottom: 32px; }
h1 { font-size: 26px; font-weight: 800; color: #0F172A; margin-bottom: 8px; }
.subtitle { color: #64748B; font-size: 15px; margin-bottom: 32px; }
.card { background: #FFFFFF; border-radius: 16px; padding: 24px; margin-bottom: 20px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
h2 { font-size: 16px; font-weight: 700; color: #0F172A; margin-bottom: 16px; }
.step { display: flex; align-items: flex-start; gap: 14px; margin-bottom: 14px; }
.step-num { min-width: 28px; height: 28px; background: #6C5CE7; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; }
.step-text { font-size: 15px; color: #334155; padding-top: 3px; }
.step-text strong { color: #0F172A; }
.info-box { background: #F0FDF4; border: 1px solid #BBF7D0; border-radius: 12px; padding: 16px; margin-top: 8px; }
.info-box p { font-size: 14px; color: #166534; margin-bottom: 6px; }
.info-box p:last-child { margin-bottom: 0; }
.contact { background: #FFFFFF; border-radius: 16px; padding: 20px 24px; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
.contact p { font-size: 14px; color: #475569; margin-bottom: 6px; }
.contact a { color: #6C5CE7; text-decoration: none; font-weight: 600; }
.footer { margin-top: 32px; text-align: center; font-size: 13px; color: #94A3B8; }
</style>
</head>
<body>
<div class="container">
  <div class="logo">Biz499</div>
  <h1>How to Delete Your Account</h1>
  <p class="subtitle">Follow the steps below to delete your Biz499 account and request data removal.</p>

  <div class="card">
    <h2>Steps to Delete Account (In-App)</h2>
    <div class="step"><div class="step-num">1</div><div class="step-text">Open the <strong>Biz499 app</strong> on your phone</div></div>
    <div class="step"><div class="step-num">2</div><div class="step-text">Tap the <strong>Profile</strong> icon at the bottom right</div></div>
    <div class="step"><div class="step-num">3</div><div class="step-text">Scroll down to the bottom of the page</div></div>
    <div class="step"><div class="step-num">4</div><div class="step-text">Tap <strong>Delete Account</strong> (shown in red)</div></div>
    <div class="step"><div class="step-num">5</div><div class="step-text">Tap <strong>Confirm</strong> to permanently delete your account</div></div>
  </div>

  <div class="card">
    <h2>What Happens After Deletion</h2>
    <div class="info-box">
      <p>✅ Your account is immediately deactivated</p>
      <p>✅ You will be logged out automatically</p>
      <p>✅ Your data is never sold or shared with third parties</p>
      <p>✅ Data is retained internally only for app improvement purposes</p>
      <p>✅ You can re-register with the same phone number anytime</p>
    </div>
  </div>

  <div class="contact">
    <h2 style="margin-bottom:10px;">Need Help?</h2>
    <p>Email: <a href="mailto:support@biz499.com">support@biz499.com</a></p>
    <p>WhatsApp: <a href="https://wa.me/917990636954">+91 79906 36954</a></p>
  </div>

  <div class="footer">&copy; 2026 Biz499. All rights reserved.</div>
</div>
</body>
</html>`);
});

export default auth;
