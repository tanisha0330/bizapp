import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { authMiddleware } from '../middleware/auth';

const events = new Hono<AppEnv>();

// POST /events/track — track an analytics event (auth required)
events.post('/track', authMiddleware, async (c) => {
    const userId = c.get('userId') as string;
    const { event, data } = await c.req.json<{ event: string; data?: any }>();

    if (!event) return c.json({ error: 'Event name required' }, 400);

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Increment event counter for today
    const eventKey = `analytics:${event}:${today}`;
    const current = await c.env.CACHE.get(eventKey);
    await c.env.CACHE.put(eventKey, String((current ? parseInt(current, 10) : 0) + 1), { expirationTtl: 86400 * 90 });

    // Track unique users per event per day
    const userKey = `analytics_users:${event}:${today}`;
    const usersStr = await c.env.CACHE.get(userKey);
    const users = usersStr ? JSON.parse(usersStr) : [];
    if (!users.includes(userId)) {
        users.push(userId);
        await c.env.CACHE.put(userKey, JSON.stringify(users), { expirationTtl: 86400 * 90 });
    }

    // Store recent activity (last 50 events)
    try {
        const user = await c.env.DB.prepare('SELECT full_name, phone, business_name FROM users WHERE id = ?').bind(userId).first();
        const activityKey = 'analytics:recent_activity';
        const activityStr = await c.env.CACHE.get(activityKey);
        const activities = activityStr ? JSON.parse(activityStr) : [];
        activities.unshift({
            event,
            user: user?.full_name || user?.business_name || 'Unknown',
            phone: user?.phone || '',
            time: now,
            data: data || undefined,
        });
        // Keep last 50
        await c.env.CACHE.put(activityKey, JSON.stringify(activities.slice(0, 50)), { expirationTtl: 86400 * 7 });
    } catch {}

    return c.json({ ok: true });
});

// GET /events/dashboard — admin analytics dashboard (auth required)
events.get('/dashboard', authMiddleware, async (c) => {
    const trackedEvents = [
        'app_open', 'signup', 'login',
        'poster_created', 'poster_saved', 'poster_shared',
        'card_created', 'card_printed', 'card_shared',
        'website_submitted', 'website_edited',
        'ad_draft_saved', 'ad_published',
        'fb_connected', 'fb_disconnected',
        'lead_added', 'lead_status_changed',
        'news_opened', 'dark_mode_toggled',
    ];

    const days: any[] = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayData: any = { date: dateStr };
        for (const event of trackedEvents) {
            const countStr = await c.env.CACHE.get(`analytics:${event}:${dateStr}`);
            const usersStr = await c.env.CACHE.get(`analytics_users:${event}:${dateStr}`);
            const count = countStr ? parseInt(countStr, 10) : 0;
            const uniqueUsers = usersStr ? JSON.parse(usersStr).length : 0;
            if (count > 0) dayData[event] = { count, uniqueUsers };
        }
        days.push(dayData);
    }

    let totalUsers = 0;
    try {
        const result = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first();
        totalUsers = (result?.count as number) || 0;
    } catch {}

    return c.json({ totalUsers, last7Days: days });
});

// GET /events/live — stats page (password protected)
events.get('/live', async (c) => {
    const key = c.req.query('key');
    if (key !== 'b499_xK9mP2vL7q') {
        return c.text('Access denied.', 403);
    }

    const trackedEvents = [
        'app_open', 'signup', 'login',
        'poster_created', 'card_saved', 'card_shared',
        'website_submitted', 'ad_published', 'ad_draft_saved',
        'fb_connected', 'news_opened',
    ];

    const days: any[] = [];
    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const dayData: any = { date: dateStr };
        for (const event of trackedEvents) {
            const countStr = await c.env.CACHE.get(`analytics:${event}:${dateStr}`);
            if (countStr) dayData[event] = parseInt(countStr, 10);
        }
        days.push(dayData);
    }

    let totalUsers = 0;
    try {
        const result = await c.env.DB.prepare('SELECT COUNT(*) as count FROM users').first();
        totalUsers = (result?.count as number) || 0;
    } catch {}

    // Recent users
    let recentUsers: any[] = [];
    try {
        const { results } = await c.env.DB.prepare(
            'SELECT full_name, phone, business_name, business_category, created_at, last_login_at FROM users ORDER BY created_at DESC LIMIT 20'
        ).all();
        recentUsers = results || [];
    } catch {}

    // Recent activity
    let recentActivity: any[] = [];
    try {
        const activityStr = await c.env.CACHE.get('analytics:recent_activity');
        recentActivity = activityStr ? JSON.parse(activityStr) : [];
    } catch {}

    // Poster stats
    const today = new Date().toISOString().split('T')[0];
    const postersToday = await c.env.CACHE.get(`poster_global:${today}`);
    const postersFailed = await c.env.CACHE.get(`poster_fail:${today}`);

    // Website requests
    let websiteRequests = 0;
    try {
        const wr = await c.env.DB.prepare('SELECT COUNT(*) as count FROM website_requests').first();
        websiteRequests = (wr?.count as number) || 0;
    } catch {}

    return c.html(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Biz499 — Live Dashboard</title>
<meta http-equiv="refresh" content="60">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#0F172A;color:#F1F5F9;padding:20px;max-width:1200px;margin:0 auto}
h1{font-size:22px;margin-bottom:4px}
h2{font-size:16px;color:#94A3B8;margin:24px 0 10px;font-weight:600}
.sub{color:#64748B;font-size:13px;margin-bottom:20px}
.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-bottom:20px}
.card{background:#1E293B;border-radius:12px;padding:14px}
.card .num{font-size:26px;font-weight:800;color:#6C5CE7}
.card .label{font-size:11px;color:#94A3B8;margin-top:4px}
table{width:100%;border-collapse:collapse;margin-bottom:20px}
th,td{text-align:left;padding:6px 10px;border-bottom:1px solid #1E293B;font-size:12px}
th{color:#64748B;font-weight:600;background:#1E293B}
td{color:#CBD5E1}
.green{color:#34D399}.red{color:#F87171}.blue{color:#60A5FA}.purple{color:#A78BFA}
.badge{display:inline-block;padding:2px 8px;border-radius:8px;font-size:10px;font-weight:600}
.activity{background:#1E293B;border-radius:10px;padding:10px 14px;margin-bottom:6px;display:flex;justify-content:space-between;align-items:center}
.activity .name{font-weight:600;font-size:13px}
.activity .event{font-size:11px;color:#94A3B8}
.activity .time{font-size:10px;color:#475569}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:768px){.two-col{grid-template-columns:1fr}}
</style></head><body>
<h1>Biz499 Live Dashboard</h1>
<p class="sub">Auto-refreshes every 60s · ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>

<div class="grid">
<div class="card"><div class="num">${totalUsers}</div><div class="label">Total Users</div></div>
<div class="card"><div class="num blue">${websiteRequests}</div><div class="label">Website Requests</div></div>
<div class="card"><div class="num green">${postersToday || 0}</div><div class="label">Posters Today</div></div>
<div class="card"><div class="num ${(postersFailed && parseInt(postersFailed) > 0) ? 'red' : 'green'}">${postersFailed || 0}</div><div class="label">Poster Failures</div></div>
</div>

<div class="two-col">
<div>
<h2>Recent Activity</h2>
${recentActivity.length > 0 ? recentActivity.slice(0, 15).map((a: any) => {
    const timeAgo = Math.round((Date.now() - new Date(a.time).getTime()) / 60000);
    const timeStr = timeAgo < 60 ? `${timeAgo}m ago` : timeAgo < 1440 ? `${Math.round(timeAgo/60)}h ago` : `${Math.round(timeAgo/1440)}d ago`;
    return `<div class="activity"><div><div class="name">${a.user}</div><div class="event">${a.event.replace(/_/g, ' ')} · ${a.phone}</div></div><div class="time">${timeStr}</div></div>`;
}).join('') : '<p style="color:#475569;font-size:13px">No activity yet. Events will appear as users interact with the app.</p>'}
</div>
<div>
<h2>Registered Users</h2>
<table><tr><th>Name</th><th>Business</th><th>Phone</th><th>Category</th><th>Joined</th></tr>
${recentUsers.map((u: any) => `<tr><td>${u.full_name || '-'}</td><td>${u.business_name || '-'}</td><td>${u.phone?.replace(/^\++/, '+') || '-'}</td><td>${u.business_category || '-'}</td><td>${u.created_at?.split('T')[0] || '-'}</td></tr>`).join('')}
</table>
</div>
</div>

<h2>7-Day Event Breakdown</h2>
<table><tr><th>Date</th>${trackedEvents.map(e => `<th>${e.replace(/_/g, ' ')}</th>`).join('')}</tr>
${days.map(d => `<tr><td>${d.date}</td>${trackedEvents.map(e => `<td>${d[e] || '-'}</td>`).join('')}</tr>`).join('')}
</table>

<p style="color:#334155;font-size:11px;margin-top:16px">Biz499 Analytics · Powered by Cloudflare</p>
</body></html>`);
});

export default events;
