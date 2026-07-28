import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { Header } from "../components/Header";
import { Footer } from "../components/Footer";

interface UsageStats {
  totals: {
    totalFetches: number;
    totalProcessed: number;
    totalRewritten: number;
    totalInputTokens: number;
    totalOutputTokens: number;
    totalCostUsd: string;
  };
  recentLogs: Array<{
    id: number;
    fetchedAt: string;
    articlesProcessed: number;
    articlesRewritten: number;
    inputTokens: number;
    outputTokens: number;
    estimatedCostUsd: string;
  }>;
  articleCount: number;
  subscriberCount: number;
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="border border-gray-200 rounded-sm p-4 bg-white">
      <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">{label}</p>
      <p className="text-2xl font-black text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

function adminFetch(url: string, token: string) {
  return fetch(url, { headers: { "X-Admin-Token": token } }).then(r => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  });
}

function adminPost(url: string, token: string) {
  return fetch(url, { method: "POST", headers: { "X-Admin-Token": token } }).then(r => {
    if (!r.ok) throw new Error(String(r.status));
    return r.json();
  });
}

function LoginScreen({ onLogin }: { onLogin: (pw: string) => void }) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [checking, setChecking] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setChecking(true);
    setError("");
    try {
      await adminFetch("/api/admin/stats", input);
      sessionStorage.setItem("adminToken", input);
      onLogin(input);
    } catch {
      setError("Incorrect password.");
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans flex items-center justify-center">
      <div className="w-full max-w-sm">
        <div className="bg-[#0A1628] px-6 py-5 flex items-center gap-2 rounded-t-sm">
          <span className="text-[#CC0000] text-2xl font-black tracking-tight">AA+</span>
          <span className="text-white text-2xl font-black">News</span>
          <span className="ml-auto text-gray-400 text-xs uppercase tracking-wider font-bold">Admin</span>
        </div>
        <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-b-sm p-6">
          <p className="text-sm text-gray-500 mb-4">Enter your admin password to continue.</p>
          <input
            type="password"
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder="Admin password"
            className="w-full border border-gray-300 rounded-sm px-3 py-2 text-sm mb-3 focus:outline-none focus:border-[#CC0000]"
            autoFocus
            data-testid="input-admin-password"
          />
          {error && <p className="text-red-600 text-xs mb-3 font-medium">{error}</p>}
          <button
            type="submit"
            disabled={checking || !input}
            className="w-full bg-[#CC0000] text-white font-bold py-2 rounded-sm text-sm hover:bg-red-700 transition-colors disabled:opacity-60"
            data-testid="button-admin-login"
          >
            {checking ? "Checking..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState(() => sessionStorage.getItem("adminToken") || "");

  const handleLogout = () => {
    sessionStorage.removeItem("adminToken");
    setToken("");
  };

  if (!token) {
    return <LoginScreen onLogin={setToken} />;
  }

  return <AdminDashboard token={token} onLogout={handleLogout} />;
}

function AdminDashboard({ token, onLogout }: { token: string; onLogout: () => void }) {
  const { data: stats, isLoading } = useQuery<UsageStats>({
    queryKey: ["/api/admin/stats", token],
    queryFn: () => adminFetch("/api/admin/stats", token),
    refetchInterval: 30000,
    retry: false,
  });

  const fetchRss = useMutation({
    mutationFn: () => adminPost("/api/admin/fetch-rss", token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats", token] });
      queryClient.invalidateQueries({ queryKey: ["/api/articles"] });
    },
  });

  const totalTokens = stats
    ? Number(stats.totals.totalInputTokens) + Number(stats.totals.totalOutputTokens)
    : 0;
  const costNgn = stats
    ? (parseFloat(stats.totals.totalCostUsd) * 1600).toFixed(2)
    : "0.00";
  const costPerArticle =
    stats && Number(stats.totals.totalRewritten) > 0
      ? ((parseFloat(stats.totals.totalCostUsd) * 1600) / Number(stats.totals.totalRewritten)).toFixed(4)
      : "0.0000";
  const projectedMonthly =
    stats && Number(stats.totals.totalFetches) > 0
      ? (parseFloat(stats.totals.totalCostUsd) * (30 / Number(stats.totals.totalFetches))).toFixed(4)
      : "0.0000";

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Header />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-gray-900">AA+News Admin</h1>
            <p className="text-sm text-gray-500 mt-0.5">OpenAI cost tracker · Content management · RSS feeds</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchRss.mutate()}
              disabled={fetchRss.isPending}
              className="bg-[#CC0000] text-white font-bold px-5 py-2 rounded hover:bg-red-700 transition-colors disabled:opacity-60 text-sm"
              data-testid="button-fetch-rss"
            >
              {fetchRss.isPending ? "Fetching..." : "Fetch RSS Now"}
            </button>
            <button
              onClick={onLogout}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
              data-testid="button-admin-logout"
            >
              Sign out
            </button>
          </div>
        </div>

        {fetchRss.isSuccess && (
          <div className="mb-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-sm text-sm font-medium">
            RSS fetch complete — stats updated.
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="border border-gray-200 rounded-sm p-4 bg-white animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-2/3 mb-3" />
                <div className="h-7 bg-gray-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <StatCard label="Total Articles" value={stats.articleCount.toLocaleString()} />
              <StatCard label="Subscribers" value={stats.subscriberCount.toLocaleString()} />
              <StatCard label="RSS Fetches Run" value={Number(stats.totals.totalFetches).toLocaleString()} />
              <StatCard label="AI Rewrites" value={Number(stats.totals.totalRewritten).toLocaleString()} />
            </div>

            <div className="border border-gray-200 rounded-sm mb-8 overflow-hidden">
              <div className="bg-[#0A1628] px-4 py-3 flex items-center justify-between">
                <h2 className="text-white font-black text-sm tracking-wider uppercase">OpenAI Cost Tracker — gpt-4o-mini</h2>
                <span className="text-gray-400 text-xs">Auto-refreshes every 30s</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 bg-white divide-x divide-y md:divide-y-0 divide-gray-100">
                <div className="p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Total Cost</p>
                  <p className="text-xl font-black text-gray-900">${stats.totals.totalCostUsd}</p>
                  <p className="text-xs text-green-600 font-bold mt-1">≈ ₦{costNgn}</p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Input Tokens</p>
                  <p className="text-xl font-black text-gray-900">{Number(stats.totals.totalInputTokens).toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-1">@ $0.15/1M</p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Output Tokens</p>
                  <p className="text-xl font-black text-gray-900">{Number(stats.totals.totalOutputTokens).toLocaleString()}</p>
                  <p className="text-xs text-gray-400 mt-1">@ $0.60/1M</p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Cost / Article</p>
                  <p className="text-xl font-black text-gray-900">₦{costPerArticle}</p>
                  <p className="text-xs text-gray-400 mt-1">avg per rewrite</p>
                </div>
                <div className="p-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider font-bold mb-1">Projected / Month</p>
                  <p className="text-xl font-black text-gray-900">${projectedMonthly}</p>
                  <p className="text-xs text-gray-400 mt-1">at current rate</p>
                </div>
              </div>
              <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 flex items-center gap-6 text-xs text-gray-500">
                <span>Total tokens used: <strong className="text-gray-800">{totalTokens.toLocaleString()}</strong></span>
                <span>Articles processed: <strong className="text-gray-800">{Number(stats.totals.totalProcessed).toLocaleString()}</strong></span>
              </div>
            </div>

            <div className="border border-gray-200 rounded-sm bg-white mb-8">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h2 className="font-black text-sm text-gray-900 tracking-wider uppercase">Active RSS Sources (8)</h2>
              </div>
              <div className="divide-y divide-gray-100">
                {[
                  { name: "Punch", url: "punchng.com/feed/" },
                  { name: "Vanguard", url: "vanguardngr.com/feed/" },
                  { name: "Channels TV", url: "channelstv.com/feed/" },
                  { name: "BusinessDay", url: "businessday.ng/feed/" },
                  { name: "Premium Times", url: "premiumtimesng.com/feed" },
                  { name: "ThisDay", url: "thisdaylive.com/index.php/feed/" },
                  { name: "Leadership", url: "leadership.ng/feed/" },
                  { name: "Daily Trust", url: "dailytrust.com/feed/" },
                ].map(s => (
                  <div key={s.name} className="px-4 py-2.5 flex items-center justify-between">
                    <span className="font-semibold text-sm text-gray-800">{s.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 rounded-full bg-green-400" />
                      <span className="text-xs text-gray-400">{s.url}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border border-gray-200 rounded-sm bg-white">
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                <h2 className="font-black text-sm text-gray-900 tracking-wider uppercase">Recent Fetch History</h2>
              </div>
              {stats.recentLogs.length === 0 ? (
                <p className="px-4 py-8 text-sm text-gray-400 text-center">
                  No history yet. Click "Fetch RSS Now" to begin tracking.
                </p>
              ) : (
                <div className="divide-y divide-gray-100">
                  {stats.recentLogs.map(log => (
                    <div key={log.id} className="px-4 py-3 flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <span className="text-sm font-medium text-gray-800">
                          {new Date(log.fetchedAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
                        </span>
                        <span className="ml-3 text-xs text-gray-400">
                          {log.articlesProcessed} processed · {log.articlesRewritten} rewritten
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-xs">
                        <span className="text-gray-500">{(log.inputTokens + log.outputTokens).toLocaleString()} tokens</span>
                        <span className="font-black text-gray-900">${log.estimatedCostUsd}</span>
                        <span className="text-gray-400">≈ ₦{(parseFloat(log.estimatedCostUsd) * 1600).toFixed(4)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
