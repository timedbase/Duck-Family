// Talks to the backend in ../../backend (a thin API in front of the
// Goldsky subgraph + live contract reads, see its README). Real on-chain
// data only — nothing here is simulated.

import { DEFAULT_QUOTE_TOKENS } from "./chain/addresses.js";

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

const QUOTE_SYMBOLS = Object.fromEntries(
  DEFAULT_QUOTE_TOKENS.map((t) => [t.address.toLowerCase(), t.symbol])
);
QUOTE_SYMBOLS["0x0000000000000000000000000000000000000000"] = "ETH";

export function quoteSymbol(address) {
  if (!address) return "?";
  return QUOTE_SYMBOLS[address.toLowerCase()] || (address.slice(0, 6) + "…");
}

export function shortAddress(address) {
  if (!address) return "?";
  return address.slice(0, 6) + "…" + address.slice(-4);
}

async function getJSON(path) {
  const res = await fetch(API_BASE + path);
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
}

async function postJSON(path, body) {
  const res = await fetch(API_BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => null);
    throw new Error(detail?.error || `${path} -> HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  tokens: (params = "") => getJSON("/tokens" + params),
  token: (address) => getJSON(`/tokens/${address}`),
  trades: (address, limit = 50, offset = 0) => getJSON(`/tokens/${address}/trades?limit=${limit}&offset=${offset}`),
  holders: (address, limit = 50, offset = 0) => getJSON(`/tokens/${address}/holders?limit=${limit}&offset=${offset}`),
  comments: (address, limit = 50, offset = 0) => getJSON(`/tokens/${address}/comments?limit=${limit}&offset=${offset}`),
  postComment: (address, wallet, body) => postJSON(`/tokens/${address}/comments`, { wallet, body }),
  health: () => getJSON("/health"),
  campaigns: () => getJSON("/campaigns"),
  campaign: (id) => getJSON(`/campaigns/${id}`),
  portfolio: (address) => getJSON(`/portfolio/${address}`),
  quoteTokens: (family = "curve") => getJSON(`/quote-tokens?family=${family}`),
  quoteAssets: () => getJSON("/quote-assets"),
  locker: () => getJSON("/locker"),
  hook: () => getJSON("/hook"),
  curve: () => getJSON("/curve"),
  launcher: () => getJSON("/launcher"),
  raise: () => getJSON("/raise"),
  stats: () => getJSON("/stats"),
};
