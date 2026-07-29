import Parser from "rss-parser";
import { upsertArticle, logUsage } from "./storage.js";
import { rewriteArticle, estimateCostUsd } from "./openai.js";
import type { InsertArticle } from "@shared/schema";

const parser = new Parser({
  customFields: {
    item: ["media:content", "enclosure", "media:thumbnail"],
  },
});

const RSS_SOURCES = [
  // ── Tier 1: Hard news & investigative ──────────────────────────────────
  { name: "Punch", url: "https://punchng.com/feed/", defaultCategory: "Breaking" },
  { name: "Vanguard", url: "https://www.vanguardngr.com/feed/", defaultCategory: "Politics" },
  { name: "Channels TV", url: "https://www.channelstv.com/feed/", defaultCategory: "Breaking" },
  { name: "Premium Times", url: "https://www.premiumtimesng.com/feed", defaultCategory: "Politics" },
  { name: "ThisDay", url: "https://www.thisdaylive.com/index.php/feed/", defaultCategory: "Breaking" },
  { name: "Leadership", url: "https://leadership.ng/feed/", defaultCategory: "Politics" },
  { name: "Daily Trust", url: "https://dailytrust.com/feed/", defaultCategory: "Breaking" },
  { name: "Sahara Reporters", url: "https://saharareporters.com/rss.xml", defaultCategory: "Politics" },
  { name: "Daily Post", url: "https://dailypost.ng/feed", defaultCategory: "Breaking" },
  { name: "Tribune Online", url: "https://tribuneonlineng.com/feed", defaultCategory: "Politics" },

  // ── Tier 2: Broadcast TV news ───────────────────────────────────────────
  { name: "BusinessDay", url: "https://businessday.ng/feed/", defaultCategory: "Business" },
  { name: "Arise TV", url: "https://www.arise.tv/feed", defaultCategory: "Breaking" },
  { name: "AIT Live", url: "https://www.ait.live/feed", defaultCategory: "Breaking" },
  { name: "TVC News", url: "https://www.tvcnews.tv/rss", defaultCategory: "Breaking" },

  // ── Tier 3: Business & finance ─────────────────────────────────────────
  { name: "Nairametrics", url: "https://www.nairametrics.com/feed", defaultCategory: "Economy" },

  // ── Tier 4: Agriculture (AgricAfric focus) ─────────────────────────────
  { name: "Agriculture Nigeria", url: "https://www.agriculturenigeria.com/feed", defaultCategory: "Agriculture" },
  { name: "Farming Farmers Farms", url: "https://farmingfarmersfarms.com/feed", defaultCategory: "Agriculture" },

  // ── Tier 5: Viral, social & entertainment ──────────────────────────────
  { name: "Pulse Nigeria", url: "https://www.pulse.ng/news.rss", defaultCategory: "Breaking" },
  { name: "Pulse Entertainment", url: "https://www.pulse.ng/entertainment.rss", defaultCategory: "Entertainment" },
  { name: "Information Nigeria", url: "https://www.informationng.com/feed", defaultCategory: "Viral" },
  { name: "Instablog9ja", url: "https://instablog9ja.com/feed", defaultCategory: "Viral" },
  { name: "BellaNaija", url: "https://www.bellanaija.com/feed", defaultCategory: "Celebrity" },
  { name: "The NET", url: "https://www.thenet.ng/feed", defaultCategory: "Entertainment" },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim()
    .slice(0, 100);
}

function detectCategory(title: string, description: string): string {
  const text = (title + " " + description).toLowerCase();
  if (/naira|cbn|economy|gdp|inflation|budget|revenue|finance|bank|debt|forex/.test(text)) return "Economy";
  if (/farm|agric|harvest|crop|food|livestock|cattle|maize|rice|yam|tomato/.test(text)) return "Agriculture";
  if (/entertainment|music|movie|nollywood|afrobeat|concert|award/.test(text)) return "Entertainment";
  if (/sport|football|soccer|eagles|premier league|champions league|nfl/.test(text)) return "Sports";
  if (/tech|startup|digital|ai|software|app|internet|telecom|mtn|airtel/.test(text)) return "Tech";
  if (/health|hospital|disease|malaria|covid|nafdac|drug|medicine/.test(text)) return "Health";
  if (/lifestyle|fashion|beauty|travel|food|recipe|relationship/.test(text)) return "Lifestyle";
  if (/business|company|market|stock|trade|investment|profit/.test(text)) return "Business";
  if (/celebrity|actor|actress|singer|artist|billionaire|wealthy/.test(text)) return "Celebrity";
  if (/viral|trending|social media|tiktok|twitter|instagram/.test(text)) return "Viral";
  if (/tinubu|governor|senate|house of rep|presidency|minister|election|inec|policy/.test(text)) return "Politics";
  return "Breaking";
}

function extractRssImage(item: any): string | null {
  if (item.enclosure?.url && item.enclosure.url.match(/\.(jpe?g|png|webp|gif)/i)) return item.enclosure.url;
  if (item["media:content"]?.["$"]?.url) return item["media:content"]["$"].url;
  if (item["media:thumbnail"]?.["$"]?.url) return item["media:thumbnail"]["$"].url;
  const imgMatch = item.content?.match(/<img[^>]+src="([^"]+)"/);
  if (imgMatch) return imgMatch[1];
  return null;
}

/** Strip HTML tags and collapse whitespace into clean readable text */
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s{3,}/g, "\n\n")
    .trim();
}

/**
 * Fetch the full article text from the source URL.
 * Tries to extract the article body by looking for common content containers.
 * Falls back to the full page text if no article container is found.
 * Returns null on failure so the caller can use the RSS snippet.
 */
async function fetchFullArticleText(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AANewsBot/1.0; +https://agricafricmarket.com/news)",
        "Accept": "text/html,application/xhtml+xml",
      },
    });
    clearTimeout(id);
    if (!res.ok) return null;

    const html = await res.text();

    // Try common article content wrappers used by Nigerian news sites
    const contentPatterns = [
      // Article body containers (generic, works across many sites)
      /<article[^>]*>([\s\S]*?)<\/article>/i,
      /<div[^>]+class="[^"]*(?:article-body|article-content|story-body|post-content|entry-content|content-body|article__body|tdb-block-inner)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      // Punch, Premium Times
      /<div[^>]+class="[^"]*(?:post-content|single-post-content|article-detail)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      // Vanguard
      /<div[^>]+class="[^"]*story-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      // BusinessDay
      /<div[^>]+class="[^"]*post-body[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      // ThisDay / Leadership / Tribune / Daily Post (WordPress td- theme)
      /<div[^>]+class="[^"]*td-post-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      // Sahara Reporters (Drupal)
      /<div[^>]+class="[^"]*field-item[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      // Nairametrics / Business Post (WordPress Elementor)
      /<div[^>]+class="[^"]*elementor-widget-theme-post-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      // Arise TV / AIT / TVC (broadcast CMS patterns)
      /<div[^>]+class="[^"]*(?:single-content|news-content|article-text|story-text|main-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      // Pulse Nigeria (AMP / custom CMS)
      /<div[^>]+class="[^"]*(?:pulse-content|article__content|content__body)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      // BellaNaija / Information Nigeria / Instablog (WordPress standard)
      /<div[^>]+class="[^"]*(?:entry-content|post-entry|the-content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      // Agriculture Nigeria / Farming Farmers Farms (niche WordPress)
      /<div[^>]+class="[^"]*(?:blog-content|farm-content|agric-content|content-area)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
      // The NET (entertainment WordPress)
      /<div[^>]+class="[^"]*(?:jeg_inner_content|jeg_post_content)[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    ];

    let extracted = "";
    for (const pattern of contentPatterns) {
      const match = html.match(pattern);
      if (match && match[1]) {
        const text = stripHtml(match[1]);
        if (text.length > 300) {
          extracted = text;
          break;
        }
      }
    }

    // Fallback: strip everything and take what's left
    if (!extracted) {
      // Remove nav, header, footer, sidebar, script, style first
      const cleaned = html
        .replace(/<(nav|header|footer|aside|script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ")
        .replace(/<!--[\s\S]*?-->/g, " ");
      extracted = stripHtml(cleaned);
    }

    // Take the meaty middle — skip boilerplate at very start and end
    const words = extracted.split(/\s+/).filter(Boolean);
    if (words.length < 80) return null; // too thin, not worth it

    // Cap at 800 words to keep costs reasonable while getting real depth
    return words.slice(0, 800).join(" ");
  } catch {
    return null;
  }
}

/** Fetch the actual article page and extract its og:image meta tag. */
async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AANewsBot/1.0; +https://agricafricmarket.com/news)",
        "Accept": "text/html",
      },
    });
    clearTimeout(id);
    if (!res.ok) return null;
    const html = await res.text();
    const m =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
    const found = m ? m[1].trim() : null;
    if (found && found.startsWith("http") && found.length > 10) return found;
    return null;
  } catch {
    return null;
  }
}

/** Returns true when the image URL looks like a site-wide logo / generic share image. */
function isGenericImage(url: string, genericUrls: Set<string>): boolean {
  if (genericUrls.has(url)) return true;
  return /logo|brand|default|placeholder|og[\-_]image|social[\-_]share|site[\-_]image|favicon/i.test(url);
}

const FALLBACK_IMAGES: Record<string, string> = {
  Politics: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&q=80",
  Economy: "https://images.unsplash.com/photo-1580048915913-4f8f5cb481c4?w=800&q=80",
  Agriculture: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=800&q=80",
  Entertainment: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80",
  Sports: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=800&q=80",
  Tech: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&q=80",
  Health: "https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=800&q=80",
  Business: "https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&q=80",
  Lifestyle: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80",
  Viral: "https://images.unsplash.com/photo-1611605698335-8b1569810432?w=800&q=80",
  Celebrity: "https://images.unsplash.com/photo-1549924231-f129b911e442?w=800&q=80",
  Breaking: "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&q=80",
};

export async function fetchAllFeeds(): Promise<{ fetched: number; saved: number; errors: string[] }> {
  let fetched = 0;
  let saved = 0;
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let articlesRewritten = 0;
  const errors: string[] = [];

  for (const source of RSS_SOURCES) {
    try {
      const feed = await parser.parseURL(source.url);
      const items = feed.items.slice(0, 5).filter(i => i.title);

      // Detect which RSS images are generic (same URL repeated across articles)
      const rssImages = items.map(i => extractRssImage(i));
      const imageCounts: Record<string, number> = {};
      for (const img of rssImages) {
        if (img) imageCounts[img] = (imageCounts[img] ?? 0) + 1;
      }
      const genericUrls = new Set(
        Object.entries(imageCounts)
          .filter(([, count]) => count >= 3)
          .map(([url]) => url)
      );

      // Fetch og:image AND full article text in parallel for all items
      const pageResults = await Promise.allSettled(
        items.map(async (item, idx) => {
          if (!item.link) return { ogImage: null, fullText: null };

          const rssImg = rssImages[idx];
          const needsOg = !rssImg || isGenericImage(rssImg, genericUrls);

          // Run og:image fetch and full article fetch concurrently per article
          const [ogImage, fullText] = await Promise.allSettled([
            needsOg ? fetchOgImage(item.link) : Promise.resolve(null),
            fetchFullArticleText(item.link),
          ]);

          return {
            ogImage: ogImage.status === "fulfilled" ? ogImage.value : null,
            fullText: fullText.status === "fulfilled" ? fullText.value : null,
          };
        })
      );

      for (let idx = 0; idx < items.length; idx++) {
        const item = items[idx];
        if (!item.title) continue;
        fetched++;

        const pageResult = pageResults[idx].status === "fulfilled"
          ? pageResults[idx].value
          : { ogImage: null, fullText: null };

        const rssImg = rssImages[idx];
        const ogImg = pageResult.ogImage;
        const fullText = pageResult.fullText;

        // Priority: og:image from page > RSS image (if not generic) > Unsplash fallback
        const category = detectCategory(item.title, item.contentSnippet || item.content || "");
        const imageUrl =
          ogImg ||
          (rssImg && !isGenericImage(rssImg, genericUrls) ? rssImg : null) ||
          FALLBACK_IMAGES[category];

        const originalTitle = item.title;
        // Use full article text if scraped successfully, else fall back to RSS snippet
        const rssSnippet = item.contentSnippet || item.content || "";
        const sourceText = (fullText && fullText.length > rssSnippet.length)
          ? fullText
          : rssSnippet;

        const baseSlug = slugify(item.title);
        const slug = baseSlug + "-" + Date.now().toString().slice(-6);

        let title = originalTitle;
        let content = rssSnippet; // fallback if AI fails
        let excerpt = rssSnippet.slice(0, 200) + "...";
        let isRewritten = false;

        try {
          const rewritten = await rewriteArticle(originalTitle, sourceText, category);
          title = rewritten.title;
          content = rewritten.content;
          excerpt = rewritten.excerpt;
          isRewritten = rewritten.inputTokens > 0;
          if (isRewritten) {
            articlesRewritten++;
            totalInputTokens += rewritten.inputTokens;
            totalOutputTokens += rewritten.outputTokens;
          }
        } catch {
          excerpt = rssSnippet.slice(0, 200) + (rssSnippet.length > 200 ? "..." : "");
        }

        const article: InsertArticle = {
          title,
          slug,
          excerpt,
          content,
          category,
          imageUrl,
          sourceName: source.name,
          sourceUrl: item.link || source.url,
          originalTitle,
          isRewritten,
          isFeatured: false,
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
        };

        await upsertArticle(article);
        saved++;
      }
    } catch (e: any) {
      errors.push(`${source.name}: ${e.message}`);
    }
  }

  if (articlesRewritten > 0 || fetched > 0) {
    await logUsage({
      articlesProcessed: fetched,
      articlesRewritten,
      inputTokens: totalInputTokens,
      outputTokens: totalOutputTokens,
      estimatedCostUsd: estimateCostUsd(totalInputTokens, totalOutputTokens),
    }).catch(console.error);
  }

  return { fetched, saved, errors };
}
