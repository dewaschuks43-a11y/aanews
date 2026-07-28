import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,
      retry: 1,
    },
  },
});

const API_BASE = import.meta.env.BASE_URL.replace(/\/$/, "");

export function apiFetch(path: string, init?: RequestInit) {
  return fetch(API_BASE + path, init).then((r) => r.json());
}

export async function apiRequest(method: string, url: string, body?: unknown) {
  const res = await fetch(API_BASE + url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}
