import type { Article } from "@shared/schema";
import { cn } from "../lib/utils";

const categoryColor: Record<string, string> = {
  Breaking: "bg-red-600",
  Economy: "bg-blue-800",
  Agriculture: "bg-green-700",
  Politics: "bg-gray-700",
  Entertainment: "bg-purple-700",
  Viral: "bg-orange-600",
  Sports: "bg-blue-700",
  Business: "bg-teal-700",
  Lifestyle: "bg-pink-700",
  Tech: "bg-indigo-700",
  Health: "bg-emerald-700",
  Celebrity: "bg-rose-700",
};

function getCatBg(cat: string) {
  return categoryColor[cat] ?? "bg-gray-700";
}

function timeAgo(date: string | Date) {
  const d = new Date(date);
  const now = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} mins ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} hrs ago`;
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

interface HeroCardProps {
  article: Article;
}

export function HeroCard({ article }: HeroCardProps) {
  return (
    <a href={`/article/${article.slug}`} className="block relative overflow-hidden rounded-sm group cursor-pointer no-underline">
      <img
        src={article.imageUrl || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=900&q=80"}
        alt={article.title}
        className="w-full h-[420px] object-cover group-hover:scale-[1.02] transition-transform duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <span className={cn("inline-block text-white text-xs font-black px-2.5 py-1 mb-3 tracking-wider", getCatBg(article.category))}>
          {article.category.toUpperCase()}
        </span>
        <h1 className="text-white text-2xl font-black leading-tight mb-2 group-hover:text-gray-200 transition-colors">
          {article.title}
        </h1>
        <p className="text-gray-300 text-sm leading-relaxed mb-3 line-clamp-2">{article.excerpt}</p>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-xs">{timeAgo(article.publishedAt!)}</span>
          {article.sourceName && (
            <span className="text-gray-500 text-xs">via {article.sourceName}</span>
          )}
        </div>
      </div>
    </a>
  );
}

interface MediumCardProps {
  article: Article;
  className?: string;
}

export function MediumCard({ article, className }: MediumCardProps) {
  return (
    <a
      href={`/article/${article.slug}`}
      className={cn("block cursor-pointer group overflow-hidden rounded-sm border border-gray-100 no-underline", className)}
    >
      <div className="overflow-hidden">
        <img
          src={article.imageUrl || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=400&q=80"}
          alt={article.title}
          className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-3">
        <span className={cn("inline-block text-white text-xs font-black px-2 py-0.5 mb-1.5 tracking-wider", getCatBg(article.category))}>
          {article.category.toUpperCase()}
        </span>
        <h3 className="text-sm font-bold leading-snug group-hover:text-[#CC0000] transition-colors line-clamp-3 text-gray-900">
          {article.title}
        </h3>
        <span className="text-xs text-gray-400 mt-1 block">{timeAgo(article.publishedAt!)}</span>
      </div>
    </a>
  );
}

interface ListItemProps {
  article: Article;
  index: number;
}

export function ListItem({ article, index }: ListItemProps) {
  return (
    <a
      href={`/article/${article.slug}`}
      className="flex items-start gap-3 pb-4 border-b border-gray-100 cursor-pointer group no-underline"
    >
      <span className="text-[#CC0000] font-black text-lg leading-none mt-0.5 shrink-0">
        {String(index + 1).padStart(2, "0")}
      </span>
      <div>
        <span className={cn("inline-block text-white text-xs font-black px-2 py-0.5 mb-1 tracking-wider", getCatBg(article.category))}>
          {article.category.toUpperCase()}
        </span>
        <h4 className="text-sm font-bold leading-snug group-hover:text-[#CC0000] transition-colors text-gray-900">
          {article.title}
        </h4>
        <span className="text-xs text-gray-400 mt-0.5 block">{timeAgo(article.publishedAt!)}</span>
      </div>
    </a>
  );
}

export { getCatBg, timeAgo };
