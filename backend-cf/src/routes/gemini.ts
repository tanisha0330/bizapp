import { Hono } from 'hono';
import type { AppEnv } from '../types';
import { authMiddleware } from '../middleware/auth';
import { geminiRateLimit } from '../middleware/rateLimit';

const geminiRoutes = new Hono<AppEnv>();

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

// All Gemini routes require auth + stricter rate limit
geminiRoutes.use('*', authMiddleware);
geminiRoutes.use('*', geminiRateLimit);

// Proxy: Generate content (text model) — HuggingFace first, Gemini fallback
geminiRoutes.post('/generate', async (c) => {
    const body = await c.req.json();
    const promptText = body.contents?.[0]?.parts?.[0]?.text || '';

    // 1. Try HuggingFace text model first
    if (c.env.HF_API_TOKEN && promptText) {
        try {
            const hfRes = await fetch('https://router.huggingface.co/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${c.env.HF_API_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    model: 'meta-llama/Llama-3.1-8B-Instruct',
                    messages: [{ role: 'user', content: promptText }],
                    max_tokens: 500,
                }),
            });

            if (hfRes.ok) {
                const hfData = await hfRes.json() as any;
                const text = hfData?.choices?.[0]?.message?.content;
                if (text) {
                    console.log('Text generated via HuggingFace');
                    return c.json({
                        candidates: [{
                            content: { parts: [{ text }], role: 'model' },
                        }],
                    });
                }
            }
            console.log('HuggingFace text failed, trying Gemini');
        } catch (e) {
            console.log('HuggingFace text error:', e);
        }
    }

    // 2. Fallback: Gemini
    const apiKey = c.env.GEMINI_API_KEY;
    if (!apiKey) {
        return c.json({ error: 'Text generation failed — no providers available' }, 500);
    }

    const model = body.model || 'gemini-2.5-flash';
    const url = `${GEMINI_API_BASE}/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: body.contents,
            generationConfig: body.generationConfig,
        }),
    });

    const data = await response.json();

    if (!response.ok) {
        console.error('Gemini API error:', JSON.stringify(data));
    return c.json({ error: 'Text generation failed. Please try again.' }, response.status as any);
    }

    console.log('Text generated via Gemini');
    return c.json(data);
});

// Enhance prompt for poster backgrounds
function enhancePrompt(rawPrompt: string): string {
    return `Clean, minimal, professional advertisement background.
${rawPrompt}.
Style: Modern, elegant, muted color palette. NOT bright or neon.
Soft gradients, subtle textures, minimal elements, lots of negative space.
Large clear area in the center and bottom for text overlay.
Muted sophisticated colors — deep blues, warm neutrals, soft pastels, earthy tones.
NO text, NO letters, NO words, NO numbers, NO logos. Pure background only.
Square format. Print-ready quality.`;
}

// Convert image response to base64
async function imageToBase64(response: Response): Promise<string> {
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength < 1000) throw new Error('Image too small');
    const bytes = new Uint8Array(arrayBuffer);
    const CHUNK = 8192;
    let binary = '';
    for (let i = 0; i < bytes.length; i += CHUNK) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
    }
    return btoa(binary);
}

// Try Pollinations with retry
async function tryPollinations(prompt: string): Promise<string> {
    const encodedPrompt = encodeURIComponent(enhancePrompt(prompt));

    for (let attempt = 1; attempt <= 2; attempt++) {
        try {
            const seed = Math.floor(Math.random() * 999999);
            const url = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=512&height=512&nologo=true&seed=${seed}`;
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await imageToBase64(res);
        } catch (e) {
            console.log(`Pollinations attempt ${attempt} failed:`, e);
            if (attempt === 2) throw e;
            // Wait 2 seconds before retry
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    throw new Error('Pollinations failed after 2 attempts');
}

// Try Gemini image generation
async function tryGemini(prompt: string, apiKey: string, apiBase: string): Promise<any | null> {
    try {
        const url = `${apiBase}/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`;
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: enhancePrompt(prompt) }] }],
                generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
            }),
        });
        if (!res.ok) return null;
        return await res.json();
    } catch {
        return null;
    }
}

// Try Hugging Face Inference API (free, 1000 req/day)
async function tryHuggingFace(prompt: string, hfToken: string): Promise<string> {
    const model = 'stabilityai/stable-diffusion-xl-base-1.0';
    const res = await fetch(`https://router.huggingface.co/hf-inference/models/${model}`, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${hfToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ inputs: enhancePrompt(prompt) }),
    });
    if (!res.ok) throw new Error(`HuggingFace returned ${res.status}`);
    return await imageToBase64(res);
}

// Generate image — Gemini → HuggingFace → Pollinations (with retry)
geminiRoutes.post('/generate-image', async (c) => {
    const userId = c.get('userId') as string;
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = `poster_daily:${userId}:${today}`;
    const countStr = await c.env.CACHE.get(dailyKey);
    const count = countStr ? parseInt(countStr, 10) : 0;

    if (count >= 10) {
        return c.json({ error: 'Daily limit reached. You can create up to 10 AI posters per day. Try again tomorrow!' }, 429);
    }

    const body = await c.req.json();
    const promptText = body.contents?.[0]?.parts?.[0]?.text || 'professional business advertisement background';

    // Strategy: Cloudflare AI → HuggingFace → Pollinations → Gemini
    let responseData: any = null;

    // 1. Try Cloudflare Workers AI first (free, fastest, same edge)
    if (c.env.AI) {
        try {
            const aiResponse = await c.env.AI.run('@cf/stabilityai/stable-diffusion-xl-base-1.0', {
                prompt: enhancePrompt(promptText),
            });
            if (aiResponse) {
                const bytes = new Uint8Array(aiResponse);
                const CHUNK = 8192;
                let binary = '';
                for (let i = 0; i < bytes.length; i += CHUNK) {
                    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
                }
                const base64 = btoa(binary);
                responseData = {
                    candidates: [{
                        content: {
                            parts: [
                                { text: 'Poster background generated successfully' },
                                { inlineData: { mimeType: 'image/png', data: base64 } },
                            ],
                            role: 'model',
                        },
                    }],
                };
                console.log('Image generated via Cloudflare Workers AI');
            }
        } catch (e) {
            console.log('Cloudflare AI failed:', e);
        }
    }

    // 2. Try Hugging Face (free, reliable)
    if (!responseData && c.env.HF_API_TOKEN) {
        try {
            const base64 = await tryHuggingFace(promptText, c.env.HF_API_TOKEN);
            responseData = {
                candidates: [{
                    content: {
                        parts: [
                            { text: 'Poster background generated successfully' },
                            { inlineData: { mimeType: 'image/jpeg', data: base64 } },
                        ],
                        role: 'model',
                    },
                }],
            };
            console.log('Image generated via HuggingFace');
        } catch (e) {
            console.log('HuggingFace failed:', e);
        }
    }

    // 3. Fallback: Pollinations with retry
    if (!responseData) {
        try {
            const base64 = await tryPollinations(promptText);
            responseData = {
                candidates: [{
                    content: {
                        parts: [
                            { text: 'Poster background generated successfully' },
                            { inlineData: { mimeType: 'image/jpeg', data: base64 } },
                        ],
                        role: 'model',
                    },
                }],
            };
            console.log('Image generated via Pollinations');
        } catch {}
    }

    // 3. Last resort: Try Gemini
    if (!responseData) {
        const apiKey = c.env.GEMINI_API_KEY;
        if (apiKey) {
            const geminiResult = await tryGemini(promptText, apiKey, GEMINI_API_BASE);
            if (geminiResult?.candidates?.[0]?.content?.parts) {
                responseData = geminiResult;
                console.log('Image generated via Gemini');
            }
        }
    }

    if (responseData) {
        await c.env.CACHE.put(dailyKey, String(count + 1), { expirationTtl: 86400 });

        const globalKey = `poster_global:${today}`;
        const globalStr = await c.env.CACHE.get(globalKey);
        const globalCount = globalStr ? parseInt(globalStr, 10) : 0;
        await c.env.CACHE.put(globalKey, String(globalCount + 1), { expirationTtl: 86400 * 30 });

        return c.json(responseData);
    }

    // All 3 failed
    {
        const msg = 'All image providers failed';
        console.error('Pollinations error:', msg);

        // Track failures too
        const failKey = `poster_fail:${today}`;
        const failStr = await c.env.CACHE.get(failKey);
        await c.env.CACHE.put(failKey, String((failStr ? parseInt(failStr, 10) : 0) + 1), { expirationTtl: 86400 * 30 });

        return c.json({ error: 'Image generation failed. Please try again.' }, 500);
    }
});

// GET /gemini/stats — poster generation stats (for admin monitoring)
geminiRoutes.get('/stats', async (c) => {
    const today = new Date().toISOString().split('T')[0];
    const days: any[] = [];

    for (let i = 0; i < 7; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        const generated = await c.env.CACHE.get(`poster_global:${dateStr}`);
        const failed = await c.env.CACHE.get(`poster_fail:${dateStr}`);
        days.push({
            date: dateStr,
            generated: generated ? parseInt(generated, 10) : 0,
            failed: failed ? parseInt(failed, 10) : 0,
        });
    }

    const totalGenerated = days.reduce((sum, d) => sum + d.generated, 0);
    const totalFailed = days.reduce((sum, d) => sum + d.failed, 0);
    const todayStats = days[0];
    const failureRate = todayStats.generated > 0
        ? Math.round((todayStats.failed / (todayStats.generated + todayStats.failed)) * 100)
        : 0;

    let healthStatus = 'healthy';
    let alert = '';
    if (failureRate > 50) {
        healthStatus = 'critical';
        alert = 'Pollinations failure rate above 50% — consider switching to backup image API';
    } else if (failureRate > 20) {
        healthStatus = 'degraded';
        alert = 'Pollinations failure rate elevated — monitor closely';
    }

    return c.json({
        health: healthStatus,
        alert: alert || undefined,
        today: { ...todayStats, failureRate: `${failureRate}%` },
        last7Days: days,
        totalGenerated,
        totalFailed,
    });
});

export default geminiRoutes;
