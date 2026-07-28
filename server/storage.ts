import { db } from "./db.js";
import { articles, newsletterSubscribers, usageLogs } from "@shared/schema";
import type { InsertArticle, Article, InsertSubscriber, UsageLog } from "@shared/schema";
import { eq, desc, ilike, and, sql, sum } from "drizzle-orm";

export async function getArticles(opts: {
  category?: string;
  limit?: number;
  offset?: number;
  featured?: boolean;
}): Promise<Article[]> {
  const { category, limit = 20, offset = 0, featured } = opts;
  const conditions = [];
  if (category && category !== "All") {
    conditions.push(ilike(articles.category, category));
  }
  if (featured !== undefined) {
    conditions.push(eq(articles.isFeatured, featured));
  }
  return db
    .select()
    .from(articles)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(articles.publishedAt))
    .limit(limit)
    .offset(offset);
}

export async function getArticleBySlug(slug: string): Promise<Article | undefined> {
  const [article] = await db.select().from(articles).where(eq(articles.slug, slug));
  if (article) {
    await db
      .update(articles)
      .set({ viewCount: (article.viewCount ?? 0) + 1 })
      .where(eq(articles.id, article.id));
  }
  return article;
}

export async function insertArticle(data: InsertArticle): Promise<Article> {
  const [article] = await db.insert(articles).values(data).returning();
  return article;
}

export async function upsertArticle(data: InsertArticle): Promise<Article> {
  const existing = await db
    .select()
    .from(articles)
    .where(eq(articles.slug, data.slug))
    .limit(1);
  if (existing.length > 0) return existing[0];
  return insertArticle(data);
}

export async function getArticleCount(): Promise<number> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(articles);
  return Number(count);
}

export async function setFeatured(id: number, featured: boolean): Promise<void> {
  await db.update(articles).set({ isFeatured: featured }).where(eq(articles.id, id));
}

export async function subscribeNewsletter(email: string): Promise<void> {
  await db
    .insert(newsletterSubscribers)
    .values({ email })
    .onConflictDoNothing();
}

export async function getAllSubscribers() {
  return db.select().from(newsletterSubscribers).where(eq(newsletterSubscribers.isActive, true));
}

export async function logUsage(data: {
  articlesProcessed: number;
  articlesRewritten: number;
  inputTokens: number;
  outputTokens: number;
  estimatedCostUsd: string;
}): Promise<void> {
  await db.insert(usageLogs).values(data);
}

export async function getUsageStats() {
  const [totals] = await db
    .select({
      totalFetches: sql<number>`count(*)`,
      totalProcessed: sql<number>`coalesce(sum(articles_processed), 0)`,
      totalRewritten: sql<number>`coalesce(sum(articles_rewritten), 0)`,
      totalInputTokens: sql<number>`coalesce(sum(input_tokens), 0)`,
      totalOutputTokens: sql<number>`coalesce(sum(output_tokens), 0)`,
      totalCostUsd: sql<string>`coalesce(sum(estimated_cost_usd::numeric), 0)::text`,
    })
    .from(usageLogs);

  const recentLogs = await db
    .select()
    .from(usageLogs)
    .orderBy(desc(usageLogs.fetchedAt))
    .limit(10);

  const [articleCount] = await db.select({ count: sql<number>`count(*)` }).from(articles);
  const [subscriberCount] = await db.select({ count: sql<number>`count(*)` }).from(newsletterSubscribers);

  return {
    totals: {
      ...totals,
      totalCostUsd: parseFloat(totals?.totalCostUsd || "0").toFixed(6),
    },
    recentLogs,
    articleCount: Number(articleCount?.count || 0),
    subscriberCount: Number(subscriberCount?.count || 0),
  };
}
