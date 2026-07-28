import { pool } from "./db.js";

export async function ensureTables() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS aanews_articles (
        id SERIAL PRIMARY KEY,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        excerpt TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT NOT NULL,
        image_url TEXT,
        source_name TEXT,
        source_url TEXT,
        original_title TEXT,
        is_rewritten BOOLEAN DEFAULT false,
        is_featured BOOLEAN DEFAULT false,
        view_count INTEGER DEFAULT 0,
        published_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS aanews_newsletter_subscribers (
        id SERIAL PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        subscribed_at TIMESTAMP DEFAULT NOW(),
        is_active BOOLEAN DEFAULT true
      );
    `);
    console.log("[AA+News] Tables ready");
  } finally {
    client.release();
  }
}
