import { useState } from "react";
import { useLocation } from "wouter";

const categories = [
  "All", "Breaking", "Politics", "Economy", "Agriculture",
  "Entertainment", "Sports", "Lifestyle", "Tech", "Health", "Viral",
];

const breakingTicker = [
  "CBN holds MPR at 26.75% — naira steady",
  "Dangote refinery expands West Africa exports",
  "Super Eagles prepare for AFCON qualifiers",
  "AgricAfric market: tomatoes at ₦3,200/basket",
];

export function Header() {
  const [, navigate] = useLocation();
  const [tickerIndex] = useState(0);
  const [searchVal, setSearchVal] = useState("");

  return (
    <header>
      {/* Breaking news ticker */}
      <div className="bg-[#0A1628] text-white text-xs py-1.5 px-4 flex items-center justify-between overflow-hidden">
        <div className="flex items-center gap-4 min-w-0">
          <span className="text-[#CC0000] font-black uppercase tracking-wider shrink-0 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 bg-[#CC0000] rounded-full animate-pulse" />
            Live
          </span>
          <div className="flex gap-8 overflow-hidden">
            {breakingTicker.map((n, i) => (
              <span key={i} className="opacity-80 whitespace-nowrap shrink-0">{n}</span>
            ))}
          </div>
        </div>
        <span className="text-gray-400 shrink-0 ml-4 hidden md:block">
          {new Date().toLocaleDateString("en-NG", {
            weekday: "long", day: "numeric", month: "long", year: "numeric",
          })}
        </span>
      </div>

      {/* Logo + search */}
      <div className="border-b-4 border-[#CC0000]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between flex-wrap gap-3">
          <a href="/" className="flex items-center gap-2 no-underline">
            <div className="flex items-center">
              <span className="text-[#CC0000] font-black text-4xl tracking-tight leading-none">AA</span>
              <span className="text-[#CC0000] font-black text-3xl leading-none">+</span>
              <span className="text-[#0A1628] font-black text-4xl tracking-tight leading-none">News</span>
            </div>
            <div className="hidden md:block w-px h-8 bg-gray-300 mx-2" />
            <span className="hidden md:block text-xs text-gray-500 uppercase tracking-widest">
              Nigeria's Story, Told Fully
            </span>
          </a>
          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-1 border border-gray-300 rounded px-3 py-1.5">
              <svg className="w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                className="text-sm outline-none w-32 bg-transparent placeholder-gray-400"
                placeholder="Search news..."
                value={searchVal}
                onChange={e => setSearchVal(e.target.value)}
              />
            </div>
            <a
              href="https://agricafricmarket.com"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#0A1628] text-white text-xs font-bold px-3 py-2 rounded hover:bg-navy-900 transition-colors hidden md:block"
            >
              AgricAfric Market
            </a>
          </div>
        </div>

        {/* Category nav */}
        <nav className="bg-[#0A1628]">
          <div className="max-w-7xl mx-auto px-4 flex items-center overflow-x-auto scrollbar-hide">
            {categories.map((cat) => (
              <a
                key={cat}
                href={cat === "All" ? "/" : `/category/${cat.toLowerCase()}`}
                className="text-xs font-semibold px-4 py-2.5 whitespace-nowrap text-gray-300 hover:text-white hover:bg-white/10 transition-colors no-underline border-b-2 border-transparent hover:border-[#CC0000]"
              >
                {cat.toUpperCase()}
              </a>
            ))}
          </div>
        </nav>
      </div>
    </header>
  );
}
