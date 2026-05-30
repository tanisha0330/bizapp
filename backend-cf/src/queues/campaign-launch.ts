import type { Env } from '../types';
import { FacebookClient } from '../services/facebook';
import { decryptToken } from '../utils/crypto';

interface LaunchPayload {
  campaignId: string;
  userId: string;
}

interface PauseResumePayload {
  campaignId: string;
  userId: string;
  metaCampaignId: string;
}

export async function handleCampaignQueue(
  batch: MessageBatch,
  env: Env
): Promise<void> {
  for (const message of batch.messages) {
    const { type, payload } = message.body as { type: string; payload: Record<string, string> };

    try {
      switch (type) {
        case 'launch_campaign':
          await launchCampaign(payload as unknown as LaunchPayload, env);
          break;
        case 'pause_campaign':
          await pauseResumeCampaign(payload as unknown as PauseResumePayload, env, 'PAUSED');
          break;
        case 'resume_campaign':
          await pauseResumeCampaign(payload as unknown as PauseResumePayload, env, 'ACTIVE');
          break;
        default:
          console.error(`Unknown campaign queue message type: ${type}`);
      }
      message.ack();
    } catch (err) {
      console.error('Campaign queue error [%s]:', type, err);
      message.retry();
    }
  }
}

async function launchCampaign(payload: LaunchPayload, env: Env): Promise<void> {
  const { campaignId, userId } = payload;

  // Fetch campaign details
  const campaign = await env.DB.prepare('SELECT * FROM campaigns WHERE id = ?').bind(campaignId).first();
  if (!campaign) throw new Error('Campaign not found');

  // Get user's Meta connection
  const metaConn = await env.DB.prepare(
    'SELECT access_token FROM meta_connections WHERE user_id = ? AND is_active = 1'
  ).bind(userId).first();
  if (!metaConn) {
    await updateCampaignStatus(env, campaignId, 'failed', 'Facebook not connected');
    return;
  }

  // Get the page and its access token
  const page = await env.DB.prepare(
    'SELECT page_id, page_access_token FROM meta_pages WHERE page_id = ? AND is_active = 1'
  ).bind(campaign.page_id).first();
  if (!page) {
    await updateCampaignStatus(env, campaignId, 'failed', 'Selected page not found');
    return;
  }

  // Get Facebook ad account linked to this ad account
  const adAccount = await env.DB.prepare('SELECT * FROM ad_accounts WHERE id = ?').bind(campaign.ad_account_id).first();
  if (!adAccount) {
    await updateCampaignStatus(env, campaignId, 'failed', 'Ad account not found');
    return;
  }

  // Get the Meta ad account ID (from meta_ad_accounts table)
  const metaAdAccount = await env.DB.prepare(`
    SELECT ad_account_id FROM meta_ad_accounts
    WHERE meta_connection_id = (SELECT id FROM meta_connections WHERE user_id = ? AND is_active = 1)
    AND is_active = 1 LIMIT 1
  `).bind(userId).first();

  if (!metaAdAccount) {
    await updateCampaignStatus(env, campaignId, 'failed', 'No Facebook ad account found');
    return;
  }

  const accessToken = await decryptToken(metaConn.access_token as string, env.TOKEN_ENCRYPTION_KEY);
  const pageAccessToken = await decryptToken(page.page_access_token as string, env.TOKEN_ENCRYPTION_KEY);
  const fbAdAccountId = metaAdAccount.ad_account_id as string;

  const fb = new FacebookClient(env.META_APP_ID, env.META_APP_SECRET, env.GRAPH_API_VERSION);

  try {
    // 1. Create Facebook Campaign
    const fbCampaign = await fb.createCampaign(fbAdAccountId, accessToken, {
      name: campaign.title as string,
      objective: campaign.objective as string,
      status: 'PAUSED', // Create as paused, activate after ad is ready
      special_ad_categories: [],
    });

    // 2. Build targeting
    const targeting = campaign.targeting ? JSON.parse(campaign.targeting as string) : {};
    const fbTargeting: Record<string, unknown> = {};

    if (targeting.locations?.length) {
      fbTargeting.geo_locations = {
        cities: targeting.locations.map((loc: string) => ({ key: loc })),
      };
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
      daily_budget: Math.round((campaign.daily_budget as number) * 100), // Convert to cents
      billing_event: 'IMPRESSIONS',
      optimization_goal: 'REACH',
      targeting: Object.keys(fbTargeting).length > 0 ? fbTargeting : { geo_locations: { countries: ['IN'] } },
      start_time: campaign.start_date as string,
      end_time: campaign.end_date as string | undefined,
      status: 'PAUSED',
    });

    // 4. Get creative file URL
    const creative = await env.DB.prepare(
      'SELECT r2_key, file_type FROM creatives WHERE id = ?'
    ).bind(campaign.creative_id).first();

    let imageHash: string | undefined;
    if (creative) {
      // Get the R2 object and create a temporary public URL or upload directly
      // For Facebook, we upload the image to their servers
      const r2Object = await env.CREATIVES_BUCKET.get(creative.r2_key as string);
      if (r2Object) {
        // Upload image to Facebook ad account
        // Note: For production, you'd use a public R2 URL or Workers route
        const imageResult = await fb.uploadImage(fbAdAccountId, accessToken,
          `https://${env.ENVIRONMENT === 'production' ? 'api.biz499.com' : 'biz499-api.workers.dev'}/creatives/${campaign.creative_id}/file`
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

    // 7. Activate campaign
    await fb.updateCampaignStatus(fbCampaign.id, accessToken, 'ACTIVE');
    await fb.updateCampaignStatus(fbAdSet.id, accessToken, 'ACTIVE');
    await fb.updateCampaignStatus(fbAd.id, accessToken, 'ACTIVE');

    // 8. Update local campaign with Facebook IDs
    await env.DB.prepare(`
      UPDATE campaigns SET
        meta_campaign_id = ?,
        meta_adset_id = ?,
        meta_ad_id = ?,
        status = 'active',
        updated_at = datetime('now')
      WHERE id = ?
    `).bind(fbCampaign.id, fbAdSet.id, fbAd.id, campaignId).run();

  } catch (err) {
    const message = err instanceof Error ? err.message : 'Launch failed';
    await updateCampaignStatus(env, campaignId, 'failed', message);
    throw err;
  }
}

async function pauseResumeCampaign(payload: PauseResumePayload, env: Env, fbStatus: string): Promise<void> {
  const { campaignId, userId, metaCampaignId } = payload;

  const metaConn = await env.DB.prepare(
    'SELECT access_token FROM meta_connections WHERE user_id = ? AND is_active = 1'
  ).bind(userId).first();
  if (!metaConn) throw new Error('Facebook not connected');

  const accessToken = await decryptToken(metaConn.access_token as string, env.TOKEN_ENCRYPTION_KEY);
  const fb = new FacebookClient(env.META_APP_ID, env.META_APP_SECRET, env.GRAPH_API_VERSION);

  await fb.updateCampaignStatus(metaCampaignId, accessToken, fbStatus);

  const localStatus = fbStatus === 'ACTIVE' ? 'active' : 'paused';
  await updateCampaignStatus(env, campaignId, localStatus);
}

async function updateCampaignStatus(env: Env, campaignId: string, status: string, errorMessage?: string): Promise<void> {
  await env.DB.prepare(
    "UPDATE campaigns SET status = ?, updated_at = datetime('now') WHERE id = ?"
  ).bind(status, campaignId).run();

  if (errorMessage) {
    // Log the error
    await env.DB.prepare(
      `INSERT INTO api_logs (id, endpoint, method, is_error, error_message, created_at)
       VALUES (?, 'campaign_launch', 'QUEUE', 1, ?, datetime('now'))`
    ).bind(crypto.randomUUID(), errorMessage).run();
  }
}
