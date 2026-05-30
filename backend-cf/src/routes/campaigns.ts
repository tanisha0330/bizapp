import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { authMiddleware } from '../middleware/auth';
import { campaignLaunchRateLimit } from '../middleware/rateLimit';
import { createCampaignSchema } from '../middleware/validate';
import { generateId } from '../utils/crypto';
import { launchCampaignSync, pauseResumeCampaignSync } from '../services/campaign-launcher';

const campaigns = new Hono<AppEnv>();
campaigns.use('*', authMiddleware);

// POST /campaigns - Create a new campaign
campaigns.post('/', async (c) => {
  const userId = c.get('userId') as string;
  const rawBody = await c.req.json();

  const parsed = createCampaignSchema.safeParse(rawBody);
  if (!parsed.success) {
    const errors = parsed.error.issues.map((e: any) => `${e.path.join('.')}: ${e.message}`);
    return c.json({ error: 'Validation failed', details: errors }, 400);
  }

  const body = parsed.data;

  // Verify ad account belongs to user's org
  const adAccount = await c.env.DB.prepare(`
    SELECT aa.id FROM ad_accounts aa
    INNER JOIN organizations o ON aa.org_id = o.id
    INNER JOIN org_members om ON o.id = om.org_id
    WHERE aa.id = ? AND om.user_id = ?
  `).bind(body.adAccountId, userId).first();

  if (!adAccount) {
    return c.json({ error: 'Ad account not found or unauthorized' }, 404);
  }

  const campaignId = generateId();
  const targeting = JSON.stringify(body.targeting || {});

  await c.env.DB.prepare(`
    INSERT INTO campaigns (id, user_id, ad_account_id, title, objective, status, daily_budget, total_budget, start_date, end_date, targeting, creative_id, primary_text, headline, cta, destination_url, page_id, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, 'draft', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
  `).bind(
    campaignId, userId, body.adAccountId, body.title,
    body.objective || 'OUTCOME_AWARENESS',
    body.dailyBudget, body.totalBudget || null,
    body.startDate, body.endDate || null,
    targeting, body.creativeId || null,
    body.primaryText || null, body.headline || null,
    body.cta || 'LEARN_MORE', body.destinationUrl || null,
    body.pageId || null
  ).run();

  return c.json({
    id: campaignId,
    status: 'draft',
    title: body.title,
  }, 201);
});

// GET /campaigns - List user's campaigns
campaigns.get('/', async (c) => {
  const userId = c.get('userId') as string;
  const status = c.req.query('status');

  let query = 'SELECT * FROM campaigns WHERE user_id = ?';
  const binds: (string)[] = [userId];

  if (status) {
    query += ' AND status = ?';
    binds.push(status);
  }

  query += ' ORDER BY created_at DESC';

  const stmt = c.env.DB.prepare(query);
  const { results } = await stmt.bind(...binds).all();

  // Parse targeting JSON for each result
  const campaignsData = results.map((r) => ({
    ...r,
    targeting: r.targeting ? JSON.parse(r.targeting as string) : {},
  }));

  return c.json({ campaigns: campaignsData });
});

// GET /campaigns/:id - Get single campaign
campaigns.get('/:id', async (c) => {
  const userId = c.get('userId') as string;
  const id = c.req.param('id');

  const campaign = await c.env.DB.prepare(
    'SELECT * FROM campaigns WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first();

  if (!campaign) return c.json({ error: 'Campaign not found' }, 404);

  return c.json({
    campaign: {
      ...campaign,
      targeting: campaign.targeting ? JSON.parse(campaign.targeting as string) : {},
    },
  });
});

// PUT /campaigns/:id - Update a campaign
campaigns.put('/:id', async (c) => {
  const userId = c.get('userId') as string;
  const id = c.req.param('id');
  const body = await c.req.json<Record<string, unknown>>();

  // Verify ownership
  const existing = await c.env.DB.prepare(
    'SELECT status FROM campaigns WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first();

  if (!existing) return c.json({ error: 'Campaign not found' }, 404);

  // Only allow editing draft or paused campaigns
  if (existing.status !== 'draft' && existing.status !== 'paused') {
    return c.json({ error: 'Can only edit draft or paused campaigns' }, 400);
  }

  // Build dynamic update
  const allowedFields = [
    'title', 'objective', 'daily_budget', 'total_budget',
    'start_date', 'end_date', 'primary_text', 'headline',
    'cta', 'destination_url', 'creative_id', 'page_id',
  ];

  const fieldMap: Record<string, string> = {
    dailyBudget: 'daily_budget',
    totalBudget: 'total_budget',
    startDate: 'start_date',
    endDate: 'end_date',
    primaryText: 'primary_text',
    destinationUrl: 'destination_url',
    creativeId: 'creative_id',
    pageId: 'page_id',
  };

  const updates: string[] = [];
  const values: unknown[] = [];

  for (const [key, value] of Object.entries(body)) {
    const dbField = fieldMap[key] || key;
    if (allowedFields.includes(dbField)) {
      if (dbField === 'targeting') {
        updates.push('targeting = ?');
        values.push(JSON.stringify(value));
      } else {
        updates.push(`${dbField} = ?`);
        values.push(value);
      }
    }
  }

  if (body.targeting) {
    updates.push('targeting = ?');
    values.push(JSON.stringify(body.targeting));
  }

  if (updates.length === 0) {
    return c.json({ error: 'No valid fields to update' }, 400);
  }

  updates.push("updated_at = datetime('now')");
  values.push(id, userId);

  await c.env.DB.prepare(
    `UPDATE campaigns SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`
  ).bind(...values).run();

  const updated = await c.env.DB.prepare(
    'SELECT * FROM campaigns WHERE id = ?'
  ).bind(id).first();

  return c.json({
    campaign: {
      ...updated,
      targeting: updated?.targeting ? JSON.parse(updated.targeting as string) : {},
    },
  });
});

// POST /campaigns/:id/launch - Queue campaign for launch via Facebook API
campaigns.post('/:id/launch', campaignLaunchRateLimit, async (c) => {
  const userId = c.get('userId') as string;
  const id = c.req.param('id')!;

  const campaign = await c.env.DB.prepare(
    'SELECT * FROM campaigns WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first();

  if (!campaign) return c.json({ error: 'Campaign not found' }, 404);
  if (campaign.status !== 'draft') {
    return c.json({ error: 'Only draft campaigns can be launched' }, 400);
  }
  if (!campaign.creative_id) {
    return c.json({ error: 'Campaign must have a creative attached' }, 400);
  }
  if (!campaign.page_id) {
    return c.json({ error: 'Campaign must have a page selected' }, 400);
  }

  // Update status to launching
  await c.env.DB.prepare(
    "UPDATE campaigns SET status = 'launching', updated_at = datetime('now') WHERE id = ?"
  ).bind(id).run();

  if (c.env.CAMPAIGN_QUEUE) {
    await c.env.CAMPAIGN_QUEUE.send({
      type: 'launch_campaign',
      payload: { campaignId: id, userId },
    });
    return c.json({ status: 'launching', message: 'Campaign queued for launch' });
  }

  // Sync fallback (free plan - no queues)
  try {
    await launchCampaignSync(id, userId, c.env);
    return c.json({ status: 'active', message: 'Campaign launched successfully' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Launch failed';
    return c.json({ error: msg, status: 'failed' }, 500);
  }
});

// POST /campaigns/:id/pause - Pause an active campaign
campaigns.post('/:id/pause', async (c) => {
  const userId = c.get('userId') as string;
  const id = c.req.param('id');

  const campaign = await c.env.DB.prepare(
    'SELECT * FROM campaigns WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first();

  if (!campaign) return c.json({ error: 'Campaign not found' }, 404);
  if (campaign.status !== 'active') {
    return c.json({ error: 'Only active campaigns can be paused' }, 400);
  }

  try {
    await pauseResumeCampaignSync(id, userId, campaign.meta_campaign_id as string, 'pause', c.env);
    return c.json({ status: 'paused', message: 'Campaign paused' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Pause failed';
    return c.json({ error: msg }, 500);
  }
});

// POST /campaigns/:id/resume - Resume a paused campaign
campaigns.post('/:id/resume', async (c) => {
  const userId = c.get('userId') as string;
  const id = c.req.param('id');

  const campaign = await c.env.DB.prepare(
    'SELECT * FROM campaigns WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first();

  if (!campaign) return c.json({ error: 'Campaign not found' }, 404);
  if (campaign.status !== 'paused') {
    return c.json({ error: 'Only paused campaigns can be resumed' }, 400);
  }

  try {
    await pauseResumeCampaignSync(id, userId, campaign.meta_campaign_id as string, 'resume', c.env);
    return c.json({ status: 'active', message: 'Campaign resumed' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Resume failed';
    return c.json({ error: msg }, 500);
  }
});

// DELETE /campaigns/:id - Delete a campaign (only draft)
campaigns.delete('/:id', async (c) => {
  const userId = c.get('userId') as string;
  const id = c.req.param('id');

  const campaign = await c.env.DB.prepare(
    'SELECT status FROM campaigns WHERE id = ? AND user_id = ?'
  ).bind(id, userId).first();

  if (!campaign) return c.json({ error: 'Campaign not found' }, 404);
  if (campaign.status !== 'draft') {
    return c.json({ error: 'Only draft campaigns can be deleted' }, 400);
  }

  await c.env.DB.prepare('DELETE FROM campaigns WHERE id = ?').bind(id).run();
  return c.json({ success: true });
});

export default campaigns;
