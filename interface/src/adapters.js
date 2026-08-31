// Maps backend /tokens rows (real on-chain data, via the Goldsky subgraph)
// into the shape the UI components expect. Fields with no real on-chain
// equivalent yet (chg, chat) are left at honest defaults (0 / empty), not
// fabricated.
import { quoteSymbol, shortAddress } from "./api.js";
import { DUCK_INCUBATION, DUCK_LAUNCHER, DUCK_RAISE, DUCK_LOCKER, DUCK_HOOK, V4_POOL_MANAGER, DEFAULT_QUOTE_TOKENS } from "./chain/addresses.js";

// RAW subgraph amounts (raisedQuote, volumeAllTime, volume24h) are never
// decimal-normalized by the subgraph -- same convention as Trade.quoteAmount
// etc. -- so dividing by a flat 1e18 is only correct for a native-ETH-quoted
// token; USDC/USDT0 are 6 decimals. lastPrice/lastPriceUsd, by contrast,
// ARE already normalized by the subgraph (a real human-readable ratio), so
// nothing derived from those needs this.
function quoteDecimalsFor(address) {
  if (!address || address.toLowerCase() === "0x0000000000000000000000000000000000000000") return 18;
  const t = DEFAULT_QUOTE_TOKENS.find((q) => q.address.toLowerCase() === address.toLowerCase());
  return t ? t.decimals : 18;
}

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
  [V4_POOL_MANAGER.toLowerCase()]: "Liquidity Pool",
  "0x000000000000000000000000000000000000dead": "Burned",
};

export function labelFor(address, extraLabels) {
  if (!address) return null;
  const key = address.toLowerCase();
  return (extraLabels && extraLabels[key]) || STATIC_LABELS[key] || null;
}

// Compact "leading zero count" notation for small decimals -- the same
// convention pump.fun/Photon/etc. use, e.g. 0.000004338325 becomes
// "0.0₄4338" instead of a hard-to-scan run of zeros. Only kicks in below
// 0.0001, where plain fixed-decimal formatting stops being scannable;
// anything at or above that (including large numbers like a market cap)
// uses normal formatting.
const SUBSCRIPT_DIGITS = "₀₁₂₃₄₅₆₇₈₉";
function toSubscript(num) {
  return String(num).split("").map((d) => SUBSCRIPT_DIGITS[+d]).join("");
}
export function compactNumber(n) {
  if (n === 0) return "0";
  if (n >= 0.0001) return n.toLocaleString(undefined, { maximumFractionDigits: n < 1 ? 6 : n < 1000 ? 3 : 2 });
  const str = n.toFixed(24);
  const match = str.match(/^0\.(0+)(\d+)/);
  if (!match) return n.toString();
  const zeroCount = match[1].length;
  const significant = match[2].slice(0, 4);
  return "0.0" + toSubscript(zeroCount - 1) + significant;
}

// mc/raised/vol are denominated in whatever quote asset a token trades
// against (ETH, USDC, USDT0, or a platform token) -- never real USD without
// an actual conversion (see usdOrQuote below). Shows the real
// quote-denominated number with its real unit instead of a fabricated
// dollar sign.
export function quoteAmount(n, symbol) {
  if (n == null) return "—";
  return compactNumber(n) + " " + symbol;
}

// Real USD, resolved via the subgraph's ETH/USDC-USDT0 reference price (or
// the 1:1 stablecoin peg) -- shown when available. Null for a platform-
// token-quoted pool (that token's own USD value isn't resolvable without
// its own tracked market) -- falls back to the honest quote-denominated
// figure instead of fabricating a dollar amount.
export function usdOrQuote(usd, quote, symbol) {
  if (usd != null) return "$" + compactNumber(usd);
  return quoteAmount(quote, symbol);
}

// `meta`: for CURVE/INSTANT tokens, { name, symbol } fetched separately via
// chain/tokenMeta.js's fetchTokenMeta (see its header comment for why —
// neither TokenCreated nor TokenLaunched carries name/symbol). CAMPAIGN
// tokens don't need it: DuckRaise's CampaignCreated does carry them, so
// t.campaign.name/symbol are already populated by the backend.
export function tokenToCoin(t, i, meta) {
  const ageMin = Math.max(0, Math.round((Date.now() / 1000 - Number(t.createdAt)) / 60));
  // Minutes since the most recent real trade -- null (not "same as ageMin")
  // when the token has never traded, so "most recently active" can be told
  // apart from "just launched, never traded".
  const lastActiveMin = t.lastTradeAt != null ? Math.max(0, Math.round((Date.now() / 1000 - Number(t.lastTradeAt)) / 60)) : null;

  // DuckRaise deploys a campaign's token immediately at launch() -- not at
  // finalize() -- so a CAMPAIGN token exists (and is indexed) the moment the
  // campaign starts, well before it resolves. Its "progress" is the
  // campaign's own raised/goal (native ETH), not a curve fill.
  let pct = 100; // INSTANT tokens launch straight onto a DEX pool — no curve to fill
  // Cumulative quote-asset inflow -- NOT market cap, a different number.
  // CURVE's quoteToken varies (ETH/USDC/USDT0); CAMPAIGN is always native
  // ETH (contribute() takes no other asset), handled in its own branch below.
  let raised = t.raisedQuote ? Number(t.raisedQuote) / 10 ** quoteDecimalsFor(t.quoteToken) : 0;
  if (t.family === "CURVE" && t.migrationTarget && Number(t.migrationTarget) > 0) {
    pct = Math.min(100, (Number(t.raisedQuote || 0) / Number(t.migrationTarget)) * 100);
  } else if (t.family === "CAMPAIGN") {
    const goal = Number(t.campaign?.goal || 0);
    const campaignRaised = Number(t.campaign?.totalRaised || 0);
    pct = goal > 0 ? Math.min(100, (campaignRaised / goal) * 100) : 0;
    raised = campaignRaised / 1e18;
  }

  const curveSeed = buildCurveSeedPoint(t);
  // Real price (quote-asset per token), from the subgraph's running
  // lastPrice -- the ratio of the most recent actual trade -- falling back
  // to a curve's deterministic pre-trade seed price if it hasn't traded
  // yet. Null (not 0) when genuinely unknown, so callers can tell "no
  // price data" apart from "trades at zero".
  const price = t.lastPrice != null ? Number(t.lastPrice) : curveSeed ? curveSeed.price : null;
  const supplyTokens = t.totalSupply ? Number(t.totalSupply) / 1e18 : 0;
  const mc = price != null ? price * supplyTokens : 0; // real market cap = price * supply, not cumulative inflow

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
    burnedSupply: t.burnedSupply || "0",
    curveSeed,
    migrated: !!t.migrated,
    name: name || symbol || shortAddress(t.id),
    symbol: symbol || "???",
    ticker: "$" + (symbol || "???"),
    initials: (symbol || "??").slice(0, 2).toUpperCase(),
    famBg: fam.bg, famFg: fam.fg,
    creator: t.creator,
    dev: shortAddress(t.creator),
    price, mc, raised,
    priceUsd: t.lastPriceUsd != null ? Number(t.lastPriceUsd) : null,
    mcUsd: t.lastPriceUsd != null ? Number(t.lastPriceUsd) * supplyTokens : null,
    vol: Number(t.volume24h || 0) / 10 ** quoteDecimalsFor(t.quoteToken),
    volUsd: t.volume24hUsd != null ? Number(t.volume24hUsd) : null,
    volumeAllTime: Number(t.volumeAllTime || 0) / 10 ** quoteDecimalsFor(t.quoteToken),
    volumeAllTimeUsd: t.volumeAllTimeUsd != null ? Number(t.volumeAllTimeUsd) : null,
    // Real 24h change from the subgraph's hourly close-price snapshots --
    // null (not 0) when there's no prior bucket to compare against yet
    // (too new, or hasn't traded before that point), so callers can tell
    // "genuinely flat" apart from "not enough history".
    chg: t.priceChange24h != null ? t.priceChange24h : null,
    chgUsd: t.priceChange24hUsd != null ? t.priceChange24hUsd : null,
    ageMin, lastActiveMin, pct,
    desc: "",
    quote: quoteSymbol(t.quoteToken),
    holders: Number(t.holderCount || 0),
    mint: shortAddress(t.id),
    metaUri: t.metaUri || null, // indexed directly now; loadTokenMeta falls back to an on-chain read if still empty (e.g. a token created moments ago, ahead of the subgraph)
    // Set by DuckMetaOverride (platform-controlled) when this token's
    // original metadata has been replaced -- App.jsx's loadTokenMeta prefers
    // this over metaUri whenever it's present.
    metaOverrideUri: t.metaOverrideUri || null,
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

// Discrete filled/unfilled tick cells for the Discover table view's progress
// column (the handoff keeps this as individual ticks there, unlike the card
// views' single filled pill bar) -- pct is 0-100.
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
// this reverses to chronological order and buckets by `bucketSeconds` --
// the range picker's job (5M/1H/4H/1D pick a candle *resolution*, applied
// across the token's ENTIRE trade history, exactly like a real exchange's
// timeframe selector; they are not a "how far back to look" filter, and
// trades must never be pre-filtered by recency before reaching this
// function -- a quiet-but-real token would otherwise show "no trades" on
// every range except "ALL" purely because nothing happened to trade in the
// last 5 real-world minutes). When bucketSeconds is omitted (the "ALL"
// case), an interval is picked from how much time the history spans, so a
// token with five trades over a minute doesn't get one giant daily candle.
// `seed`, when given, is a real deterministic starting price (not fake data)
// — see buildCurveSeedPoint() below — prepended so the chart has a "since
// launch" reference point even before the first trade.
export function buildCandles(trades, seed, bucketSeconds) {
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

  if (!bucketSeconds) {
    const span = points[points.length - 1].time - points[0].time;
    bucketSeconds = span <= 3600 ? 60 : span <= 86400 ? 300 : span <= 7 * 86400 ? 3600 : 86400;
  }

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
    tagBd: tagged ? "1px solid var(--line)" : "0",
  };
}

function ageAgo(unixSeconds) {
  const secs = Math.max(0, Math.round(Date.now() / 1000 - Number(unixSeconds)));
  if (secs < 60) return secs + "s";
  if (secs < 3600) return Math.round(secs / 60) + "m";
  return Math.round(secs / 3600) + "h";
}
