import { Hono } from 'hono';
import type { Env, AppEnv } from './types';
import { corsMiddleware } from './middleware/cors';
import { apiRateLimit } from './middleware/rateLimit';
import authRoutes from './routes/auth';
import metaRoutes from './routes/meta';
import creativesRoutes from './routes/creatives';
import campaignsRoutes from './routes/campaigns';
import analyticsRoutes from './routes/analytics';
import geminiRoutes from './routes/gemini';
import cardsRoutes from './routes/cards';
import websitesRoutes from './routes/websites';
import newsRoutes from './routes/news';
import eventsRoutes from './routes/analytics-events';
import webhookRoutes from './routes/webhook';
import { handleCampaignQueue } from './queues/campaign-launch';
import { handleAnalyticsQueue } from './queues/analytics-sync';
import { sendPushNotification } from './services/expoPush';
import { FacebookClient } from './services/facebook';
import { decryptToken, generateId } from './utils/crypto';

const app = new Hono<AppEnv>();

// Global middleware
app.use('*', corsMiddleware);
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('X-XSS-Protection', '1; mode=block');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
});
app.use('*', apiRateLimit);

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.route('/auth', authRoutes);
app.route('/meta', metaRoutes);
app.route('/creatives', creativesRoutes);
app.route('/campaigns', campaignsRoutes);
app.route('/analytics', analyticsRoutes);
app.route('/gemini', geminiRoutes);
app.route('/cards', cardsRoutes);
app.route('/websites', websitesRoutes);
app.route('/news', newsRoutes);
app.route('/events', eventsRoutes);
app.route('/webhook', webhookRoutes);

// Privacy Policy & Terms
app.get('/privacy-policy', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Biz499 - Privacy Policy</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F8FAFC; color: #1E293B; line-height: 1.7; }
.container { max-width: 720px; margin: 0 auto; padding: 40px 24px; }
h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; color: #0F172A; }
.date { color: #64748B; font-size: 14px; margin-bottom: 32px; }
h2 { font-size: 18px; font-weight: 700; margin-top: 28px; margin-bottom: 10px; color: #0F172A; }
p, li { font-size: 15px; color: #475569; margin-bottom: 12px; }
ul { padding-left: 20px; }
li { margin-bottom: 6px; }
.footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E2E8F0; font-size: 13px; color: #94A3B8; }
</style>
</head>
<body>
<div class="container">
<h1>Privacy Policy</h1>
<p class="date">Last updated: March 30, 2026</p>

<p>Biz499 ("we", "our", or "us") operates the Biz499 mobile application. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our app.</p>

<h2>Information We Collect</h2>
<p>We collect the following information to provide and improve our services:</p>
<ul>
<li><strong>Phone Number</strong> - Used for authentication via OTP login (Phone.Email service)</li>
<li><strong>Business Information</strong> - Business name, category, contact details you provide</li>
<li><strong>Facebook Account Data</strong> - When you connect Facebook, we access your pages, ad accounts, and campaign data to display insights and manage ads on your behalf</li>
<li><strong>Camera & Photos</strong> - Used to upload business logos, gallery images for website builder and business cards. We do not access your camera or photos without your explicit action.</li>
<li><strong>Device Information</strong> - Device type and OS version for app compatibility</li>
</ul>

<h2>How We Use Your Information</h2>
<ul>
<li>To authenticate your identity and manage your account</li>
<li>To create and manage Facebook ad campaigns on your behalf</li>
<li>To generate business cards, websites, and marketing materials</li>
<li>To display ad performance analytics and lead information</li>
<li>To provide customer support</li>
</ul>

<h2>Data Storage & Security</h2>
<p>Your data is stored securely on Cloudflare's infrastructure (D1 database, R2 storage). Facebook access tokens are encrypted using AES-256-GCM before storage. We use HTTPS for all data transmission.</p>

<h2>Third-Party Services</h2>
<ul>
<li><strong>Phone.Email</strong> - OTP authentication</li>
<li><strong>Facebook/Meta</strong> - Ad management and page insights (governed by Meta's data policy)</li>
<li><strong>Google Gemini AI</strong> - AI-powered poster generation (text prompts only, no personal data sent)</li>
<li><strong>Cloudflare</strong> - Hosting and data storage</li>
</ul>

<h2>Data Sharing</h2>
<p>We do not sell, trade, or rent your personal information to third parties. We only share data with the third-party services listed above as necessary to provide our features.</p>

<h2>Data Retention & Deletion</h2>
<p>You can delete your account at any time from the app (Profile > Account > Delete Account). This will permanently remove your data from our systems. Facebook tokens are immediately revoked upon disconnection.</p>

<h2>Permissions Used</h2>
<ul>
<li><strong>Camera</strong> - To capture photos for business cards and website content</li>
<li><strong>Storage/Photos</strong> - To pick images from gallery and save generated designs</li>
<li><strong>Internet</strong> - Required for all app functionality</li>
</ul>

<h2>Children's Privacy</h2>
<p>Our app is not intended for use by anyone under the age of 18. We do not knowingly collect personal data from children.</p>

<h2>Changes to This Policy</h2>
<p>We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.</p>

<h2>Contact Us</h2>
<p>If you have any questions about this Privacy Policy, please contact us:</p>
<ul>
<li>Email: support@biz499.com</li>
<li>WhatsApp: +91 79906 36954</li>
</ul>

<div class="footer">
&copy; 2026 Biz499. All rights reserved.
</div>
</div>
</body>
</html>`);
});

app.get('/terms', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Biz499 - Terms of Service</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #F8FAFC; color: #1E293B; line-height: 1.7; }
.container { max-width: 720px; margin: 0 auto; padding: 40px 24px; }
h1 { font-size: 28px; font-weight: 800; margin-bottom: 8px; color: #0F172A; }
.date { color: #64748B; font-size: 14px; margin-bottom: 32px; }
h2 { font-size: 18px; font-weight: 700; margin-top: 28px; margin-bottom: 10px; color: #0F172A; }
p, li { font-size: 15px; color: #475569; margin-bottom: 12px; }
ul { padding-left: 20px; }
li { margin-bottom: 6px; }
.footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #E2E8F0; font-size: 13px; color: #94A3B8; }
</style>
</head>
<body>
<div class="container">
<h1>Terms of Service</h1>
<p class="date">Last updated: March 30, 2026</p>

<p>By using the Biz499 app, you agree to these terms. Please read them carefully.</p>

<h2>Service Description</h2>
<p>Biz499 is a business marketing platform that helps small businesses create ads, manage Facebook campaigns, generate business cards, build websites, and track leads.</p>

<h2>Account Responsibilities</h2>
<ul>
<li>You are responsible for maintaining the security of your account</li>
<li>You must provide accurate business information</li>
<li>You are responsible for all activity under your account</li>
<li>You must comply with Facebook's advertising policies when running ads</li>
</ul>

<h2>Facebook Integration</h2>
<p>When you connect your Facebook account, you authorize Biz499 to manage ads and access page data on your behalf. Ad spend is charged directly by Facebook to your linked payment method. Biz499 does not handle ad payments.</p>

<h2>AI-Generated Content</h2>
<p>Poster designs generated using AI (Google Gemini) are limited to 5 per user per day. Generated content is for your business use. We do not guarantee the accuracy or appropriateness of AI-generated text or images.</p>

<h2>Website Builder</h2>
<p>Websites created through Biz499 are hosted on our infrastructure. We reserve the right to remove websites that contain illegal, harmful, or inappropriate content.</p>

<h2>Limitation of Liability</h2>
<p>Biz499 is provided "as is". We are not liable for any losses resulting from ad campaign performance, Facebook API changes, or service interruptions.</p>

<h2>Contact</h2>
<p>Email: support@biz499.com | WhatsApp: +91 79906 36954</p>

<div class="footer">
&copy; 2026 Biz499. All rights reserved.
</div>
</div>
</body>
</html>`);
});

// 404 handler
app.notFound((c) => c.json({ error: 'Not found' }, 404));

// Error handler
app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Internal server error' }, 500);
});

// ── Lead sync + push notification (runs every 15 min via cron) ───────────────
async function syncLeadsAndNotify(env: Env): Promise<void> {
  // Get all active Facebook connections with user push tokens
  const { results: connections } = await env.DB.prepare(`
    SELECT mc.id, mc.user_id, mc.access_token, u.push_token
    FROM meta_connections mc
    JOIN users u ON u.id = mc.user_id
    WHERE mc.is_active = 1
  `).all();

  if (connections.length === 0) return;

  const SYNC_KEY_PREFIX = 'lead_sync_ts:';

  for (const conn of connections) {
    const userId = conn.user_id as string;
    const pushToken = conn.push_token as string | null;

    // Last sync timestamp — default to 20 minutes ago to catch anything missed
    const syncKey = `${SYNC_KEY_PREFIX}${userId}`;
    const lastSyncTs = await env.CACHE.get(syncKey);
    const since = lastSyncTs
      ? new Date(parseInt(lastSyncTs)).toISOString().replace('T', ' ').split('.')[0]
      : new Date(Date.now() - 20 * 60 * 1000).toISOString().replace('T', ' ').split('.')[0];

    // Update sync timestamp immediately to avoid double-processing on overlap
    await env.CACHE.put(syncKey, String(Date.now()), { expirationTtl: 86400 });

    const fb = new FacebookClient(env.META_APP_ID, env.META_APP_SECRET, env.GRAPH_API_VERSION);

    // Get all active pages for this connection
    const { results: pages } = await env.DB.prepare(
      'SELECT page_id, page_name, page_access_token FROM meta_pages WHERE meta_connection_id = ? AND is_active = 1'
    ).bind(conn.id as string).all();

    const newLeads: Array<{ name: string; phone: string; email: string }> = [];

    for (const page of pages) {
      let pageToken: string;
      try {
        pageToken = await decryptToken(page.page_access_token as string, env.TOKEN_ENCRYPTION_KEY);
      } catch { continue; }

      // Get all lead forms (paginated)
      const forms = await fb.getLeadForms(page.page_id as string, pageToken);

      for (const form of forms) {
        // Fetch leads since last sync — sorted newest first
        const res = await fetch(
          `https://graph.facebook.com/${env.GRAPH_API_VERSION}/${form.id}/leads?fields=id,created_time,field_data&limit=25&sort=created_time_desc&access_token=${pageToken}`
        );
        if (!res.ok) continue;

        const data = await res.json() as { data: any[] };
        const leads = data.data || [];

        for (const lead of leads) {
          // Skip leads older than our last sync window
          if (lead.created_time && new Date(lead.created_time).toISOString() < since.replace(' ', 'T')) continue;

          // Deduplicate — skip if already stored
          const existing = await env.DB.prepare(
            'SELECT id FROM fb_leads WHERE user_id = ? AND fb_lead_id = ?'
          ).bind(userId, lead.id).first();
          if (existing) continue;

          // Parse fields
          const fields: Record<string, string> = {};
          for (const f of (lead.field_data || [])) {
            fields[f.name] = Array.isArray(f.values) ? f.values[0] : f.values;
          }
          const name = fields.full_name || fields.first_name || fields.name || 'Someone';
          const email = fields.email || '';
          const phone = fields.phone_number || fields.phone || '';
          const city = fields.city || '';

          // Store in fb_leads
          await env.DB.prepare(`
            INSERT OR IGNORE INTO fb_leads
              (id, user_id, fb_lead_id, form_id, form_name, page_id, page_name, name, email, phone, city, raw_fields, notified, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)
          `).bind(
            generateId(), userId, lead.id, form.id, form.name || 'Lead Form',
            page.page_id as string, page.page_name as string,
            name, email, phone, city,
            JSON.stringify(fields),
            lead.created_time || new Date().toISOString()
          ).run();

          newLeads.push({ name, phone, email });
        }
      }
    }

    // Send a single batched push notification for all new leads
    if (newLeads.length > 0 && pushToken) {
      const title = newLeads.length === 1
        ? '🎯 New Lead!'
        : `🎯 ${newLeads.length} New Leads!`;

      const body = newLeads.length === 1
        ? (newLeads[0].phone ? `${newLeads[0].name} · ${newLeads[0].phone}` : newLeads[0].name)
        : newLeads.slice(0, 3).map(l => l.name).join(', ') + (newLeads.length > 3 ? ' & more' : '');

      await sendPushNotification(pushToken, title, body, { type: 'lead' });

      // Mark all new leads as notified
      await env.DB.prepare(
        `UPDATE fb_leads SET notified = 1 WHERE user_id = ? AND notified = 0`
      ).bind(userId).run();

      console.log(`Cron: notified user ${userId} of ${newLeads.length} new leads`);
    }
  }
}

// Export for Cloudflare Workers
export default {
  fetch: app.fetch,

  // Queue consumers
  async queue(batch: MessageBatch, env: Env): Promise<void> {
    const queueName = batch.queue;

    if (queueName === 'biz499-campaign-queue') {
      await handleCampaignQueue(batch, env);
    } else if (queueName === 'biz499-analytics-queue') {
      await handleAnalyticsQueue(batch, env);
    }
  },

  // Cron: runs every 15 minutes — syncs new leads and sends push notifications
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    try {
      await syncLeadsAndNotify(env);
    } catch (e) {
      console.error('Cron lead sync failed:', e);
    }
  },
};
