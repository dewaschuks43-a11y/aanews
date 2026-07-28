# AA+News — Nigeria's Story, Told Fully

## What This Is
AA+News is a standalone Nigerian news aggregator and rewriter. It pulls RSS feeds from 8 major Nigerian outlets (Punch, Vanguard, Channels TV, BusinessDay, Premium Times, ThisDay, Leadership, Daily Trust), rewrites articles using OpenAI for clarity and depth, and serves them as a clean news site. It also has a newsletter subscription system.

AA+News is a **separate project from AgricAfric** (the agricultural marketplace). It was originally part of AgricAfric but was split into its own standalone app. AgricAfric can optionally link to AA+News via the `VITE_AANEWS_URL` environment variable.

## User Preferences
Preferred communication style: Simple, everyday language.

## Tech Stack
- **Frontend**: React 18, TypeScript, Vite, Wouter (routing), TailwindCSS, Shadcn/ui
- **Backend**: Express.js (Node.js), ESM modules (`"type": "module"` in package.json)
- **Database**: PostgreSQL via `@neondatabase/serverless` using **WebSocket mode** (NEVER switch to HTTP mode — it has a boolean/array parsing bug)
- **ORM**: Drizzle ORM (`drizzle-orm/neon-serverless`)
- **AI**: OpenAI GPT-4o for article rewriting — reads `OPENAI_API_KEY` or falls back to `AI_INTEGRATIONS_OPENAI_API_KEY`
- **Email**: Resend for newsletter welcome emails (`RESEND_API_KEY`)
- **Scheduling**: node-cron — RSS fetch runs every 3 hours automatically

## Environment Variables (Secrets)

| Variable | Required | Purpose |
|---|---|---|
| `DATABASE_URL` | YES | PostgreSQL connection string (Neon or Replit built-in) |
| `ADMIN_PASSWORD` | YES | Password to access `/admin` — sent as `x-admin-token` header |
| `OPENAI_API_KEY` | Optional | For article rewriting (or use Replit AI Integration) |
| `RESEND_API_KEY` | Optional | For newsletter welcome emails |
| `AANEWS_PORT` | Optional | Port to run on (default: 3000; Replit dev uses 5000) |

If using **Replit's built-in Database** (recommended for dev), `DATABASE_URL` is set automatically — no need to enter it manually.

If using **Replit AI Integration** for OpenAI, no `OPENAI_API_KEY` needed — the integration sets `AI_INTEGRATIONS_OPENAI_API_KEY` automatically.

## Database Schema
All tables are prefixed with `aanews_` to avoid conflicts if sharing a database:
- `aanews_articles` — news articles (id, title, slug, excerpt, content, category, imageUrl, sourceName, sourceUrl, isRewritten, isFeatured, viewCount, publishedAt)
- `aanews_newsletter` — email subscribers (id, email, subscribedAt, isActive)
- `aanews_usage_log` — tracks OpenAI API usage/cost

Tables are auto-created on startup via `server/migrate.ts` (`ensureTables()`). No manual migration needed for fresh installs. For schema changes, run `npm run db:push`.

## Project Structure
```
server/
  index.ts       — Express app, starts server, launches cron scheduler
  routes.ts      — All API routes (/api/articles, /api/newsletter, /api/fetch-news, etc.)
  storage.ts     — All database queries (Drizzle ORM)
  db.ts          — Database connection (WebSocket Neon driver)
  migrate.ts     — Auto-creates tables if they don't exist
  rss.ts         — RSS feed fetching from 8 Nigerian outlets
  openai.ts      — Article rewriting with GPT-4o
  marketPrices.ts — Live market/commodity price data

client/src/
  pages/
    Home.tsx     — Main news feed with categories
    Article.tsx  — Single article view
    Category.tsx — Category filtered view
    Admin.tsx    — Admin dashboard (password protected)
  App.tsx        — Routing (Wouter)

shared/
  schema.ts      — Drizzle schema (articles, newsletter, usage_log tables)
```

## API Endpoints
- `GET /api/articles` — list articles (query: category, limit, offset, featured)
- `GET /api/articles/count` — total article count
- `GET /api/articles/:slug` — single article by slug
- `POST /api/newsletter/subscribe` — subscribe email
- `POST /api/fetch-news` — trigger RSS fetch + AI rewrite (admin only)
- `GET /api/market-prices` — live commodity prices
- `GET /api/usage-stats` — OpenAI cost tracking (admin only)
- `GET /api/health` — health check (returns `{ ok: true }`)

## Admin Panel
The `/admin` page is password protected. The password is set via the `ADMIN_PASSWORD` environment variable. The frontend sends it as the `x-admin-token` header. If `ADMIN_PASSWORD` is not set, admin routes are open (dev convenience only — always set it in production).

From admin, you can:
- Trigger RSS fetch + AI rewrite for all sources
- View usage stats (API calls, cost)
- See article counts by category

## RSS Sources
8 Nigerian outlets configured in `server/rss.ts`:
Punch, Vanguard, Channels TV, BusinessDay, Premium Times, ThisDay, Leadership, Daily Trust

Category auto-detection runs on title + description text. Articles are upserted by slug to avoid duplicates.

## Deployment
- **Dev (Replit)**: `npm run dev` — runs Vite + Express together on `AANEWS_PORT` (default 5000 for Replit, 3000 otherwise)
- **Production (Railway)**: Multi-stage Dockerfile builds the app; `railway.toml` sets `startCommand = "node dist/server/index.js"`
- **Health check**: `/api/health` returns `{ ok: true }`

## Key Decisions & Gotchas
1. **WebSocket DB driver only** — `drizzle-orm/neon-serverless` with `neonConfig.webSocketConstructor = ws`. HTTP driver (`drizzle-orm/neon-http`) has a known bug returning wrong values for booleans and arrays.
2. **ESM modules** — `package.json` has `"type": "module"`. All imports use `.js` extensions even for `.ts` files.
3. **Tables auto-created** — `ensureTables()` in `migrate.ts` runs `CREATE TABLE IF NOT EXISTS` on startup. No need to manually run migrations for a fresh install.
4. **OpenAI fallback** — reads `OPENAI_API_KEY` first, then `AI_INTEGRATIONS_OPENAI_API_KEY` (Replit AI Integration). If neither set, AI rewriting is disabled but the app still runs.
5. **Port config** — `AANEWS_PORT` env var controls port. Replit sets it to 5000 (as a Configuration, not a Secret). Railway uses the Dockerfile default of 3000. Don't hardcode ports.
6. **Vite base path** — `vite.config.ts` uses `base: "/"` (not `/aanews/`). Always keep it as `/`.
