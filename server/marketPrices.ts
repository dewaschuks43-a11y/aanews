import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;

let _pool: Pool | null = null;

function getPool(): Pool {
  if (!_pool) {
    _pool = new Pool({ connectionString: process.env.DATABASE_URL! });
  }
  return _pool;
}

export interface MarketPrice {
  item: string;
  price: string;
  unit: string;
  category: string;
  location: string;
}

const AGRIC_KEYWORDS = [
  "tomato", "rice", "yam", "palm oil", "maize", "beans", "cassava",
  "pepper", "onion", "plantain", "groundnut", "soybean", "sorghum",
  "millet", "wheat", "cocoa", "cashew", "fish", "chicken", "goat",
  "cow", "cattle", "egg", "potato", "vegetable", "fruit",
];

export async function getLiveMarketPrices(): Promise<MarketPrice[]> {
  try {
    const pool = getPool();
    const result = await pool.query(`
      SELECT name, price::numeric, price_unit, category, state
      FROM products
      WHERE 
        in_stock = true
        AND price > 0
        AND removed_by_admin IS DISTINCT FROM true
        AND (
          ${AGRIC_KEYWORDS.map((_, i) => `LOWER(name) LIKE $${i + 1}`).join(" OR ")}
        )
      ORDER BY created_at DESC
      LIMIT 50
    `, AGRIC_KEYWORDS.map(k => `%${k}%`));

    if (result.rows.length === 0) return [];

    const grouped: Record<string, { prices: number[]; unit: string; location: string }> = {};

    for (const row of result.rows) {
      const key = row.name.toLowerCase().slice(0, 30);
      if (!grouped[key]) {
        grouped[key] = { prices: [], unit: row.price_unit || "unit", location: row.state || "Nigeria" };
      }
      grouped[key].prices.push(parseFloat(row.price));
    }

    const prices: MarketPrice[] = [];
    for (const [name, data] of Object.entries(grouped).slice(0, 8)) {
      const avg = data.prices.reduce((a, b) => a + b, 0) / data.prices.length;
      prices.push({
        item: name.charAt(0).toUpperCase() + name.slice(1),
        price: `₦${avg.toLocaleString("en-NG", { maximumFractionDigits: 0 })}`,
        unit: data.unit,
        category: "Agriculture",
        location: data.location,
      });
    }

    return prices;
  } catch (e) {
    console.error("[Market prices] DB error:", e);
    return [];
  }
}
