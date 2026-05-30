import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { authMiddleware } from '../middleware/auth';
import { generateId } from '../utils/crypto';

const websites = new Hono<AppEnv>();

// Auth for all routes except preview and design-data (team access)
websites.use('*', async (c, next) => {
  const path = c.req.path;
  if (path.includes('/preview/') || path.includes('/design-data/') || path.includes('/enquiry/') || path.includes('/asset/')) {
    return next();
  }
  return authMiddleware(c, next);
});

// POST /websites/request - Submit a website request
websites.post('/request', async (c) => {
  const userId = c.get('userId') as string;
  const body = await c.req.json<{
    businessName: string;
    businessCategory?: string;
    phone?: string;
    email?: string;
    websiteType?: string;
    pagesNeeded?: string[];
    description?: string;
    referenceUrls?: string[];
    designHtml?: string;
    designData?: string;
  }>();

  if (!body.businessName) {
    return c.json({ error: 'businessName is required' }, 400);
  }

  // Check if user already has a pending request — update it instead of rejecting
  const existing = await c.env.DB.prepare(
    "SELECT id, status FROM website_requests WHERE user_id = ? AND status IN ('pending', 'in_progress')"
  ).bind(userId).first();

  if (existing) {
    // Update the existing request
    await c.env.DB.prepare(`
      UPDATE website_requests SET business_name = ?, business_category = ?, phone = ?, email = ?,
        website_type = ?, pages_needed = ?, description = ?, reference_urls = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      body.businessName, body.businessCategory || null, body.phone || null, body.email || null,
      body.websiteType || 'business', JSON.stringify(body.pagesNeeded || []),
      body.description || null, JSON.stringify(body.referenceUrls || []),
      existing.id as string,
    ).run();

    const existingId = existing.id as string;
    const origin = new URL(c.req.url).origin;
    const previewUrl = `${origin}/websites/preview/${existingId}`;

    // Update HTML preview
    if (body.designHtml) {
      try {
        const finalHtml = body.designHtml.replace(/WEBSITE_ID/g, existingId);
        await c.env.CREATIVES_BUCKET.put(`website-previews/${existingId}.html`, finalHtml, { httpMetadata: { contentType: 'text/html' } });
        await c.env.DB.prepare('UPDATE website_requests SET preview_url = ? WHERE id = ?').bind(previewUrl, existingId).run();
      } catch {}
    }
    if (body.designData) {
      try {
        await c.env.CREATIVES_BUCKET.put(`website-previews/${existingId}-data.json`, body.designData, { httpMetadata: { contentType: 'application/json' } });
      } catch {}
    }

    return c.json({ id: existingId, status: 'pending', message: 'Your website has been updated!' }, 200);
  }

  const requestId = generateId();

  await c.env.DB.prepare(`
    INSERT INTO website_requests (id, user_id, business_name, business_category, phone, email, website_type, pages_needed, description, reference_urls, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', datetime('now'), datetime('now'))
  `).bind(
    requestId, userId,
    body.businessName,
    body.businessCategory || null,
    body.phone || null,
    body.email || null,
    body.websiteType || 'business',
    JSON.stringify(body.pagesNeeded || ['Home', 'About', 'Contact']),
    body.description || null,
    JSON.stringify(body.referenceUrls || []),
  ).run();

  // Store the HTML preview in R2 so the team can view the actual design
  const origin = new URL(c.req.url).origin;
  const previewUrl = `${origin}/websites/preview/${requestId}`;

  if (body.designHtml) {
    try {
      // Replace placeholder with actual request ID so the contact form submits to the right endpoint
      const finalHtml = body.designHtml.replace(/WEBSITE_ID/g, requestId);
      await c.env.CREATIVES_BUCKET.put(
        `website-previews/${requestId}.html`,
        finalHtml,
        { httpMetadata: { contentType: 'text/html' } }
      );
      // Save preview URL in DB for easy access
      await c.env.DB.prepare(
        'UPDATE website_requests SET preview_url = ? WHERE id = ?'
      ).bind(previewUrl, requestId).run();
    } catch (e) {
      console.error('Failed to store HTML preview:', e);
    }
  }

  // Store full design data in R2 (theme, fonts, sections, content)
  if (body.designData) {
    try {
      await c.env.CREATIVES_BUCKET.put(
        `website-previews/${requestId}-data.json`,
        body.designData,
        { httpMetadata: { contentType: 'application/json' } }
      );
    } catch (e) {
      console.error('Failed to store design data:', e);
    }
  }

  // Send notification to team (store in KV for team dashboard)
  try {
    await c.env.CACHE.put(
      `website-request:${requestId}`,
      JSON.stringify({
        id: requestId,
        userId,
        businessName: body.businessName,
        phone: body.phone,
        email: body.email,
        websiteType: body.websiteType,
        pagesNeeded: body.pagesNeeded,
        description: body.description,
        hasDesignPreview: !!body.designHtml,
        submittedAt: new Date().toISOString(),
      }),
      { expirationTtl: 60 * 60 * 24 * 30 } // 30 days
    );
  } catch {}

  return c.json({
    id: requestId,
    status: 'pending',
    message: 'Your website request has been submitted! Our team will contact you within 24 hours.',
  }, 201);
});

// GET /websites/request - Get user's website request status
websites.get('/request', async (c) => {
  const userId = c.get('userId') as string;

  const { results } = await c.env.DB.prepare(
    'SELECT id, business_name, website_type, pages_needed, status, quoted_price, created_at, updated_at FROM website_requests WHERE user_id = ? ORDER BY created_at DESC LIMIT 5'
  ).bind(userId).all();

  return c.json({
    requests: results.map(r => ({
      ...r,
      pages_needed: r.pages_needed ? JSON.parse(r.pages_needed as string) : [],
    })),
  });
});

// POST /websites/upload-images/:id - Upload logo + gallery images for a website request
websites.post('/upload-images/:id', async (c) => {
  const requestId = c.req.param('id');
  const userId = c.get('userId') as string;

  // Verify the request belongs to this user
  const req = await c.env.DB.prepare(
    'SELECT id FROM website_requests WHERE id = ? AND user_id = ?'
  ).bind(requestId, userId).first();

  if (!req) {
    return c.json({ error: 'Request not found' }, 404);
  }

  const body = await c.req.json<{
    logo?: string; // base64 data URI
    galleryImages?: string[]; // array of base64 data URIs
  }>();

  const uploaded: string[] = [];

  // Store logo
  if (body.logo && body.logo.startsWith('data:image')) {
    try {
      const base64Data = body.logo.split(',')[1];
      const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
      await c.env.CREATIVES_BUCKET.put(
        `website-assets/${requestId}/logo.jpg`,
        bytes,
        { httpMetadata: { contentType: 'image/jpeg' } }
      );
      uploaded.push('logo');
    } catch (e) {
      console.error('Failed to upload logo:', e);
    }
  }

  // Store gallery images
  if (body.galleryImages?.length) {
    for (let i = 0; i < body.galleryImages.length; i++) {
      const img = body.galleryImages[i];
      if (!img || !img.startsWith('data:image')) continue;
      try {
        const base64Data = img.split(',')[1];
        const bytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
        await c.env.CREATIVES_BUCKET.put(
          `website-assets/${requestId}/gallery-${i + 1}.jpg`,
          bytes,
          { httpMetadata: { contentType: 'image/jpeg' } }
        );
        uploaded.push(`gallery-${i + 1}`);
      } catch (e) {
        console.error(`Failed to upload gallery image ${i + 1}:`, e);
      }
    }
  }

  return c.json({ uploaded, count: uploaded.length });
});

// POST /websites/enquiry/:id - Receive contact form submissions (public, no auth)
websites.post('/enquiry/:id', async (c) => {
  // Rate limit: max 5 enquiries per IP per hour
  const ip = c.req.header('cf-connecting-ip') || 'unknown';
  const rateLimitKey = `enquiry_rate:${ip}`;
  const rateLimitStr = await c.env.CACHE.get(rateLimitKey);
  const rateLimitCount = rateLimitStr ? parseInt(rateLimitStr, 10) : 0;
  if (rateLimitCount >= 5) {
    return c.json({ error: 'Too many enquiries. Please try again later.' }, 429);
  }
  await c.env.CACHE.put(rateLimitKey, String(rateLimitCount + 1), { expirationTtl: 3600 });

  const requestId = c.req.param('id');

  // Verify the website request exists
  const req = await c.env.DB.prepare(
    'SELECT id, user_id, business_name, phone FROM website_requests WHERE id = ?'
  ).bind(requestId).first();

  if (!req) {
    return c.json({ error: 'Website not found' }, 404);
  }

  const body = await c.req.json<{
    name?: string;
    phone?: string;
    message?: string;
  }>();

  if (!body.name && !body.phone) {
    return c.json({ error: 'Name or phone is required' }, 400);
  }

  const enquiryId = generateId();

  await c.env.DB.prepare(
    `INSERT INTO website_enquiries (id, request_id, name, phone, message, created_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))`
  ).bind(enquiryId, requestId, body.name || null, body.phone || null, body.message || null).run();

  // Store in KV for quick access / notifications
  try {
    await c.env.CACHE.put(
      `enquiry:${enquiryId}`,
      JSON.stringify({
        id: enquiryId,
        requestId,
        businessName: req.business_name,
        ownerPhone: req.phone,
        visitorName: body.name,
        visitorPhone: body.phone,
        message: body.message,
        createdAt: new Date().toISOString(),
      }),
      { expirationTtl: 60 * 60 * 24 * 90 } // 90 days
    );
  } catch {}

  // Return CORS headers for cross-origin form submission
  return c.json({ success: true, message: 'Thank you! We will get back to you soon.' }, 201);
});

// GET /websites/enquiries/:id - Get all enquiries for a website (auth required)
websites.get('/enquiries/:id', async (c) => {
  const requestId = c.req.param('id');
  const userId = c.get('userId') as string;

  // Verify ownership
  const req = await c.env.DB.prepare(
    'SELECT id FROM website_requests WHERE id = ? AND user_id = ?'
  ).bind(requestId, userId).first();

  if (!req) {
    return c.json({ error: 'Not found' }, 404);
  }

  const { results } = await c.env.DB.prepare(
    'SELECT id, name, phone, message, created_at FROM website_enquiries WHERE request_id = ? ORDER BY created_at DESC'
  ).bind(requestId).all();

  return c.json({ enquiries: results });
});

// GET /websites/preview/:id - View the stored HTML preview (for team)
websites.get('/preview/:id', async (c) => {
  const requestId = c.req.param('id');

  const obj = await c.env.CREATIVES_BUCKET.get(`website-previews/${requestId}.html`);
  if (!obj) {
    return c.json({ error: 'Preview not found' }, 404);
  }

  const html = await obj.text();
  c.header('X-Frame-Options', 'DENY');
  return c.html(html);
});

// GET /websites/design-data/:id - Get the design JSON (for team)
websites.get('/design-data/:id', async (c) => {
  const requestId = c.req.param('id');

  const obj = await c.env.CREATIVES_BUCKET.get(`website-previews/${requestId}-data.json`);
  if (!obj) {
    return c.json({ error: 'Design data not found' }, 404);
  }

  const data = await obj.json();
  return c.json({ designData: data });
});

// GET /websites/asset/:id/:filename - Serve uploaded assets (logo, gallery)
websites.get('/asset/:id/:filename', async (c) => {
  const requestId = c.req.param('id');
  const filename = c.req.param('filename');

  if (filename.includes('..') || filename.includes('/')) {
    return c.json({ error: 'Invalid filename' }, 400);
  }

  const obj = await c.env.CREATIVES_BUCKET.get(`website-assets/${requestId}/${filename}`);
  if (!obj) {
    return c.json({ error: 'Asset not found' }, 404);
  }

  const headers = new Headers();
  headers.set('Content-Type', obj.httpMetadata?.contentType || 'image/jpeg');
  headers.set('Cache-Control', 'public, max-age=86400');

  return new Response(obj.body, { headers });
});

export default websites;
