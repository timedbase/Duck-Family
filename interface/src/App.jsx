import { useState, useEffect, useCallback, useRef } from "react";
import { formatEther, formatUnits, parseEther, parseUnits } from "viem";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { cs } from "./cs.js";
import { XIcon, TelegramIcon } from "./MetaChips.jsx";
import DiscoverPage from "./pages/DiscoverPage.jsx";
import TokenPage from "./pages/TokenPage.jsx";
import CreateChooserPage from "./pages/CreateChooserPage.jsx";
import CreateFormPage from "./pages/CreateFormPage.jsx";
import CampaignPage from "./pages/CampaignPage.jsx";
import PortfolioPage from "./pages/PortfolioPage.jsx";
import StatsPage from "./pages/StatsPage.jsx";
import HowItWorksPage from "./pages/HowItWorksPage.jsx";
import DocsPage from "./pages/DocsPage.jsx";
import { api, shortAddress, quoteSymbol, API_BASE } from "./api.js";
import { tokenToCoin, tradeToRow, holderToRow, buildCandles, buildSparkline, buildTicks, labelFor, compactNumber, quoteAmount, usdOrQuote } from "./adapters.js";
import { ageLabel } from "./data.js";
import {
  createCurveToken, buyCurve, buyCurveWithNative, sellCurve, claimCurveFee,
  launchInstant,
  createCampaign, contributeCampaign, claimCampaign, claimCampaignRefund, finalizeCampaign, getRaiseDefaults,
  claimFees, claimAllFees, getPosition, getPositionCreator, getPool, getCtoApplication,
  applyForCTO, getCtoFee, setHookFeeSplits, getHookFeeSplits, getHookAccruedFees,
  getNativeBalance, waitForTx, getPlatformTokens,
} from "./chain/actions.js";
import { buyOnPoolWithNative, sellOnPoolForNative } from "./chain/dex.js";
import { previewCurveBuy, previewCurveSell, previewCurveBuyWithNative, previewPoolBuyWithNative, previewPoolSellForNative, applySlippage } from "./chain/quotes.js";
import { ZERO_ADDRESS, DEFAULT_QUOTE_TOKENS, CURVE_LAUNCHER_QUOTE_TOKENS, STOCK_QUOTE_TOKENS, RAISE_DEFAULT_QUOTE_ASSETS, LIQUID_QUOTE_TOKEN_SYMBOLS } from "./chain/addresses.js";
import { fetchTokenMeta, fetchTokenMetaUri } from "./chain/tokenMeta.js";
import { findBlockedTerm } from "./moderation.js";
import { resolveTokenImage, resolveTokenSocials, resolveTokenDescription, resolveTokenNameSymbol } from "./ipfs.js";

const REFRESH_MS = 15000;
const PAGE_SIZE = 10; // Trades/Holders tabs page at this size, both server- and client-side.
const GAS_RESERVE_WEI = parseEther("0.005");
const INK = "var(--ink)", CARD = "var(--card)", LIME = "var(--lime)", ORANGE = "var(--orange)";

function truncateDecimals(numStr, decimals) {
  const [whole, frac = ""] = numStr.split(".");
  return frac.length > decimals ? `${whole}.${frac.slice(0, decimals)}` : numStr;
}

// ETH first (always tradeable directly), then the platform's default-allowed
// quote tokens, then that family's platformToken() (if the owner has set
// one) -- fetched live, see getPlatformTokens.
function quoteOptionsFor(base, platformToken) {
  const options = [
    { label: "ETH", address: ZERO_ADDRESS },
    ...base.map((t) => ({ label: t.symbol, address: t.address, decimals: t.decimals })),
  ];
  if (platformToken && !options.some((o) => o.address.toLowerCase() === platformToken.address.toLowerCase())) {
    options.push({ label: platformToken.symbol, address: platformToken.address, decimals: platformToken.decimals });
  }
  return options;
}
function decimalsFor(address, platformTokens = []) {
  if (address.toLowerCase() === ZERO_ADDRESS) return 18;
  const all = [...DEFAULT_QUOTE_TOKENS, ...STOCK_QUOTE_TOKENS, ...platformTokens.filter(Boolean)];
  const t = all.find((q) => q.address.toLowerCase() === address.toLowerCase());
  return t ? t.decimals : 18;
}

const EMPTY_SOCIALS = { twitter: "", telegram: "", website: "" };
const EMPTY_IMAGE = { file: null, previewUrl: "", uploading: false, ipfsUri: "", gatewayUrl: "", error: "" };
const EMPTY_PORTFOLIO = { created: [], holdings: [], contributions: [] };
const block = (active) => (active ? { bg: INK, fg: CARD } : { bg: CARD, fg: INK });

// Real URL routing (plain History API -- no router dependency needed for
// ~7 static paths plus one dynamic one). A token or campaign's page is
// keyed by its own contract address, e.g. /0xe911...8888, so the link is
// the same thing Blockscout/Etherscan would call it -- shareable and
// bookmarkable without any separate slug concept.
const ADDRESS_PATH_RE = /^\/(0x[0-9a-fA-F]{40})$/;
const CREATE_FAMILY_PATH_RE = /^\/create\/(incubation|launcher|raise)$/;

function pathForScreen(screen, tokenId, family) {
  if ((screen === "token" || screen === "campaign") && tokenId) return "/" + tokenId;
  if (screen === "createForm" && family) return "/create/" + family;
  if (screen === "create") return "/create";
  if (screen === "portfolio") return "/portfolio";
  if (screen === "stats") return "/stats";
  if (screen === "how") return "/how";
  if (screen === "docs") return "/docs";
  return "/";
}

// Every static path this maps to a screen -- anything else (unknown path,
// or a /0x... address, which needs s.coins loaded first) falls through to
// null and is handled by the caller.
function staticScreenForPath(pathname) {
  const path = pathname.replace(/\/+$/, "") || "/";
  if (path === "/") return { screen: "home" };
  if (path === "/create") return { screen: "create" };
  const fam = path.match(CREATE_FAMILY_PATH_RE);
  if (fam) return { screen: "createForm", family: fam[1] };
  if (path === "/portfolio") return { screen: "portfolio" };
  if (path === "/stats") return { screen: "stats" };
  if (path === "/how") return { screen: "how" };
  if (path === "/docs") return { screen: "docs" };
  return null;
}

// Real market-cap/launch-date bands for Discover's filter dropdowns --
// bucketed off real mcUsd/ageMin, never a fabricated placeholder list.
const MCAP_PRESETS = [
  { key: "any", label: "Any market cap" },
  { key: "u10k", label: "Under $10K" },
  { key: "10k-100k", label: "$10K – $100K" },
  { key: "100k-1m", label: "$100K – $1M" },
  { key: "1m+", label: "Over $1M" },
];
const MCAP_TEST = {
  u10k: (v) => v < 10000,
  "10k-100k": (v) => v >= 10000 && v < 100000,
  "100k-1m": (v) => v >= 100000 && v < 1000000,
  "1m+": (v) => v >= 1000000,
};
const LAUNCHED_PRESETS = [
  { key: "any", label: "Any launch date" },
  { key: "1h", label: "Last hour" },
  { key: "24h", label: "Last 24 hours" },
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
];
const LAUNCHED_TEST = {
  "1h": (min) => min <= 60,
  "24h": (min) => min <= 1440,
  "7d": (min) => min <= 10080,
  "30d": (min) => min <= 43200,
};

export default function App() {
  const { address: account, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();

  // Deep-link support: a static path (/, /create, /portfolio, /stats, /how,
  // /docs) resolves synchronously into the initial screen. A /0x... address
  // can't -- it needs s.coins loaded first to tell a token from a campaign
  // -- so it's captured here and consumed once by the effect below.
  const initialStatic = staticScreenForPath(window.location.pathname) || { screen: "home" };
  const deepLinkToken = useRef((window.location.pathname.match(ADDRESS_PATH_RE) || [])[1] || null);
  const firstUrlSync = useRef(true);
  const skipNextPush = useRef(false);

  const [s, setS] = useState({
    mobile: false, menuOpen: false, sort: "Last activity",
    layout: "cards", filter: "All", query: "",
    mcapFilter: "any", launchedFilter: "any", quoteFilter: "any",
    tokenId: null, side: "buy", amount: "250", range: "1D", chartMode: "price", tab: "Trades", chatDraft: "",
    family: null, contribAmount: "0.5", slippageBps: 500,
    ...initialStatic,
    previewOut: null, previewLoading: false, simulating: false,
    nativeBalance: 0n, txPending: false, tx: null, toast: "",
    portfolio: EMPTY_PORTFOLIO, coins: [], coinsLoading: true, coinsError: "",
    draftCurve: { name: "", ticker: "", desc: "", quoteToken: ZERO_ADDRESS, startVirtualQuote: "8000", migrationTargetQuote: "60000", earlyBuyAmount: "0", socials: EMPTY_SOCIALS },
    draftInstant: { name: "", ticker: "", desc: "", quoteToken: ZERO_ADDRESS, launchMarketCap: "10", buyAmountHype: "0", socials: EMPTY_SOCIALS },
    draftCampaign: { name: "", ticker: "", desc: "", dexQuoteAsset: ZERO_ADDRESS, goalNative: "50", socials: EMPTY_SOCIALS },
    draftImage: EMPTY_IMAGE,
    raiseDefaults: null, platformTokens: { incubation: null, launcher: null, raise: null },
    creatorData: null, creatorLoading: false,
    campaignDetail: null,
  });
  const set = useCallback((patch) => setS((st) => ({ ...st, ...(typeof patch === "function" ? patch(st) : patch) })), []);

  // ---------- lifecycle ----------

  useEffect(() => {
    const fit = () => set({ mobile: (window.innerWidth || 1440) < 900 });
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [set]);

  // URL routing: keep the address bar in sync with s.screen/tokenId/family
  // (state -> URL), support the browser's back/forward buttons (URL ->
  // state), and resolve a /0x... deep link into the right screen once
  // coins have loaded (openToken needs s.coins to tell a token from a
  // campaign -- see staticScreenForPath's comment above).
  useEffect(() => {
    const path = pathForScreen(s.screen, s.tokenId, s.family);
    const isFirst = firstUrlSync.current;
    firstUrlSync.current = false;
    if (skipNextPush.current) { skipNextPush.current = false; return; }
    // A pending /0x... deep link hasn't resolved into s.screen/tokenId yet
    // (needs s.coins loaded first) -- leave the real URL alone rather than
    // stomping it with "/" for the split second before openToken runs.
    if (isFirst && deepLinkToken.current) return;
    if (window.location.pathname === path) return;
    if (isFirst) window.history.replaceState(null, "", path);
    else window.history.pushState(null, "", path);
  }, [s.screen, s.tokenId, s.family]);

  useEffect(() => {
    function onPopState() {
      skipNextPush.current = true;
      const stat = staticScreenForPath(window.location.pathname);
      if (stat) { set(stat); return; }
      const addr = (window.location.pathname.match(ADDRESS_PATH_RE) || [])[1];
      if (addr) openToken(addr);
      else set({ screen: "home" });
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (deepLinkToken.current && s.coins.length > 0) {
      const id = deepLinkToken.current;
      deepLinkToken.current = null;
      openToken(id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.coins.length]);

  useEffect(() => {
    getPlatformTokens().then((tokens) => set({ platformTokens: tokens })).catch(() => {});
  }, [set]);

  const loadCoins = useCallback(async () => {
    try {
      const rows = await api.tokens();
      let coins = rows.map((t, i) => tokenToCoin(t, i));

      // name/symbol are indexed directly on Token now -- this only fires
      // for a token the subgraph hasn't reindexed yet since that field was
      // added (or one from right before a redeploy), never in steady state.
      const missingMeta = coins.filter((c) => c.family !== "CAMPAIGN" && c.symbol === "???").map((c) => c.id);
      if (missingMeta.length > 0) {
        const meta = await fetchTokenMeta(missingMeta);
        coins = coins.map((c) => {
          const m = meta[c.id.toLowerCase()];
          if (!m || (!m.name && !m.symbol)) return c;
          const symbol = m.symbol || c.symbol;
          return { ...c, name: m.name || c.name, symbol, ticker: "$" + symbol, initials: symbol.slice(0, 2).toUpperCase() };
        });
      }

      // `coins` (below) is already the complete, freshly-fetched list at
      // this point -- returned as-is so callers like pollUntilFound can
      // check it directly instead of reading back through setS, whose
      // updater isn't guaranteed to have run yet by the time a caller reads
      // it right after this call returns.
      setS((st) => {
        const byId = new Map(st.coins.map((c) => [c.id, c]));
        const merged = coins.map((next) => {
          const prev = byId.get(next.id);
          return prev ? {
            ...next, trades: prev.trades, holderRows: prev.holderRows, rawTrades: prev.rawTrades, chat: prev.chat, imageUrl: prev.imageUrl, desc: prev.desc, metaUri: prev.metaUri, socials: prev.socials,
            tradesHasMore: prev.tradesHasMore, tradesOffset: prev.tradesOffset, holdersHasMore: prev.holdersHasMore, holdersOffset: prev.holdersOffset,
          } : next;
        });
        return { ...st, coins: merged, coinsLoading: false, coinsError: "" };
      });
      resolveCoinImages();
      return coins;
    } catch (e) {
      set({ coinsLoading: false, coinsError: String(e.message || e) });
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A freshly-launched token isn't visible until (a) the tx is actually
  // mined on Ink and (b) the subgraph indexes it -- both take real seconds
  // that this can't shortcut. What it CAN shortcut is the frontend's own
  // polling gap: the ambient loadCoins loop only runs every REFRESH_MS
  // (15s), so a single blind refresh could otherwise leave the user
  // staring at PendingLaunchPanel for up to another 15s after the real
  // work is already done. Poll tighter for a short window right after a
  // launch instead, and stop as soon as the token actually shows up.
  function pollUntilFound(address, attemptsLeft = 8) {
    setTimeout(async () => {
      const coins = await loadCoins();
      const found = coins?.some((c) => c.id.toLowerCase() === address.toLowerCase());
      if (!found && attemptsLeft > 1) pollUntilFound(address, attemptsLeft - 1);
    }, 2500);
  }

  // Only start polling for the new token/campaign once the launch tx is
  // actually confirmed on-chain -- a sim-then-send can still revert at
  // execution time (state moved between the two), and polling for
  // something that will never exist would otherwise strand the user on
  // PendingLaunchPanel forever with no explanation. On revert, bounce back
  // to the create form so they can see the error (surfaced via the tx
  // modal / runTx's own reverted-stage handling) and retry.
  function confirmAndPoll(hash, address) {
    waitForTx(hash)
      .then((receipt) => {
        if (receipt.status === "success") pollUntilFound(address);
        else { flash("Launch reverted on-chain. Nothing was created."); set({ screen: "createForm" }); }
      })
      .catch(() => flash("Could not confirm the launch transaction."));
  }

  function resolveCoinImages() {
    setS((st) => {
      for (const coin of st.coins) {
        const uri = coin.metaOverrideUri || coin.metaUri;
        if (coin.imageUrl || !uri) continue;
        resolveTokenImage(uri).then((url) => {
          if (!url) return;
          setS((s2) => ({ ...s2, coins: s2.coins.map((c) => (c.id === coin.id ? { ...c, imageUrl: url } : c)) }));
        });
      }
      return st;
    });
  }

  const refreshBalance = useCallback(async () => {
    if (!account) return;
    try {
      const bal = await getNativeBalance(account);
      set({ nativeBalance: bal });
    } catch (e) { console.error("failed to fetch balance", e); }
  }, [account, set]);

  const loadPortfolio = useCallback(async () => {
    if (!account) return;
    try {
      const data = await api.portfolio(account);
      set({ portfolio: data });
    } catch (e) { console.error("failed to load portfolio", e); }
  }, [account, set]);

  useEffect(() => { loadCoins(); const t = setInterval(loadCoins, REFRESH_MS); return () => clearInterval(t); }, [loadCoins]);
  useEffect(() => {
    if (!account) { set({ nativeBalance: 0n, portfolio: EMPTY_PORTFOLIO }); return; }
    refreshBalance(); loadPortfolio();
    const t = setInterval(refreshBalance, REFRESH_MS);
    return () => clearInterval(t);
  }, [account, refreshBalance, loadPortfolio, set]);

  // Shared by loadTokenDetail (CURVE/INSTANT) and loadCampaignDetail (RAISE)
  // -- metaURI() is the same ERC20 field on every family's token clone.
  // `overrideUri`, when given (DuckMetaOverride has registered this token —
  // see coin.metaOverrideUri), wins over both knownUri and the on-chain
  // metaURI() fallback: the whole point of an override is that nothing else
  // gets read once one exists. Only an override can also correct the
  // *displayed* name/symbol (the real ones are immutable ERC20 fields this
  // can't touch) -- resolveTokenNameSymbol is only even attempted in that
  // case, so the non-override path's name/symbol behavior is unchanged.
  const loadTokenMeta = useCallback(async (address, knownUri, overrideUri, knownImageUrl) => {
    try {
      const originalUri = knownUri || (overrideUri ? null : await fetchTokenMetaUri(address));
      const uri = overrideUri || originalUri;
      if (!uri) return;
      // The backend already resolved this image server-side (see
      // adapters.js) -- re-fetching it here too would just be the exact
      // same slow client-side IPFS round trip this was built to avoid.
      const [desc, imageUrl, socials, nameSymbol] = await Promise.all([
        resolveTokenDescription(uri), knownImageUrl ? Promise.resolve(knownImageUrl) : resolveTokenImage(uri), resolveTokenSocials(uri),
        overrideUri ? resolveTokenNameSymbol(uri) : Promise.resolve(null),
      ]);
      setS((st) => ({
        ...st,
        coins: st.coins.map((c) => {
          if (c.id !== address) return c;
          const patch = { desc: desc || c.desc, imageUrl: imageUrl || c.imageUrl, socials };
          if (originalUri) patch.metaUri = originalUri;
          if (nameSymbol?.name) patch.name = nameSymbol.name;
          if (nameSymbol?.symbol) { patch.symbol = nameSymbol.symbol; patch.ticker = "$" + nameSymbol.symbol; patch.initials = nameSymbol.symbol.slice(0, 2).toUpperCase(); }
          return { ...c, ...patch };
        }),
      }));
    } catch (e) { console.error("failed to load token metadata", e); }
  }, []);

  const loadTokenDetail = useCallback(async (address, knownMetaUri, overrideUri, knownImageUrl) => {
    loadTokenMeta(address, knownMetaUri, overrideUri, knownImageUrl);
    try {
      const [tradesRes, holdersRes] = await Promise.all([api.trades(address, PAGE_SIZE, 0), api.holders(address, PAGE_SIZE, 0)]);
      setS((st) => {
        const coin = st.coins.find((c) => c.id === address);
        if (!coin) return st;
        const totalSupply = coin.totalSupply ? Number(coin.totalSupply) / 1e18 : 1_000_000_000;
        const labels = {};
        if (coin.creator) labels[coin.creator.toLowerCase()] = "Creator";
        return {
          ...st,
          coins: st.coins.map((c) => c.id === address ? {
            ...c,
            trades: tradesRes.items.map((tr) => tradeToRow(tr, labels, coin.quote)),
            rawTrades: tradesRes.items, tradesHasMore: tradesRes.hasMore, tradesOffset: tradesRes.items.length,
            holderRows: holdersRes.items.map((h, i) => holderToRow(h, i, totalSupply, labels)),
            holdersHasMore: holdersRes.hasMore, holdersOffset: holdersRes.items.length,
          } : c),
        };
      });
    } catch (e) { console.error("failed to load token detail", e); }
  }, []);

  // "Load more" for the Trades/Holders tabs -- appends the next page rather
  // than re-fetching from the top, using each coin's own running offset so
  // repeated clicks page forward instead of re-requesting the same rows.
  async function loadMoreTrades(address) {
    const coin = s.coins.find((c) => c.id === address);
    if (!coin || !coin.tradesHasMore) return;
    try {
      const res = await api.trades(address, PAGE_SIZE, coin.tradesOffset || 0);
      setS((st) => {
        const cur = st.coins.find((c) => c.id === address);
        if (!cur) return st;
        const labels = {};
        if (cur.creator) labels[cur.creator.toLowerCase()] = "Creator";
        const newRows = res.items.map((tr) => tradeToRow(tr, labels, cur.quote));
        return {
          ...st,
          coins: st.coins.map((c) => c.id === address ? {
            ...c,
            trades: [...c.trades, ...newRows], rawTrades: [...c.rawTrades, ...res.items],
            tradesHasMore: res.hasMore, tradesOffset: (c.tradesOffset || 0) + res.items.length,
          } : c),
        };
      });
    } catch (e) { console.error("failed to load more trades", e); }
  }

  async function loadMoreHolders(address) {
    const coin = s.coins.find((c) => c.id === address);
    if (!coin || !coin.holdersHasMore) return;
    try {
      const res = await api.holders(address, PAGE_SIZE, coin.holdersOffset || 0);
      setS((st) => {
        const cur = st.coins.find((c) => c.id === address);
        if (!cur) return st;
        const totalSupply = cur.totalSupply ? Number(cur.totalSupply) / 1e18 : 1_000_000_000;
        const labels = {};
        if (cur.creator) labels[cur.creator.toLowerCase()] = "Creator";
        const startRank = cur.holderRows.length;
        const newRows = res.items.map((h, i) => holderToRow(h, startRank + i, totalSupply, labels));
        return {
          ...st,
          coins: st.coins.map((c) => c.id === address ? {
            ...c,
            holderRows: [...c.holderRows, ...newRows],
            holdersHasMore: res.hasMore, holdersOffset: (c.holdersOffset || 0) + res.items.length,
          } : c),
        };
      });
    } catch (e) { console.error("failed to load more holders", e); }
  }

  function errorText(e, fallback) {
    const decoded = e?.cause?.data?.errorName;
    if (decoded) return decoded;
    const base = e?.shortMessage || e?.message || fallback;
    const causeMsg = e?.cause?.shortMessage || e?.cause?.message;
    return causeMsg && causeMsg !== base ? `${base}: ${causeMsg}` : base;
  }

  const toastTimer = { current: null };
  function flash(msg) {
    clearTimeout(window.__duckToast);
    set({ toast: msg });
    window.__duckToast = setTimeout(() => set({ toast: "" }), 3800);
  }
  function requireWallet() {
    if (account) return true;
    if (openConnectModal) openConnectModal();
    else flash("Connect a wallet first.");
    return false;
  }
  function openToken(rawId) {
    // Case-insensitive lookup: a /0x... URL typed or pasted from a block
    // explorer often carries EIP-55 checksummed casing, while subgraph ids
    // are lowercase. Normalize to the coin's own canonical id so every
    // other s.coins.find(x => x.id === s.tokenId) lookup downstream (view
    // model, URL sync) keeps matching regardless of the casing a link came
    // in with.
    const coin = s.coins.find((c) => c.id.toLowerCase() === rawId.toLowerCase());
    const id = coin ? coin.id : rawId.toLowerCase();
    if (coin && coin.family === "CAMPAIGN") {
      set({ screen: "campaign", tokenId: id, campaignDetail: null });
      if (coin.campaignId) loadCampaignDetail(coin.campaignId);
      loadTokenMeta(id, coin.metaUri, coin.metaOverrideUri, coin.imageUrl);
      getRaiseDefaults().then((d) => set({ raiseDefaults: d })).catch(() => {});
    } else {
      set({ screen: "token", tokenId: id, tab: "Trades", side: "buy", amount: "250" });
      loadTokenDetail(id, coin?.metaUri, coin?.metaOverrideUri, coin?.imageUrl);
    }
    window.scrollTo(0, 0);
  }

  const loadCampaignDetail = useCallback(async (campaignId) => {
    try {
      const data = await api.campaign(campaignId);
      set({ campaignDetail: data });
    } catch (e) { console.error("failed to load campaign detail", e); }
  }, [set]);

  async function runTx(label, fn) {
    if (!requireWallet()) return null;
    if (s.txPending) return null;
    set({ txPending: true, tx: { stage: "pending" } });
    try {
      const hash = await fn();
      set({ tx: { stage: "pending", hash } });
      waitForTx(hash)
        .then((receipt) => set((st) => (st.tx ? { tx: { stage: receipt.status === "success" ? "success" : "reverted", hash } } : {})))
        .catch(() => set((st) => (st.tx ? { tx: { stage: "reverted", hash } } : {})))
        .finally(refreshBalance);
      return hash;
    } catch (e) {
      flash(errorText(e, label + " failed."));
      set({ tx: null });
      return null;
    } finally {
      set({ txPending: false });
    }
  }

  // ---------- trading ----------

  async function buy(coin, amtEth) {
    if (coin.family === "CAMPAIGN") return flash("This token is a campaign. Use Contribute instead of Buy.");
    if (!amtEth || amtEth <= 0) return flash("Enter an amount.");
    const valueWei = parseEther(String(amtEth));
    if (valueWei > s.nativeBalance) return flash("Not enough ETH. Need " + amtEth + ".");
    const isPool = coin.family === "INSTANT" || (coin.family === "CURVE" && coin.migrated);
    const isNativeQuote = coin.quoteTokenAddress.toLowerCase() === ZERO_ADDRESS;
    let hash;
    try {
      if (isPool) {
        const expected = await previewPoolBuyWithNative({ token: coin.id, hook: coin.hook, quoteAsset: coin.quoteTokenAddress, quoteSymbol: coin.quote, amountInWei: valueWei });
        if (expected === 0n) return flash("No ETH route available for this pool right now.");
        const minOut = applySlippage(expected, s.slippageBps);
        hash = await runTx("Buy", () => buyOnPoolWithNative({ account, token: coin.id, hook: coin.hook, quoteAsset: coin.quoteTokenAddress, quoteSymbol: coin.quote, amountInWei: valueWei, minOut }));
      } else if (isNativeQuote) {
        const expected = await previewCurveBuy(coin.id, valueWei);
        const minOut = applySlippage(expected, s.slippageBps);
        hash = await runTx("Buy", () => buyCurve({ account, token: coin.id, quoteToken: ZERO_ADDRESS, amountIn: valueWei, minOut }));
      } else {
        const { quoteOut, tokensOut } = await previewCurveBuyWithNative(coin.id, coin.quoteTokenAddress, coin.quote, valueWei);
        if (quoteOut === 0n) return flash("No ETH route available for this token's quote asset (" + coin.quote + ").");
        const minQuoteOut = applySlippage(quoteOut, s.slippageBps);
        const minOut = applySlippage(tokensOut, s.slippageBps);
        hash = await runTx("Buy", () => buyCurveWithNative({ account, token: coin.id, amountInWei: valueWei, minQuoteOut, minOut }));
      }
    } catch (e) {
      return flash("Couldn't get a price quote. Try again. (" + errorText(e, "unknown") + ")");
    }
    if (hash) { await Promise.all([loadPortfolio(), loadTokenDetail(coin.id, coin.metaUri, coin.metaOverrideUri, coin.imageUrl)]); flash("Bought " + coin.ticker + " for " + amtEth + " ETH"); }
  }

  async function sell(coin, tokenAmount) {
    if (coin.family === "CAMPAIGN") return flash("Selling isn't available for campaign tokens.");
    if (!tokenAmount || tokenAmount <= 0) return flash("Enter an amount.");
    const amountIn = parseUnits(String(tokenAmount), 18);
    const isPool = coin.family === "INSTANT" || (coin.family === "CURVE" && coin.migrated);
    let hash;
    try {
      if (isPool) {
        const expected = await previewPoolSellForNative({ token: coin.id, hook: coin.hook, quoteAsset: coin.quoteTokenAddress, quoteSymbol: coin.quote, amountIn });
        if (expected === 0n) return flash("No ETH route available for this pool right now.");
        const minOut = applySlippage(expected, s.slippageBps);
        hash = await runTx("Sell", () => sellOnPoolForNative({ account, token: coin.id, hook: coin.hook, quoteAsset: coin.quoteTokenAddress, quoteSymbol: coin.quote, amountIn, minOut }));
      } else {
        const expected = await previewCurveSell(coin.id, amountIn);
        const minQuoteOut = applySlippage(expected, s.slippageBps);
        hash = await runTx("Sell", () => sellCurve({ account, token: coin.id, amountIn, minQuoteOut }));
      }
    } catch (e) {
      return flash("Couldn't get a price quote. Try again. (" + errorText(e, "unknown") + ")");
    }
    if (hash) {
      await Promise.all([loadPortfolio(), loadTokenDetail(coin.id, coin.metaUri, coin.metaOverrideUri, coin.imageUrl)]);
      flash(isPool ? "Sold " + coin.ticker : "Sold " + coin.ticker + (coin.quote !== "ETH" ? " (proceeds landed as " + coin.quote + ")" : ""));
    }
  }

  // ---------- create ----------

  function onImagePick(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (s.draftImage.previewUrl) URL.revokeObjectURL(s.draftImage.previewUrl);
    const previewUrl = URL.createObjectURL(file);
    set({ draftImage: { file, previewUrl, uploading: true, ipfsUri: "", gatewayUrl: "", error: "" } });
    const form = new FormData();
    form.append("file", file);
    fetch(API_BASE + "/upload/image", { method: "POST", body: form })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `upload failed (${res.status})`);
        return res.json();
      })
      .then(({ ipfsUri, gatewayUrl }) => set((st) => ({ draftImage: { ...st.draftImage, uploading: false, ipfsUri, gatewayUrl } })))
      .catch((err) => set((st) => ({ draftImage: { ...st.draftImage, uploading: false, error: err.message || "upload failed" } })));
  }
  function clearImage() {
    if (s.draftImage.previewUrl) URL.revokeObjectURL(s.draftImage.previewUrl);
    set({ draftImage: EMPTY_IMAGE });
  }
  async function buildMetaURI(name, symbol, desc, socials) {
    try {
      const res = await fetch(API_BASE + "/upload/metadata", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, symbol, description: desc, image: s.draftImage.ipfsUri || "", socials: socials || {} }),
      });
      if (!res.ok) throw new Error("metadata upload failed");
      const { ipfsUri } = await res.json();
      return ipfsUri;
    } catch { return desc; }
  }
  function setSocial(field, value) {
    const key = s.family === "incubation" ? "draftCurve" : s.family === "launcher" ? "draftInstant" : "draftCampaign";
    set({ [key]: { ...s[key], socials: { ...s[key].socials, [field]: value } } });
  }

  async function submitCreate() {
    if (!requireWallet()) return;
    const { family, account: acct } = { family: s.family, account };
    if (family === "incubation") {
      const d = s.draftCurve;
      if (!d.name.trim() || !d.ticker.trim()) return flash("Name and ticker are required.");
      if (findBlockedTerm(d.name, d.ticker, d.desc)) return flash("That name, ticker, or description isn't allowed.");
      const symbol = d.ticker.trim().toUpperCase().slice(0, 9);
      const decimals = decimalsFor(d.quoteToken, [s.platformTokens.incubation]);
      const startVirtualQuote = parseUnits(d.startVirtualQuote || "1", decimals);
      const migrationTargetQuote = parseUnits(d.migrationTargetQuote || "10", decimals);
      if (startVirtualQuote === 0n || migrationTargetQuote <= startVirtualQuote) return flash("Migration target must exceed the start target.");
      const metaURI = await buildMetaURI(d.name.trim(), symbol, d.desc.trim(), d.socials);
      const isNativeQuoted = d.quoteToken.toLowerCase() === ZERO_ADDRESS;
      const earlyBuyAmount = d.earlyBuyAmount && Number(d.earlyBuyAmount) > 0 ? parseUnits(String(d.earlyBuyAmount), decimals) : 0n;
      let createdAddress;
      const hash = await runTx("Launch", async () => {
        const r = await createCurveToken({
          account: acct, name: d.name.trim(), symbol, totalSupply: parseUnits("1000000000", 18),
          curveBps: 8000n, liquidityBps: 2000n, quoteToken: d.quoteToken, startVirtualQuote, migrationTargetQuote,
          enableAntibot: false, antibotBlocks: 0n, metaURI,
          buyAmountWei: isNativeQuoted ? earlyBuyAmount : 0n, earlyBuyAmount: isNativeQuoted ? 0n : earlyBuyAmount,
        });
        createdAddress = r.tokenAddress.toLowerCase();
        return r.hash;
      });
      if (hash) {
        set({ screen: "token", tokenId: createdAddress, tab: "Trades", side: "buy", amount: "250", draftImage: EMPTY_IMAGE });
        flash("Launch submitted."); loadTokenMeta(createdAddress); confirmAndPoll(hash, createdAddress);
      }
    } else if (family === "launcher") {
      const d = s.draftInstant;
      if (!d.name.trim() || !d.ticker.trim()) return flash("Name and ticker are required.");
      if (findBlockedTerm(d.name, d.ticker, d.desc)) return flash("That name, ticker, or description isn't allowed.");
      const symbol = d.ticker.trim().toUpperCase().slice(0, 9);
      const metaURI = await buildMetaURI(d.name.trim(), symbol, d.desc.trim(), d.socials);
      const decimals = decimalsFor(d.quoteToken, [s.platformTokens.launcher]);
      const launchMarketCap = parseUnits(d.launchMarketCap || "10", decimals);
      const buyWei = d.buyAmountHype && Number(d.buyAmountHype) > 0 ? parseEther(String(d.buyAmountHype)) : 0n;
      let createdAddress;
      const hash = await runTx("Launch", async () => {
        const r = await launchInstant({
          account: acct, name: d.name.trim(), symbol, metaURI, quoteToken: d.quoteToken, launchMarketCap, quoteAmountWei: buyWei,
        });
        createdAddress = r.tokenAddress.toLowerCase();
        return r.hash;
      });
      if (hash) {
        set({ screen: "token", tokenId: createdAddress, tab: "Trades", side: "buy", amount: "250", draftImage: EMPTY_IMAGE });
        flash("Launch submitted."); loadTokenMeta(createdAddress); confirmAndPoll(hash, createdAddress);
      }
    } else {
      const d = s.draftCampaign;
      if (!d.name.trim() || !d.ticker.trim()) return flash("Name and ticker are required.");
      if (findBlockedTerm(d.name, d.ticker, d.desc)) return flash("That name, ticker, or description isn't allowed.");
      const symbol = d.ticker.trim().toUpperCase().slice(0, 9);
      const metaURI = await buildMetaURI(d.name.trim(), symbol, d.desc.trim(), d.socials);
      const goalNativeWei = parseEther(d.goalNative || "1");
      if (goalNativeWei === 0n) return flash("Enter a funding goal greater than zero.");
      let createdAddress, createdCampaignId;
      const hash = await runTx("Create campaign", async () => {
        const r = await createCampaign({
          account: acct, name: d.name.trim(), symbol, metaURI, dexQuoteAsset: d.dexQuoteAsset, goalNativeWei,
        });
        createdAddress = r.tokenAddress.toLowerCase(); createdCampaignId = r.campaignId;
        return r.hash;
      });
      if (hash) {
        set({ screen: "campaign", tokenId: createdAddress, campaignDetail: null, draftImage: EMPTY_IMAGE });
        flash("Campaign submitted."); loadTokenMeta(createdAddress); loadCampaignDetail(createdCampaignId); confirmAndPoll(hash, createdAddress);
      }
    }
  }

  // Proves a launch would succeed -- the exact same params (vanity salt,
  // uploaded metaURI, fees) run through a real simulateContract eth_call,
  // just stopped before the wallet is ever asked to sign or a transaction
  // sent. Shares submitCreate's validation/param-building so "simulate"
  // can never silently check something different from what "launch"
  // actually submits.
  async function simulateCreate() {
    if (!requireWallet()) return;
    const family = s.family;
    set({ simulating: true });
    try {
      if (family === "incubation") {
        const d = s.draftCurve;
        if (!d.name.trim() || !d.ticker.trim()) return flash("Name and ticker are required.");
        if (findBlockedTerm(d.name, d.ticker, d.desc)) return flash("That name, ticker, or description isn't allowed.");
        const symbol = d.ticker.trim().toUpperCase().slice(0, 9);
        const decimals = decimalsFor(d.quoteToken, [s.platformTokens.incubation]);
        const startVirtualQuote = parseUnits(d.startVirtualQuote || "1", decimals);
        const migrationTargetQuote = parseUnits(d.migrationTargetQuote || "10", decimals);
        if (startVirtualQuote === 0n || migrationTargetQuote <= startVirtualQuote) return flash("Migration target must exceed the start target.");
        const metaURI = await buildMetaURI(d.name.trim(), symbol, d.desc.trim(), d.socials);
        const isNativeQuoted = d.quoteToken.toLowerCase() === ZERO_ADDRESS;
        const earlyBuyAmount = d.earlyBuyAmount && Number(d.earlyBuyAmount) > 0 ? parseUnits(String(d.earlyBuyAmount), decimals) : 0n;
        await createCurveToken({
          account, name: d.name.trim(), symbol, totalSupply: parseUnits("1000000000", 18),
          curveBps: 8000n, liquidityBps: 2000n, quoteToken: d.quoteToken, startVirtualQuote, migrationTargetQuote,
          enableAntibot: false, antibotBlocks: 0n, metaURI,
          buyAmountWei: isNativeQuoted ? earlyBuyAmount : 0n, earlyBuyAmount: isNativeQuoted ? 0n : earlyBuyAmount,
          dryRun: true,
        });
      } else if (family === "launcher") {
        const d = s.draftInstant;
        if (!d.name.trim() || !d.ticker.trim()) return flash("Name and ticker are required.");
        if (findBlockedTerm(d.name, d.ticker, d.desc)) return flash("That name, ticker, or description isn't allowed.");
        const symbol = d.ticker.trim().toUpperCase().slice(0, 9);
        const metaURI = await buildMetaURI(d.name.trim(), symbol, d.desc.trim(), d.socials);
        const decimals = decimalsFor(d.quoteToken, [s.platformTokens.launcher]);
        const launchMarketCap = parseUnits(d.launchMarketCap || "10", decimals);
        const buyWei = d.buyAmountHype && Number(d.buyAmountHype) > 0 ? parseEther(String(d.buyAmountHype)) : 0n;
        await launchInstant({
          account, name: d.name.trim(), symbol, metaURI, quoteToken: d.quoteToken, launchMarketCap, quoteAmountWei: buyWei,
          dryRun: true,
        });
      } else {
        const d = s.draftCampaign;
        if (!d.name.trim() || !d.ticker.trim()) return flash("Name and ticker are required.");
        if (findBlockedTerm(d.name, d.ticker, d.desc)) return flash("That name, ticker, or description isn't allowed.");
        const symbol = d.ticker.trim().toUpperCase().slice(0, 9);
        const metaURI = await buildMetaURI(d.name.trim(), symbol, d.desc.trim(), d.socials);
        const goalNativeWei = parseEther(d.goalNative || "1");
        if (goalNativeWei === 0n) return flash("Enter a funding goal greater than zero.");
        await createCampaign({
          account, name: d.name.trim(), symbol, metaURI, dexQuoteAsset: d.dexQuoteAsset, goalNativeWei,
          dryRun: true,
        });
      }
      flash("Simulation succeeded. This would launch successfully.");
    } catch (e) {
      flash("Simulation failed: " + errorText(e, "unknown error"));
    } finally {
      set({ simulating: false });
    }
  }

  // ---------- campaign ----------

  async function contribute(coin, amtEth) {
    if (!amtEth || amtEth <= 0) return flash("Enter an amount.");
    const valueWei = parseEther(String(amtEth));
    const hash = await runTx("Contribute", () => contributeCampaign({ account, campaignId: BigInt(coin.campaignId), amountWei: valueWei }));
    if (hash) { await Promise.all([loadPortfolio(), loadCoins()]); flash("Contributed " + amtEth + " ETH"); }
  }
  async function claimCampaignTokens(coin) {
    const hash = await runTx("Claim", () => claimCampaign({ account, campaignId: BigInt(coin.campaignId) }));
    if (hash) { await loadPortfolio(); flash("Claimed."); }
  }
  async function claimCampaignRefundAction(coin) {
    const hash = await runTx("Refund", () => claimCampaignRefund({ account, campaignId: BigInt(coin.campaignId) }));
    if (hash) { await loadPortfolio(); flash("Refunded."); }
  }
  async function finalizeCampaignAction(coin) {
    const hash = await runTx("Finalize", () => finalizeCampaign({ account, campaignId: BigInt(coin.campaignId) }));
    if (hash) { await loadCoins(); flash("Finalized."); }
  }
  async function claimCreatorFees(tokenAddress) {
    const hash = await runTx("Claim fees", () => claimFees({ account, token: tokenAddress }));
    if (hash) { await loadPortfolio(); flash("Fees claimed."); }
  }
  async function claimAllCreatorFees() {
    const hash = await runTx("Claim all fees", () => claimAllFees({ account }));
    if (hash) { await loadPortfolio(); flash("All fees claimed."); }
  }

  // ---------- creator + liquidity / CTO (lazy-loaded on tab open) ----------

  const loadCreatorData = useCallback(async (coin) => {
    if (!coin || coin.family === "CAMPAIGN") return;
    set({ creatorLoading: true });
    try {
      const [position, creator] = await Promise.all([getPosition(coin.id), getPositionCreator(coin.id).catch(() => null)]);
      const tokenId = position?.[0] ?? 0n;
      const poolId = position?.[3] ?? null;
      const hasPool = !!poolId && poolId !== "0x0000000000000000000000000000000000000000000000000000000000000";
      let pool = null, ctoApp = null, hookAccrued = 0n, hookAccruedFailed = false, hookSplits = [], ctoFee = null;
      if (hasPool) {
        let hookAccruedResult;
        [pool, ctoApp, hookAccruedResult, hookSplits, ctoFee] = await Promise.all([
          getPool(poolId, coin.hook).catch(() => null), getCtoApplication(poolId, coin.hook).catch(() => null),
          getHookAccruedFees(poolId, coin.hook).then((v) => ({ ok: true, v })).catch(() => ({ ok: false, v: 0n })),
          getHookFeeSplits(poolId, coin.hook).catch(() => []), getCtoFee(coin.hook).catch(() => null),
        ]);
        hookAccrued = hookAccruedResult.v;
        hookAccruedFailed = !hookAccruedResult.ok;
      }
      set({ creatorData: { hasPool, tokenId, poolId, pool, creator, ctoApp, hookAccrued, hookAccruedFailed, hookSplits, ctoFee }, creatorLoading: false });
    } catch (e) {
      console.error("failed to load creator data", e);
      set({ creatorData: null, creatorLoading: false });
    }
  }, [set]);

  const selectedCoin = s.coins.find((x) => x.id === s.tokenId);
  useEffect(() => {
    if (s.screen === "token" && s.tab === "Creator + liquidity" && selectedCoin) loadCreatorData(selectedCoin);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.screen, s.tab, s.tokenId]);

  // Live "you receive ~X" estimate, debounced -- reuses the exact same
  // preview calls buy()/sell() use for minOut, just without submitting
  // anything. Cleared whenever the amount/side/token changes so a stale
  // estimate from a previous keystroke never lingers on screen.
  useEffect(() => {
    if (s.screen !== "token" || !selectedCoin || selectedCoin.family === "CAMPAIGN") return;
    const amt = parseFloat(s.amount);
    if (!amt || amt <= 0) { set({ previewOut: null, previewLoading: false }); return; }
    const coin = selectedCoin;
    const buying = s.side === "buy";
    set({ previewLoading: true });
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const isPool = coin.family === "INSTANT" || (coin.family === "CURVE" && coin.migrated);
        let out = null;
        if (buying) {
          const valueWei = parseEther(String(amt));
          if (isPool) {
            out = await previewPoolBuyWithNative({ token: coin.id, hook: coin.hook, quoteAsset: coin.quoteTokenAddress, quoteSymbol: coin.quote, amountInWei: valueWei });
          } else if (coin.quoteTokenAddress.toLowerCase() === ZERO_ADDRESS) {
            out = await previewCurveBuy(coin.id, valueWei);
          } else {
            const r = await previewCurveBuyWithNative(coin.id, coin.quoteTokenAddress, coin.quote, valueWei);
            out = r.tokensOut;
          }
        } else {
          const amountIn = parseUnits(String(amt), 18);
          out = isPool
            ? await previewPoolSellForNative({ token: coin.id, hook: coin.hook, quoteAsset: coin.quoteTokenAddress, quoteSymbol: coin.quote, amountIn })
            : await previewCurveSell(coin.id, amountIn);
        }
        if (!cancelled) set({ previewOut: out, previewLoading: false });
      } catch {
        if (!cancelled) set({ previewOut: null, previewLoading: false });
      }
    }, 400);
    return () => { cancelled = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s.screen, s.tokenId, s.side, s.amount]);

  // Triggers DuckLocker.claimFees, which collects the LP-position's trading
  // fee and (same call, best-effort) the hook's separate creator fee --
  // but only the hook's fee actually pays the creator. The LP-position fee
  // itself always goes token-side-burned (0.5%, realized on buys) / quote-
  // side-to-platform-wallet (0.5%, realized on sells) via DuckLocker.
  // _collectAndDistribute -- the creator is just the address permitted to
  // trigger the collection, not a recipient of that side.
  async function claimCreatorAndHookFees(coin) {
    const hash = await runTx("Claim fees", () => claimFees({ account, token: coin.id }));
    if (hash) { await Promise.all([loadPortfolio(), loadCreatorData(coin)]); flash("Fees claimed."); }
  }
  // Separate from the above: DuckIncubation's own 1% curve-trading fee,
  // accrued pre-migration but only claimable once migrated.
  async function claimCurveFeeAction(coin) {
    const hash = await runTx("Claim curve fee", () => claimCurveFee({ account, token: coin.id }));
    if (hash) { await Promise.all([loadPortfolio(), loadCreatorData(coin)]); flash("Curve fee claimed."); }
  }
  async function saveFeeSplits(coin, poolId, splits) {
    let hash;
    if (poolId) hash = await runTx("Save fee settings", () => setHookFeeSplits({ account, poolId, splits, hook: coin.hook }));
    if (hash) { await loadCreatorData(coin); flash("Fee settings saved."); }
  }
  async function buyTakeover(coin, poolId, newCreator) {
    const hash = await runTx("Buy takeover", () => applyForCTO({ account, poolId, newCreator: newCreator || account, hook: coin.hook }));
    if (hash) { await loadCreatorData(coin); flash("CTO application submitted."); }
  }

  // ---------- render ----------

  const v = buildViewModel({
    s, set, account, isConnected, disconnect, openConnectModal,
    loadCoins, loadPortfolio, loadTokenDetail, loadMoreTrades, loadMoreHolders, openToken, flash, requireWallet,
    buy, sell, submitCreate, simulateCreate, onImagePick, clearImage, setSocial,
    contribute, claimCampaignTokens, claimCampaignRefundAction, finalizeCampaignAction,
    claimCreatorFees, claimAllCreatorFees, loadCreatorData, claimCreatorAndHookFees, claimCurveFeeAction, saveFeeSplits, buyTakeover,
  });

  const m = v.isMobile;
  return (
    <div style={cs("min-height:100vh;display:flex;background:var(--paper)")}>

      {!m && (
        <aside style={cs("width:236px;flex:none;display:flex;flex-direction:column;border-right:1px solid var(--line);background:var(--card);position:sticky;top:0;height:100vh")}>
          <div onClick={v.goHome} style={cs("display:flex;align-items:center;gap:10px;padding:18px 16px 16px;cursor:pointer")}>
            <img src="/duckfun-logo.png" alt="duckfun" style={cs("width:26px;height:26px;object-fit:contain;display:block;flex:none")} />
            <span style={cs("font-size:15.5px;font-weight:600;letter-spacing:-.02em")}>duckfun</span>
          </div>

          <div style={cs("font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.16em;color:var(--mute);padding:4px 16px 8px")}>PLATFORM</div>
          <div style={cs("display:flex;flex-direction:column;gap:2px;padding:0 10px")}>
            {v.navMain.map((n, i) => (
              <button key={i} onClick={n.go} className="d-hover-paper" style={cs(`display:flex;align-items:center;gap:11px;width:100%;padding:8px 11px 8px 9px;border:0;border-left:2px solid ${n.u};border-radius:6px;background:transparent;color:${n.c};font-size:13.5px;font-weight:${n.w};text-align:left;cursor:pointer`)}>{n.label}</button>
            ))}
          </div>

          <div style={cs("height:1px;background:var(--line);margin:14px 16px 12px")}></div>
          <div style={cs("font-family:'JetBrains Mono',monospace;font-size:9px;letter-spacing:.16em;color:var(--mute);padding:0 16px 8px")}>LEARN</div>
          <div style={cs("display:flex;flex-direction:column;gap:2px;padding:0 10px")}>
            {v.navLearn.map((n, i) => (
              <button key={i} onClick={n.go} className="d-hover-paper" style={cs(`display:flex;align-items:center;gap:11px;width:100%;padding:8px 11px 8px 9px;border:0;border-left:2px solid ${n.u};border-radius:6px;background:transparent;color:${n.c};font-size:13.5px;font-weight:${n.w};text-align:left;cursor:pointer`)}>{n.label}</button>
            ))}
          </div>

          <div style={cs("flex:1")}></div>
        </aside>
      )}

      <div style={cs("flex:1;min-width:0;max-width:100%;display:flex;flex-direction:column")}>
        <header style={cs("position:sticky;top:0;z-index:40;background:rgba(23,23,23,.9);backdrop-filter:blur(8px);border-bottom:1px solid var(--line)")}>
          <div style={cs(`display:flex;align-items:center;gap:12px;padding:0 ${m ? "12px" : "20px"};min-height:${m ? "52px" : "58px"}`)}>
            {m && (
              <div onClick={v.goHome} style={cs("display:flex;align-items:center;gap:9px;cursor:pointer;flex:none")}>
                <img src="/duckfun-logo.png" alt="duckfun" style={cs("width:24px;height:24px;object-fit:contain;display:block")} />
                <span style={cs("font-size:15px;font-weight:600;letter-spacing:-.02em")}>duckfun</span>
              </div>
            )}
            {!m && v.pageTitle && (
              <div style={cs("display:flex;flex-direction:column;min-width:0;flex:none")}>
                <span style={cs("font-size:15px;font-weight:600;letter-spacing:-.02em")}>{v.pageTitle}</span>
                {v.pageSub && <span style={cs("font-size:11.5px;color:var(--mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{v.pageSub}</span>}
              </div>
            )}
            <div style={cs("flex:1;min-width:0")}></div>
            {v.isHome && !m && (
              <div style={cs("display:flex;align-items:center;gap:8px;height:36px;padding:0 11px;border:1px solid var(--line);border-radius:6px;background:var(--paper);flex:1 1 200px;max-width:320px;min-width:0")}>
                <span style={cs("color:var(--mute);font-size:13px")}>⌕</span>
                <input value={v.query} onChange={v.setQuery} placeholder="Search name, symbol or address" style={cs("border:0;outline:0;background:transparent;font-size:13px;width:100%")} />
              </div>
            )}
            <button onClick={v.toggleWallet} style={cs(`height:36px;padding:0 14px;border:1px solid var(--line);border-radius:6px;background:${v.walletBg};color:${v.walletFg};font-family:${v.walletFont};font-size:13px;font-weight:500;white-space:nowrap;flex:none;cursor:pointer`)}>{v.walletLabel}</button>
            {m && (
              <button onClick={v.openMenu} aria-label="Menu" style={cs("display:flex;width:36px;height:36px;align-items:center;justify-content:center;flex-direction:column;gap:4px;border:1px solid var(--line);border-radius:6px;background:var(--card);cursor:pointer;padding:0;flex:none")}>
                <span style={cs("width:15px;height:1.5px;background:var(--ink);display:block")}></span>
                <span style={cs("width:15px;height:1.5px;background:var(--ink);display:block")}></span>
                <span style={cs("width:15px;height:1.5px;background:var(--ink);display:block")}></span>
              </button>
            )}
          </div>
        </header>

        <main style={cs(`flex:1;padding:${m ? "14px 12px 76px" : "22px 24px 96px"};width:100%;max-width:1320px;margin:0 auto;min-width:0`)}>
          {v.isHome && <DiscoverPage v={v} />}
          {v.isToken && (v.coin ? <TokenPage v={v} /> : <PendingLaunchPanel v={v} />)}
          {v.isCreate && <CreateChooserPage v={v} />}
          {v.isCreateForm && <CreateFormPage v={v} />}
          {v.isCampaign && (v.camp ? <CampaignPage v={v} /> : <PendingLaunchPanel v={v} />)}
          {v.isPortfolio && <PortfolioPage v={v} />}
          {v.isStats && <StatsPage v={v} />}
          {v.isHow && <HowItWorksPage v={v} />}
          {v.isDocs && <DocsPage v={v} />}
        </main>
      </div>

      {/* Persistent status/docs/social bar -- pinned to the bottom on every
          screen, offset past the sidebar on desktop the same way the header
          is, full-width on mobile. Docs lives here as an icon instead of a
          nav link now, alongside the chain-sync status and the social
          links, none of which need to sit in the nav/header anymore. */}
      <div style={cs(`position:fixed;left:${m ? "0" : "236px"};right:0;bottom:0;z-index:55;display:flex;align-items:center;gap:10px;height:44px;padding:0 ${m ? "12px" : "20px"};border-top:1px solid var(--line);background:rgba(23,23,23,.92);backdrop-filter:blur(8px);font-family:'JetBrains Mono',monospace;font-size:10.5px;color:var(--mute)`)}>
        <span style={cs("width:6px;height:6px;border-radius:99px;background:var(--lime);flex:none")}></span>
        <span>{m ? "INK 57073" : "Ink 57073 · synced"}</span>
        <div style={cs("margin-left:auto;display:flex;gap:6px")}>
          <button onClick={v.goDocs} title="Docs" style={cs("width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:6px;background:var(--card);color:var(--ink);cursor:pointer;padding:0")}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M6 2h8l4 4v16H6z"/><path d="M14 2v4h4" /><path d="M9 12h6M9 16h6" /></svg>
          </button>
          <a href="https://x.com/duckfunfamily" target="_blank" rel="noreferrer" title="duckfun on X" style={cs("width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:6px;background:var(--card);color:var(--ink)")}>
            <XIcon />
          </a>
          <a href="https://t.me/DuckFunFamily" target="_blank" rel="noreferrer" title="duckfun on Telegram" style={cs("width:28px;height:28px;display:flex;align-items:center;justify-content:center;border:1px solid var(--line);border-radius:6px;background:var(--card);color:var(--ink)")}>
            <TelegramIcon />
          </a>
        </div>
      </div>

      {m && v.menuOpen && (
        <div onClick={v.closeMenu} style={cs("position:fixed;inset:0;z-index:90;background:rgba(0,0,0,.6);display:flex;justify-content:flex-end")}>
          <div onClick={(e) => e.stopPropagation()} style={cs("width:78%;max-width:290px;height:100%;background:var(--card);border-left:1px solid var(--line);display:flex;flex-direction:column")}>
            <div style={cs("display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 16px;border-bottom:1px solid var(--line)")}>
              <span style={cs("font-size:14.5px;font-weight:600")}>Menu</span>
              <button onClick={v.closeMenu} aria-label="Close menu" style={cs("width:30px;height:30px;border:1px solid var(--line);border-radius:6px;background:var(--paper);cursor:pointer;font-size:15px;line-height:1")}>✕</button>
            </div>
            <div style={cs("display:flex;flex-direction:column;gap:3px;padding:10px")}>
              {v.navDrawer.map((n, i) => (
                <button key={i} onClick={() => { n.go(); v.closeMenu(); }} style={cs(`text-align:left;padding:11px 12px;border:0;border-radius:6px;background:transparent;color:${n.c};font-size:14.5px;font-weight:${n.w};cursor:pointer`)}>{n.label}</button>
              ))}
            </div>
            <div style={cs("flex:1")}></div>
          </div>
        </div>
      )}

      {v.txOpen && (
        <div style={cs("position:fixed;inset:0;z-index:95;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;padding:20px")}>
          <div style={cs("width:100%;max-width:400px;border:1px solid var(--line);border-radius:10px;background:var(--card);overflow:hidden")}>
            <div style={cs(`padding:26px 22px;border-bottom:1px solid var(--line);text-align:center;background:${v.tx.headBg};color:${v.tx.headFg}`)}>
              <div style={cs(`width:46px;height:46px;margin:0 auto 16px;border:3px solid ${v.tx.headFg};border-radius:999px;border-top-color:${v.tx.ringTop};animation:${v.tx.anim};display:flex;align-items:center;justify-content:center;font-size:19px`)}>{v.tx.glyph}</div>
              <div style={cs("font-size:19px;font-weight:700;letter-spacing:-.03em")}>{v.tx.title}</div>
              <div style={cs(`font-size:12.5px;margin-top:7px;line-height:1.5;opacity:${v.tx.headFg === "#fff" ? ".9" : "1"};color:${v.tx.headFg === "#fff" ? "#fff" : "var(--mute)"}`)}>{v.tx.sub}</div>
            </div>
            <div style={cs("padding:14px 18px;border-bottom:1px solid var(--line);font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--mute);word-break:break-all;line-height:1.5")}>{v.tx.hash}</div>
            <div style={cs("display:flex")}>
              <a href={v.tx.explorerUrl} target="_blank" rel="noreferrer" style={cs("flex:1;padding:14px;text-align:center;font-size:13.5px;font-weight:600;border:0;border-right:1px solid var(--line)")}>Explorer ↗</a>
              <button onClick={v.closeTx} style={cs("flex:1;padding:14px;border:0;background:var(--ink);color:var(--card);font-size:13.5px;font-weight:600;cursor:pointer")}>{v.tx.cta}</button>
            </div>
          </div>
        </div>
      )}

      {v.toast && (
        <div style={cs(`position:fixed;z-index:60;left:50%;bottom:28px;transform:translateX(-50%);display:flex;align-items:center;gap:10px;padding:13px 20px;border:1px solid var(--line);border-radius:8px;background:var(--card);animation:slidein .22s ease both;max-width:90vw`)}>
          <span style={cs("width:7px;height:7px;background:var(--lime);flex:none")}></span>
          <span style={cs("font-size:13px")}>{v.toast}</span>
        </div>
      )}
    </div>
  );
}

// ---------- view-model ----------

function buildViewModel(ctx) {
  const { s, set, account, isConnected, disconnect, openConnectModal } = ctx;
  const scr = s.screen;

  const nav = [["Discover", "home"], ["Launch", "create"], ["Stats", "stats"], ["Portfolio", "portfolio"], ["How it works", "how"], ["Docs", "docs"]].map(([label, key]) => {
    const active = scr === key
      || (key === "home" && (scr === "token" || scr === "campaign"))
      || (key === "create" && scr === "createForm");
    return {
      label, go: () => set({ screen: key, family: key === "create" ? null : s.family }),
      c: active ? INK : "var(--mute)", w: active ? "700" : "500", u: active ? INK : "transparent",
    };
  });

  const filters = ["All", "CURVE", "INSTANT", "CAMPAIGN", "Migrated"].map((key) => {
    const label = key === "CURVE" ? "Bonding" : key === "INSTANT" ? "Instant launch" : key === "CAMPAIGN" ? "Crowdlaunch" : key;
    const shortLabel = key === "CURVE" ? "Bonding" : key === "INSTANT" ? "Instant" : label;
    return Object.assign({ key, label: s.mobile ? shortLabel : label, dv: key === "All" ? "0" : "1px solid var(--line)", go: () => set({ filter: key }) }, block(s.filter === key));
  });

  let list = s.coins.slice();
  if (s.filter === "Migrated") list = list.filter((c) => c.migrated);
  else if (s.filter !== "All") list = list.filter((c) => c.family === s.filter);
  // A token with no priced trade yet has no mcUsd to test -- pass it through
  // rather than guess, so an untraded launch is never hidden by mistake.
  if (s.mcapFilter !== "any") { const test = MCAP_TEST[s.mcapFilter]; list = list.filter((c) => c.mcUsd == null || test(c.mcUsd)); }
  if (s.launchedFilter !== "any") { const test = LAUNCHED_TEST[s.launchedFilter]; list = list.filter((c) => test(c.ageMin)); }
  if (s.quoteFilter !== "any") list = list.filter((c) => c.quote === s.quoteFilter);
  const q = s.query.trim().toLowerCase();
  if (q) list = list.filter((c) => (c.name + c.ticker + c.dev).toLowerCase().includes(q));
  const quoteFilterOptions = ["any", ...new Set(s.coins.map((c) => c.quote))];

  const isInstant = (c) => c.family === "INSTANT";
  const shape = (c) => ({
    id: c.id, family: c.family === "CURVE" ? "BONDING" : c.family === "INSTANT" ? "INSTANT LAUNCH" : "CROWDLAUNCH",
    famBg: c.famBg, famFg: c.famFg, initials: c.initials, imageUrl: c.imageUrl, symbol: c.ticker, name: c.name,
    creator: shortAddress(c.creator), age: ageLabel(c.ageMin),
    price: usdOrQuote(c.priceUsd, c.price, c.quote),
    chg: c.chg != null ? (c.chg >= 0 ? "+" : "") + c.chg.toFixed(1) + "%" : "—",
    chgColor: c.chg != null ? (c.chg >= 0 ? "var(--pos)" : "var(--neg)") : "var(--mute)",
    mcap: usdOrQuote(c.mcUsd, c.mc, c.quote), vol: usdOrQuote(c.volUsd, c.vol, c.quote),
    holders: c.holders.toLocaleString(), quote: c.quote,
    socials: c.socials || {},
    bars: buildSparkline(c.rawTrades),
    // Instant-launch tokens land straight on a V4 pool -- no curve to fill,
    // so the handoff hides the progress bar entirely for them (a permanent
    // "LP LOCKED" label instead) rather than showing a meaningless 100%.
    progLabel: c.family === "CAMPAIGN" ? "RAISE · ILLIQUID" : c.migrated ? "MIGRATED → V4" : "CURVE",
    progPct: isInstant(c) ? "LP LOCKED" : Math.round(c.pct) + "%",
    showProg: !isInstant(c),
    progWidth: Math.min(100, Math.max(0, c.pct)),
    progFill: c.family === "CAMPAIGN" ? ORANGE : c.pct >= 100 ? "var(--pos)" : INK,
    ticks: buildTicks(20, c.pct, INK),
    open: () => ctx.openToken(c.id),
  });

  // Three real ranking modes over the launched-token list. "Last activity"
  // ranks by real last-trade time (Token.lastTradeAt, tracked alongside
  // lastPrice) -- tokens that have never traded sort last, never faked into
  // looking recently active. Used two ways: as the feed's own sort order
  // (sortTabs, scoped by whatever family/search filters are active), and,
  // unfiltered, to pick the single highest-mcap coin for the King of Ducks
  // hero card below.
  const SORT_MODES = {
    "Last activity": { sort: (a, b) => (a.lastActiveMin ?? Infinity) - (b.lastActiveMin ?? Infinity) },
    "Top market cap": { sort: (a, b) => (b.mcUsd ?? b.mc) - (a.mcUsd ?? a.mc) },
    New: { sort: (a, b) => a.ageMin - b.ageMin },
  };
  const sortMode = SORT_MODES[s.sort] || SORT_MODES["Last activity"];
  const sortTabs = Object.keys(SORT_MODES).map((label) =>
    Object.assign({ label, go: () => set({ sort: label }) }, block(s.sort === label)));
  const feed = list.slice().sort(sortMode.sort).map(shape);

  const kingPool = s.coins.slice().sort(SORT_MODES["Top market cap"].sort);
  const kingCoin = kingPool.length > 0 ? { ...shape(kingPool[0]), mcapLabel: usdOrQuote(kingPool[0].mcUsd, kingPool[0].mc, kingPool[0].quote) } : null;

  const c = s.coins.find((x) => x.id === s.tokenId);
  const buying = s.side === "buy";
  const amt = parseFloat(s.amount) || 0;
  const myBalance = c ? s.portfolio.holdings.find((h) => h.token?.id === c.id)?.balance : null;
  const myBalanceTokens = myBalance ? Number(myBalance) / 1e18 : 0;
  const myContribution = c ? s.portfolio.contributions.find((ct) => ct.campaign?.id === c.campaignId) : null;

  const walletTx = buildTxModel(s, account);

  // Candle RESOLUTION (bucket size) applied across the token's whole trade
  // history -- like a real exchange's timeframe picker, not a "how far back"
  // filter. "ALL" omits a fixed size so buildCandles auto-picks one from the
  // real history's span.
  const RANGE_BUCKET_SECONDS = { "5M": 300, "1H": 3600, "4H": 4 * 3600, "1D": 86400, ALL: undefined };
  const fmtOhlc = (v) => compactNumber(v);
  let candles = [], ohlc = null;
  if (c) {
    candles = buildCandles(c.rawTrades || [], c.curveSeed, RANGE_BUCKET_SECONDS[s.range]);
    if (candles.length > 0) {
      const last = candles[candles.length - 1];
      // pctChange computed from the RAW numbers, before formatting --
      // ohlc.o/c below become display strings that can contain unicode
      // subscript digits (compactNumber's small-price notation), which
      // silently produce NaN if re-parsed as numbers via `-`.
      const pctChange = last.open !== 0 ? ((last.close - last.open) / Math.abs(last.open)) * 100 : 0;
      ohlc = { o: fmtOhlc(last.open), h: fmtOhlc(last.high), l: fmtOhlc(last.low), c: fmtOhlc(last.close), up: last.close >= last.open, pctChange };
    }
  }
  // Chart-only view: PRICE (as-is) or MCAP (every OHLC value scaled by
  // total supply -- a pure uniform rescale, same real trade data, not a
  // separate metric requiring its own indexed history). Never affects
  // sel.price/ohlc above, which is always the token header's real price.
  const supplyTokens = c && c.totalSupply ? Number(c.totalSupply) / 1e18 : 0;
  const chartCandles = s.chartMode === "mcap"
    ? candles.map((k) => ({ ...k, open: k.open * supplyTokens, high: k.high * supplyTokens, low: k.low * supplyTokens, close: k.close * supplyTokens }))
    : candles;
  let chartOhlc = null;
  if (chartCandles.length > 0) {
    const last = chartCandles[chartCandles.length - 1];
    chartOhlc = { o: fmtOhlc(last.open), h: fmtOhlc(last.high), l: fmtOhlc(last.low), c: fmtOhlc(last.close), up: last.close >= last.open };
  }

  // Sidebar page title/subtitle, replacing the old top-nav's link row on
  // desktop. Real data where it exists (token/campaign symbol+name), a
  // short honest description everywhere else -- never a fabricated one.
  const PAGE_META = {
    home: { title: "Discover", sub: "Every token live on Ink" },
    create: { title: "Launch a token", sub: "Bonding curve, instant V4 or crowdlaunch" },
    createForm: { title: "Launch a token", sub: "" },
    portfolio: { title: "Portfolio", sub: "Your holdings, launches and claims" },
    stats: { title: "Stats", sub: "Platform-wide activity" },
    how: { title: "How it works", sub: "Launching and trading, end to end" },
    docs: { title: "Docs", sub: "Technical reference for the contracts" },
  };
  const pageMeta = (scr === "token" || scr === "campaign") && c
    ? { title: c.ticker, sub: c.name }
    : PAGE_META[scr] || { title: "", sub: "" };

  return {
    isMobile: s.mobile,
    pageTitle: pageMeta.title, pageSub: pageMeta.sub,
    // Docs moves out of the nav entirely and into the persistent bottom bar
    // (as an icon, alongside platform status and the social links) -- kept
    // out of navMain/navLearn/navDrawer, all three of which the sidebar,
    // desktop LEARN group and mobile drawer render from.
    navMain: nav.slice(0, 4), navLearn: nav.slice(4, 5), navDrawer: nav.filter((n) => n.label !== "Docs"),
    connected: !!account, account, accountShort: account ? shortAddress(account) : "",
    balance: Number(formatEther(s.nativeBalance)).toFixed(4),
    walletLabel: account ? shortAddress(account) : "Connect wallet",
    walletBg: account ? CARD : INK, walletFg: account ? INK : CARD,
    walletFont: account ? "'JetBrains Mono',monospace" : "'Outfit',sans-serif",
    toggleWallet: () => (account ? disconnect() : openConnectModal && openConnectModal()),
    txPending: s.txPending,

    nav,
    isHome: scr === "home", isToken: scr === "token", isCreate: scr === "create",
    isCreateForm: scr === "createForm", isCampaign: scr === "campaign", isPortfolio: scr === "portfolio",
    isStats: scr === "stats", isHow: scr === "how", isDocs: scr === "docs",
    goHome: () => set({ screen: "home" }), goCreate: () => set({ screen: "create" }),
    goPortfolio: () => set({ screen: "portfolio" }), goHow: () => set({ screen: "how" }), goDocs: () => set({ screen: "docs" }),
    menuOpen: s.menuOpen, openMenu: () => set({ menuOpen: true }), closeMenu: () => set({ menuOpen: false }),

    filters, feed, isEmpty: feed.length === 0,
    sortTabs, kingCoin,
    layoutCards: s.layout === "cards", layoutTable: s.layout === "table",
    setLayoutCards: () => set({ layout: "cards" }), setLayoutTable: () => set({ layout: "table" }),
    lcBg: block(s.layout === "cards").bg, lcFg: block(s.layout === "cards").fg,
    ltBg: block(s.layout === "table").bg, ltFg: block(s.layout === "table").fg,
    query: s.query, setQuery: (e) => set({ query: e.target.value }),
    mcapPresets: MCAP_PRESETS, mcapFilter: s.mcapFilter, setMcapFilter: (e) => set({ mcapFilter: e.target.value }),
    launchedPresets: LAUNCHED_PRESETS, launchedFilter: s.launchedFilter, setLaunchedFilter: (e) => set({ launchedFilter: e.target.value }),
    quoteFilterOptions, quoteFilter: s.quoteFilter, setQuoteFilter: (e) => set({ quoteFilter: e.target.value }),

    coin: c,
    sel: c ? {
      // Short labels here on purpose -- this badge sits in the token-page
      // header's single tight row alongside the logo, symbol and price, not
      // the wider Discover card where the full "INSTANT LAUNCH"/"CROWDLAUNCH"
      // labels fit fine.
      name: c.name, symbol: c.ticker, family: c.family === "CURVE" ? "BONDING" : c.family === "INSTANT" ? "INSTANT" : "RAISE",
      famBg: c.famBg, famFg: c.famFg, initials: c.initials, imageUrl: c.imageUrl, address: shortAddress(c.id), quote: c.quote,
      price: ohlc ? "$" + ohlc.c : c.curveSeed ? "$" + compactNumber(c.curveSeed.price) : "—",
      chg: ohlc ? (ohlc.pctChange >= 0 ? "+" : "−") + Math.abs(ohlc.pctChange).toFixed(1) + "%" : "—",
      chgColor: ohlc ? (ohlc.up ? "var(--pos)" : "var(--neg)") : "var(--mute)",
      migrated: c.migrated, holders: c.holders,
      raised: c.raised.toFixed(4), startTarget: "—", migTarget: "—",
    } : null,
    tokenStats: c ? [
      { k: "MCAP", v: usdOrQuote(c.mcUsd, c.mc, c.quote) },
      // "Raised" is a bonding-curve/crowdlaunch concept (ETH collected before
      // migration or finalize) -- an instant-launch token skips that phase
      // entirely and opens straight on a V4 pool, so showing "RAISED 0 ETH"
      // for one would misrepresent it as a stalled raise rather than what it
      // actually is: not applicable. Show total supply there instead.
      c.family === "INSTANT"
        ? { k: "SUPPLY", v: compactNumber(Number(c.totalSupply || 0) / 1e18) }
        : { k: "RAISED", v: quoteAmount(c.raised, c.quote) },
      { k: "24H VOL", v: usdOrQuote(c.volUsd, c.vol, c.quote) },
      { k: "HOLDERS", v: c.holders.toLocaleString() },
      { k: c.family === "CURVE" && !c.migrated ? "CURVE" : "POOL", v: c.family === "CURVE" && !c.migrated ? Math.round(c.pct) + "%" : (c.migrated || c.family === "INSTANT") ? "V4 LIVE" : "—" },
      { k: "LP LOCK", v: (c.migrated || c.family === "INSTANT") ? "FOREVER" : "—" },
      { k: "BURNED", v: compactNumber(Number(c.burnedSupply || 0) / 1e18) },
    ] : [],
    candles: chartCandles, ohlc, chartOhlc,
    chartMode: s.chartMode, setChartMode: (mode) => set({ chartMode: mode }),
    curve: c && c.family === "CURVE" ? {
      title: c.migrated ? "Migrated to Uniswap V4" : "Curve → V4 migration",
      headline: c.migrated ? "LP LOCKED FOREVER" : Math.round(c.pct) + "% filled",
      progWidth: Math.min(100, Math.max(0, c.pct)), progFill: INK,
      blurb: c.migrated
        ? "This token cleared its target. The contract opened a V4 pool, minted a full-range position, and handed it to DuckLocker. It can never be withdrawn."
        : `Targets are raw ${c.quote} amounts. There's no oracle involved. At the migration target the contract opens a Uniswap V4 pool, mints a full-range position, and hands it to the locker permanently.`,
    } : null,
    liq: c && s.creatorData ? {
      status: s.creatorData.hasPool ? "LP LOCKED · PERMANENT" : "NO POOL YET",
      stBg: s.creatorData.hasPool ? LIME : "var(--paper)", stFg: s.creatorData.hasPool ? "var(--on)" : INK,
      facts: [
        { k: "POOL", v: c.ticker.replace("$", "") + " / " + c.quote },
        { k: "POSITION", v: s.creatorData.hasPool ? "#" + s.creatorData.tokenId.toString() : "not minted" },
        { k: "FEE / TICK", v: "10000 / 200" },
        { k: "RANGE", v: s.creatorData.hasPool ? "full" : "—" },
        { k: "VAULT", v: "DuckLocker" },
      ],
    } : null,
    cto: c && s.creatorData?.hasPool ? {
      status: s.creatorData.ctoApp?.newCreator && s.creatorData.ctoApp.newCreator !== ZERO_ADDRESS ? "PENDING" : "OPEN",
      price: s.creatorData.ctoFee != null ? formatEther(s.creatorData.ctoFee) + " ETH" : "…",
      creator: s.creatorData.creator ? shortAddress(s.creatorData.creator) : "—",
      applicant: s.creatorData.ctoApp?.applicant && s.creatorData.ctoApp.applicant !== ZERO_ADDRESS ? shortAddress(s.creatorData.ctoApp.applicant) : null,
      blurb: "Anyone can pay the CTO fee to apply to take over the creator fee stream. After paying, post the transaction hash on X and tag @duckfunfamily so the team can review the application, including anything else worth knowing about the request. The owner approves or rejects it from that review; a takeover only moves the fee claim, metadata, supply and pool can never change.",
    } : null,
    hookAccrued: s.creatorData ? Number(s.creatorData.hookAccrued || 0n) / 1e18 : 0,
    hookAccruedFailed: !!s.creatorData?.hookAccruedFailed,
    hookSplits: s.creatorData?.hookSplits || [],
    buying, amt, myBalanceTokens, myContribution,
    buy: (amtEth) => ctx.buy(c, amtEth), sell: (tokenAmt) => ctx.sell(c, tokenAmt),
    setBuy: () => set({ side: "buy" }), setSell: () => set({ side: "sell", amount: myBalanceTokens ? String(myBalanceTokens / 2) : "0" }),
    buyBg: buying ? LIME : CARD, buyFg: buying ? "var(--on)" : "var(--mute)", sellBg: buying ? CARD : ORANGE, sellFg: buying ? "var(--mute)" : "#fff",
    amount: s.amount, onAmount: (e) => set({ amount: e.target.value.replace(/[^0-9.]/g, "") }),
    presets: [25, 100, 250, "MAX"].map((label, i) => ({
      label: String(label), dv: i === 0 ? "0" : "1px solid var(--line)",
      go: () => {
        if (label === "MAX") {
          if (!buying) return set({ amount: String(myBalanceTokens) });
          const spendable = s.nativeBalance > GAS_RESERVE_WEI ? s.nativeBalance - GAS_RESERVE_WEI : 0n;
          return set({ amount: truncateDecimals(formatEther(spendable), 4) });
        }
        set({ amount: buying ? String(label) : String(myBalanceTokens * (label / 250)) });
      },
    })),
    payAsset: buying ? "ETH" : (c ? c.ticker.replace("$", "") : ""),
    payBalance: buying ? Number(formatEther(s.nativeBalance)).toFixed(4) : myBalanceTokens.toLocaleString(undefined, { maximumFractionDigits: 2 }),
    submitTx: () => (buying ? ctx.buy(c, amt) : ctx.sell(c, amt)),
    ctaLabel: !account ? "Connect wallet to trade" : s.txPending ? "Confirming…" : (buying ? "Buy " + (c ? c.ticker.replace("$", "") : "") : "Sell " + (c ? c.ticker.replace("$", "") : "")),
    ctaBg: !account ? INK : (buying ? LIME : ORANGE), ctaFg: !account ? CARD : (buying ? "var(--on)" : "#fff"),
    previewLoading: s.previewLoading,
    previewText: (() => {
      if (!c || s.previewOut == null) return null;
      const decimals = buying ? 18 : decimalsFor(c.quoteTokenAddress, [s.platformTokens.incubation, s.platformTokens.launcher, s.platformTokens.raise]);
      const symbol = buying ? c.ticker.replace("$", "") : c.quote;
      const val = Number(formatUnits(s.previewOut, decimals));
      return "~" + val.toLocaleString(undefined, { maximumFractionDigits: val < 1 ? 6 : 4 }) + " " + symbol;
    })(),
    slippageBps: s.slippageBps,
    slippageOptions: [50, 100, 500].map((bps) => Object.assign({ bps, label: (bps / 100) + "%" }, block(s.slippageBps === bps))),
    setSlippage: (bps) => set({ slippageBps: bps }),
    setSlippagePct: (e) => {
      const pct = parseFloat(e.target.value);
      if (!isNaN(pct) && pct >= 0) set({ slippageBps: Math.round(pct * 100) });
    },

    range: s.range, ranges: ["5M", "1H", "4H", "1D", "ALL"].map((label) => Object.assign({ label, go: () => set({ range: label }) }, block(s.range === label))),
    tab: s.tab, tabs: ["Trades", "Holders", "Comments", "Creator + liquidity"].map((label) => Object.assign({ label, go: () => set({ tab: label }) }, block(s.tab === label))),
    tabTrades: s.tab === "Trades", tabHolders: s.tab === "Holders", tabComments: s.tab === "Comments", tabCreator: s.tab === "Creator + liquidity",
    loadMoreTrades: () => c && ctx.loadMoreTrades(c.id), loadMoreHolders: () => c && ctx.loadMoreHolders(c.id), pageSize: PAGE_SIZE,
    chatDraft: s.chatDraft, setChatDraft: (e) => set({ chatDraft: e.target.value }),
    postChat: () => {
      const text = s.chatDraft.trim();
      if (!text || !c) return;
      set((st) => ({
        chatDraft: "",
        coins: st.coins.map((x) => x.id === c.id ? { ...x, chat: [{ wallet: account ? shortAddress(account) : "anon", tag: "HOLDER", tagBg: "var(--paper)", tagFg: "var(--mute)", tagBd: "1px solid var(--line)", age: "now", body: text }].concat(x.chat) } : x),
      }));
    },

    creatorData: s.creatorData, creatorLoading: s.creatorLoading,
    loadCreatorData: () => c && ctx.loadCreatorData(c),
    claimCreatorAndHookFees: () => ctx.claimCreatorAndHookFees(c),
    claimCurveFeeAction: () => ctx.claimCurveFeeAction(c),
    saveFeeSplits: (poolId, splits) => ctx.saveFeeSplits(c, poolId, splits),
    buyTakeover: (poolId) => ctx.buyTakeover(c, poolId, account),

    family: s.family,
    setFamily: (key) => set({ screen: "createForm", family: key }),
    backToChooser: () => set({ screen: "create" }),
    draftCurve: s.draftCurve, setCurve: (patch) => set({ draftCurve: { ...s.draftCurve, ...patch } }),
    draftInstant: s.draftInstant, setInstant: (patch) => set({ draftInstant: { ...s.draftInstant, ...patch } }),
    draftCampaign: s.draftCampaign, setCampaign: (patch) => set({ draftCampaign: { ...s.draftCampaign, ...patch } }),
    socials: (s.family === "incubation" ? s.draftCurve : s.family === "launcher" ? s.draftInstant : s.draftCampaign).socials,
    setSocial: ctx.setSocial,
    raiseDefaults: s.raiseDefaults,
    loadRaiseDefaults: () => {
      if (s.raiseDefaults) return;
      getRaiseDefaults().then((d) => set({ raiseDefaults: d })).catch(() => {});
    },
    quoteOptions: quoteOptionsFor(CURVE_LAUNCHER_QUOTE_TOKENS, s.platformTokens[s.family === "launcher" ? "launcher" : "incubation"]),
    raiseQuoteOptions: quoteOptionsFor(RAISE_DEFAULT_QUOTE_ASSETS, s.platformTokens.raise),
    // ETH ("") always has a route by definition; a platform token isn't in
    // LIQUID_QUOTE_TOKEN_SYMBOLS either, so it correctly falls to false too
    // until this platform actually wires a route for its own token.
    quoteHasEthRoute: (label) => label === "ETH" || LIQUID_QUOTE_TOKEN_SYMBOLS.includes(label),
    createCta: !account ? "Connect wallet to launch" : s.txPending ? "Confirming…" : "Launch",
    submitCreate: ctx.submitCreate,
    simulating: s.simulating, simulateCreate: ctx.simulateCreate,
    draftImage: s.draftImage, onImagePick: ctx.onImagePick, clearImage: ctx.clearImage,

    contribAmount: s.contribAmount, setContrib: (e) => set({ contribAmount: e.target.value.replace(/[^0-9.]/g, "") }),
    contribute: (amtEth) => ctx.contribute(c, amtEth),
    claimTokens: () => ctx.claimCampaignTokens(c), claimRefund: () => ctx.claimCampaignRefundAction(c),
    finalize: () => ctx.finalizeCampaignAction(c),
    submitCampaignAction: () => {
      if (!c) return;
      if (!c.campaignSucceeded && !c.campaignFailed) {
        const deadlinePassed = c.campaignDeadline && Number(c.campaignDeadline) * 1000 <= Date.now();
        return deadlinePassed ? ctx.finalizeCampaignAction(c) : ctx.contribute(c, parseFloat(s.contribAmount) || 0);
      }
      return c.campaignSucceeded ? ctx.claimCampaignTokens(c) : ctx.claimCampaignRefundAction(c);
    },
    camp: c && c.family === "CAMPAIGN" ? buildCampaignModel(c, s, myContribution) : null,

    portfolio: s.portfolio, claimCreatorFees: ctx.claimCreatorFees, claimAllCreatorFees: ctx.claimAllCreatorFees,
    coins: s.coins, openToken: ctx.openToken,

    tx: walletTx, txOpen: !!s.tx, closeTx: () => set({ tx: null }),
    toast: s.toast,
  };
}

// Shown right after a launch tx confirms, for the few seconds before the
// subgraph indexes the new token/campaign and it shows up in s.coins --
// TokenPage/CampaignPage both render null until then, which would otherwise
// be a blank screen.
function PendingLaunchPanel({ v }) {
  return (
    <div style={cs("border:1px solid var(--line);background:var(--card);padding:40px 24px;text-align:center")}>
      <div style={cs("font-family:'JetBrains Mono',monospace;font-size:12px;letter-spacing:.1em;color:var(--mute)")}>CONFIRMING YOUR LAUNCH</div>
      <div style={cs("font-size:15px;margin-top:10px")}>This'll appear here as soon as it's indexed, usually just a few seconds.</div>
      <button onClick={v.goHome} style={cs("margin-top:18px;padding:10px 20px;border:1px solid var(--line);background:var(--paper);color:var(--ink);font-size:13px;font-weight:600;cursor:pointer")}>Back to Discover</button>
    </div>
  );
}

function buildCampaignModel(c, s, myContribution) {
  const detail = s.campaignDetail;
  const goal = Number(c.campaignGoal || 0) / 1e18;
  const raised = Number(c.campaignRaised || 0) / 1e18;
  const pct = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;
  const deadlineMs = c.campaignDeadline ? Number(c.campaignDeadline) * 1000 : 0;
  const deadlinePassed = deadlineMs > 0 && deadlineMs <= Date.now();
  const resolved = c.campaignSucceeded || c.campaignFailed;
  const status = c.campaignSucceeded ? "COMPLETE" : c.campaignFailed ? "GOAL MISSED" : "RAISING";
  const stBg = c.campaignSucceeded ? LIME : c.campaignFailed ? ORANGE : "var(--paper)";
  const stFg = c.campaignFailed ? "#fff" : c.campaignSucceeded ? "var(--on)" : INK;
  const contributorSupply = s.raiseDefaults ? (1_000_000_000 * Number(s.raiseDefaults.contributorBps)) / 10_000 : null;

  let actionTitle = "Contribute", actionSub = "Native ETH. Refundable in full if the goal is missed at the deadline.";
  let cta = "Contribute ETH", ctaBg = LIME, ctaFg = "var(--on)", ctaNote = "Your allocation is recorded now; tokens are claimable only after finalize.";
  let canContribute = !resolved && !deadlinePassed;
  if (!resolved && deadlinePassed) {
    actionTitle = "Ready to finalize"; actionSub = "Deadline passed. Anyone can trigger finalize.";
    cta = "Finalize"; ctaBg = CARD; ctaFg = INK; ctaNote = "Finalize checks whether the goal was met and either seeds the pool or unlocks refunds.";
  } else if (c.campaignSucceeded) {
    actionTitle = "Claim your tokens"; actionSub = "Allocation is your ETH in ÷ total raised, applied to the backer supply.";
    cta = myContribution?.claimed ? "Already claimed" : "Claim tokens"; ctaNote = "One claim per contributor. The token is now tradeable on its V4 pool.";
  } else if (c.campaignFailed) {
    actionTitle = "Refund available"; actionSub = "No tokens are distributed. Your full contribution is returned.";
    cta = myContribution?.refunded ? "Already refunded" : "Refund ETH"; ctaBg = ORANGE; ctaFg = "#fff";
    ctaNote = "The token stays deployed but unpooled and permanently unclaimable.";
  }

  return {
    initials: c.initials, imageUrl: c.imageUrl, name: c.name, symbol: c.ticker, token: shortAddress(c.id), tokenAddress: c.id, status, stBg, stFg,
    desc: c.desc, socials: c.socials,
    raised: raised.toFixed(4), goal: goal.toFixed(4), pct: Math.round(pct) + "%",
    backers: detail ? String(detail.contributions?.length ?? 0) : "…",
    deadline: resolved ? (c.campaignSucceeded ? "FINALIZED" : "FINALIZED · MISSED") : deadlinePassed ? "DEADLINE PASSED" : "RAISING",
    deadlineC: c.campaignSucceeded ? "var(--pos)" : c.campaignFailed ? "var(--neg)" : INK,
    progWidth: Math.min(100, Math.max(0, pct)), progFill: c.campaignFailed ? ORANGE : INK,
    note: c.campaignSucceeded
      ? "Raise complete. The escrowed supply is released, so you can claim your pro-rata allocation. The V4 pool is seeded and LP is locked in DuckLocker."
      : c.campaignFailed
      ? "The goal was not cleared, so no pool was seeded and the escrowed supply was never released. Contributions are refundable in full."
      : "Tokens are already deployed but held by the raise contract. Nothing is transferable or tradeable until the raise completes.",
    noteBg: c.campaignSucceeded ? LIME : c.campaignFailed ? ORANGE : "var(--paper)",
    noteFg: c.campaignFailed ? "#fff" : c.campaignSucceeded ? "var(--on)" : INK,
    facts: [
      { k: "GOAL", v: goal.toFixed(2) + " ETH" },
      { k: "QUOTE AT FINALIZE", v: c.quote },
      { k: "TOKEN STATUS", v: resolved && c.campaignSucceeded ? "released" : "escrowed" },
      { k: "TRADEABLE", v: c.campaignSucceeded ? "yes" : "no" },
    ],
    contribs: (detail?.contributions || []).map((ct) => {
      // Same address-labeling treatment TokenPage's Trades/Holders already
      // get (Creator, DuckRaise, DuckLocker, Burned, Liquidity Pool, etc.)
      // -- a contributor CAN be the campaign's own creator, or (post-
      // success, once claims/refunds route through it) the contract itself.
      const label = labelFor(ct.contributor, { [c.creator?.toLowerCase()]: "Creator" });
      return {
        wallet: label || shortAddress(ct.contributor), full: ct.contributor, eth: (Number(ct.amount) / 1e18).toFixed(4),
        status: ct.claimed ? "claimed" : ct.refunded ? "refunded" : "pending", age: "",
      };
    }),
    custody: [
      { k: "ESCROWED ETH", v: raised.toFixed(4) + " ETH", c: INK },
      { k: "ESCROWED SUPPLY", v: contributorSupply != null ? compactNumber(contributorSupply) : "—", c: INK },
      { k: "HELD BY", v: "DuckRaise", c: INK },
      { k: "TRANSFERS", v: c.campaignSucceeded ? "enabled" : "disabled", c: c.campaignSucceeded ? "var(--pos)" : "var(--neg)" },
    ],
    timeline: [
      { k: "Token deployed", v: "At creation, verifiable on Blockscout before a single contribution.", on: true },
      { k: "Supply escrowed", v: "Full backer supply minted to the raise contract; transfers disabled.", on: true },
      { k: "Contributions open", v: "Native ETH accrues until the deadline. No price, no trading.", on: !resolved || true },
      { k: "Goal cleared", v: "ETH swaps to the quote asset, seeds a two-sided V4 pool, LP locks, claims open.", on: c.campaignSucceeded },
      { k: "Goal missed", v: "No pool, no release. Refunds unlock, one claim per contributor.", on: c.campaignFailed },
    ],
    actionTitle, actionSub, cta, ctaBg, ctaFg, ctaNote, canContribute,
    deadlinePassedUnresolved: !resolved && deadlinePassed,
  };
}

function buildTxModel(s, account) {
  if (!s.tx) return null;
  if (s.tx.stage === "success") {
    return {
      title: "Confirmed", sub: "Included on Ink.", glyph: "✓", headBg: LIME, headFg: "var(--on)", ringTop: "var(--on)", anim: "none", cta: "Done",
      hash: s.tx.hash, explorerUrl: `https://explorer.inkonchain.com/tx/${s.tx.hash}`,
    };
  }
  if (s.tx.stage === "reverted") {
    return {
      title: "Transaction reverted", sub: "Included on Ink, but it reverted on-chain. Nothing happened.", glyph: "✕", headBg: "var(--neg)", headFg: "#fff", ringTop: INK, anim: "none", cta: "Dismiss",
      hash: s.tx.hash, explorerUrl: `https://explorer.inkonchain.com/tx/${s.tx.hash}`,
    };
  }
  return {
    title: "Confirm in your wallet", sub: "Broadcasting to Ink (57073).", glyph: "", headBg: CARD, headFg: INK, ringTop: LIME,
    anim: "spin .9s linear infinite", cta: "Hide",
    hash: s.tx.hash || "awaiting hash…",
    explorerUrl: s.tx.hash ? `https://explorer.inkonchain.com/tx/${s.tx.hash}` : "https://explorer.inkonchain.com",
  };
}
