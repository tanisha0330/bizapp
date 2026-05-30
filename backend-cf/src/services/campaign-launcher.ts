import type { Env } from '../types';
import { FacebookClient } from './facebook';
import { decryptToken } from '../utils/crypto';

export async function launchCampaignSync(campaignId: string, userId: string, env: Env): Promise<void> {
  const campaign = await env.DB.prepare('SELECT * FROM campaigns WHERE id = ?').bind(campaignId).first();
  if (!campaign) throw new Error('Campaign not found');

  const metaConn = await env.DB.prepare(
    'SELECT access_token FROM meta_connections WHERE user_id = ? AND is_active = 1'
  ).bind(userId).first();
  if (!metaConn) {
    await updateStatus(env, campaignId, 'failed');
    throw new Error('Facebook not connected');
  }

  const page = await env.DB.prepare(
    'SELECT page_id, page_access_token FROM meta_pages WHERE page_id = ? AND is_active = 1'
  ).bind(campaign.page_id).first();
  if (!page) {
    await updateStatus(env, campaignId, 'failed');
    throw new Error('Selected page not found');
  }

  const metaAdAccount = await env.DB.prepare(`
    SELECT ad_account_id FROM meta_ad_accounts
    WHERE meta_connection_id = (SELECT id FROM meta_connections WHERE user_id = ? AND is_active = 1)
    AND is_active = 1 LIMIT 1
  `).bind(userId).first();
  if (!metaAdAccount) {
    await updateStatus(env, campaignId, 'failed');
    throw new Error('No Facebook ad account found');
  }

  const accessToken = await decryptToken(metaConn.access_token as string, env.TOKEN_ENCRYPTION_KEY);
  const fbAdAccountId = metaAdAccount.ad_account_id as string;
  const fb = new FacebookClient(env.META_APP_ID, env.META_APP_SECRET, env.GRAPH_API_VERSION);

  // 1. Create Facebook Campaign
  const fbCampaign = await fb.createCampaign(fbAdAccountId, accessToken, {
    name: campaign.title as string,
    objective: campaign.objective as string,
    status: 'PAUSED',
    special_ad_categories: [],
  });

  // 2. Build targeting
  const targeting = campaign.targeting ? JSON.parse(campaign.targeting as string) : {};
  const fbTargeting: Record<string, unknown> = {};
  if (targeting.locations?.length) {
    fbTargeting.geo_locations = { cities: targeting.locations.map((loc: string) => ({ key: loc })) };
  }
  if (targeting.interests?.length) {
    fbTargeting.interests = targeting.interests.map((interest: string) => ({ name: interest }));
  }
  if (targeting.ageMin) fbTargeting.age_min = targeting.ageMin;
  if (targeting.ageMax) fbTargeting.age_max = targeting.ageMax;
  if (targeting.genders?.length) fbTargeting.genders = targeting.genders;

  // 3. Create Ad Set
  const fbAdSet = await fb.createAdSet(fbAdAccountId, accessToken, {
    name: `${campaign.title} - Ad Set`,
    campaign_id: fbCampaign.id,
    daily_budget: Math.round((campaign.daily_budget as number) * 100),
    billing_event: 'IMPRESSIONS',
    optimization_goal: 'REACH',
    targeting: Object.keys(fbTargeting).length > 0 ? fbTargeting : { geo_locations: { countries: ['IN'] } },
    start_time: campaign.start_date as string,
    end_time: campaign.end_date as string | undefined,
    status: 'PAUSED',
  });

  // 4. Upload image if creative exists
  let imageHash: string | undefined;
  if (campaign.creative_id) {
    const creative = await env.DB.prepare('SELECT r2_key FROM creatives WHERE id = ?').bind(campaign.creative_id).first();
    if (creative) {
      const workerHost = env.ENVIRONMENT === 'production' ? 'api.biz499.com' : 'biz499-api.workers.dev';
      const imageResult = await fb.uploadImage(fbAdAccountId, accessToken,
        `https://${workerHost}/creatives/${campaign.creative_id}/file`
      );
      const images = imageResult.images;
      imageHash = Object.values(images)[0]?.hash;
    }
  }

  // 5. Create Ad Creative
  const fbCreative = await fb.createAdCreative(fbAdAccountId, accessToken, {
    name: `${campaign.title} - Creative`,
    object_story_spec: {
      page_id: page.page_id,
      link_data: {
        message: campaign.primary_text || '',
        link: campaign.destination_url || 'https://facebook.com',
        name: campaign.headline || campaign.title,
        call_to_action: { type: campaign.cta || 'LEARN_MORE' },
        ...(imageHash ? { image_hash: imageHash } : {}),
      },
    },
  });

  // 6. Create Ad
  const fbAd = await fb.createAd(fbAdAccountId, accessToken, {
    name: `${campaign.title} - Ad`,
    adset_id: fbAdSet.id,
    creative: { creative_id: fbCreative.id },
    status: 'PAUSED',
  });

  // 7. Activate all
  await fb.updateCampaignStatus(fbCampaign.id, accessToken, 'ACTIVE');
  await fb.updateCampaignStatus(fbAdSet.id, accessToken, 'ACTIVE');
  await fb.updateCampaignStatus(fbAd.id, accessToken, 'ACTIVE');

  // 8. Update local campaign
  await env.DB.prepare(`
    UPDATE campaigns SET meta_campaign_id = ?, meta_adset_id = ?, meta_ad_id = ?, status = 'active', updated_at = datetime('now')
    WHERE id = ?
  `).bind(fbCampaign.id, fbAdSet.id, fbAd.id, campaignId).run();
}

export async function pauseResumeCampaignSync(
  campaignId: string, userId: string, metaCampaignId: string, action: 'pause' | 'resume', env: Env
): Promise<void> {
  const metaConn = await env.DB.prepare(
    'SELECT access_token FROM meta_connections WHERE user_id = ? AND is_active = 1'
  ).bind(userId).first();
  if (!metaConn) throw new Error('Facebook not connected');

  const accessToken = await decryptToken(metaConn.access_token as string, env.TOKEN_ENCRYPTION_KEY);
  const fb = new FacebookClient(env.META_APP_ID, env.META_APP_SECRET, env.GRAPH_API_VERSION);

  const fbStatus = action === 'resume' ? 'ACTIVE' : 'PAUSED';
  await fb.updateCampaignStatus(metaCampaignId, accessToken, fbStatus);

  const localStatus = action === 'resume' ? 'active' : 'paused';
  await updateStatus(env, campaignId, localStatus);
}

async function updateStatus(env: Env, campaignId: string, status: string): Promise<void> {
  await env.DB.prepare(
    "UPDATE campaigns SET status = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(status, campaignId).run();
}
