import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { authMiddleware } from '../middleware/auth';
import { encryptToken, decryptToken, generateId } from '../utils/crypto';
import { FacebookClient } from '../services/facebook';

const meta = new Hono<AppEnv>();

// Auth for all routes except /callback (browser redirect from Facebook)
meta.use('*', async (c, next) => {
  if (c.req.path.endsWith('/callback')) {
    return next();
  }
  return authMiddleware(c, next);
});

// GET /meta/oauth-url - Generate Facebook OAuth URL
meta.get('/oauth-url', async (c) => {
  const userId = c.get('userId') as string;
  const redirectUri = `${new URL(c.req.url).origin}/meta/callback`;

  // Accept optional app redirect URL from frontend (for Expo Go vs production builds)
  const appRedirectUrl = c.req.query('appRedirectUrl') || 'biz499://auth/callback';

  const state = btoa(JSON.stringify({ userId, ts: Date.now() }));

  // Cache state + app redirect URL for use after OAuth (5 min TTL)
  await c.env.CACHE.put(`oauth_state:${state}`, JSON.stringify({ userId, appRedirectUrl }), { expirationTtl: 300 });

  const permissions = [
    'public_profile',
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_ads',
    'ads_management',
    'ads_read',
    'business_management',
    'leads_retrieval',
  ].join(',');

  const oauthUrl = `https://www.facebook.com/${c.env.GRAPH_API_VERSION}/dialog/oauth?` +
    `client_id=${c.env.META_APP_ID}` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&scope=${permissions}` +
    `&state=${encodeURIComponent(state)}` +
    `&response_type=code`;

  return c.json({ url: oauthUrl, state });
});

// GET /meta/callback - Facebook OAuth callback (browser redirect)
// This endpoint does NOT use authMiddleware (handled separately)
meta.get('/callback', async (c) => {
  const code = c.req.query('code');
  const state = c.req.query('state');
  const error = c.req.query('error');

  // Retrieve stored state data (userId + app redirect URL)
  let storedUserId = '';
  let appRedirectUrl = 'biz499://auth/callback';

  if (state) {
    const storedData = await c.env.CACHE.get(`oauth_state:${state}`);
    if (storedData) {
      try {
        const parsed = JSON.parse(storedData);
        storedUserId = parsed.userId || storedData;
        appRedirectUrl = parsed.appRedirectUrl || appRedirectUrl;
      } catch {
        // Legacy format: stored data is just the userId string
        storedUserId = storedData;
      }
    }
  }

  // Helper to build redirect URL with params
  const redirectToApp = (params: string) => {
    const separator = appRedirectUrl.includes('?') ? '&' : '?';
    return c.redirect(`${appRedirectUrl}${separator}${params}`);
  };

  if (error) {
    return redirectToApp(`error=${encodeURIComponent(error)}`);
  }

  if (!code || !state) {
    return redirectToApp('error=missing_params');
  }

  if (!storedUserId) {
    return redirectToApp('error=invalid_state');
  }

  // Clean up state
  await c.env.CACHE.delete(`oauth_state:${state}`);

  try {
    const fb = new FacebookClient(c.env.META_APP_ID, c.env.META_APP_SECRET, c.env.GRAPH_API_VERSION);
    const redirectUri = `${new URL(c.req.url).origin}/meta/callback`;

    // Exchange code for token
    const tokenData = await fb.exchangeCodeForToken(code, redirectUri);

    // Get long-lived token
    const longLivedToken = await fb.getLongLivedToken(tokenData.access_token);

    // Get profile
    const profile = await fb.getProfile(longLivedToken.access_token);

    // Encrypt access token before storing
    const encryptedToken = await encryptToken(longLivedToken.access_token, c.env.TOKEN_ENCRYPTION_KEY);

    const connectionId = generateId();
    const expiresIn = longLivedToken.expires_in || 5184000; // default 60 days if missing
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
    const scopes = 'public_profile,pages_show_list,pages_read_engagement,pages_manage_ads,ads_management,ads_read,business_management,leads_retrieval';

    // Upsert meta connection
    await c.env.DB.prepare(`
      INSERT INTO meta_connections (id, user_id, meta_user_id, meta_name, meta_email, access_token, token_expires_at, granted_scopes, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
      ON CONFLICT(user_id) DO UPDATE SET
        meta_user_id = excluded.meta_user_id,
        meta_name = excluded.meta_name,
        meta_email = excluded.meta_email,
        access_token = excluded.access_token,
        token_expires_at = excluded.token_expires_at,
        granted_scopes = excluded.granted_scopes,
        is_active = 1,
        updated_at = datetime('now')
    `).bind(connectionId, storedUserId, profile.id, profile.name, profile.email || null, encryptedToken, expiresAt, scopes).run();

    // Get the actual connection id (might be existing on upsert)
    const conn = await c.env.DB.prepare(
      'SELECT id FROM meta_connections WHERE user_id = ?'
    ).bind(storedUserId).first();

    // Fetch and store pages
    const pages = await fb.getPages(longLivedToken.access_token);
    const activePageIds = pages.map((p: any) => p.id);

    // Deactivate pages no longer returned by Facebook (deleted or access removed)
    if (activePageIds.length > 0) {
      await c.env.DB.prepare(
        `UPDATE meta_pages SET is_active = 0 WHERE meta_connection_id = ? AND page_id NOT IN (${activePageIds.map(() => '?').join(',')})`
      ).bind(conn!.id as string, ...activePageIds).run();
    } else {
      await c.env.DB.prepare(
        'UPDATE meta_pages SET is_active = 0 WHERE meta_connection_id = ?'
      ).bind(conn!.id as string).run();
    }

    for (const page of pages) {
      const encryptedPageToken = await encryptToken(page.access_token, c.env.TOKEN_ENCRYPTION_KEY);
      const ig = await fb.getInstagramAccount(page.id, page.access_token);

      await c.env.DB.prepare(`
        INSERT INTO meta_pages (id, meta_connection_id, page_id, page_name, page_category, page_access_token, page_picture_url, instagram_business_account_id, instagram_username, is_active, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
        ON CONFLICT(meta_connection_id, page_id) DO UPDATE SET
          page_name = excluded.page_name,
          page_category = excluded.page_category,
          page_access_token = excluded.page_access_token,
          page_picture_url = excluded.page_picture_url,
          instagram_business_account_id = excluded.instagram_business_account_id,
          instagram_username = excluded.instagram_username,
          is_active = 1,
          updated_at = datetime('now')
      `).bind(
        generateId(), conn!.id as string, page.id, page.name, page.category || null,
        encryptedPageToken, page.picture?.data?.url || null,
        ig?.id || null, ig?.username || null
      ).run();
    }

    // Fetch and store ad accounts
    const adAccounts = await fb.getAdAccounts(longLivedToken.access_token);
    for (const acc of adAccounts) {
      await c.env.DB.prepare(`
        INSERT INTO meta_ad_accounts (id, meta_connection_id, ad_account_id, ad_account_name, account_status, currency, business_name, business_id, is_active, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'))
        ON CONFLICT(meta_connection_id, ad_account_id) DO UPDATE SET
          ad_account_name = excluded.ad_account_name,
          account_status = excluded.account_status,
          currency = excluded.currency
      `).bind(
        generateId(), conn!.id as string, acc.id, acc.name || null,
        acc.account_status, acc.currency || 'INR',
        acc.business?.name || null, acc.business?.id || null
      ).run();
    }

    // Redirect to app with success
    return redirectToApp('status=success');
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('Facebook OAuth error:', message);
    return redirectToApp(`error=${encodeURIComponent(message)}`);
  }
});

// GET /meta/status - Check connection status
meta.get('/status', async (c) => {
  const userId = c.get('userId') as string;

  const conn = await c.env.DB.prepare(
    'SELECT id, meta_name, meta_email, is_active, token_expires_at FROM meta_connections WHERE user_id = ? AND is_active = 1'
  ).bind(userId).first();

  if (!conn) {
    return c.json({ connected: false });
  }

  const tokenExpired = conn.token_expires_at
    ? new Date(conn.token_expires_at as string) < new Date()
    : false;

  return c.json({
    connected: true,
    tokenExpired,
    profile: { name: conn.meta_name, email: conn.meta_email },
  });
});

// GET /meta/pages - List connected pages
meta.get('/pages', async (c) => {
  const userId = c.get('userId') as string;

  const conn = await c.env.DB.prepare(
    'SELECT id FROM meta_connections WHERE user_id = ? AND is_active = 1'
  ).bind(userId).first();

  if (!conn) {
    return c.json({ error: 'Facebook not connected' }, 400);
  }

  const { results } = await c.env.DB.prepare(
    'SELECT id, page_id, page_name, page_category, page_picture_url, instagram_business_account_id, instagram_username FROM meta_pages WHERE meta_connection_id = ? AND is_active = 1'
  ).bind(conn.id as string).all();

  return c.json({ pages: results });
});

// GET /meta/ad-accounts - List ad accounts from Facebook
meta.get('/ad-accounts', async (c) => {
  const userId = c.get('userId') as string;

  const conn = await c.env.DB.prepare(
    'SELECT id FROM meta_connections WHERE user_id = ? AND is_active = 1'
  ).bind(userId).first();

  if (!conn) {
    return c.json({ error: 'Facebook not connected' }, 400);
  }

  const { results } = await c.env.DB.prepare(
    'SELECT id, ad_account_id, ad_account_name, account_status, currency, business_name FROM meta_ad_accounts WHERE meta_connection_id = ? AND is_active = 1'
  ).bind(conn.id as string).all();

  return c.json({ adAccounts: results });
});

// GET /meta/fb-campaigns - Fetch all campaigns from Facebook (historical + active)
meta.get('/fb-campaigns', async (c) => {
  const userId = c.get('userId') as string;
  const filterPageId = c.req.query('pageId') || null;

  const conn = await c.env.DB.prepare(
    'SELECT id, access_token FROM meta_connections WHERE user_id = ? AND is_active = 1'
  ).bind(userId).first();

  if (!conn) {
    return c.json({ error: 'Facebook not connected' }, 400);
  }

  const accessToken = await decryptToken(conn.access_token as string, c.env.TOKEN_ENCRYPTION_KEY);
  const fb = new FacebookClient(c.env.META_APP_ID, c.env.META_APP_SECRET, c.env.GRAPH_API_VERSION);

  // Get all ad accounts
  const { results: adAccounts } = await c.env.DB.prepare(
    'SELECT ad_account_id, ad_account_name FROM meta_ad_accounts WHERE meta_connection_id = ? AND is_active = 1'
  ).bind(conn.id as string).all();

  // Build pageId → pageName map for labelling campaigns
  const { results: allPages } = await c.env.DB.prepare(
    'SELECT page_id, page_name FROM meta_pages WHERE meta_connection_id = ? AND is_active = 1'
  ).bind(conn.id as string).all();
  const pageNameMap = new Map<string, string>(allPages.map((p: any) => [String(p.page_id), p.page_name as string]));

  if (adAccounts.length === 0) {
    return c.json({ campaigns: [], insights: null });
  }

  const allCampaigns: any[] = [];
  let accountInsights: any = null;

  for (const account of adAccounts) {
    const adAccountId = account.ad_account_id as string;

    try {
      // Fetch campaigns from Facebook
      let campaigns = await fb.getAdAccountCampaigns(adAccountId, accessToken);

      // Filter campaigns by page using embedded adsets.promoted_object (no extra API call needed)
      // Also tag each campaign with the page it belongs to
      campaigns = campaigns
        .filter((campaign: any) => {
          if (!filterPageId) return true;
          const adsets: any[] = campaign.adsets?.data || [];
          if (adsets.length === 0) return true;
          return adsets.some((as: any) => String(as.promoted_object?.page_id) === String(filterPageId));
        })
        .map((campaign: any) => {
          const adsets: any[] = campaign.adsets?.data || [];
          const matchedPageId = adsets.map((as: any) => String(as.promoted_object?.page_id)).find((pid) => pageNameMap.has(pid)) || filterPageId || null;
          return {
            ...campaign,
            pageId: matchedPageId,
            pageName: matchedPageId ? pageNameMap.get(matchedPageId) || null : null,
          };
        });

      // Fetch insights for each campaign (all-time)
      const campaignsWithInsights = await Promise.all(
        campaigns.map(async (campaign: any) => {
          try {
            const insights = await fb.getCampaignInsights(campaign.id, accessToken, {
              datePreset: 'maximum',
            });
            // Extract all useful metrics from the actions array
            const actions: any[] = Array.isArray(insights?.actions) ? insights.actions : [];
            const costPerAction: any[] = Array.isArray(insights?.cost_per_action_type) ? insights.cost_per_action_type : [];

            // sum across all matching action types (Facebook splits lead counts across subtypes)
            const sumAction = (types: string[]) => {
              const total = actions
                .filter((a: any) => types.includes(a.action_type))
                .reduce((acc: number, a: any) => acc + parseFloat(a.value || '0'), 0);
              return total > 0 ? String(Math.round(total)) : '0';
            };
            const findAction = (types: string[]) =>
              actions.find((a: any) => types.includes(a.action_type))?.value || '0';
            const findCost = (types: string[]) =>
              costPerAction.find((a: any) => types.includes(a.action_type))?.value || '0';

            const LEAD_TYPES = ['lead', 'onsite_conversion.lead_grouped', 'leadgen_grouped', 'contact_lead'];
            const parsedActions = {
              leads: sumAction(LEAD_TYPES),
              messages: sumAction(['onsite_conversion.messaging_conversation_started_7d', 'messaging_conversation_started_7d']),
              purchases: findAction(['purchase', 'omni_purchase']),
              addToCart: findAction(['add_to_cart', 'omni_add_to_cart']),
              registrations: findAction(['complete_registration', 'omni_complete_registration']),
              linkClicks: findAction(['link_click']),
              pageEngagement: findAction(['page_engagement']),
              postEngagement: findAction(['post_engagement']),
              postReactions: findAction(['post_reaction']),
              comments: findAction(['comment']),
              shares: findAction(['post', 'share']),
              videoViews: findAction(['video_view']),
              costPerLead: findCost(['lead']),
              costPerMessage: findCost(['onsite_conversion.messaging_conversation_started_7d', 'messaging_conversation_started_7d']),
              costPerPurchase: findCost(['purchase', 'omni_purchase']),
              costPerRegistration: findCost(['complete_registration', 'omni_complete_registration']),
              costPerLinkClick: findCost(['link_click']),
            };

            return {
              ...campaign,
              adAccountId,
              adAccountName: account.ad_account_name,
              insights: {
                ...(insights || { impressions: '0', clicks: '0', spend: '0', reach: '0' }),
                ...parsedActions,
              },
              source: 'facebook',
            };
          } catch {
            return {
              ...campaign,
              adAccountId,
              adAccountName: account.ad_account_name,
              insights: { impressions: '0', clicks: '0', spend: '0', reach: '0' },
              source: 'facebook',
            };
          }
        })
      );

      allCampaigns.push(...campaignsWithInsights);

      // Get account-level insights (aggregate, all-time)
      try {
        const accInsights = await fb.getAdAccountInsights(adAccountId, accessToken, {
          datePreset: 'maximum',
        });
        if (accInsights) {
          // Parse account-level actions too
          const accActions: any[] = Array.isArray(accInsights.actions) ? accInsights.actions : [];
          const accCosts: any[] = Array.isArray(accInsights.cost_per_action_type) ? accInsights.cost_per_action_type : [];
          const sumAccAction = (types: string[]) => {
            const total = accActions
              .filter((a: any) => types.includes(a.action_type))
              .reduce((acc: number, a: any) => acc + parseFloat(a.value || '0'), 0);
            return total > 0 ? String(Math.round(total)) : '0';
          };
          const findAccAction = (types: string[]) =>
            accActions.find((a: any) => types.includes(a.action_type))?.value || '0';
          const findAccCost = (types: string[]) =>
            accCosts.find((a: any) => types.includes(a.action_type))?.value || '0';

          accountInsights = {
            ...accInsights,
            leads: sumAccAction(['lead', 'onsite_conversion.lead_grouped', 'leadgen_grouped', 'contact_lead']),
            messages: sumAccAction(['onsite_conversion.messaging_conversation_started_7d', 'messaging_conversation_started_7d']),
            purchases: findAccAction(['purchase', 'omni_purchase']),
            linkClicks: findAccAction(['link_click']),
            postEngagement: findAccAction(['post_engagement']),
            videoViews: findAccAction(['video_view']),
            costPerLead: findAccCost(['lead']),
            costPerPurchase: findAccCost(['purchase', 'omni_purchase']),
          };
        }
      } catch {}
    } catch (err) {
      console.error('Error fetching campaigns for account %s:', adAccountId, err);
    }
  }

  // Sort by created_time descending (most recent first)
  allCampaigns.sort((a, b) => {
    const dateA = new Date(a.created_time || 0).getTime();
    const dateB = new Date(b.created_time || 0).getTime();
    return dateB - dateA;
  });

  return c.json({
    campaigns: allCampaigns,
    insights: accountInsights,
    adAccountsCount: adAccounts.length,
  });
});

// Helper to recursively extract all lead_gen_form_id values from an object
function extractFormIds(obj: any, found = new Set<string>()): Set<string> {
  if (!obj || typeof obj !== 'object') return found;
  for (const [key, val] of Object.entries(obj)) {
    if (key === 'lead_gen_form_id' && typeof val === 'string') {
      found.add(val);
    } else if (typeof val === 'object') {
      extractFormIds(val, found);
    }
  }
  return found;
}

// GET /meta/leads - Fetch leads from all lead forms across pages
meta.get('/leads', async (c) => {
  const userId = c.get('userId') as string;
  const campaignId = c.req.query('campaignId') || null;
  const filterPageId = c.req.query('pageId') || null;
  const cacheKey = `leads:${userId}`;

  const conn = await c.env.DB.prepare(
    'SELECT id, access_token FROM meta_connections WHERE user_id = ? AND is_active = 1'
  ).bind(userId).first();

  if (!conn) {
    return c.json({ error: 'Facebook not connected' }, 400);
  }

  const fb = new FacebookClient(c.env.META_APP_ID, c.env.META_APP_SECRET, c.env.GRAPH_API_VERSION);

  // Get pages — if pageId filter provided, fetch only that page; otherwise all pages
  const { results: pages } = await c.env.DB.prepare(
    filterPageId
      ? 'SELECT page_id, page_name, page_access_token FROM meta_pages WHERE meta_connection_id = ? AND page_id = ? AND is_active = 1'
      : 'SELECT page_id, page_name, page_access_token FROM meta_pages WHERE meta_connection_id = ? AND is_active = 1'
  ).bind(...(filterPageId ? [conn.id, filterPageId] : [conn.id])).all();

  const allLeads: any[] = [];
  const allForms: any[] = [];
  let fetchError = false;

  for (const page of pages) {
    const pageToken = await decryptToken(page.page_access_token as string, c.env.TOKEN_ENCRYPTION_KEY);

    try {
      const forms = await fb.getLeadForms(page.page_id as string, pageToken);

      for (const form of forms) {
        allForms.push({
          ...form,
          pageName: page.page_name,
          pageId: page.page_id,
        });

        try {
          const leads = await fb.getFormLeads(form.id, pageToken);
          for (const lead of leads) {
            const fields: Record<string, string> = {};
            for (const field of (lead.field_data || [])) {
              fields[field.name] = Array.isArray(field.values) ? field.values[0] : field.values;
            }
            allLeads.push({
              id: lead.id,
              formId: form.id,
              formName: form.name,
              pageName: page.page_name,
              pageId: page.page_id,
              createdAt: lead.created_time,
              name: fields.full_name || fields.first_name || fields.name || '',
              email: fields.email || '',
              phone: fields.phone_number || fields.phone || '',
              city: fields.city || '',
              ...fields,
            });
          }
        } catch (err: any) {
          fetchError = true;
          console.error(`[leads] getFormLeads error form=${form.id} page=${page.page_id}:`, err?.message);
        }
      }
    } catch (err: any) {
      fetchError = true;
      console.error(`[leads] getLeadForms error page=${page.page_id}:`, err?.message);
    }
  }

  // Sort leads by most recent first
  allLeads.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // If we got fresh leads from FB, update the KV cache (7-day TTL)
  if (allLeads.length > 0) {
    c.executionCtx.waitUntil(
      c.env.CACHE.put(cacheKey, JSON.stringify({ leads: allLeads, forms: allForms, cachedAt: new Date().toISOString() }), { expirationTtl: 7 * 24 * 3600 })
    );

    // If campaignId provided, filter leads to only those from this campaign's forms
    if (campaignId) {
      const accessToken = await decryptToken(conn.access_token as string, c.env.TOKEN_ENCRYPTION_KEY);
      const campaignFormIds = new Set<string>();
      try {
        const campaignAds = await fb.getCampaignAds(campaignId, accessToken);
        for (const ad of campaignAds) {
          extractFormIds(ad.creative?.object_story_spec, campaignFormIds);
        }
      } catch (err: any) {
        console.error(`[leads] getCampaignAds error campaignId=${campaignId}:`, err?.message);
      }
      const filtered = campaignFormIds.size > 0
        ? allLeads.filter(l => campaignFormIds.has(l.formId))
        : allLeads; // fallback: return all if we couldn't resolve form IDs
      return c.json({ leads: filtered, forms: allForms, totalLeads: filtered.length, fromCache: false });
    }

    return c.json({ leads: allLeads, forms: allForms, totalLeads: allLeads.length, fromCache: false });
  }

  // FB returned nothing — try serving from KV cache so leads never disappear
  const cached = await c.env.CACHE.get(cacheKey);
  if (cached) {
    const { leads, forms, cachedAt } = JSON.parse(cached);
    console.warn(`[leads] serving ${leads.length} cached leads for user=${userId} (cachedAt=${cachedAt})`);

    // Apply campaign filter on cached leads too
    if (campaignId) {
      const accessToken = await decryptToken(conn.access_token as string, c.env.TOKEN_ENCRYPTION_KEY);
      const campaignFormIds = new Set<string>();
      try {
        const campaignAds = await fb.getCampaignAds(campaignId, accessToken);
        for (const ad of campaignAds) {
          extractFormIds(ad.creative?.object_story_spec, campaignFormIds);
        }
      } catch (err: any) {
        console.error(`[leads] getCampaignAds (cache) error campaignId=${campaignId}:`, err?.message);
      }
      const filtered = campaignFormIds.size > 0
        ? leads.filter((l: any) => campaignFormIds.has(l.formId))
        : leads;
      return c.json({ leads: filtered, forms, totalLeads: filtered.length, fromCache: true, cachedAt });
    }

    const pageFiltered = filterPageId ? leads.filter((l: any) => String(l.pageId) === String(filterPageId)) : leads;
    return c.json({ leads: pageFiltered, forms, totalLeads: pageFiltered.length, fromCache: true, cachedAt });
  }

  // No cache either — return empty with error flag so app can show reconnect prompt
  return c.json({ leads: [], forms: [], totalLeads: 0, fromCache: false, fetchError });
});

// GET /meta/messages - Fetch recent Messenger conversations from pages
meta.get('/messages', async (c) => {
  const userId = c.get('userId') as string;

  const conn = await c.env.DB.prepare(
    'SELECT id FROM meta_connections WHERE user_id = ? AND is_active = 1'
  ).bind(userId).first();

  if (!conn) {
    return c.json({ error: 'Facebook not connected' }, 400);
  }

  const fb = new FacebookClient(c.env.META_APP_ID, c.env.META_APP_SECRET, c.env.GRAPH_API_VERSION);

  const { results: pages } = await c.env.DB.prepare(
    'SELECT page_id, page_name, page_access_token FROM meta_pages WHERE meta_connection_id = ? AND is_active = 1'
  ).bind(conn.id as string).all();

  const allMessages: any[] = [];

  for (const page of pages) {
    const pageToken = await decryptToken(page.page_access_token as string, c.env.TOKEN_ENCRYPTION_KEY);

    try {
      const conversations = await fb.getPageConversations(page.page_id as string, pageToken);

      for (const conv of conversations) {
        const participants = conv.participants?.data || [];
        // Find the customer (not the page itself)
        const customer = participants.find((p: any) => p.id !== page.page_id) || participants[0];
        const lastMessage = conv.messages?.data?.[0];

        allMessages.push({
          id: conv.id,
          pageName: page.page_name,
          pageId: page.page_id,
          customerName: customer?.name || 'Unknown',
          customerId: customer?.id || '',
          lastMessage: lastMessage?.message || '',
          lastMessageFrom: lastMessage?.from?.name || '',
          lastMessageTime: lastMessage?.created_time || conv.updated_time,
          messageCount: conv.message_count || 0,
          updatedAt: conv.updated_time,
        });
      }
    } catch {}
  }

  allMessages.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

  return c.json({
    messages: allMessages,
    totalMessages: allMessages.length,
  });
});

// POST /meta/disconnect - Disconnect Facebook
meta.post('/disconnect', async (c) => {
  const userId = c.get('userId') as string;

  await c.env.DB.prepare(
    'UPDATE meta_connections SET is_active = 0, updated_at = datetime("now") WHERE user_id = ?'
  ).bind(userId).run();

  return c.json({ success: true });
});

// DELETE /meta/pages/:pageId - Remove a specific connected page
meta.delete('/pages/:pageId', async (c) => {
  const userId = c.get('userId') as string;
  const pageId = c.req.param('pageId');

  const conn = await c.env.DB.prepare(
    'SELECT id FROM meta_connections WHERE user_id = ? AND is_active = 1'
  ).bind(userId).first();

  if (!conn) return c.json({ error: 'Facebook not connected' }, 400);

  await c.env.DB.prepare(
    'UPDATE meta_pages SET is_active = 0, updated_at = datetime("now") WHERE meta_connection_id = ? AND page_id = ?'
  ).bind(conn.id, pageId).run();

  return c.json({ success: true });
});

// POST /meta/sync-pages - Re-fetch pages from Facebook
meta.post('/sync-pages', async (c) => {
  const userId = c.get('userId') as string;

  const conn = await c.env.DB.prepare(
    'SELECT id, access_token FROM meta_connections WHERE user_id = ? AND is_active = 1'
  ).bind(userId).first();

  if (!conn) {
    return c.json({ error: 'Facebook not connected' }, 400);
  }

  const accessToken = await decryptToken(conn.access_token as string, c.env.TOKEN_ENCRYPTION_KEY);
  const fb = new FacebookClient(c.env.META_APP_ID, c.env.META_APP_SECRET, c.env.GRAPH_API_VERSION);
  const pages = await fb.getPages(accessToken);
  const activePageIds = pages.map((p: any) => p.id);

  // Deactivate pages no longer returned by Facebook (deleted or access removed)
  if (activePageIds.length > 0) {
    await c.env.DB.prepare(
      `UPDATE meta_pages SET is_active = 0 WHERE meta_connection_id = ? AND page_id NOT IN (${activePageIds.map(() => '?').join(',')})`
    ).bind(conn.id as string, ...activePageIds).run();
  } else {
    await c.env.DB.prepare(
      'UPDATE meta_pages SET is_active = 0 WHERE meta_connection_id = ?'
    ).bind(conn.id as string).run();
  }

  for (const page of pages) {
    const encryptedPageToken = await encryptToken(page.access_token, c.env.TOKEN_ENCRYPTION_KEY);
    const ig = await fb.getInstagramAccount(page.id, page.access_token);

    await c.env.DB.prepare(`
      INSERT INTO meta_pages (id, meta_connection_id, page_id, page_name, page_category, page_access_token, page_picture_url, instagram_business_account_id, instagram_username, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, datetime('now'), datetime('now'))
      ON CONFLICT(meta_connection_id, page_id) DO UPDATE SET
        page_name = excluded.page_name,
        page_access_token = excluded.page_access_token,
        page_picture_url = excluded.page_picture_url,
        instagram_business_account_id = excluded.instagram_business_account_id,
        instagram_username = excluded.instagram_username,
        is_active = 1,
        updated_at = datetime('now')
    `).bind(
      generateId(), conn.id as string, page.id, page.name, page.category || null,
      encryptedPageToken, page.picture?.data?.url || null,
      ig?.id || null, ig?.username || null
    ).run();
  }

  const { results } = await c.env.DB.prepare(
    'SELECT id, page_id, page_name, page_category, page_picture_url, instagram_business_account_id, instagram_username FROM meta_pages WHERE meta_connection_id = ? AND is_active = 1'
  ).bind(conn.id as string).all();

  return c.json({ pages: results });
});

export default meta;
