// Facebook Webhook Handler
// Receives real-time leadgen events from Meta
// Setup: Meta Developer → Your App → Webhooks → Subscribe to 'leadgen' field

import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { decryptToken, generateId } from '../utils/crypto';
import { sendPushNotification } from '../services/expoPush';

const webhook = new Hono<AppEnv>();

// ── Helpers ──────────────────────────────────────────────────────────────────

async function fetchAndStoreLead(
    leadId: string,
    pageToken: string,
    userId: string,
    pageId: string,
    pageName: string,
    formId: string,
    formName: string,
    env: AppEnv['Bindings']
): Promise<{ name: string; phone: string; email: string; isNew: boolean }> {
    // Check if we already have this lead
    const existing = await env.DB.prepare(
        'SELECT id FROM fb_leads WHERE user_id = ? AND fb_lead_id = ?'
    ).bind(userId, leadId).first();

    if (existing) return { name: '', phone: '', email: '', isNew: false };

    // Fetch lead details from Facebook
    const res = await fetch(
        `https://graph.facebook.com/${env.GRAPH_API_VERSION}/${leadId}?fields=id,created_time,field_data&access_token=${pageToken}`
    );
    if (!res.ok) return { name: '', phone: '', email: '', isNew: false };

    const data = await res.json() as { id: string; created_time: string; field_data: Array<{ name: string; values: string[] }> };

    const fields: Record<string, string> = {};
    for (const f of (data.field_data || [])) {
        fields[f.name] = Array.isArray(f.values) ? f.values[0] : f.values;
    }

    const name = fields.full_name || fields.first_name || fields.name || 'Unknown';
    const email = fields.email || '';
    const phone = fields.phone_number || fields.phone || '';
    const city = fields.city || '';

    await env.DB.prepare(`
        INSERT OR IGNORE INTO fb_leads
            (id, user_id, fb_lead_id, form_id, form_name, page_id, page_name, name, email, phone, city, raw_fields, notified, created_at, synced_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, datetime('now'))
    `).bind(
        generateId(), userId, leadId, formId, formName,
        pageId, pageName, name, email, phone, city,
        JSON.stringify(fields),
        data.created_time || new Date().toISOString()
    ).run();

    return { name, phone, email, isNew: true };
}

// ── GET /webhook/leadgen — Facebook verification challenge ────────────────────

webhook.get('/leadgen', (c) => {
    const mode = c.req.query('hub.mode');
    const token = c.req.query('hub.verify_token');
    const challenge = c.req.query('hub.challenge');

    const verifyToken = c.env.META_WEBHOOK_VERIFY_TOKEN || 'biz499_webhook_secret';

    if (mode === 'subscribe' && token === verifyToken) {
        console.log('Facebook webhook verified');
        return c.text(challenge || '', 200);
    }
    return c.text('Forbidden', 403);
});

// ── POST /webhook/leadgen — Receive lead events ───────────────────────────────

webhook.post('/leadgen', async (c) => {
    // Always return 200 immediately — Facebook will retry if it doesn't get 200 quickly
    c.executionCtx.waitUntil(processWebhookEvent(c));
    return c.text('OK', 200);
});

async function processWebhookEvent(c: any): Promise<void> {
    try {
        const body = await c.req.json() as {
            object: string;
            entry: Array<{
                id: string; // page_id
                changes: Array<{
                    field: string;
                    value: {
                        leadgen_id: string;
                        page_id: string;
                        form_id: string;
                        ad_id?: string;
                        created_time: number;
                    };
                }>;
            }>;
        };

        if (body.object !== 'page') return;

        for (const entry of body.entry || []) {
            for (const change of entry.changes || []) {
                if (change.field !== 'leadgen') continue;

                const { leadgen_id, page_id, form_id } = change.value;

                // Find the page owner
                const pageRow = await c.env.DB.prepare(`
                    SELECT mp.page_access_token, mp.page_name, mc.user_id, mc.access_token
                    FROM meta_pages mp
                    JOIN meta_connections mc ON mc.id = mp.meta_connection_id
                    WHERE mp.page_id = ? AND mp.is_active = 1
                    LIMIT 1
                `).bind(page_id).first();

                if (!pageRow) {
                    console.log(`Webhook: no page found for page_id=${page_id}`);
                    continue;
                }

                const pageToken = await decryptToken(pageRow.page_access_token as string, c.env.TOKEN_ENCRYPTION_KEY);
                const userId = pageRow.user_id as string;

                // Get form name
                let formName = 'Lead Form';
                try {
                    const formRes = await fetch(
                        `https://graph.facebook.com/${c.env.GRAPH_API_VERSION}/${form_id}?fields=name&access_token=${pageToken}`
                    );
                    if (formRes.ok) {
                        const formData = await formRes.json() as { name?: string };
                        formName = formData.name || formName;
                    }
                } catch {}

                const { name, phone, email, isNew } = await fetchAndStoreLead(
                    leadgen_id, pageToken, userId,
                    page_id, pageRow.page_name as string,
                    form_id, formName,
                    c.env
                );

                if (!isNew) continue;

                // Send push notification
                const user = await c.env.DB.prepare(
                    'SELECT push_token FROM users WHERE id = ?'
                ).bind(userId).first();

                const pushToken = user?.push_token as string | undefined;
                if (pushToken) {
                    const notifBody = phone
                        ? `${name} · ${phone}`
                        : email
                            ? `${name} · ${email}`
                            : name;

                    await sendPushNotification(
                        pushToken,
                        '🎯 New Lead!',
                        notifBody,
                        { type: 'lead', leadId: leadgen_id, pageId: page_id }
                    );

                    await c.env.DB.prepare(
                        'UPDATE fb_leads SET notified = 1 WHERE fb_lead_id = ? AND user_id = ?'
                    ).bind(leadgen_id, userId).run();
                }

                console.log(`Webhook lead processed: ${leadgen_id} for user ${userId}`);
            }
        }
    } catch (e) {
        console.error('Webhook processing error:', e);
    }
}

export default webhook;
