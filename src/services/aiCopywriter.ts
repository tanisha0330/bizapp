import { api } from './api';

const MODEL_NAME = 'gemini-2.5-flash';

export interface AdCopyRequest {
    businessName: string;
    businessCategory?: string;
    goal: string;
    description?: string;
}

export interface AdCopyResult {
    title: string;
    primaryText: string;
    cta: string;
    hashtags: string[];
}

export interface CaptionRequest {
    businessName: string;
    occasion: string;
    tone?: 'professional' | 'casual' | 'festive' | 'motivational';
}

export interface CaptionResult {
    caption: string;
    hashtags: string[];
}

async function callGemini(prompt: string): Promise<string> {
    const data = await api.geminiGenerate({
        model: MODEL_NAME,
        contents: [{ parts: [{ text: prompt }] }],
    });
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
}

/**
 * Generate ad copy using Gemini AI (via backend proxy)
 */
export async function generateAdCopy(req: AdCopyRequest): Promise<AdCopyResult> {
    try {
        const prompt = `You are an expert ad copywriter for Indian small businesses. Generate ad copy for:

Business: ${req.businessName}
Category: ${req.businessCategory || 'General'}
Goal: ${req.goal}
${req.description ? `Description: ${req.description}` : ''}

Return ONLY a valid JSON object (no markdown, no code blocks) with these exact keys:
{
  "title": "Short catchy ad title (max 40 chars)",
  "primaryText": "Compelling ad text (2-3 lines, max 150 chars)",
  "cta": "Call to action text (max 20 chars)",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
}`;

        const text = await callGemini(prompt);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        return {
            title: `${req.businessName} - ${req.goal}`,
            primaryText: `Visit ${req.businessName} today! Special offers available.`,
            cta: 'Learn More',
            hashtags: [`#${req.businessName?.replace(/\s/g, '')}`, '#SmallBusiness', '#India'],
        };
    } catch (error) {
        console.error('AI copy generation failed:', error);
        return {
            title: `${req.businessName} - Special Offer`,
            primaryText: `Check out ${req.businessName} for amazing deals and services!`,
            cta: 'Learn More',
            hashtags: ['#Business', '#Offer', '#India'],
        };
    }
}

/**
 * Generate social media caption using Gemini AI (via backend proxy)
 */
export async function generateCaption(req: CaptionRequest): Promise<CaptionResult> {
    try {
        const prompt = `You are a social media manager for Indian businesses. Generate a ${req.tone || 'professional'} social media caption for:

Business: ${req.businessName}
Occasion: ${req.occasion}

Return ONLY a valid JSON object (no markdown, no code blocks):
{
  "caption": "Engaging caption (2-4 lines with relevant emojis)",
  "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5", "#tag6", "#tag7"]
}`;

        const text = await callGemini(prompt);
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }

        return {
            caption: `Happy ${req.occasion}! From ${req.businessName} family to yours.`,
            hashtags: [`#${req.occasion.replace(/\s/g, '')}`, `#${req.businessName?.replace(/\s/g, '')}`],
        };
    } catch (error) {
        console.error('AI caption generation failed:', error);
        return {
            caption: `Wishing everyone a wonderful ${req.occasion}! From all of us at ${req.businessName}.`,
            hashtags: [`#${req.occasion?.replace(/\s/g, '')}`, '#Celebration'],
        };
    }
}

/**
 * Generate creative description for a design template
 */
export async function generateDesignDescription(
    templateName: string,
    businessName: string,
    businessCategory?: string
): Promise<string> {
    try {
        const prompt = `Write a short (1-2 lines) creative description for a ${templateName} design template for ${businessName} (${businessCategory || 'business'}). Make it catchy and Indian market focused. Return ONLY the text, no quotes.`;
        const text = await callGemini(prompt);
        return text.replace(/^["']|["']$/g, '');
    } catch {
        return `Professional ${templateName} template for ${businessName}`;
    }
}
