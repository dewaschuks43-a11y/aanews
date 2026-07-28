import { useQuery, useMutation } from "@tanstack/react-query";
import type { Article } from "@shared/schema";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { HeroCard, MediumCard, ListItem } from "../components/ArticleCard";
import { apiFetch, apiRequest, queryClient } from "../lib/queryClient";

interface MarketPrice {
  item: string;
  price: string;
  unit: string;
  category: string;
  location: string;
}

const FALLBACK_PRICES = [
  { item: "Tomato (basket)", price: "₦3,200", unit: "basket" },
  { item: "Rice (50kg)", price: "₦87,000", unit: "bag" },
  { item: "Yam (tuber)", price: "₦1,800", unit: "tuber" },
  { item: "Palm Oil (25L)", price: "₦42,000", unit: "25L" },
  { item: "Maize (bag)", price: "₦38,500", unit: "bag" },
  { item: "Beans (kg)", price: "₦1,650", unit: "kg" },
];

function SkeletonCard({ h = "h-36" }: { h?: string }) {
  return (
    <div className="animate-pulse">
      <div className={`bg-gray-200 ${h} w-full rounded-sm mb-2`} />
      <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
      <div className="h-4 bg-gray-200 rounded w-full mb-1" />
      <div className="h-4 bg-gray-200 rounded w-3/4" />
    </div>
  );
}

export default function Home() {
  const { data: articles = [], isLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles"],
    queryFn: () => apiFetch("/api/articles?limit=30"),
  });

  const { data: livePrices = [] } = useQuery<MarketPrice[]>({
    queryKey: ["/api/market-prices"],
    queryFn: () => apiFetch("/api/market-prices"),
    staleTime: 1000 * 60 * 10,
  });

  const displayPrices = livePrices.length > 0 ? livePrices : FALLBACK_PRICES;

  const fetchRss = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/fetch-rss"),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/articles"] }),
  });

  const hero = articles[0];
  const sidebarTop = articles.slice(1, 2);
  const secondRow = articles.slice(2, 6);
  const moreStories = articles.slice(6, 18);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900">
      <Header />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Empty state — trigger RSS fetch */}
        {!isLoading && articles.length === 0 && (
          <div className="text-center py-16 border-2 border-dashed border-gray-200 rounded-sm mb-8">
            <p className="text-gray-500 text-lg mb-2 font-semibold">No articles yet</p>
            <p className="text-gray-400 text-sm mb-4">Fetch the latest Nigerian news to get started.</p>
            <button
              onClick={() => fetchRss.mutate()}
              disabled={fetchRss.isPending}
              className="bg-[#CC0000] text-white font-bold px-6 py-2.5 rounded hover:bg-red-700 transition-colors disabled:opacity-70"
            >
              {fetchRss.isPending ? "Fetching news..." : "Fetch Latest News"}
            </button>
            {fetchRss.isSuccess && (
              <p className="text-green-600 text-sm mt-3">Done! Refreshing articles...</p>
            )}
          </div>
        )}

        {/* Hero + Sidebar */}
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-8">
            {isLoading ? (
              <div className="animate-pulse">
                <div className="bg-gray-200 h-[420px] w-full rounded-sm" />
              </div>
            ) : hero ? (
              <HeroCard article={hero} />
            ) : null}
          </div>

          <div className="col-span-12 md:col-span-4 flex flex-col gap-4">
            {/* Market Prices Widget */}
            <div className="border border-gray-200 rounded-sm">
              <div className="bg-[#0A1628] px-4 py-2 flex items-center justify-between">
                <span className="text-white text-xs font-black tracking-wider uppercase">Market Prices</span>
                <a
                  href="https://agricafricmarket.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-400 text-xs hover:text-[#CC0000] transition-colors no-underline"
                >
                  Live from AgricAfric
                </a>
              </div>
              <div className="divide-y divide-gray-100">
                {displayPrices.map((p, i) => (
                  <div key={i} className="flex items-center justify-between px-4 py-2">
                    <span className="text-xs text-gray-700 font-medium">
                      {p.item}{("unit" in p && (p as any).unit && !(p as any).item.includes(p.unit as string)) ? ` (${p.unit})` : ""}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-900">{p.price}</span>
                      {"location" in p && (
                        <span className="text-xs text-gray-400">{(p as MarketPrice).location}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <div className="px-4 py-2 border-t border-gray-100">
                <a
                  href="https://agricafricmarket.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#CC0000] font-bold hover:underline no-underline"
                >
                  View all prices on AgricAfric Market →
                </a>
              </div>
            </div>

            {/* Sidebar story */}
            {isLoading ? (
              <SkeletonCard h="h-28" />
            ) : sidebarTop[0] ? (
              <MediumCard article={sidebarTop[0]} />
            ) : null}
          </div>
        </div>

        {/* Second row — 4 stories */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          {isLoading
            ? [1, 2, 3, 4].map(i => <SkeletonCard key={i} />)
            : secondRow.map(a => <MediumCard key={a.id} article={a} />)
          }
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4 my-6">
          <div className="h-px bg-gray-200 flex-1" />
          <span className="text-xs font-black text-gray-400 tracking-widest uppercase">More Stories</span>
          <div className="h-px bg-gray-200 flex-1" />
        </div>

        {/* More Stories list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
          {isLoading
            ? [1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="animate-pulse flex gap-3 pb-4 border-b border-gray-100">
                <div className="h-5 w-6 bg-gray-200 rounded shrink-0 mt-1" />
                <div className="flex-1">
                  <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-4 bg-gray-200 rounded w-full mb-1" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            ))
            : moreStories.map((a, i) => <ListItem key={a.id} article={a} index={i} />)
          }
        </div>

        {/* Load more */}
        {!isLoading && articles.length > 18 && (
          <div className="text-center mt-8">
            <a
              href="/category/all"
              className="inline-block border-2 border-[#0A1628] text-[#0A1628] font-bold px-8 py-3 hover:bg-[#0A1628] hover:text-white transition-colors no-underline"
            >
              Load More Stories
            </a>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
