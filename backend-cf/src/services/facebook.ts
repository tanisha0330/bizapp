// Facebook Graph API client for Cloudflare Workers

export interface FacebookTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface FacebookProfile {
  id: string;
  name: string;
  email?: string;
  picture?: { data: { url: string } };
}

export interface FacebookPage {
  id: string;
  name: string;
  category: string;
  access_token: string;
  tasks: string[];
  picture?: { data: { url: string } };
}

export interface FacebookAdAccount {
  id: string;
  name: string;
  account_status: number;
  currency: string;
  business?: { id: string; name: string };
}

const GRAPH_BASE = 'https://graph.facebook.com';

export class FacebookClient {
  private version: string;
  private appId: string;
  private appSecret: string;

  constructor(appId: string, appSecret: string, version = 'v19.0') {
    this.appId = appId;
    this.appSecret = appSecret;
    this.version = version;
  }

  private url(path: string): string {
    return `${GRAPH_BASE}/${this.version}${path}`;
  }

  // Exchange authorization code for short-lived token
  async exchangeCodeForToken(code: string, redirectUri: string): Promise<FacebookTokenResponse> {
    const params = new URLSearchParams({
      client_id: this.appId,
      client_secret: this.appSecret,
      redirect_uri: redirectUri,
      code,
    });
    const res = await fetch(this.url(`/oauth/access_token?${params}`));
    if (!res.ok) {
      const err = await res.json() as { error?: { message?: string } };
      throw new Error(err.error?.message || 'Token exchange failed');
    }
    return res.json() as Promise<FacebookTokenResponse>;
  }

  // Exchange short-lived token for long-lived token (60 days)
  async getLongLivedToken(shortToken: string): Promise<FacebookTokenResponse> {
    const params = new URLSearchParams({
      grant_type: 'fb_exchange_token',
      client_id: this.appId,
      client_secret: this.appSecret,
      fb_exchange_token: shortToken,
    });
    const res = await fetch(this.url(`/oauth/access_token?${params}`));
    if (!res.ok) {
      const err = await res.json() as { error?: { message?: string } };
      throw new Error(err.error?.message || 'Long-lived token exchange failed');
    }
    return res.json() as Promise<FacebookTokenResponse>;
  }

  // Get user profile
  async getProfile(accessToken: string): Promise<FacebookProfile> {
    const res = await fetch(this.url(`/me?fields=id,name,email,picture&access_token=${accessToken}`));
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json() as Promise<FacebookProfile>;
  }

  // Get user's pages
  async getPages(accessToken: string): Promise<FacebookPage[]> {
    const res = await fetch(
      this.url(`/me/accounts?fields=id,name,category,access_token,tasks,picture&access_token=${accessToken}`)
    );
    if (!res.ok) throw new Error('Failed to fetch pages');
    const data = await res.json() as { data: FacebookPage[] };
    return data.data;
  }

  // Get user's ad accounts (personal + business manager shared)
  async getAdAccounts(accessToken: string): Promise<FacebookAdAccount[]> {
    const allAccounts = new Map<string, FacebookAdAccount>();

    // 1. Personal ad accounts (/me/adaccounts)
    try {
      const res = await fetch(
        this.url(`/me/adaccounts?fields=id,name,account_status,currency,business&access_token=${accessToken}`)
      );
      if (res.ok) {
        const data = await res.json() as { data: FacebookAdAccount[] };
        for (const acc of data.data || []) {
          allAccounts.set(acc.id, acc);
        }
      }
    } catch {}

    // 2. Business Manager ad accounts (fetch businesses, then their ad accounts)
    try {
      const bizRes = await fetch(
        this.url(`/me/businesses?fields=id,name&access_token=${accessToken}`)
      );
      if (bizRes.ok) {
        const bizData = await bizRes.json() as { data: Array<{ id: string; name: string }> };
        for (const biz of bizData.data || []) {
          try {
            const accRes = await fetch(
              this.url(`/${biz.id}/owned_ad_accounts?fields=id,name,account_status,currency,business&access_token=${accessToken}`)
            );
            if (accRes.ok) {
              const accData = await accRes.json() as { data: FacebookAdAccount[] };
              for (const acc of accData.data || []) {
                allAccounts.set(acc.id, acc);
              }
            }
          } catch {}
          // Also try client ad accounts (shared with the business)
          try {
            const clientRes = await fetch(
              this.url(`/${biz.id}/client_ad_accounts?fields=id,name,account_status,currency,business&access_token=${accessToken}`)
            );
            if (clientRes.ok) {
              const clientData = await clientRes.json() as { data: FacebookAdAccount[] };
              for (const acc of clientData.data || []) {
                allAccounts.set(acc.id, acc);
              }
            }
          } catch {}
        }
      }
    } catch {}

    return Array.from(allAccounts.values());
  }

  // Get Instagram business account for a page
  async getInstagramAccount(pageId: string, pageAccessToken: string) {
    const res = await fetch(
      this.url(`/${pageId}?fields=instagram_business_account{id,username,profile_picture_url}&access_token=${pageAccessToken}`)
    );
    if (!res.ok) return null;
    const data = await res.json() as {
      instagram_business_account?: { id: string; username: string; profile_picture_url: string };
    };
    return data.instagram_business_account || null;
  }

  // Create a campaign
  async createCampaign(adAccountId: string, accessToken: string, params: {
    name: string;
    objective: string;
    status: string;
    special_ad_categories: string[];
  }) {
    const res = await fetch(this.url(`/${adAccountId}/campaigns`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, access_token: accessToken }),
    });
    if (!res.ok) {
      const err = await res.json() as { error?: { message?: string } };
      throw new Error(err.error?.message || 'Campaign creation failed');
    }
    return res.json() as Promise<{ id: string }>;
  }

  // Create an ad set
  async createAdSet(adAccountId: string, accessToken: string, params: {
    name: string;
    campaign_id: string;
    daily_budget: number;
    billing_event: string;
    optimization_goal: string;
    targeting: Record<string, unknown>;
    start_time: string;
    end_time?: string;
    status: string;
  }) {
    const res = await fetch(this.url(`/${adAccountId}/adsets`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, access_token: accessToken }),
    });
    if (!res.ok) {
      const err = await res.json() as { error?: { message?: string } };
      throw new Error(err.error?.message || 'Ad set creation failed');
    }
    return res.json() as Promise<{ id: string }>;
  }

  // Create an ad creative
  async createAdCreative(adAccountId: string, accessToken: string, params: {
    name: string;
    object_story_spec: Record<string, unknown>;
  }) {
    const res = await fetch(this.url(`/${adAccountId}/adcreatives`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, access_token: accessToken }),
    });
    if (!res.ok) {
      const err = await res.json() as { error?: { message?: string } };
      throw new Error(err.error?.message || 'Ad creative creation failed');
    }
    return res.json() as Promise<{ id: string }>;
  }

  // Create an ad
  async createAd(adAccountId: string, accessToken: string, params: {
    name: string;
    adset_id: string;
    creative: { creative_id: string };
    status: string;
  }) {
    const res = await fetch(this.url(`/${adAccountId}/ads`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...params, access_token: accessToken }),
    });
    if (!res.ok) {
      const err = await res.json() as { error?: { message?: string } };
      throw new Error(err.error?.message || 'Ad creation failed');
    }
    return res.json() as Promise<{ id: string }>;
  }

  // Upload image to ad account
  async uploadImage(adAccountId: string, accessToken: string, imageUrl: string) {
    const res = await fetch(this.url(`/${adAccountId}/adimages`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: imageUrl, access_token: accessToken }),
    });
    if (!res.ok) {
      const err = await res.json() as { error?: { message?: string } };
      throw new Error(err.error?.message || 'Image upload failed');
    }
    return res.json() as Promise<{ images: Record<string, { hash: string; url: string }> }>;
  }

  // Get all campaigns for an ad account (historical + active)
  async getAdAccountCampaigns(adAccountId: string, accessToken: string, limit = 50): Promise<any[]> {
    const fields = 'id,name,objective,status,daily_budget,lifetime_budget,start_time,stop_time,created_time,updated_time,adsets{promoted_object}';
    const res = await fetch(
      this.url(`/${adAccountId}/campaigns?fields=${fields}&limit=${limit}&access_token=${accessToken}`)
    );
    if (!res.ok) {
      const err = await res.json() as { error?: { message?: string } };
      throw new Error(err.error?.message || 'Failed to fetch campaigns');
    }
    const data = await res.json() as { data: any[] };
    return data.data || [];
  }

  // Get insights for an ad account (aggregated across all campaigns)
  async getAdAccountInsights(adAccountId: string, accessToken: string, options?: { since?: string; until?: string; datePreset?: string }): Promise<any> {
    let url = this.url(
      `/${adAccountId}/insights?fields=impressions,clicks,spend,reach,frequency,cpc,cpm,ctr,actions,cost_per_action_type,inline_link_clicks&access_token=${accessToken}`
    );
    if (options?.datePreset) {
      url += `&date_preset=${options.datePreset}`;
    } else if (options?.since && options?.until) {
      url += `&time_range={"since":"${options.since}","until":"${options.until}"}`;
    }
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as { data: any[] };
    return data.data?.[0] || null;
  }

  // Get campaign insights
  async getCampaignInsights(campaignId: string, accessToken: string, options?: { since?: string; until?: string; datePreset?: string }) {
    let url = this.url(
      `/${campaignId}/insights?fields=impressions,clicks,spend,conversions,reach,frequency,cpc,cpm,ctr,actions,cost_per_action_type,website_ctr,inline_link_clicks,inline_link_click_ctr&access_token=${accessToken}`
    );
    if (options?.datePreset) {
      url += `&date_preset=${options.datePreset}`;
    } else if (options?.since && options?.until) {
      url += `&time_range={"since":"${options.since}","until":"${options.until}"}`;
    }
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json() as { data: Array<Record<string, string>> };
    return data.data?.[0] || null;
  }

  // Get lead forms for a page
  async getLeadForms(pageId: string, pageAccessToken: string): Promise<any[]> {
    const allForms: any[] = [];
    let url: string | null = this.url(
      `/${pageId}/leadgen_forms?fields=id,name,status,leads_count,created_time&limit=50&access_token=${pageAccessToken}`
    );
    // Follow pagination to get all forms (Facebook defaults to 25, pages can have many)
    while (url) {
      const res = await fetch(url);
      if (!res.ok) break;
      const data = await res.json() as { data: any[]; paging?: { next?: string } };
      allForms.push(...(data.data || []));
      url = data.paging?.next || null;
      if (allForms.length >= 200) break; // safety cap
    }
    return allForms;
  }

  // Get leads from a lead form
  async getFormLeads(formId: string, pageAccessToken: string, limit = 100): Promise<any[]> {
    // sort=created_time_desc ensures newest leads come first within the limit
    const res = await fetch(
      this.url(`/${formId}/leads?fields=id,created_time,field_data&limit=${limit}&sort=created_time_desc&access_token=${pageAccessToken}`)
    );
    if (!res.ok) return [];
    const data = await res.json() as { data: any[] };
    return data.data || [];
  }

  // Get ad-level data for a campaign (to find lead forms)
  async getCampaignAds(campaignId: string, accessToken: string): Promise<any[]> {
    const res = await fetch(
      this.url(`/${campaignId}/ads?fields=id,name,status,creative{id,name,object_story_spec}&access_token=${accessToken}`)
    );
    if (!res.ok) return [];
    const data = await res.json() as { data: any[] };
    return data.data || [];
  }

  // Get recent conversations for a page
  async getPageConversations(pageId: string, pageAccessToken: string, limit = 50): Promise<any[]> {
    const res = await fetch(
      this.url(`/${pageId}/conversations?fields=id,participants,updated_time,message_count,messages.limit(1){message,from,created_time}&limit=${limit}&access_token=${pageAccessToken}`)
    );
    if (!res.ok) return [];
    const data = await res.json() as { data: any[] };
    return data.data || [];
  }

  // Update campaign status
  async updateCampaignStatus(campaignId: string, accessToken: string, status: string) {
    const res = await fetch(this.url(`/${campaignId}`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, access_token: accessToken }),
    });
    if (!res.ok) {
      const err = await res.json() as { error?: { message?: string } };
      throw new Error(err.error?.message || 'Status update failed');
    }
    return res.json();
  }
}
