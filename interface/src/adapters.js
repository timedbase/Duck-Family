// Maps backend /tokens rows (real on-chain data, via the Goldsky subgraph)
// into the shape the UI components expect. Fields with no real on-chain
// equivalent yet (chg, chat) are left at honest defaults (0 / empty), not
// fabricated.
import { quoteSymbol, shortAddress } from "./api.js";
import { DUCK_INCUBATION, DUCK_LAUNCHER, DUCK_RAISE, DUCK_LOCKER, DUCK_HOOK } from "./chain/addresses.js";

// Family badge colors, matching the design's FAM map (lime = curve, plain
// card = instant, orange = campaign).
export const FAM_COLORS = {
  CURVE: { bg: "var(--lime)", fg: "var(--ink)" },
  INSTANT: { bg: "var(--card)", fg: "var(--ink)" },
  CAMPAIGN: { bg: "var(--orange)", fg: "#fff" },
};

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

  // Every family's name/symbol is indexed directly on Token now (read off
  // the token contract at creation time for CURVE/INSTANT; CampaignCreated
  // already carries them for CAMPAIGN, mirrored onto Token too) -- `meta`
  // is only ever passed for a token the subgraph hasn't reindexed yet since
  // this field was added, see loadCoins' gap-fill fallback.
  const name = t.name || (t.family === "CAMPAIGN" ? t.campaign?.name : meta?.name);
  const symbol = t.symbol || (t.family === "CAMPAIGN" ? t.campaign?.symbol : meta?.symbol);
  const fam = FAM_COLORS[t.family] || FAM_COLORS.INSTANT;

  return {
    id: t.id,
    address: t.id,
    family: t.family,
    campaignId: t.campaign?.id,
    campaignSucceeded: !!t.campaign?.succeeded,
    campaignFailed: !!t.campaign?.failed,
    campaignDeadline: t.campaign?.deadline,
    campaignGoal: t.campaign?.goal,
    campaignRaised: t.campaign?.totalRaised,
    quoteTokenAddress: t.quoteToken,
    poolId: t.pool?.id,
    hook: t.hook,
    totalSupply: t.totalSupply,
    curveSeed: buildCurveSeedPoint(t),
    migrated: !!t.migrated,
    name: name || symbol || shortAddress(t.id),
    symbol: symbol || "???",
    ticker: "$" + (symbol || "???"),
    initials: (symbol || "??").slice(0, 2).toUpperCase(),
    famBg: fam.bg, famFg: fam.fg,
    creator: t.creator,
    dev: shortAddress(t.creator),
    mc, vol: 0, ageMin, chg: 0, pct,
    desc: "",
    quote: quoteSymbol(t.quoteToken),
    holders: 0, // see chain/tokenMeta.js's header — not indexed, only fetchable per-token
    mint: shortAddress(t.id),
    metaUri: t.metaUri || null, // indexed directly now; loadTokenMeta falls back to an on-chain read if still empty (e.g. a token created moments ago, ahead of the subgraph)
    imageUrl: null,
    rawTrades: [],
    holderRows: [],
    trades: [],
    chat: [],
  };
}

// Real per-token mini-chart bars for the Discover feed, derived from actual
// trade history -- never the random noise a mockup might use as a
// placeholder. A token with no trades yet gets a flat, muted bar row
// (honestly "no data"), not fake variation.
export function buildSparkline(rawTrades, count = 26) {
  if (!rawTrades || rawTrades.length < 2) {
    return Array.from({ length: count }, () => ({ h: 22, c: "var(--soft)" }));
  }
  const points = rawTrades
    .slice()
    .reverse()
    .map((tr) => {
      const quoteAmt = Number(tr.quoteAmount) / 1e18;
      const tokenAmt = Number(tr.tokenAmount) / 1e18;
      return tokenAmt > 0 ? quoteAmt / tokenAmt : null;
    })
    .filter((p) => p != null && p > 0);
  if (points.length < 2) {
    return Array.from({ length: count }, () => ({ h: 22, c: "var(--soft)" }));
  }
  const bucketed = Array.from({ length: count }, (_, i) => {
    const idx = Math.min(points.length - 1, Math.floor((i / count) * points.length));
    return points[idx];
  });
  const hi = Math.max(...bucketed), lo = Math.min(...bucketed), span = hi - lo || hi || 1;
  const up = bucketed[bucketed.length - 1] >= bucketed[0];
  const color = up ? "var(--lime)" : "var(--orange)";
  return bucketed.map((p) => ({ h: (18 + ((p - lo) / span) * 82).toFixed(0), c: color }));
}

// Progress ticks (curve fill / raise progress) as an array of filled/unfilled
// cell colors for the tick-strip visual.
export function buildTicks(count, pct, onColor, offColor = "var(--paper)") {
  const filled = Math.round((count * Math.min(100, Math.max(0, pct))) / 100);
  return Array.from({ length: count }, (_, i) => (i < filled ? onColor : offColor));
}

export function tradeToRow(tr, labels, quoteSymbolLabel = "ETH") {
  const quoteAmt = Number(tr.quoteAmount) / 1e18;
  const tokenAmt = Number(tr.tokenAmount) / 1e18;
  const buy = tr.side === "BUY";
  return {
    side: tr.side,
    bg: buy ? "var(--lime)" : "var(--orange)",
    fg: buy ? "var(--ink)" : "#fff",
    who: labelFor(tr.trader, labels) || shortAddress(tr.trader),
    full: tr.trader,
    ago: ageAgo(tr.timestamp),
    quote: quoteAmt.toFixed(4),
    amount: tokenAmt >= 1000 ? Math.round(tokenAmt / 1000).toLocaleString() + "K" : tokenAmt.toFixed(2),
    quoteSymbol: quoteSymbolLabel,
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
      return { time: Number(tr.timestamp), price: tokenAmt > 0 ? quoteAmt / tokenAmt : 0, quoteAmt };
    })
    .filter((p) => p.price > 0);
  if (seed && (points.length === 0 || seed.time < points[0].time)) points.unshift({ ...seed, quoteAmt: 0 });
  if (points.length === 0) return [];

  const span = points[points.length - 1].time - points[0].time;
  const bucketSeconds = span <= 3600 ? 60 : span <= 86400 ? 300 : span <= 7 * 86400 ? 3600 : 86400;

  const buckets = new Map();
  for (const p of points) {
    const bucketTime = Math.floor(p.time / bucketSeconds) * bucketSeconds;
    const existing = buckets.get(bucketTime);
    if (!existing) {
      buckets.set(bucketTime, { time: bucketTime, open: p.price, high: p.price, low: p.price, close: p.price, volume: p.quoteAmt });
    } else {
      existing.high = Math.max(existing.high, p.price);
      existing.low = Math.min(existing.low, p.price);
      existing.close = p.price;
      existing.volume += p.quoteAmt;
    }
  }
  return Array.from(buckets.values()).sort((a, b) => a.time - b.time);
}

// Converts real OHLCV candles into the percentage-position bars a hand-rolled
// CSS candlestick chart draws with (wick top/height, body top/height, volume
// height, all as % of the chart's pixel box) -- real data in, real geometry
// out, no placeholder/random values anywhere in this path.
export function buildChartBars(candles) {
  if (!candles.length) return { bars: [], axis: [], ohlc: null };
  const hi = Math.max(...candles.map((k) => k.high));
  const lo = Math.min(...candles.map((k) => k.low));
  const span = hi - lo || hi || 1;
  const maxVol = Math.max(...candles.map((k) => k.volume), 1);
  const y = (v) => ((hi - v) / span) * 100;
  const bars = candles.map((k) => {
    const up = k.close >= k.open;
    const color = up ? "var(--lime)" : "var(--orange)";
    return {
      c: color, vc: color,
      wt: y(k.high).toFixed(2), wh: Math.max(y(k.low) - y(k.high), 0.3).toFixed(2),
      bt: y(Math.max(k.open, k.close)).toFixed(2),
      bh: Math.max(y(Math.min(k.open, k.close)) - y(Math.max(k.open, k.close)), 0.8).toFixed(2),
      vh: Math.max((k.volume / maxVol) * 100, k.volume > 0 ? 4 : 0).toFixed(0),
    };
  });
  const fmt = (v) => (v < 0.01 ? v.toFixed(5) : v.toFixed(v < 1 ? 4 : 3));
  const axis = [0, 1, 2, 3, 4].map((i) => "$" + fmt(hi - (span * i) / 4));
  const last = candles[candles.length - 1];
  const ohlc = { o: fmt(last.open), h: fmt(last.high), l: fmt(last.low), c: fmt(last.close), up: last.close >= last.open };
  return { bars, axis, ohlc };
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
  const tag = label ? label.split(" ")[0].toUpperCase() : (i < 3 ? "TOP 10" : "—");
  const tagged = !!label || i < 3;
  return {
    rank: String(i + 1),
    who: label || shortAddress(h.account),
    full: h.account,
    balance: balance.toLocaleString(undefined, { maximumFractionDigits: 0 }),
    share: share + "%",
    tag,
    tagBg: tagged ? "var(--paper)" : "transparent",
    tagFg: tagged ? "var(--mute)" : "var(--mute)",
    tagBd: tagged ? "2px solid var(--ink)" : "0",
  };
}

function ageAgo(unixSeconds) {
  const secs = Math.max(0, Math.round(Date.now() / 1000 - Number(unixSeconds)));
  if (secs < 60) return secs + "s";
  if (secs < 3600) return Math.round(secs / 60) + "m";
  return Math.round(secs / 3600) + "h";
}
