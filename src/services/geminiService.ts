import { File, Paths, Directory } from 'expo-file-system';
import { api } from './api';

const TEXT_MODEL = 'gemini-2.5-flash';
const IMAGE_MODEL = 'gemini-2.5-flash-image';

export interface DesignContext {
    businessName?: string;
    industry?: string;
    targetAudience?: string;
    brandColors?: string[];
    logoUri?: string;
    referenceImages?: string[];
}

export interface GenerateDesignRequest {
    context: DesignContext;
    prompt: string;
    imageUris?: string[];
    chatHistory?: { role: 'user' | 'ai'; text: string }[];
}

export interface PosterBrief {
    headline: string;
    subtext: string;
    businessName: string;
    contact: string;
    cta: string;
    offer: string;
    colors: string;
    mood: string;
    themeElements: string;
}

export interface GenerateDesignResponse {
    success: boolean;
    text?: string;
    imageUri?: string;
    brief?: PosterBrief;
    error?: string;
}

async function imageUriToBase64(uri: string): Promise<string> {
    const file = new File(uri);
    return await file.base64();
}

function base64ToUint8Array(base64: string): Uint8Array {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

async function saveBase64Image(base64Data: string): Promise<string> {
    const fileName = `ai_poster_${Date.now()}.png`;
    const postersDir = new Directory(Paths.document, 'ai_posters');
    if (!postersDir.exists) {
        postersDir.create();
    }
    const file = new File(postersDir, fileName);
    file.create();
    file.write(base64ToUint8Array(base64Data));
    return file.uri;
}

// All Gemini calls go through the backend proxy (API keys stay server-side)
async function callGeminiText(contents: any[]): Promise<any> {
    return api.geminiGenerate({ model: TEXT_MODEL, contents });
}

async function callGeminiImage(contents: any[], generationConfig?: any): Promise<any> {
    return api.geminiGenerateImage({
        model: IMAGE_MODEL,
        contents,
        generationConfig: generationConfig || { responseModalities: ['TEXT', 'IMAGE'] },
    });
}

// STEP 1: Use text model to correct spelling, plan all text, build creative brief
async function buildCreativeBrief(
    context: DesignContext,
    userPrompt: string,
): Promise<PosterBrief> {
    const plannerPrompt = `You are an award-winning creative director at a top advertising agency (like Ogilvy or Wieden+Kennedy). You create premium, high-converting ad posters that businesses confidently run as Facebook/Instagram ads.

CLIENT INFO:
- Business name: "${context.businessName || 'N/A'}"
- Industry: ${context.industry || 'N/A'}
- Target audience: ${context.targetAudience || 'General'}
- Brand colors: ${context.brandColors?.length ? context.brandColors.join(', ') : 'Not specified'}

CLIENT REQUEST (may have typos — FIX all spelling errors):
"${userPrompt}"

OUTPUT a structured brief in EXACTLY this format (one value per line, no markdown, no extra text):

HEADLINE: [Max 4 words, powerful, spell-checked. Short and punchy.]
SUBTEXT: [Max 8 words, adds value/urgency. Or NONE if headline is enough.]
BUSINESS_NAME: [Exact business name — correctly spelled, properly capitalised]
CONTACT: [Only if client provided phone/address/WhatsApp — copy numbers exactly digit by digit, or NONE]
CTA: [2-3 words like "Order Now", "Book Today", "Shop Now", or NONE]
OFFER: [e.g. "50% OFF", "Flat ₹299", "Buy 1 Get 1" — short, or NONE]
COLORS: [2-3 muted, elegant hex colors. NO neon, NO bright red/yellow. Use sophisticated palettes: deep blues, warm grays, terracotta, olive, navy, burgundy, forest green, soft gold. Colors that look premium on print.]
MOOD: [One line — clean, professional visual direction]
THEME_ELEMENTS: [Specific visual elements that match the occasion]

STRICT RULES:
- Fix ALL spelling and grammar mistakes
- NEVER repeat any word across headline, subtext, CTA, or offer
- NEVER repeat business name anywhere — it appears separately
- NEVER repeat phone number — it appears separately
- NEVER invent info the client didn't provide
- If client wrote a phone number, copy it digit-for-digit
- NONE means skip that element entirely
- Keep text minimal — best posters have 3-6 words total
- Use simple, easy-to-read words
- Colors must be MUTED and PROFESSIONAL — never garish or overly bright`;

    const data = await callGeminiText([{ parts: [{ text: plannerPrompt }] }]);

    const briefText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    console.log('Creative brief:', briefText);

    const parseLine = (key: string): string => {
        const safeKey = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const match = briefText.match(new RegExp(`${safeKey}:\\s*(.+)`, 'i'));
        const value = match?.[1]?.trim() || '';
        return (value === 'NONE' || value === 'N/A') ? '' : value;
    };

    return {
        headline: parseLine('HEADLINE'),
        subtext: parseLine('SUBTEXT'),
        businessName: parseLine('BUSINESS_NAME') || context.businessName || '',
        contact: parseLine('CONTACT'),
        cta: parseLine('CTA'),
        offer: parseLine('OFFER'),
        colors: parseLine('COLORS'),
        mood: parseLine('MOOD'),
        themeElements: parseLine('THEME_ELEMENTS'),
    };
}

// STEP 2: Generate background artwork ONLY — no text rendered in the image
async function generateBackground(
    brief: PosterBrief,
    imageUris: string[],
): Promise<string | undefined> {
    const imagePrompt = `You are a world-class graphic designer creating a BACKGROUND IMAGE for a premium advertisement poster. This poster will be used as a paid Facebook/Instagram ad — it must look professional enough that a business owner confidently spends money promoting it.

ABSOLUTE RULE: Do NOT render ANY text, letters, words, numbers, symbols, logos, or characters on the image. ZERO text. This is ONLY the visual background artwork. Text will be overlaid separately.

DESIGN BRIEF:
- Theme & elements: ${brief.themeElements || 'Clean, professional business advertisement'}
- Mood & atmosphere: ${brief.mood || 'Premium, aspirational, modern'}
- Color palette: ${brief.colors || 'Rich, professional, high-contrast'}

QUALITY STANDARDS (non-negotiable):
- Resolution feel: Ultra-sharp, 4K-quality, print-ready (1080x1080 square)
- Lighting: Cinematic, dramatic — use depth, shadows, golden hour, rim lighting
- Composition: Rule of thirds, layered depth, visual hierarchy
- Leave generous clear/semi-transparent space in the CENTER for text overlay
- Background areas behind text zones should be solid, gradient, or blurred — ensuring text readability
- Colors must be rich, saturated but tasteful — never washed out or muddy
- Use professional design elements: subtle gradients, texture overlays, bokeh, light leaks, geometric accents
- Style reference: Think Canva Pro templates, Apple product ads, Nike campaign visuals
- For festival themes: authentic, culturally rich imagery with premium treatment
- For food/restaurant: warm, appetizing tones with depth of field
- For fashion/beauty: editorial, aspirational lighting with elegant composition
- For services/tech: clean, modern, geometric with professional color blocking

AVOID: clipart, cartoonish elements, flat/boring backgrounds, stock photo clichés, low-quality textures, oversaturated neon, busy/cluttered designs

REMEMBER: Absolutely ZERO text, letters, numbers, or words anywhere. Pure visual artwork only.`;

    const parts: any[] = [{ text: imagePrompt }];

    if (imageUris.length > 0) {
        const imageParts = await Promise.all(
            imageUris.slice(0, 3).map(async (uri) => ({
                inlineData: {
                    data: await imageUriToBase64(uri),
                    mimeType: 'image/jpeg',
                },
            }))
        );
        parts.push(...imageParts);
    }

    const data = await callGeminiImage([{ parts }]);

    const candidates = data.candidates;
    if (candidates && candidates[0]?.content?.parts) {
        for (const part of candidates[0].content.parts) {
            if (part.inlineData) {
                console.log(`Background image: ${part.inlineData.mimeType}, ${part.inlineData.data.length} chars`);
                return await saveBase64Image(part.inlineData.data);
            }
        }
    }
    return undefined;
}

export async function generateAdDesign(
    request: GenerateDesignRequest
): Promise<GenerateDesignResponse> {
    try {
        const { context, prompt, imageUris = [] } = request;

        const isGreeting = /^(hi|hello|hey|namaste|hola|yo|sup)\s*[!?.]*$/i.test(prompt.trim());
        const isUnrelated = /\b(weather|joke|recipe|code|math|news|song|movie|game)\b/i.test(prompt.trim());

        if (isGreeting) {
            return {
                success: true,
                text: `Hey${context.businessName ? ` from ${context.businessName}` : ''}! I create professional ad posters for your business.\n\nTo make the perfect poster, tell me:\n1. What's the occasion? (sale, festival, launch, offer etc.)\n2. Any specific offer? (e.g. 50% off, Buy 1 Get 1)\n3. Target audience age group?\n4. Color preference?\n5. Any extra details? (tagline, phone number, address)\n\nOr just describe your poster and I'll create it!`,
            };
        }
        if (isUnrelated) {
            return {
                success: true,
                text: "I only create ad posters! Tell me what poster you need — mention the occasion, offer, and any details you'd like on it.",
            };
        }

        const hasOccasion = /sale|offer|launch|opening|festival|diwali|holi|eid|christmas|new year|discount|free|event|wedding|party|special|announce|inaugur|celebrate|grand|season|summer|winter|monsoon|navratri|rakhi|independence|republic|poster|flyer|banner|ad\b/i.test(prompt);
        const hasDetail = prompt.trim().split(/\s+/).length >= 5 || hasOccasion;

        if (!hasDetail && !request.chatHistory?.some(m => m.role === 'ai' && m.text?.includes('occasion'))) {
            return {
                success: true,
                text: `I'd love to create that! Could you share a few more details?\n\n1. What's the occasion or purpose?\n2. Any offer or discount to highlight?\n3. Who's the target audience?\n4. Preferred colors?\n5. Contact info to show? (phone, address, website)\n\nThe more details, the better the poster!`,
            };
        }

        // STEP 1: Build creative brief (spell-check + plan text)
        console.log('Step 1: Building creative brief...');
        const brief = await buildCreativeBrief(context, prompt);

        // STEP 2: Generate background image (NO text)
        console.log('Step 2: Generating background artwork...');
        const bgUri = await generateBackground(brief, imageUris);

        if (bgUri) {
            return {
                success: true,
                text: "Here's your poster! Save, Share, or Run Ad. Want changes? Just tell me.",
                imageUri: bgUri,
                brief,
            };
        }

        console.warn('No background image generated, falling back');
        return await generateTextFallback(request);
    } catch (error: any) {
        const errMsg = error?.message || (typeof error === 'object' ? JSON.stringify(error) : String(error));
        console.error('generateAdDesign error:', errMsg);
        try {
            return await generateTextFallback(request);
        } catch {
            return { success: false, error: errMsg || 'Failed to generate poster' };
        }
    }
}

async function generateTextFallback(
    request: GenerateDesignRequest
): Promise<GenerateDesignResponse> {
    const { context, prompt } = request;
    const contextLine = [
        context.businessName && `Business: ${context.businessName}`,
        context.industry && `Industry: ${context.industry}`,
    ].filter(Boolean).join(' | ');

    const fallbackPrompt = `You are a poster design assistant. Image generation is temporarily unavailable.
Give a SHORT (3-4 lines) text description of the poster you would create for:
${contextLine ? `[${contextLine}]` : ''}
Request: ${prompt}
Keep it brief. Mention: headline text, colors, layout.
End with: "Tip: Try again in a moment!"`;

    const data = await callGeminiText([{ parts: [{ text: fallbackPrompt }] }]);
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not generate design.';
    return { success: true, text: "Could not generate image right now.\n\n" + text };
}

export async function analyzeReferenceImages(
    imageUris: string[]
): Promise<GenerateDesignResponse> {
    try {
        if (imageUris.length === 0) return { success: false, error: 'No images provided' };

        const imageParts = await Promise.all(
            imageUris.map(async (uri) => ({
                inlineData: { data: await imageUriToBase64(uri), mimeType: 'image/jpeg' },
            }))
        );

        const data = await callGeminiText([{ parts: [
            { text: `Analyze these reference images briefly (max 4 lines):\n- Colors & style\n- What works well\n- One improvement suggestion` },
            ...imageParts,
        ] }]);

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Could not analyze images.';
        return { success: true, text };
    } catch (error: any) {
        console.error('Error analyzing images:', error);
        return { success: false, error: error.message || 'Failed to analyze images' };
    }
}
