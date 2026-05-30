import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { authMiddleware } from '../middleware/auth';

const analytics = new Hono<AppEnv>();
analytics.use('*', authMiddleware);

// GET /analytics/overview - Dashboard overview stats
analytics.get('/overview', async (c) => {
  const userId = c.get('userId') as string;

  // Try cache first (5 min TTL)
  const cacheKey = `analytics:overview:${userId}`;
  const cached = await c.env.CACHE.get(cacheKey, 'json');
  if (cached) {
    return c.json(cached);
  }

  // Total campaigns by status
  const { results: statusCounts } = await c.env.DB.prepare(
    'SELECT status, COUNT(*) as count FROM campaigns WHERE user_id = ? GROUP BY status'
  ).bind(userId).all();

  // Aggregate analytics for last 30 days
  const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
  const aggregated = await c.env.DB.prepare(`
    SELECT
      COALESCE(SUM(ca.impressions), 0) as total_impressions,
      COALESCE(SUM(ca.clicks), 0) as total_clicks,
      COALESCE(SUM(ca.spend), 0) as total_spend,
      COALESCE(SUM(ca.conversions), 0) as total_conversions,
      COALESCE(SUM(ca.reach), 0) as total_reach
    FROM campaign_analytics ca
    INNER JOIN campaigns c ON ca.campaign_id = c.id
    WHERE c.user_id = ? AND ca.date >= ?
  `).bind(userId, thirtyDaysAgo).first();

  // Daily spend trend (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const { results: dailyTrend } = await c.env.DB.prepare(`
    SELECT ca.date, SUM(ca.impressions) as impressions, SUM(ca.clicks) as clicks, SUM(ca.spend) as spend
    FROM campaign_analytics ca
    INNER JOIN campaigns c ON ca.campaign_id = c.id
    WHERE c.user_id = ? AND ca.date >= ?
    GROUP BY ca.date ORDER BY ca.date
  `).bind(userId, sevenDaysAgo).all();

  // Top performing campaigns
  const { results: topCampaigns } = await c.env.DB.prepare(`
    SELECT c.id, c.title, c.status,
      COALESCE(SUM(ca.impressions), 0) as impressions,
      COALESCE(SUM(ca.clicks), 0) as clicks,
      COALESCE(SUM(ca.spend), 0) as spend
    FROM campaigns c
    LEFT JOIN campaign_analytics ca ON c.id = ca.campaign_id
    WHERE c.user_id = ?
    GROUP BY c.id
    ORDER BY impressions DESC
    LIMIT 5
  `).bind(userId).all();

  const totalImpressions = (aggregated?.total_impressions as number) || 0;
  const totalClicks = (aggregated?.total_clicks as number) || 0;

  const overview = {
    campaigns: Object.fromEntries(statusCounts.map(r => [r.status, r.count])),
    last30Days: {
      impressions: totalImpressions,
      clicks: totalClicks,
      spend: (aggregated?.total_spend as number) || 0,
      conversions: (aggregated?.total_conversions as number) || 0,
      reach: (aggregated?.total_reach as number) || 0,
      ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00',
    },
    dailyTrend,
    topCampaigns,
  };

  // Cache for 5 minutes
  await c.env.CACHE.put(cacheKey, JSON.stringify(overview), { expirationTtl: 300 });

  return c.json(overview);
});

// GET /analytics/campaigns/:id - Per-campaign analytics
analytics.get('/campaigns/:id', async (c) => {
  const userId = c.get('userId') as string;
  const campaignId = c.req.param('id');
  const days = parseInt(c.req.query('days') || '30');

  // Verify ownership
  const campaign = await c.env.DB.prepare(
    'SELECT id, title, status, meta_campaign_id FROM campaigns WHERE id = ? AND user_id = ?'
  ).bind(campaignId, userId).first();

  if (!campaign) return c.json({ error: 'Campaign not found' }, 404);

  const sinceDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

  // Daily breakdown
  const { results: daily } = await c.env.DB.prepare(`
    SELECT date, impressions, clicks, spend, conversions, reach, cpc, cpm, ctr
    FROM campaign_analytics
    WHERE campaign_id = ? AND date >= ?
    ORDER BY date
  `).bind(campaignId, sinceDate).all();

  // Totals
  const totals = await c.env.DB.prepare(`
    SELECT
      COALESCE(SUM(impressions), 0) as impressions,
      COALESCE(SUM(clicks), 0) as clicks,
      COALESCE(SUM(spend), 0) as spend,
      COALESCE(SUM(conversions), 0) as conversions,
      COALESCE(SUM(reach), 0) as reach
    FROM campaign_analytics
    WHERE campaign_id = ? AND date >= ?
  `).bind(campaignId, sinceDate).first();

  const totalImpressions = (totals?.impressions as number) || 0;
  const totalClicks = (totals?.clicks as number) || 0;
  const totalSpend = (totals?.spend as number) || 0;

  return c.json({
    campaign: {
      id: campaign.id,
      title: campaign.title,
      status: campaign.status,
    },
    period: { days, since: sinceDate },
    totals: {
      ...totals,
      ctr: totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00',
      cpc: totalClicks > 0 ? (totalSpend / totalClicks).toFixed(2) : '0.00',
      cpm: totalImpressions > 0 ? ((totalSpend / totalImpressions) * 1000).toFixed(2) : '0.00',
    },
    daily,
  });
});

// POST /analytics/sync - Trigger analytics sync for active campaigns
analytics.post('/sync', async (c) => {
  const userId = c.get('userId') as string;

  const { results: activeCampaigns } = await c.env.DB.prepare(
    "SELECT id, meta_campaign_id FROM campaigns WHERE user_id = ? AND status = 'active' AND meta_campaign_id IS NOT NULL"
  ).bind(userId).all();

  if (activeCampaigns.length === 0) {
    return c.json({ message: 'No active campaigns to sync' });
  }

  if (c.env.ANALYTICS_QUEUE) {
    for (const campaign of activeCampaigns) {
      await c.env.ANALYTICS_QUEUE.send({
        type: 'sync_campaign_analytics',
        payload: { campaignId: campaign.id, metaCampaignId: campaign.meta_campaign_id, userId },
      });
    }
  }

  return c.json({
    message: `Triggered analytics sync for ${activeCampaigns.length} campaigns`,
    campaigns: activeCampaigns.map(c => c.id),
  });
});

export default analytics;
