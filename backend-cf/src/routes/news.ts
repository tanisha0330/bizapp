import { Hono } from 'hono';
import type { AppEnv } from '../types';

const news = new Hono<AppEnv>();

const RSS_FEEDS = [
    { url: 'https://feeds.feedburner.com/entrepreneur/latest', category: 'Marketing' },
    { url: 'https://blog.hubspot.com/marketing/rss.xml', category: 'Marketing' },
    { url: 'https://www.artificialintelligence-news.com/feed/', category: 'AI & Tech' },
    { url: 'https://venturebeat.com/category/ai/feed/', category: 'AI & Tech' },
    { url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', category: 'AI & Tech' },
    { url: 'https://www.businessinsider.in/rss.cms', category: 'Business' },
    { url: 'https://economictimes.indiatimes.com/rssfeedsdefault.cms', category: 'Business' },
    { url: 'https://techcrunch.com/feed/', category: 'AI & Tech' },
];

const CACHE_KEY = 'news_cache_v2';
const CACHE_TTL = 1800; // 30 minutes

interface NewsArticle {
    title: string;
    description: string;
    url: string;
    image?: string;
    source: string;
    publishedAt: string;
    category: string;
}

// GET /news — returns cached news, refreshes if stale
news.get('/', async (c) => {
    const cached = await c.env.CACHE.get(CACHE_KEY);
    if (cached) {
        return c.json(JSON.parse(cached));
    }

    const articles = await fetchAllFeeds();
    await c.env.CACHE.put(CACHE_KEY, JSON.stringify({ articles, fetchedAt: new Date().toISOString() }), {
        expirationTtl: CACHE_TTL,
    });

    return c.json({ articles, fetchedAt: new Date().toISOString() });
});

// POST /news/refresh — force refresh cache
news.post('/refresh', async (c) => {
    const articles = await fetchAllFeeds();
    await c.env.CACHE.put(CACHE_KEY, JSON.stringify({ articles, fetchedAt: new Date().toISOString() }), {
        expirationTtl: CACHE_TTL,
    });
    return c.json({ refreshed: true, count: articles.length });
});

// --- Direct RSS parser (no third-party dependency) ---

function extractTag(xml: string, tag: string): string {
    // Handle CDATA
    const cdataRe = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i');
    const cdataMatch = xml.match(cdataRe);
    if (cdataMatch) return cdataMatch[1].trim();

    const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
    const match = xml.match(re);
    return match ? match[1].replace(/<[^>]*>/g, '').trim() : '';
}

function extractAttr(xml: string, tag: string, attr: string): string {
    const re = new RegExp(`<${tag}[^>]*${attr}=["']([^"']+)["'][^>]*>`, 'i');
    const match = xml.match(re);
    return match ? match[1] : '';
}

function extractImage(itemXml: string): string | undefined {
    // 1. media:content url
    const mediaContent = itemXml.match(/<media:content[^>]+url=["']([^"']+)["'][^>]*>/i);
    if (mediaContent) return mediaContent[1];

    // 2. media:thumbnail url
    const mediaThumbnail = itemXml.match(/<media:thumbnail[^>]+url=["']([^"']+)["'][^>]*>/i);
    if (mediaThumbnail) return mediaThumbnail[1];

    // 3. enclosure url (podcasts/images)
    const enclosure = itemXml.match(/<enclosure[^>]+url=["']([^"']+)["'][^>]*type=["']image[^"']*["'][^>]*>/i)
        || itemXml.match(/<enclosure[^>]+type=["']image[^"']*["'][^>]*url=["']([^"']+)["'][^>]*>/i);
    if (enclosure) return enclosure[1];

    // 4. First <img> in description/content
    const imgTag = itemXml.match(/<img[^>]+src=["']([^"']+)["']/i);
    if (imgTag) return imgTag[1];

    return undefined;
}

function parseRSS(xml: string, category: string): NewsArticle[] {
    const articles: NewsArticle[] = [];

    // Channel title as source
    const channelTitleMatch = xml.match(/<channel[^>]*>[\s\S]*?<title[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/i);
    const source = channelTitleMatch ? channelTitleMatch[1].replace(/<[^>]*>/g, '').trim().substring(0, 30) : category;

    // Split into items
    const itemsRe = /<item[^>]*>([\s\S]*?)<\/item>/gi;
    let match: RegExpExecArray | null;
    let count = 0;

    while ((match = itemsRe.exec(xml)) !== null && count < 4) {
        const item = match[1];

        const title = extractTag(item, 'title');
        const link = extractTag(item, 'link') || extractAttr(item, 'link', 'href');
        const pubDate = extractTag(item, 'pubDate') || extractTag(item, 'published') || extractTag(item, 'dc:date');
        const description = extractTag(item, 'description') || extractTag(item, 'summary') || extractTag(item, 'content');
        const image = extractImage(item);

        if (!title || !link) continue;

        articles.push({
            title: title.substring(0, 120),
            description: description.replace(/<[^>]*>/g, '').trim().substring(0, 160),
            url: link.trim(),
            image,
            source,
            publishedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
            category,
        });
        count++;
    }

    return articles;
}

async function fetchAllFeeds(): Promise<NewsArticle[]> {
    const allArticles: NewsArticle[] = [];

    const feedPromises = RSS_FEEDS.map(async (feed) => {
        try {
            const res = await fetch(feed.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; Biz499Bot/1.0)',
                    'Accept': 'application/rss+xml, application/xml, text/xml, */*',
                },
                cf: { cacheTtl: 300, cacheEverything: false } as any,
            });

            if (!res.ok) {
                console.log(`Feed failed ${res.status}: ${feed.url}`);
                return [];
            }

            const xml = await res.text();
            if (!xml.includes('<item') && !xml.includes('<entry')) {
                console.log(`No items in feed: ${feed.url}`);
                return [];
            }

            return parseRSS(xml, feed.category);
        } catch (e) {
            console.error(`Feed error (${feed.category}):`, e);
            return [];
        }
    });

    const results = await Promise.allSettled(feedPromises);
    for (const result of results) {
        if (result.status === 'fulfilled') {
            allArticles.push(...result.value);
        }
    }

    // Sort newest first
    allArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

    return allArticles;
}

export default news;
