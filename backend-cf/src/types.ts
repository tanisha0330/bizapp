export interface Variables {
  userId: string;
  phone: string;
}

export interface AppEnv {
  Bindings: Env;
  Variables: Variables;
}

export interface Env {
  DB: D1Database;
  CREATIVES_BUCKET: R2Bucket;
  CACHE: KVNamespace;
  CAMPAIGN_QUEUE?: Queue;
  ANALYTICS_QUEUE?: Queue;

  // Secrets
  META_APP_ID: string;
  META_APP_SECRET: string;
  JWT_SECRET: string;
  TOKEN_ENCRYPTION_KEY: string;
  GEMINI_API_KEY: string;
  HF_API_TOKEN?: string;
  FAL_API_KEY?: string;
  AI: any; // Cloudflare Workers AI binding

  META_WEBHOOK_VERIFY_TOKEN: string;

  // Vars
  ENVIRONMENT: string;
  GRAPH_API_VERSION: string;
  PHONE_EMAIL_CLIENT_ID: string;
}

export interface JWTPayload {
  sub: string; // user id
  phone: string;
  iat: number;
  exp: number;
}

export interface User {
  id: string;
  phone: string;
  email: string | null;
  full_name: string | null;
  business_name: string | null;
  business_category: string | null;
  created_at: string;
  updated_at: string;
  is_active: number;
}

export interface Organization {
  id: string;
  name: string;
  owner_user_id: string;
  created_at: string;
}

export interface OrgMember {
  id: string;
  org_id: string;
  user_id: string;
  role: string;
}

export interface AdAccount {
  id: string;
  org_id: string;
  name: string;
  platform: string;
  platform_account_id: string | null;
  currency: string;
  timezone: string;
  status: string;
  created_at: string;
}

export interface MetaConnection {
  id: string;
  user_id: string;
  meta_user_id: string;
  meta_name: string | null;
  meta_email: string | null;
  access_token: string;
  token_expires_at: string | null;
  granted_scopes: string | null;
  is_active: number;
  created_at: string;
}

export interface MetaPage {
  id: string;
  meta_connection_id: string;
  page_id: string;
  page_name: string;
  page_category: string | null;
  page_access_token: string;
  page_picture_url: string | null;
  instagram_business_account_id: string | null;
  instagram_username: string | null;
  is_active: number;
}

export interface Creative {
  id: string;
  user_id: string;
  org_id: string | null;
  file_name: string;
  file_type: string;
  file_size: number;
  r2_key: string;
  thumbnail_r2_key: string | null;
  width: number | null;
  height: number | null;
  created_at: string;
}

export interface Campaign {
  id: string;
  user_id: string;
  ad_account_id: string;
  title: string;
  objective: string;
  status: string;
  daily_budget: number;
  total_budget: number | null;
  start_date: string;
  end_date: string | null;
  targeting: string; // JSON string
  creative_id: string | null;
  primary_text: string | null;
  headline: string | null;
  cta: string | null;
  destination_url: string | null;
  meta_campaign_id: string | null;
  meta_adset_id: string | null;
  meta_ad_id: string | null;
  page_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CampaignAnalytics {
  id: string;
  campaign_id: string;
  date: string;
  impressions: number;
  clicks: number;
  spend: number;
  conversions: number;
  reach: number;
  cpc: number;
  cpm: number;
  ctr: number;
}

export interface QueueMessage {
  type: string;
  payload: Record<string, unknown>;
}
