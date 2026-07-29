import type { Express } from "express";
import {
  getArticles,
  getArticleBySlug,
  getArticleCount,
  subscribeNewsletter,
  getUsageStats,
  insertArticle,
} from "./storage.js";
import { fetchAllFeeds } from "./rss.js";
import { getLiveMarketPrices } from "./marketPrices.js";
import { generateOriginalArticle, estimateCostUsd } from "./openai.js";
import { Resend } from "resend";
import { z } from "zod";

const resend = new Resend(process.env.RESEND_API_KEY);

function requireAdmin(req: any, res: any, next: any) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) return next();
  const token = req.headers["x-admin-token"];
  if (token === adminPassword) return next();
  res.status(401).json({ error: "Unauthorized" });
}

export function registerRoutes(app: Express) {
  app.get("/api/articles", async (req, res) => {
    try {
      const { category, limit = "20", offset = "0", featured } = req.query;
      const arts = await getArticles({
        category: category as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        featured: featured === "true" ? true : undefined,
      });
      res.json(arts);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/articles/count", async (_req, res) => {
    try {
      const count = await getArticleCount();
      res.json({ count });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/articles/:slug", async (req, res) => {
    try {
      const article = await getArticleBySlug(req.params.slug);
      if (!article) return res.status(404).json({ error: "Not found" });
      res.json(article);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/newsletter/subscribe", async (req, res) => {
    try {
      const { email } = z.object({ email: z.string().email() }).parse(req.body);
      await subscribeNewsletter(email);

      // Send welcome email via Resend (fire-and-forget — don't block response)
      resend.emails.send({
        from: "AA+News <support@agricafricmarket.com>",
        to: email,
        subject: "Welcome to AA+News — Nigeria's story, told fully",
        html: `
          <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#fff;">
            <div style="background:#0A1628;padding:24px 32px;display:flex;align-items:center;gap:8px;">
              <span style="color:#CC0000;font-size:24px;font-weight:900;letter-spacing:-1px;">AA+</span>
              <span style="color:#fff;font-size:24px;font-weight:900;">News</span>
            </div>
            <div style="padding:32px;">
              <h1 style="font-size:22px;font-weight:900;color:#111;margin:0 0 12px;">You're in. Welcome to AA+News.</h1>
              <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 20px;">
                Every morning you'll get Nigeria's top business, agriculture, and economy stories — rewritten for clarity, delivered straight to your inbox.
              </p>
              <p style="color:#444;font-size:15px;line-height:1.6;margin:0 0 24px;">
                In the meantime, catch up on the latest:
              </p>
              <a href="${process.env.AANEWS_PUBLIC_URL || 'https://agricafricmarket.com'}"
                 style="display:inline-block;background:#CC0000;color:#fff;font-weight:700;font-size:14px;padding:12px 24px;text-decoration:none;border-radius:4px;">
                Read Today's News →
              </a>
            </div>
            <div style="background:#f5f5f5;padding:20px 32px;border-top:1px solid #e5e5e5;">
              <p style="color:#888;font-size:12px;margin:0;">
                You subscribed with ${email}. 
                To unsubscribe, reply with "unsubscribe" in the subject line.<br/>
                © ${new Date().getFullYear()} AgricAfric Group · <a href="https://agricafricmarket.com" style="color:#CC0000;">AgricAfric Marketplace</a>
              </p>
            </div>
          </div>
        `,
      }).catch(err => console.error("Welcome email failed:", err));

      res.json({ ok: true, message: "Subscribed successfully!" });
    } catch (e: any) {
      res.status(400).json({ error: e.message });
    }
  });

  app.post("/api/admin/fetch-rss", requireAdmin, async (_req, res) => {
    try {
      const result = await fetchAllFeeds();
      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/market-prices", async (_req, res) => {
    try {
      const prices = await getLiveMarketPrices();
      res.json(prices);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/admin/stats", requireAdmin, async (_req, res) => {
    try {
      const stats = await getUsageStats();
      res.json(stats);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── AI Desk: generate a brand-owned original article ──────────────────
  app.post("/api/admin/generate-article", requireAdmin, async (req, res) => {
    try {
      const { prompt, category } = z.object({
        prompt: z.string().min(10).max(2000),
        category: z.string().default("Breaking"),
      }).parse(req.body);

      // Pull recent articles in this category as context
      const contextArticles = await getArticles({ category, limit: 6 });

      const result = await generateOriginalArticle(
        prompt,
        category,
        contextArticles.map(a => ({ title: a.title, content: a.content }))
      );

      res.json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // ── AI Desk: publish (or save as draft) a generated article ───────────
  app.post("/api/admin/publish-generated", requireAdmin, async (req, res) => {
    try {
      const body = z.object({
        title: z.string().min(1),
        excerpt: z.string().min(1),
        content: z.string().min(1),
        category: z.string().min(1),
        authorName: z.string().default("AA+News AI Desk"),
        publishNow: z.boolean().default(true),
      }).parse(req.body);

      function slugify(text: string): string {
        return text.toLowerCase().replace(/[^a-z0-9\s-]/g, "").replace(/\s+/g, "-").replace(/-+/g, "-").trim().slice(0, 100);
      }

      const slug = slugify(body.title) + "-" + Date.now().toString().slice(-6);

      const article = await insertArticle({
        title: body.title,
        slug,
        excerpt: body.excerpt,
        content: body.content,
        category: body.category,
        sourceName: "AA+News",
        sourceUrl: null,
        originalTitle: body.title,
        isRewritten: false,
        isOriginal: true,
        isFeatured: false,
        authorName: body.authorName,
        status: body.publishNow ? "published" : "draft",
        publishedAt: body.publishNow ? new Date() : null,
        imageUrl: null,
      });

      res.json({ ok: true, article });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok", app: "AA+News" });
  });
}
