import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import type { Article } from "@shared/schema";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { HeroCard, MediumCard } from "../components/ArticleCard";

export default function CategoryPage() {
  const { category } = useParams();
  const catName = category
    ? category.charAt(0).toUpperCase() + category.slice(1)
    : "All";

  const { data: articles = [], isLoading } = useQuery<Article[]>({
    queryKey: ["/api/articles", "category", catName],
    queryFn: () =>
      fetch(`/api/articles?category=${catName}&limit=30`).then(r => r.json()),
  });

  const hero = articles[0];
  const rest = articles.slice(1);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Category header */}
        <div className="flex items-center gap-3 mb-6 pb-3 border-b-2 border-[#CC0000]">
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-wider">{catName}</h1>
          {!isLoading && (
            <span className="text-sm text-gray-400">{articles.length} stories</span>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="animate-pulse">
                <div className="bg-gray-200 h-36 w-full rounded-sm mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-4 bg-gray-200 rounded w-full" />
              </div>
            ))}
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-500 font-semibold">No articles in this category yet.</p>
            <a href="/" className="text-[#CC0000] font-bold mt-3 block hover:underline no-underline">
              ← Back to Home
            </a>
          </div>
        ) : (
          <>
            {hero && (
              <div className="mb-6">
                <HeroCard article={hero} />
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {rest.map(a => <MediumCard key={a.id} article={a} />)}
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
