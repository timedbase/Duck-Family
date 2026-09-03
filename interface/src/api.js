// Talks to the backend in ../../backend (a thin API in front of each
// chain's subgraph + live contract reads, see its README). Real on-chain
// data only — nothing here is simulated.

import { CHAINS } from "./chain/addresses.js";

export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

function buildQuoteSymbols(chain) {
  const table = Object.fromEntries(chain.DEFAULT_QUOTE_TOKENS.map((t) => [t.address.toLowerCase(), t.symbol]));
  table["0x0000000000000000000000000000000000000000"] = chain.nativeSymbol;
  return table;
}
const QUOTE_SYMBOLS = { ink: buildQuoteSymbols(CHAINS.ink), arc: buildQuoteSymbols(CHAINS.arc) };

export function quoteSymbol(chain, address) {
  if (!address) return "?";
  return QUOTE_SYMBOLS[chain.slug][address.toLowerCase()] || (address.slice(0, 6) + "…");
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

// Every data route is chain-scoped on the backend (see
// backend/src/chain/registry.ts) -- every method below takes the resolved
// CHAINS[slug] config (see chain/addresses.js) as its first `chain` arg,
// same convention as every other chain-aware function in this app, and
// builds `/${chain.slug}/...`. /health and /upload stay unprefixed on the
// backend (chain-agnostic), matching the two call sites that don't go
// through this object (App.jsx's direct API_BASE + "/upload/..." calls) and
// health() below.

export const api = {
  tokens: (chain, params = "") => getJSON(`/${chain.slug}/tokens` + params),
  token: (chain, address) => getJSON(`/${chain.slug}/tokens/${address}`),
  trades: (chain, address, limit = 50, offset = 0) => getJSON(`/${chain.slug}/tokens/${address}/trades?limit=${limit}&offset=${offset}`),
  holders: (chain, address, limit = 50, offset = 0) => getJSON(`/${chain.slug}/tokens/${address}/holders?limit=${limit}&offset=${offset}`),
  comments: (chain, address, limit = 50, offset = 0) => getJSON(`/${chain.slug}/tokens/${address}/comments?limit=${limit}&offset=${offset}`),
  postComment: (chain, address, wallet, body) => postJSON(`/${chain.slug}/tokens/${address}/comments`, { wallet, body }),
  health: () => getJSON("/health"),
  campaigns: (chain) => getJSON(`/${chain.slug}/campaigns`),
  campaign: (chain, id) => getJSON(`/${chain.slug}/campaigns/${id}`),
  portfolio: (chain, address) => getJSON(`/${chain.slug}/portfolio/${address}`),
  quoteTokens: (chain, family = "curve") => getJSON(`/${chain.slug}/quote-tokens?family=${family}`),
  quoteAssets: (chain) => getJSON(`/${chain.slug}/quote-assets`),
  locker: (chain) => getJSON(`/${chain.slug}/locker`),
  hook: (chain) => getJSON(`/${chain.slug}/hook`),
  curve: (chain) => getJSON(`/${chain.slug}/curve`),
  launcher: (chain) => getJSON(`/${chain.slug}/launcher`),
  raise: (chain) => getJSON(`/${chain.slug}/raise`),
  stats: (chain) => getJSON(`/${chain.slug}/stats`),
};
