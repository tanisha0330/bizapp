import type { Env } from '../types';
import { FacebookClient } from '../services/facebook';
import { decryptToken, generateId } from '../utils/crypto';

interface SyncPayload {
  campaignId: string;
  metaCampaignId: string;
  userId: string;
}

export async function handleAnalyticsQueue(
  batch: MessageBatch,
  env: Env
): Promise<void> {
  for (const message of batch.messages) {
    const { type, payload } = message.body as { type: string; payload: SyncPayload };

    try {
      if (type === 'sync_campaign_analytics') {
        await syncCampaignAnalytics(payload, env);
      }
      message.ack();
    } catch (err) {
      console.error('Analytics sync error:', err);
      message.retry();
    }
  }
}

async function syncCampaignAnalytics(payload: SyncPayload, env: Env): Promise<void> {
  const { campaignId, metaCampaignId, userId } = payload;

  const metaConn = await env.DB.prepare(
    'SELECT access_token FROM meta_connections WHERE user_id = ? AND is_active = 1'
  ).bind(userId).first();

  if (!metaConn) return;

  const accessToken = await decryptToken(metaConn.access_token as string, env.TOKEN_ENCRYPTION_KEY);
  const fb = new FacebookClient(env.META_APP_ID, env.META_APP_SECRET, env.GRAPH_API_VERSION);

  const today = new Date().toISOString().split('T')[0];
  const insights = await fb.getCampaignInsights(metaCampaignId, accessToken, {
    since: today,
    until: today,
  });

  if (!insights) return;

  const impressions = parseInt(insights.impressions || '0');
  const clicks = parseInt(insights.clicks || '0');
  const spend = parseFloat(insights.spend || '0');
  const reach = parseInt(insights.reach || '0');

  await env.DB.prepare(`
    INSERT INTO campaign_analytics (id, campaign_id, date, impressions, clicks, spend, conversions, reach, cpc, cpm, ctr, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(campaign_id, date) DO UPDATE SET
      impressions = excluded.impressions,
      clicks = excluded.clicks,
      spend = excluded.spend,
      reach = excluded.reach,
      cpc = excluded.cpc,
      cpm = excluded.cpm,
      ctr = excluded.ctr
  `).bind(
    generateId(), campaignId, today,
    impressions, clicks, spend, reach,
    clicks > 0 ? (spend / clicks) : 0,
    impressions > 0 ? ((spend / impressions) * 1000) : 0,
    impressions > 0 ? ((clicks / impressions) * 100) : 0
  ).run();

  // Invalidate analytics cache
  await env.CACHE.delete(`analytics:overview:${userId}`);
}
