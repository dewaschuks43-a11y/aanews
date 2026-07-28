import { useState } from "react";
import { apiRequest } from "../lib/queryClient";

export function Footer() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const subscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setStatus("loading");
    try {
      await apiRequest("POST", "/api/newsletter/subscribe", { email });
      setStatus("done");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

  return (
    <footer className="bg-[#0A1628] text-gray-400 mt-12">
      {/* Newsletter */}
      <div className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[#CC0000] font-black text-xl">AA+</span>
              <span className="text-white font-black text-xl">Daily Briefing</span>
            </div>
            <p className="text-gray-400 text-sm">Nigeria's top stories every morning. Free. No spam.</p>
          </div>
          {status === "done" ? (
            <p className="text-green-400 font-bold text-sm">Subscribed! Welcome to AA+News.</p>
          ) : (
            <form onSubmit={subscribe} className="flex items-center gap-2">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Your email address"
                className="text-sm px-4 py-2.5 rounded outline-none w-56 bg-white/10 text-white placeholder-gray-500 border border-white/20 focus:border-[#CC0000]"
                disabled={status === "loading"}
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="bg-[#CC0000] hover:bg-red-700 text-white text-sm font-bold px-5 py-2.5 rounded transition-colors whitespace-nowrap disabled:opacity-70"
              >
                {status === "loading" ? "..." : "Subscribe Free"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Links */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-1 mb-2">
              <span className="text-[#CC0000] font-black text-xl">AA+</span>
              <span className="text-white font-black text-xl">News</span>
              <span className="text-gray-500 text-xs ml-2">by AgricAfric Group</span>
            </div>
            <p className="text-xs text-gray-500">Nigeria's story, told fully.</p>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs">
            {["About", "Advertise", "Privacy Policy", "Contact"].map(link => (
              <a key={link} href="#" className="text-gray-500 hover:text-white transition-colors no-underline">
                {link}
              </a>
            ))}
            <a
              href="https://agricafricmarket.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#CC0000] hover:text-red-400 transition-colors no-underline font-semibold"
            >
              AgricAfric Marketplace
            </a>
          </div>
        </div>
        <div className="border-t border-white/10 mt-4 pt-4">
          <p className="text-xs text-gray-600 text-center">
            © {new Date().getFullYear()} AgricAfric Group. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
