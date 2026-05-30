import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { authMiddleware } from '../middleware/auth';
import { generateId } from '../utils/crypto';

const cards = new Hono<AppEnv>();

// Auth-protected routes
const authed = new Hono<AppEnv>();
authed.use('*', authMiddleware);

// POST /cards - Save or update a digital card
authed.post('/', async (c) => {
  const userId = c.get('userId') as string;
  const body = await c.req.json<{
    cardData: Record<string, string>;
    templateId: string;
    slug?: string;
    imageBase64?: string;
  }>();

  if (!body.cardData || !body.templateId) {
    return c.json({ error: 'cardData and templateId are required' }, 400);
  }

  // Generate slug from business name or name
  const rawSlug = body.slug
    || body.cardData.businessName
    || body.cardData.name
    || 'card';
  let slug = rawSlug
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);

  // Check if user already has a card
  const existing = await c.env.DB.prepare(
    'SELECT id, slug FROM digital_cards WHERE user_id = ? AND is_active = 1'
  ).bind(userId).first();

  let cardId: string;
  let imageR2Key: string | null = null;

  // Save card image to R2 if provided
  if (body.imageBase64) {
    const binaryStr = atob(body.imageBase64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    imageR2Key = `cards/${userId}/card-${Date.now()}.png`;
    await c.env.CREATIVES_BUCKET.put(imageR2Key, bytes, {
      httpMetadata: { contentType: 'image/png' },
    });
  }

  if (existing) {
    // Update existing card
    cardId = existing.id as string;
    // Keep existing slug unless explicitly changed
    if (!body.slug) slug = existing.slug as string;

    await c.env.DB.prepare(`
      UPDATE digital_cards SET card_data = ?, template_id = ?, slug = ?,
        image_r2_key = COALESCE(?, image_r2_key),
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(
      JSON.stringify(body.cardData), body.templateId, slug,
      imageR2Key, cardId
    ).run();
  } else {
    // Create new card — ensure slug is unique
    cardId = generateId();
    const slugExists = await c.env.DB.prepare(
      'SELECT id FROM digital_cards WHERE slug = ?'
    ).bind(slug).first();
    if (slugExists) slug = `${slug}-${cardId.substring(0, 6)}`;

    await c.env.DB.prepare(`
      INSERT INTO digital_cards (id, user_id, slug, card_data, template_id, image_r2_key, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
    `).bind(cardId, userId, slug, JSON.stringify(body.cardData), body.templateId, imageR2Key).run();
  }

  const cardUrl = `${new URL(c.req.url).origin}/cards/v/${slug}`;

  return c.json({
    id: cardId,
    slug,
    url: cardUrl,
    updated: !!existing,
  }, existing ? 200 : 201);
});

// GET /cards/mine - Get current user's card
authed.get('/mine', async (c) => {
  const userId = c.get('userId') as string;
  const card = await c.env.DB.prepare(
    'SELECT id, slug, card_data, template_id, views, created_at, updated_at FROM digital_cards WHERE user_id = ? AND is_active = 1'
  ).bind(userId).first();

  if (!card) return c.json({ card: null });

  return c.json({
    card: {
      ...card,
      card_data: JSON.parse(card.card_data as string),
      url: `${new URL(c.req.url).origin}/cards/v/${card.slug}`,
    },
  });
});

// DELETE /cards/mine - Delete user's card
authed.delete('/mine', async (c) => {
  const userId = c.get('userId') as string;
  await c.env.DB.prepare(
    "UPDATE digital_cards SET is_active = 0, updated_at = datetime('now') WHERE user_id = ?"
  ).bind(userId).run();
  return c.json({ success: true });
});

// Mount auth-protected routes
cards.route('/', authed);

// ─── PUBLIC: Shareable card page (no auth) ───────────────
cards.get('/v/:slug', async (c) => {
  const slug = c.req.param('slug');

  const card = await c.env.DB.prepare(
    'SELECT id, card_data, template_id, image_r2_key, views FROM digital_cards WHERE slug = ? AND is_active = 1'
  ).bind(slug).first();

  if (!card) {
    return c.html('<html><body style="display:flex;align-items:center;justify-content:center;height:100vh;font-family:system-ui"><h2>Card not found</h2></body></html>', 404);
  }

  // Increment views
  await c.env.DB.prepare(
    'UPDATE digital_cards SET views = views + 1 WHERE id = ?'
  ).bind(card.id).run();

  const data = JSON.parse(card.card_data as string);
  const imageUrl = card.image_r2_key
    ? `${new URL(c.req.url).origin}/cards/img/${card.id}`
    : null;

  // Generate vCard download data
  const vcard = [
    'BEGIN:VCARD', 'VERSION:3.0',
    `FN:${data.name || ''}`,
    `ORG:${data.businessName || ''}`,
    `TITLE:${data.title || ''}`,
    data.phone ? `TEL;TYPE=CELL:${data.phone}` : '',
    data.email ? `EMAIL:${data.email}` : '',
    data.website ? `URL:${data.website}` : '',
    data.address ? `ADR:;;${data.address};;;` : '',
    'END:VCARD',
  ].filter(Boolean).join('\n');

  const vcardBase64 = btoa(unescape(encodeURIComponent(vcard)));

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.name || 'Digital Card'} - ${data.businessName || 'Biz499'}</title>
  <meta name="description" content="${data.title || ''} at ${data.businessName || ''}">
  ${imageUrl ? `<meta property="og:image" content="${imageUrl}">` : ''}
  <meta property="og:title" content="${data.name || 'Digital Card'}">
  <meta property="og:description" content="${data.title || ''} | ${data.businessName || ''}">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .card { background: #fff; border-radius: 20px; max-width: 420px; width: 100%; overflow: hidden; box-shadow: 0 20px 60px rgba(0,0,0,0.3); }
    .card-img { width: 100%; aspect-ratio: 5/3; object-fit: cover; }
    .card-body { padding: 24px; }
    .avatar { width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 800; margin: -52px auto 12px; border: 4px solid #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .name { font-size: 22px; font-weight: 800; text-align: center; color: #1a1a1a; }
    .title { font-size: 14px; color: #6b7280; text-align: center; margin-top: 4px; }
    .biz { font-size: 12px; color: #9ca3af; text-align: center; margin-top: 2px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; }
    .divider { height: 1px; background: #e5e7eb; margin: 16px 0; }
    .info-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; color: #374151; font-size: 14px; text-decoration: none; }
    .info-row:hover { color: #4f46e5; }
    .info-icon { width: 36px; height: 36px; border-radius: 10px; background: #f3f4f6; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
    .actions { display: flex; gap: 10px; margin-top: 16px; }
    .btn { flex: 1; padding: 12px; border-radius: 12px; text-align: center; font-weight: 600; font-size: 14px; text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 6px; }
    .btn-primary { background: #4f46e5; color: #fff; }
    .btn-whatsapp { background: #25d366; color: #fff; }
    .btn-save { background: #f3f4f6; color: #374151; }
    .footer { text-align: center; padding: 12px; font-size: 11px; color: #9ca3af; }
    .footer a { color: #6366f1; text-decoration: none; }
  </style>
</head>
<body>
  <div class="card">
    ${imageUrl ? `<img src="${imageUrl}" class="card-img" alt="Business Card">` : ''}
    <div class="card-body">
      ${!imageUrl ? `<div class="avatar">${(data.name || 'B').charAt(0).toUpperCase()}</div>` : ''}
      <div class="name">${data.name || 'Your Name'}</div>
      <div class="title">${data.title || ''}</div>
      <div class="biz">${data.businessName || ''}</div>
      <div class="divider"></div>
      ${data.phone ? `<a href="tel:${data.phone}" class="info-row"><span class="info-icon">📞</span>${data.phone}</a>` : ''}
      ${data.email ? `<a href="mailto:${data.email}" class="info-row"><span class="info-icon">✉️</span>${data.email}</a>` : ''}
      ${data.website ? `<a href="${data.website.startsWith('http') ? data.website : 'https://' + data.website}" target="_blank" class="info-row"><span class="info-icon">🌐</span>${data.website}</a>` : ''}
      ${data.address ? `<div class="info-row"><span class="info-icon">📍</span>${data.address}</div>` : ''}
      <div class="actions">
        ${data.phone ? `<a href="tel:${data.phone}" class="btn btn-primary">📞 Call</a>` : ''}
        ${data.whatsapp || data.phone ? `<a href="https://wa.me/${(data.whatsapp || data.phone).replace(/[^0-9]/g, '')}" class="btn btn-whatsapp">💬 WhatsApp</a>` : ''}
        <a href="data:text/vcard;base64,${vcardBase64}" download="${(data.name || 'contact').replace(/\s+/g, '_')}.vcf" class="btn btn-save">💾 Save</a>
      </div>
    </div>
    <div class="footer">Made with <a href="https://biz499.com">Biz499</a></div>
  </div>
</body>
</html>`;

  return c.html(html);
});

// GET /cards/img/:id - Serve card image from R2
cards.get('/img/:id', async (c) => {
  const id = c.req.param('id');
  const card = await c.env.DB.prepare(
    'SELECT image_r2_key FROM digital_cards WHERE id = ? AND is_active = 1'
  ).bind(id).first();

  if (!card?.image_r2_key) return c.json({ error: 'Image not found' }, 404);

  const obj = await c.env.CREATIVES_BUCKET.get(card.image_r2_key as string);
  if (!obj) return c.json({ error: 'Image not found in storage' }, 404);

  return new Response(obj.body, {
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=86400' },
  });
});

export default cards;
