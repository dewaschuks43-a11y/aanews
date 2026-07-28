import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { registerRoutes } from "./routes.js";
import { ensureTables } from "./migrate.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
app.use(express.json());

registerRoutes(app);

const isDev = process.env.NODE_ENV === "development";

if (isDev) {
  const { createServer } = await import("vite");
  const vite = await createServer({
    configFile: path.resolve(__dirname, "../vite.config.ts"),
    server: { middlewareMode: true },
    appType: "spa",
  });
  app.use(vite.middlewares);
} else {
  const staticPath = path.resolve(__dirname, "../dist/public");
  app.use(express.static(staticPath));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });
}

const PORT = parseInt(process.env.AANEWS_PORT || "3000");

await ensureTables();

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AA+News running on port ${PORT}`);

  import("node-cron").then(({ default: cron }) => {
    cron.schedule("0 */3 * * *", async () => {
      const { fetchAllFeeds } = await import("./rss.js");
      console.log("AA+News: Running scheduled RSS fetch...");
      try {
        const result = await fetchAllFeeds();
        console.log(`RSS fetch: ${result.saved} saved, ${result.errors.length} errors`);
      } catch (err) {
        console.error("AA+News: Scheduled RSS fetch failed:", err);
      }
    });
    console.log("AA+News: RSS scheduler active — runs every 3 hours");
  }).catch(err => console.error("node-cron load failed:", err));
});
