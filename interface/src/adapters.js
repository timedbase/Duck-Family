// Maps backend /tokens rows (real on-chain data, via the Goldsky subgraph)
// into the shape the existing UI components expect. Fields with no real
// on-chain equivalent yet (chg, spark history, chat) are left at honest
// defaults (0 / empty), not fabricated.
import { art, ink } from "./data.js";
import { quoteSymbol, shortAddress } from "./api.js";
import { DUCK_INCUBATION, DUCK_LAUNCHER, DUCK_RAISE, DUCK_LOCKER, DUCK_HOOK } from "./chain/addresses.js";

// Platform contracts and the standard burn address show up constantly as
// "holders"/traders (curve reserves, LP-lock custody, migration penalty
// burns) — labeling them beats a wall of unrecognizable 0x addresses.
const STATIC_LABELS = {
  [DUCK_INCUBATION.toLowerCase()]: "DuckIncubation (bonding curve)",
  [DUCK_LAUNCHER.toLowerCase()]: "DuckLauncher (instant DEX)",
  [DUCK_RAISE.toLowerCase()]: "DuckRaise (campaigns)",
  [DUCK_LOCKER.toLowerCase()]: "DuckLocker (LP lock)",
  [DUCK_HOOK.toLowerCase()]: "DuckHookV4",
  "0x000000000000000000000000000000000000dead": "Burned",
};

function labelFor(address, extraLabels) {
  if (!address) return null;
  const key = address.toLowerCase();
  return (extraLabels && extraLabels[key]) || STATIC_LABELS[key] || null;
}

// `meta`: for CURVE/INSTANT tokens, { name, symbol } fetched separately via
// chain/tokenMeta.js's fetchTokenMeta (see its header comment for why —
// neither TokenCreated nor TokenLaunched carries name/symbol). CAMPAIGN
// tokens don't need it: DuckRaise's CampaignCreated does carry them, so
// t.campaign.name/symbol are already populated by the backend.
export function tokenToCoin(t, i, meta) {
  const ageMin = Math.max(0, Math.round((Date.now() / 1000 - Number(t.createdAt)) / 60));

  // DuckRaise deploys a campaign's token immediately at launch() -- not at
  // finalize() -- so a CAMPAIGN token exists (and is indexed) the moment the
  // campaign starts, well before it resolves. Its "progress" is the
  // campaign's own raised/goal (native ETH), not a curve fill.
  let pct = 100; // INSTANT tokens launch straight onto a DEX pool — no curve to fill
  let mc = t.raisedQuote ? Number(t.raisedQuote) / 1e18 : 0; // raw quote-asset raised, a rough stand-in for market cap
  if (t.family === "CURVE" && t.migrationTarget && Number(t.migrationTarget) > 0) {
    pct = Math.min(100, (Number(t.raisedQuote || 0) / Number(t.migrationTarget)) * 100);
  } else if (t.family === "CAMPAIGN") {
    const goal = Number(t.campaign?.goal || 0);
    const raised = Number(t.campaign?.totalRaised || 0);
    pct = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;
    mc = raised / 1e18;
  }

  const name = t.family === "CAMPAIGN" ? t.campaign?.name : meta?.name;
  const symbol = t.family === "CAMPAIGN" ? t.campaign?.symbol : meta?.symbol;

  return {
    id: t.id,
    address: t.id,
    family: t.family,
    campaignId: t.campaign?.id,
    campaignSucceeded: !!t.campaign?.succeeded,
    campaignFailed: !!t.campaign?.failed,
    campaignDeadline: t.campaign?.deadline,
    quoteTokenAddress: t.quoteToken,
    poolId: t.pool?.id,
    hook: t.hook,
    totalSupply: t.totalSupply,
    curveSeed: buildCurveSeedPoint(t),
    migrated: !!t.migrated,
    name: name || symbol || shortAddress(t.id),
    ticker: "$" + (symbol || "???"),
    creator: t.creator,
    dev: shortAddress(t.creator),
    mc, vol: 0, ageMin, chg: 0, pct,
    desc: "",
    quote: quoteSymbol(t.quoteToken),
    holders: 0, // see chain/tokenMeta.js's header — not indexed, only fetchable per-token
    art: art(i), ink: ink(i),
    mint: shortAddress(t.id),
    metaUri: null, // fetched lazily per-token detail page — see chain/tokenMeta.js's fetchTokenMetaUri
    imageUrl: null,
    rawTrades: [],
    holderRows: [],
    trades: [],
    chat: [],
  };
}

export function tradeToRow(tr, labels, quoteSymbolLabel = "ETH") {
  const quoteAmt = Number(tr.quoteAmount) / 1e18;
  const tokenAmt = Number(tr.tokenAmount) / 1e18;
  return {
    side: tr.side,
    who: labelFor(tr.trader, labels) || shortAddress(tr.trader),
    full: tr.trader,
    ago: ageAgo(tr.timestamp),
    amt: quoteAmt.toFixed(4),
    quote: quoteSymbolLabel,
    tokens: tokenAmt >= 1000 ? Math.round(tokenAmt / 1000) + "K" : tokenAmt.toFixed(2),
    dirColor: tr.side === "BUY" ? "#6BE59A" : "#FF6B81",
  };
}

// Real OHLC candles (quote per token) built from the subgraph's raw trade
// rows for the lightweight-charts price chart. The API returns newest-first;
// this reverses to chronological order and buckets by an interval picked
// from how much real time the trade history actually spans, so a token with
// five trades over a minute doesn't get one giant useless daily candle.
// `seed`, when given, is a real deterministic starting price (not fake data)
// — see buildCurveSeedPoint() below — prepended so the chart has a "since
// launch" reference point even before the first trade.
export function buildCandles(trades, seed) {
  const points = trades
    .slice()
    .reverse()
    .map((tr) => {
      const quoteAmt = Number(tr.quoteAmount) / 1e18;
      const tokenAmt = Number(tr.tokenAmount) / 1e18;
      return { time: Number(tr.timestamp), price: tokenAmt > 0 ? quoteAmt / tokenAmt : 0 };
    })
    .filter((p) => p.price > 0);
  if (seed && (points.length === 0 || seed.time < points[0].time)) points.unshift(seed);
  if (points.length === 0) return [];

  const span = points[points.length - 1].time - points[0].time;
  const bucketSeconds = span <= 3600 ? 60 : span <= 86400 ? 300 : span <= 7 * 86400 ? 3600 : 86400;

  const buckets = new Map();
  for (const p of points) {
    const bucketTime = Math.floor(p.time / bucketSeconds) * bucketSeconds;
    const existing = buckets.get(bucketTime);
    if (!existing) {
      buckets.set(bucketTime, { time: bucketTime, open: p.price, high: p.price, low: p.price, close: p.price });
    } else {
      existing.high = Math.max(existing.high, p.price);
      existing.low = Math.min(existing.low, p.price);
      existing.close = p.price;
    }
  }
  return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
}

// A freshly created bonding-curve token already has a deterministic price
// before any trade: DuckIncubation is a constant-product curve seeded with a
// virtual reserve (`virtualQuote`, indexed at creation) against the tokens
// allocated to the curve (`bcTokensTotal` = totalSupply - liquidityTokens,
// but liquidityTokens isn't indexed either -- this uses the platform's own
// Create page default of an 80/20 curve/liquidity split, same approximation
// the previous version of this file made; a token created with a different
// split via a direct contract call will get a slightly-off seed point).
export function buildCurveSeedPoint(t) {
  if (t.family !== "CURVE" || !t.virtualQuote || !t.totalSupply || !t.createdAt) return null;
  const bcTokensTotal = (Number(t.totalSupply) / 1e18) * 0.8;
  if (bcTokensTotal <= 0) return null;
  const price = Number(t.virtualQuote) / 1e18 / bcTokensTotal;
  return price > 0 ? { time: Number(t.createdAt), price } : null;
}

export function holderToRow(h, i, totalSupply, labels) {
  const balance = Number(h.balance) / 1e18;
  const share = totalSupply > 0 ? ((balance / totalSupply) * 100).toFixed(1) : "0.0";
  const label = labelFor(h.account, labels);
  return {
    rank: String(i + 1),
    who: label || shortAddress(h.account),
    full: h.account,
    share: share + "%",
    color: i === 0 ? "#D9D9D9" : "rgba(217,217,217,.32)",
    tag: label ? "contract" : (i < 3 ? "whale" : "holder"),
  };
}

function ageAgo(unixSeconds) {
  const secs = Math.max(0, Math.round(Date.now() / 1000 - Number(unixSeconds)));
  if (secs < 60) return secs + "s";
  if (secs < 3600) return Math.round(secs / 60) + "m";
  return Math.round(secs / 3600) + "h";
}
