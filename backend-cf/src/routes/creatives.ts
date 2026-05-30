import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { authMiddleware } from '../middleware/auth';
import { createCreativeSchema } from '../middleware/validate';
import { generateId } from '../utils/crypto';

const creatives = new Hono<AppEnv>();
creatives.use('*', authMiddleware);

// POST /creatives/upload - Upload a creative to R2
creatives.post('/upload', async (c) => {
  const userId = c.get('userId') as string;

  const contentType = c.req.header('Content-Type') || '';

  if (contentType.includes('multipart/form-data')) {
    // Handle multipart upload
    const formData = await c.req.formData();
    const file = formData.get('file') as File | null;
    const orgId = formData.get('orgId') as string | null;

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/quicktime'];
    if (!allowedTypes.includes(file.type)) {
      return c.json({ error: 'Unsupported file type. Allowed: JPEG, PNG, WebP, MP4, MOV' }, 400);
    }

    // Max 50MB
    const maxSize = 50 * 1024 * 1024;
    if (file.size > maxSize) {
      return c.json({ error: 'File too large. Max 50MB.' }, 400);
    }

    const creativeId = generateId();
    const ext = file.name.split('.').pop() || 'bin';
    const r2Key = `creatives/${userId}/${creativeId}.${ext}`;

    // Upload to R2
    await c.env.CREATIVES_BUCKET.put(r2Key, file.stream(), {
      httpMetadata: { contentType: file.type },
      customMetadata: { userId, creativeId, originalName: file.name },
    });

    // Store metadata in D1
    await c.env.DB.prepare(
      `INSERT INTO creatives (id, user_id, org_id, file_name, file_type, file_size, r2_key, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
    ).bind(creativeId, userId, orgId, file.name, file.type, file.size, r2Key).run();

    return c.json({
      id: creativeId,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      r2Key,
    }, 201);
  }

  // Handle JSON upload with base64 data
  const rawBody = await c.req.json();
  const parsed = createCreativeSchema.safeParse(rawBody);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`);
    return c.json({ error: 'Validation failed', details: errors }, 400);
  }

  const { data, fileName, fileType, orgId } = parsed.data;

  // Decode base64
  const binaryStr = atob(data);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  const creativeId = generateId();
  const ext = fileName.split('.').pop() || 'bin';
  const r2Key = `creatives/${userId}/${creativeId}.${ext}`;

  await c.env.CREATIVES_BUCKET.put(r2Key, bytes, {
    httpMetadata: { contentType: fileType },
    customMetadata: { userId, creativeId, originalName: fileName },
  });

  await c.env.DB.prepare(
    `INSERT INTO creatives (id, user_id, org_id, file_name, file_type, file_size, r2_key, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))`
  ).bind(creativeId, userId, orgId || null, fileName, fileType, bytes.length, r2Key).run();

  return c.json({
    id: creativeId,
    fileName,
    fileType,
    fileSize: bytes.length,
    r2Key,
  }, 201);
});

// GET /creatives - List user's creatives
creatives.get('/', async (c) => {
  const userId = c.get('userId') as string;

  const { results } = await c.env.DB.prepare(
    'SELECT id, file_name, file_type, file_size, r2_key, width, height, created_at FROM creatives WHERE user_id = ? ORDER BY created_at DESC'
  ).bind(userId).all();

  return c.json({ creatives: results });
});

// GET /creatives/:id - Get a single creative (metadata)
creatives.get('/:id', async (c) => {
  const userId = c.get('userId') as string;
  const id = c.req.param('id');

  const creative = await c.env.DB.prepare(
    'SELECT * FROM creatives WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first();

  if (!creative) return c.json({ error: 'Creative not found' }, 404);

  return c.json({ creative });
});

// GET /creatives/:id/url - Get a presigned/public URL for the creative
creatives.get('/:id/url', async (c) => {
  const userId = c.get('userId') as string;
  const id = c.req.param('id');

  const creative = await c.env.DB.prepare(
    'SELECT r2_key FROM creatives WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first();

  if (!creative) return c.json({ error: 'Creative not found' }, 404);

  // For R2, we serve the file directly through the worker
  const url = `${new URL(c.req.url).origin}/creatives/${id}/file`;
  return c.json({ url });
});

// GET /creatives/:id/file - Serve the actual file from R2
creatives.get('/:id/file', async (c) => {
  const userId = c.get('userId') as string;
  const id = c.req.param('id');

  const creative = await c.env.DB.prepare(
    'SELECT r2_key, file_type FROM creatives WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first();

  if (!creative) return c.json({ error: 'Creative not found' }, 404);

  const object = await c.env.CREATIVES_BUCKET.get(creative.r2_key as string);
  if (!object) return c.json({ error: 'File not found in storage' }, 404);

  return new Response(object.body, {
    headers: {
      'Content-Type': creative.file_type as string,
      'Cache-Control': 'public, max-age=86400',
    },
  });
});

// DELETE /creatives/:id - Delete a creative
creatives.delete('/:id', async (c) => {
  const userId = c.get('userId') as string;
  const id = c.req.param('id');

  const creative = await c.env.DB.prepare(
    'SELECT r2_key FROM creatives WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first();

  if (!creative) return c.json({ error: 'Creative not found' }, 404);

  // Delete from R2
  await c.env.CREATIVES_BUCKET.delete(creative.r2_key as string);

  // Delete thumbnail if exists
  if (creative.thumbnail_r2_key) {
    await c.env.CREATIVES_BUCKET.delete(creative.thumbnail_r2_key as string);
  }

  // Delete from D1
  await c.env.DB.prepare('DELETE FROM creatives WHERE id = ?').bind(id).run();

  return c.json({ success: true });
});

export default creatives;
