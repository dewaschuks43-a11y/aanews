import { pgTable, text, integer, boolean, timestamp, serial } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const articles = pgTable("aanews_articles", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  slug: text("slug").notNull().unique(),
  excerpt: text("excerpt").notNull(),
  content: text("content").notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  sourceName: text("source_name"),
  sourceUrl: text("source_url"),
  originalTitle: text("original_title"),
  isRewritten: boolean("is_rewritten").default(false),
  isFeatured: boolean("is_featured").default(false),
  viewCount: integer("view_count").default(0),
  publishedAt: timestamp("published_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertArticleSchema = createInsertSchema(articles).omit({
  id: true,
  createdAt: true,
  viewCount: true,
});

export type InsertArticle = z.infer<typeof insertArticleSchema>;
export type Article = typeof articles.$inferSelect;

export const newsletterSubscribers = pgTable("aanews_newsletter_subscribers", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  subscribedAt: timestamp("subscribed_at").defaultNow(),
  isActive: boolean("is_active").default(true),
});

export const insertSubscriberSchema = createInsertSchema(newsletterSubscribers).omit({
  id: true,
  subscribedAt: true,
});

export type InsertSubscriber = z.infer<typeof insertSubscriberSchema>;
export type Subscriber = typeof newsletterSubscribers.$inferSelect;

export const categories = [
  "Breaking",
  "Politics",
  "Economy",
  "Agriculture",
  "Entertainment",
  "Sports",
  "Lifestyle",
  "Tech",
  "Health",
  "Viral",
  "Business",
  "Celebrity",
] as const;

export type Category = (typeof categories)[number];

export const usageLogs = pgTable("aanews_usage_logs", {
  id: serial("id").primaryKey(),
  fetchedAt: timestamp("fetched_at").defaultNow(),
  articlesProcessed: integer("articles_processed").notNull().default(0),
  articlesRewritten: integer("articles_rewritten").notNull().default(0),
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  estimatedCostUsd: text("estimated_cost_usd").notNull().default("0.00"),
});

export type UsageLog = typeof usageLogs.$inferSelect;
