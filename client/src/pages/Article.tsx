import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import type { Article } from "@shared/schema";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";
import { getCatBg, timeAgo, MediumCard } from "../components/ArticleCard";
import { cn } from "../lib/utils";

export default function ArticlePage() {
  const { slug } = useParams();

  const { data: article, isLoading, error } = useQuery<Article>({
    queryKey: ["/api/articles", slug],
    queryFn: () => fetch(`/api/articles/${slug}`).then(r => {
      if (!r.ok) throw new Error("Not found");
      return r.json();
    }),
    enabled: !!slug,
  });

  const { data: related = [] } = useQuery<Article[]>({
    queryKey: ["/api/articles", "related", article?.category],
    queryFn: () =>
      fetch(`/api/articles?category=${article?.category}&limit=4`).then(r => r.json()),
    enabled: !!article,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-8 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4" />
          <div className="h-8 bg-gray-200 rounded w-full mb-2" />
          <div className="h-8 bg-gray-200 rounded w-3/4 mb-6" />
          <div className="bg-gray-200 h-72 w-full rounded-sm mb-6" />
          {[1,2,3,4].map(i => <div key={i} className="h-4 bg-gray-200 rounded w-full mb-3" />)}
        </main>
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-black mb-2">Article not found</h1>
          <a href="/" className="text-[#CC0000] font-bold hover:underline no-underline">← Back to Home</a>
        </main>
        <Footer />
      </div>
    );
  }

  const shareOnWhatsApp = () => {
    window.open(`https://wa.me/?text=${encodeURIComponent(article.title + " — " + window.location.href)}`, "_blank");
  };

  const shareOnTwitter = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(article.title)}&url=${encodeURIComponent(window.location.href)}`, "_blank");
  };

  const relatedFiltered = related.filter(a => a.slug !== article.slug).slice(0, 3);

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
          <a href="/" className="hover:text-[#CC0000] transition-colors no-underline">Home</a>
          <span>/</span>
          <a
            href={`/category/${article.category.toLowerCase()}`}
            className="hover:text-[#CC0000] transition-colors no-underline"
          >
            {article.category}
          </a>
        </div>

        {/* Category badge */}
        <span className={cn("inline-block text-white text-xs font-black px-2.5 py-1 mb-4 tracking-wider", getCatBg(article.category))}>
          {article.category.toUpperCase()}
        </span>

        {/* Title */}
        <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-4">
          {article.title}
        </h1>

        {/* Meta */}
        <div className="flex items-center gap-4 text-sm text-gray-500 mb-6 pb-4 border-b border-gray-200">
          <span>{timeAgo(article.publishedAt!)}</span>
          {article.sourceName && <span>via {article.sourceName}</span>}
          <span>{article.viewCount} views</span>
        </div>

        {/* Hero image */}
        {article.imageUrl && (
          <div className="mb-6">
            <img
              src={article.imageUrl}
              alt={article.title}
              className="w-full max-h-[480px] object-cover rounded-sm"
            />
            {article.sourceName && (
              <p className="text-xs text-gray-400 mt-1">Source: {article.sourceName}</p>
            )}
          </div>
        )}

        {/* Content */}
        <div className="prose prose-lg max-w-none mb-8">
          <p className="text-lg font-semibold text-gray-800 leading-relaxed mb-4">{article.excerpt}</p>
          {article.content.split("\n\n").map((para, i) => (
            <p key={i} className="text-base text-gray-700 leading-relaxed mb-4">{para}</p>
          ))}
        </div>

        {/* Source */}
        {article.sourceUrl && (
          <div className="bg-gray-50 border border-gray-200 rounded-sm px-4 py-3 mb-6">
            <p className="text-xs text-gray-500">
              Original source:{" "}
              <a
                href={article.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#CC0000] hover:underline"
              >
                {article.sourceName || article.sourceUrl}
              </a>
            </p>
          </div>
        )}

        {/* Share */}
        <div className="flex items-center gap-3 mb-10 pt-4 border-t border-gray-200">
          <span className="text-sm font-bold text-gray-700">Share:</span>
          <button
            onClick={shareOnWhatsApp}
            className="bg-green-500 text-white text-xs font-bold px-4 py-2 rounded hover:bg-green-600 transition-colors"
          >
            WhatsApp
          </button>
          <button
            onClick={shareOnTwitter}
            className="bg-[#0A1628] text-white text-xs font-bold px-4 py-2 rounded hover:bg-navy-900 transition-colors"
          >
            Twitter/X
          </button>
          <button
            onClick={() => navigator.clipboard?.writeText(window.location.href)}
            className="border border-gray-300 text-gray-600 text-xs font-bold px-4 py-2 rounded hover:border-gray-500 transition-colors"
          >
            Copy Link
          </button>
        </div>

        {/* Related articles */}
        {relatedFiltered.length > 0 && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-6 bg-[#CC0000]" />
              <h2 className="text-lg font-black text-gray-900">Related Stories</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {relatedFiltered.map(a => <MediumCard key={a.id} article={a} />)}
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
