import { useState, useEffect, useCallback } from "react";
import { formatEther, parseEther, parseUnits } from "viem";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { cs } from "./cs.js";
import DiscoverPage from "./pages/DiscoverPage.jsx";
import TokenPage from "./pages/TokenPage.jsx";
import CreateChooserPage from "./pages/CreateChooserPage.jsx";
import CreateFormPage from "./pages/CreateFormPage.jsx";
import CampaignPage from "./pages/CampaignPage.jsx";
import PortfolioPage from "./pages/PortfolioPage.jsx";
import { money } from "./data.js";
import { api, shortAddress, quoteSymbol, API_BASE } from "./api.js";
import { tokenToCoin, tradeToRow, holderToRow, buildCandles, buildChartBars, buildSparkline, buildTicks } from "./adapters.js";
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
import { ZERO_ADDRESS, DEFAULT_QUOTE_TOKENS, RAISE_DEFAULT_QUOTE_ASSETS } from "./chain/addresses.js";
import { fetchTokenMeta, fetchTokenMetaUri } from "./chain/tokenMeta.js";
import { findBlockedTerm } from "./moderation.js";
import { resolveTokenImage, resolveTokenSocials, resolveTokenDescription } from "./ipfs.js";

const REFRESH_MS = 15000;
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
  const all = [...DEFAULT_QUOTE_TOKENS, ...platformTokens.filter(Boolean)];
  const t = all.find((q) => q.address.toLowerCase() === address.toLowerCase());
  return t ? t.decimals : 18;
}

const EMPTY_SOCIALS = { twitter: "", telegram: "", website: "" };
const EMPTY_IMAGE = { file: null, previewUrl: "", uploading: false, ipfsUri: "", gatewayUrl: "", error: "" };
const EMPTY_PORTFOLIO = { created: [], holdings: [], contributions: [] };
const block = (active) => (active ? { bg: INK, fg: CARD } : { bg: CARD, fg: INK });

export default function App() {
  const { address: account, isConnected } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();

  const [s, setS] = useState({
    mobile: false,
    screen: "home", layout: "cards", filter: "All", query: "",
    tokenId: null, side: "buy", amount: "250", range: "1H", tab: "Trades", chatDraft: "",
    family: null, contribAmount: "0.5", slippageBps: 100,
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

  useEffect(() => {
    getPlatformTokens().then((tokens) => set({ platformTokens: tokens })).catch(() => {});
  }, [set]);

  const loadCoins = useCallback(async () => {
    try {
      const rows = await api.tokens();
      const metaIds = rows.filter((t) => t.family !== "CAMPAIGN").map((t) => t.id);
      const meta = await fetchTokenMeta(metaIds);
      setS((st) => {
        const byId = new Map(st.coins.map((c) => [c.id, c]));
        const coins = rows.map((t, i) => {
          const next = tokenToCoin(t, i, meta[t.id.toLowerCase()]);
          const prev = byId.get(next.id);
          return prev ? { ...next, trades: prev.trades, holderRows: prev.holderRows, rawTrades: prev.rawTrades, chat: prev.chat, imageUrl: prev.imageUrl, desc: prev.desc, metaUri: prev.metaUri, socials: prev.socials } : next;
        });
        return { ...st, coins, coinsLoading: false, coinsError: "" };
      });
      resolveCoinImages();
    } catch (e) {
      set({ coinsLoading: false, coinsError: String(e.message || e) });
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
      await loadCoins();
      let found = false;
      setS((st) => { found = st.coins.some((c) => c.id.toLowerCase() === address.toLowerCase()); return st; });
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
        else { flash("Launch reverted on-chain — nothing was created."); set({ screen: "createForm" }); }
      })
      .catch(() => flash("Could not confirm the launch transaction."));
  }

  function resolveCoinImages() {
    setS((st) => {
      for (const coin of st.coins) {
        if (coin.imageUrl || !coin.metaUri) continue;
        resolveTokenImage(coin.metaUri).then((url) => {
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
  const loadTokenMeta = useCallback(async (address) => {
    try {
      const uri = await fetchTokenMetaUri(address);
      if (!uri) return;
      const [desc, imageUrl, socials] = await Promise.all([
        resolveTokenDescription(uri), resolveTokenImage(uri), resolveTokenSocials(uri),
      ]);
      setS((st) => ({
        ...st,
        coins: st.coins.map((c) => (c.id === address ? { ...c, metaUri: uri, desc: desc || c.desc, imageUrl: imageUrl || c.imageUrl, socials } : c)),
      }));
    } catch (e) { console.error("failed to load token metadata", e); }
  }, []);

  const loadTokenDetail = useCallback(async (address) => {
    loadTokenMeta(address);
    try {
      const [trades, holders] = await Promise.all([api.trades(address), api.holders(address)]);
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
            trades: trades.map((tr) => tradeToRow(tr, labels, coin.quote)),
            rawTrades: trades,
            holderRows: holders.map((h, i) => holderToRow(h, i, totalSupply, labels)),
          } : c),
        };
      });
    } catch (e) { console.error("failed to load token detail", e); }
  }, []);

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
  function openToken(id) {
    const coin = s.coins.find((c) => c.id === id);
    if (coin && coin.family === "CAMPAIGN") {
      set({ screen: "campaign", tokenId: id, campaignDetail: null });
      if (coin.campaignId) loadCampaignDetail(coin.campaignId);
      loadTokenMeta(id);
      getRaiseDefaults().then((d) => set({ raiseDefaults: d })).catch(() => {});
    } else {
      set({ screen: "token", tokenId: id, tab: "Trades", side: "buy", amount: "250" });
      loadTokenDetail(id);
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
    if (coin.family === "CAMPAIGN") return flash("This token is a campaign — use Contribute instead of Buy.");
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
      return flash("Couldn't get a price quote — try again. (" + errorText(e, "unknown") + ")");
    }
    if (hash) { await Promise.all([loadPortfolio(), loadTokenDetail(coin.id)]); flash("Bought " + coin.ticker + " for " + amtEth + " ETH"); }
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
      return flash("Couldn't get a price quote — try again. (" + errorText(e, "unknown") + ")");
    }
    if (hash) {
      await Promise.all([loadPortfolio(), loadTokenDetail(coin.id)]);
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
      let pool = null, ctoApp = null, hookAccrued = 0n, hookSplits = [], ctoFee = null;
      if (hasPool) {
        [pool, ctoApp, hookAccrued, hookSplits, ctoFee] = await Promise.all([
          getPool(poolId, coin.hook), getCtoApplication(poolId, coin.hook), getHookAccruedFees(poolId, coin.hook).catch(() => 0n),
          getHookFeeSplits(poolId, coin.hook).catch(() => []), getCtoFee(coin.hook).catch(() => null),
        ]);
      }
      set({ creatorData: { hasPool, tokenId, poolId, pool, creator, ctoApp, hookAccrued, hookSplits, ctoFee }, creatorLoading: false });
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

  // Triggers DuckLocker.claimFees, which collects the LP-position's trading
  // fee and (same call, best-effort) the hook's separate sell-fee skim --
  // but only the hook's sell-fee skim actually pays the creator. The
  // LP-position fee itself always goes token-side-burned / quote-side-to-
  // platform-wallet (DuckLocker._collectAndDistribute) -- the creator is
  // just the address permitted to trigger the collection, not a recipient.
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
    loadCoins, loadPortfolio, loadTokenDetail, openToken, flash, requireWallet,
    buy, sell, submitCreate, onImagePick, clearImage, setSocial,
    contribute, claimCampaignTokens, claimCampaignRefundAction, finalizeCampaignAction,
    claimCreatorFees, claimAllCreatorFees, loadCreatorData, claimCreatorAndHookFees, claimCurveFeeAction, saveFeeSplits, buyTakeover,
  });

  const m = v.isMobile;
  return (
    <div style={cs("min-height:100vh;display:flex;flex-direction:column;background:var(--paper)")}>
      <header style={cs(`position:sticky;top:0;z-index:40;background:var(--paper);border-bottom:2px solid var(--ink)`)}>
        <div style={cs(`max-width:1420px;margin:0 auto;padding:0 ${m ? "12px" : "20px"};display:flex;align-items:stretch;height:${m ? "52px" : "58px"}`)}>
          <div onClick={v.goHome} style={cs(`display:flex;align-items:center;gap:${m ? "8px" : "11px"};cursor:pointer;padding-right:${m ? "10px" : "26px"};min-width:0`)}>
            <div style={cs("width:24px;height:24px;border:2px solid var(--ink);background:var(--lime);position:relative;flex:none")}>
              <div style={cs("position:absolute;left:4px;top:5px;width:5px;height:5px;background:var(--ink)")}></div>
              <div style={cs("position:absolute;left:11px;top:10px;width:9px;height:4px;background:var(--orange)")}></div>
            </div>
            <span style={cs(`font-size:${m ? "15px" : "17px"};font-weight:700;letter-spacing:-.03em;white-space:nowrap`)}>duckfun<span style={cs("color:var(--mute);font-weight:500")}>.family</span></span>
          </div>
          {!m && (
            <nav style={cs("display:flex;align-items:center;gap:0")}>
              {v.nav.map((n, i) => (
                <button key={i} onClick={n.go} style={cs(`height:58px;padding:0 18px;border:0;border-bottom:3px solid ${n.u};background:transparent;color:${n.c};font-size:14px;font-weight:${n.w};letter-spacing:-.01em;cursor:pointer`)}>{n.label}</button>
              ))}
            </nav>
          )}
          <div style={cs("flex:1;min-width:0")}></div>
          <div style={cs("display:flex;align-items:center;gap:8px;flex:none")}>
            {!m && (
              <div style={cs("display:flex;align-items:center;gap:7px;padding:6px 11px;border:2px solid var(--ink);background:var(--lime);font-family:'DM Mono',monospace;font-size:11.5px;white-space:nowrap")}>
                <span style={cs("width:6px;height:6px;background:var(--ink);flex:none")}></span>INK 57073
              </div>
            )}
            <button onClick={v.toggleWallet} style={cs(`padding:${m ? "7px 11px" : "8px 15px"};border:2px solid var(--ink);background:${v.walletBg};color:${v.walletFg};font-size:${m ? "11.5px" : "12.5px"};font-weight:700;cursor:pointer;font-family:${v.walletFont};white-space:nowrap`)}>{v.walletLabel}</button>
          </div>
        </div>
      </header>

      <main style={cs(`flex:1;max-width:1420px;width:100%;margin:0 auto;padding:${m ? "14px 12px 84px" : "22px 20px 72px"};min-width:0`)}>
        {v.isHome && <DiscoverPage v={v} />}
        {v.isToken && (v.coin ? <TokenPage v={v} /> : <PendingLaunchPanel v={v} />)}
        {v.isCreate && <CreateChooserPage v={v} />}
        {v.isCreateForm && <CreateFormPage v={v} />}
        {v.isCampaign && (v.camp ? <CampaignPage v={v} /> : <PendingLaunchPanel v={v} />)}
        {v.isPortfolio && <PortfolioPage v={v} />}
      </main>

      {!m && (
        <footer style={cs("border-top:2px solid var(--ink);background:var(--card)")}>
          <div style={cs("max-width:1420px;margin:0 auto;padding:16px 20px;display:flex;gap:20px;flex-wrap:wrap;font-family:'DM Mono',monospace;font-size:11px;letter-spacing:.06em;color:var(--mute)")}>
            <span>DUCKFUN.FAMILY</span>
            <span>INK 57073</span>
            <a href="https://explorer.inkonchain.com" target="_blank" rel="noreferrer">BLOCKSCOUT</a>
            <span style={cs("margin-left:auto")}>SUBGRAPH DUCKFUN-INK 1.0.0 · SYNCED</span>
          </div>
        </footer>
      )}

      {m && (
        <nav style={cs("position:fixed;left:0;right:0;bottom:0;z-index:50;display:flex;border-top:2px solid var(--ink);background:var(--card)")}>
          {v.nav.map((n, i) => (
            <button key={i} onClick={n.go} style={cs(`flex:1;min-height:56px;border:0;border-top:3px solid ${n.u};background:transparent;color:${n.c};font-size:12.5px;font-weight:${n.w};cursor:pointer`)}>{n.label}</button>
          ))}
        </nav>
      )}

      {v.txOpen && (
        <div style={cs("position:fixed;inset:0;z-index:95;background:rgba(17,17,16,.5);display:flex;align-items:center;justify-content:center;padding:20px")}>
          <div style={cs("width:100%;max-width:400px;border:2px solid var(--ink);background:var(--card);box-shadow:5px 5px 0 var(--ink)")}>
            <div style={cs(`padding:26px 22px;border-bottom:2px solid var(--ink);text-align:center;background:${v.tx.headBg};color:${v.tx.headFg}`)}>
              <div style={cs(`width:46px;height:46px;margin:0 auto 16px;border:3px solid var(--ink);border-top-color:${v.tx.ringTop};animation:${v.tx.anim};display:flex;align-items:center;justify-content:center;font-size:19px`)}>{v.tx.glyph}</div>
              <div style={cs("font-size:19px;font-weight:700;letter-spacing:-.03em")}>{v.tx.title}</div>
              <div style={cs(`font-size:12.5px;margin-top:7px;line-height:1.5;opacity:${v.tx.headFg === "#fff" ? ".9" : "1"};color:${v.tx.headFg === "#fff" ? "#fff" : "var(--mute)"}`)}>{v.tx.sub}</div>
            </div>
            <div style={cs("padding:14px 18px;border-bottom:2px solid var(--ink);font-family:'DM Mono',monospace;font-size:11px;color:var(--mute);word-break:break-all;line-height:1.5")}>{v.tx.hash}</div>
            <div style={cs("display:flex")}>
              <a href={v.tx.explorerUrl} target="_blank" rel="noreferrer" style={cs("flex:1;padding:14px;text-align:center;font-size:13.5px;font-weight:600;border:0;border-right:2px solid var(--ink)")}>Explorer ↗</a>
              <button onClick={v.closeTx} style={cs("flex:1;padding:14px;border:0;background:var(--ink);color:var(--card);font-size:13.5px;font-weight:600;cursor:pointer")}>{v.tx.cta}</button>
            </div>
          </div>
        </div>
      )}

      {v.toast && (
        <div style={cs(`position:fixed;z-index:60;left:50%;bottom:${m ? "68px" : "28px"};transform:translateX(-50%);display:flex;align-items:center;gap:10px;padding:13px 20px;border:2px solid var(--ink);background:var(--card);box-shadow:3px 3px 0 var(--ink);animation:slidein .22s ease both;max-width:90vw`)}>
          <span style={cs("width:7px;height:7px;background:var(--ink);flex:none")}></span>
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

  const nav = [["Discover", "home"], ["Launch", "create"], ["Portfolio", "portfolio"]].map(([label, key]) => {
    const active = scr === key
      || (key === "home" && (scr === "token" || scr === "campaign"))
      || (key === "create" && scr === "createForm");
    return {
      label, go: () => set({ screen: key, family: key === "create" ? null : s.family }),
      c: active ? INK : "var(--mute)", w: active ? "700" : "500", u: active ? INK : "transparent",
    };
  });

  const filters = ["All", "CURVE", "INSTANT", "CAMPAIGN", "Migrated"].map((key) => {
    const label = key === "CURVE" ? "Incubation" : key === "INSTANT" ? "Launcher" : key === "CAMPAIGN" ? "Raise" : key;
    const shortLabel = key === "CURVE" ? "Curve" : key === "INSTANT" ? "Launch" : label;
    return Object.assign({ key, label: s.mobile ? shortLabel : label, dv: key === "All" ? "0" : "2px solid var(--ink)", go: () => set({ filter: key }) }, block(s.filter === key));
  });

  let list = s.coins.slice();
  if (s.filter === "Migrated") list = list.filter((c) => c.migrated);
  else if (s.filter !== "All") list = list.filter((c) => c.family === s.filter);
  const q = s.query.trim().toLowerCase();
  if (q) list = list.filter((c) => (c.name + c.ticker + c.dev).toLowerCase().includes(q));

  const shape = (c) => ({
    id: c.id, family: c.family === "CURVE" ? "INCUBATION" : c.family === "INSTANT" ? "LAUNCHER" : "RAISE",
    famBg: c.famBg, famFg: c.famFg, initials: c.initials, symbol: c.ticker, name: c.name,
    price: money(c.mc / 1e6) + "/M", chg: (c.chg >= 0 ? "+" : "") + c.chg.toFixed(1) + "%",
    chgColor: c.chg >= 0 ? "var(--pos)" : "var(--neg)",
    mcap: money(c.mc), vol: money(c.vol), holders: c.holders.toLocaleString(),
    bars: buildSparkline(c.rawTrades),
    progLabel: c.family === "CAMPAIGN" ? "RAISE · ILLIQUID" : c.migrated ? "MIGRATED → V4" : "CURVE",
    progPct: Math.round(c.pct) + "%",
    ticks: buildTicks(20, c.pct, INK),
    open: () => ctx.openToken(c.id),
  });
  const feed = list.map(shape);
  // Hero slider: the 5 most recently active launches across every family,
  // unfiltered by the Discover page's own filter/search -- "most recent
  // activity" is honestly the most recent on-chain launch event (ageMin),
  // since no cross-token recent-trades feed exists to rank by actual trades.
  const recentTokens = s.coins.slice().sort((a, b) => a.ageMin - b.ageMin).slice(0, 5).map(shape);

  const c = s.coins.find((x) => x.id === s.tokenId);
  const buying = s.side === "buy";
  const amt = parseFloat(s.amount) || 0;
  const myBalance = c ? s.portfolio.holdings.find((h) => h.token?.id === c.id)?.balance : null;
  const myBalanceTokens = myBalance ? Number(myBalance) / 1e18 : 0;
  const myContribution = c ? s.portfolio.contributions.find((ct) => ct.campaign?.id === c.campaignId) : null;

  const walletTx = buildTxModel(s, account);

  const RANGE_SECONDS = { "5M": 300, "1H": 3600, "4H": 4 * 3600, "1D": 86400, ALL: Infinity };
  let chartBars = { bars: [], axis: [], ohlc: null };
  if (c) {
    const cutoff = Date.now() / 1000 - (RANGE_SECONDS[s.range] ?? Infinity);
    const windowedTrades = (c.rawTrades || []).filter((tr) => Number(tr.timestamp) >= cutoff);
    const candles = buildCandles(windowedTrades, c.curveSeed);
    chartBars = buildChartBars(candles);
  }

  return {
    isMobile: s.mobile,
    connected: !!account, account, accountShort: account ? shortAddress(account) : "",
    balance: Number(formatEther(s.nativeBalance)).toFixed(4),
    walletLabel: account ? shortAddress(account) : "Connect wallet",
    walletBg: account ? CARD : INK, walletFg: account ? INK : CARD,
    walletFont: account ? "'DM Mono',monospace" : "'Space Grotesk',sans-serif",
    toggleWallet: () => (account ? disconnect() : openConnectModal && openConnectModal()),
    txPending: s.txPending,

    nav,
    isHome: scr === "home", isToken: scr === "token", isCreate: scr === "create",
    isCreateForm: scr === "createForm", isCampaign: scr === "campaign", isPortfolio: scr === "portfolio",
    goHome: () => set({ screen: "home" }), goCreate: () => set({ screen: "create" }),
    goPortfolio: () => set({ screen: "portfolio" }),

    stats: [
      { label: "TOKENS LISTED", value: String(s.coins.length), sub: "across three families", bg: CARD },
      { label: "MIGRATED", value: String(s.coins.filter((x) => x.migrated).length), sub: "curves → V4 pools", bg: CARD },
      { label: "ACTIVE RAISES", value: String(s.coins.filter((x) => x.family === "CAMPAIGN" && !x.campaignSucceeded && !x.campaignFailed).length), sub: "crowdfund campaigns", bg: LIME },
    ],
    filters, feed, isEmpty: feed.length === 0, recentTokens,
    layoutCards: s.layout === "cards", layoutTable: s.layout === "table",
    setLayoutCards: () => set({ layout: "cards" }), setLayoutTable: () => set({ layout: "table" }),
    lcBg: block(s.layout === "cards").bg, lcFg: block(s.layout === "cards").fg,
    ltBg: block(s.layout === "table").bg, ltFg: block(s.layout === "table").fg,
    query: s.query, setQuery: (e) => set({ query: e.target.value }),

    coin: c,
    sel: c ? {
      name: c.name, symbol: c.ticker, family: c.family === "CURVE" ? "INCUBATION" : c.family === "INSTANT" ? "LAUNCHER" : "RAISE",
      famBg: c.famBg, famFg: c.famFg, initials: c.initials, address: shortAddress(c.id), quote: c.quote,
      price: chartBars.ohlc ? "$" + chartBars.ohlc.c : c.curveSeed ? "$" + (c.curveSeed.price < 0.01 ? c.curveSeed.price.toFixed(5) : c.curveSeed.price.toFixed(4)) : "—",
      chg: chartBars.ohlc ? (chartBars.ohlc.up ? "+" : "−") + (Math.abs((chartBars.ohlc.c - chartBars.ohlc.o) / (chartBars.ohlc.o || 1)) * 100).toFixed(1) + "%" : "—",
      chgColor: chartBars.ohlc ? (chartBars.ohlc.up ? "var(--pos)" : "var(--neg)") : "var(--mute)",
      migrated: c.migrated, holders: c.holders,
      raised: c.mc.toFixed(4), startTarget: "—", migTarget: "—",
    } : null,
    tokenStats: c ? [
      { k: "RAISED", v: money(c.mc) }, { k: "24H VOL", v: money(c.vol) },
      { k: "HOLDERS", v: c.holders.toLocaleString() },
      { k: c.family === "CURVE" && !c.migrated ? "CURVE" : "POOL", v: c.family === "CURVE" && !c.migrated ? Math.round(c.pct) + "%" : (c.migrated || c.family === "INSTANT") ? "V4 LIVE" : "—" },
      { k: "LP LOCK", v: (c.migrated || c.family === "INSTANT") ? "FOREVER" : "—" },
    ] : [],
    candles: chartBars.bars, axis: chartBars.axis, ohlc: chartBars.ohlc,
    curve: c && c.family === "CURVE" ? {
      title: c.migrated ? "Migrated to Uniswap V4" : "Curve → V4 migration",
      headline: c.migrated ? "LP LOCKED FOREVER" : Math.round(c.pct) + "% filled",
      ticks: buildTicks(28, c.pct, INK),
      blurb: c.migrated
        ? "This token cleared its target. The contract opened a V4 pool, minted a full-range position and handed it to DuckLocker — it can never be withdrawn."
        : `Targets are raw ${c.quote} amounts — there is no oracle. At the migration target the contract opens a Uniswap V4 pool, mints a full-range position, and hands it to the locker permanently.`,
    } : null,
    liq: c && s.creatorData ? {
      status: s.creatorData.hasPool ? "LP LOCKED · PERMANENT" : "NO POOL YET",
      stBg: s.creatorData.hasPool ? LIME : "var(--paper)", stFg: INK,
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
      blurb: "Anyone can pay the CTO fee to apply to take over the creator fee stream. The owner approves or rejects the application. Metadata, supply and pool can never change — a takeover moves the fee claim, not the token.",
    } : null,
    hookAccrued: s.creatorData ? Number(s.creatorData.hookAccrued || 0n) / 1e18 : 0,
    hookSplits: s.creatorData?.hookSplits || [],
    buying, amt, myBalanceTokens, myContribution,
    buy: (amtEth) => ctx.buy(c, amtEth), sell: (tokenAmt) => ctx.sell(c, tokenAmt),
    setBuy: () => set({ side: "buy" }), setSell: () => set({ side: "sell", amount: myBalanceTokens ? String(myBalanceTokens / 2) : "0" }),
    buyBg: buying ? LIME : CARD, buyFg: INK, sellBg: buying ? CARD : ORANGE, sellFg: buying ? "var(--mute)" : "#fff",
    amount: s.amount, onAmount: (e) => set({ amount: e.target.value.replace(/[^0-9.]/g, "") }),
    presets: [25, 100, 250, "MAX"].map((label, i) => ({
      label: String(label), dv: i === 0 ? "0" : "2px solid var(--ink)",
      go: () => {
        if (label === "MAX") {
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
    ctaBg: !account ? INK : (buying ? LIME : ORANGE), ctaFg: !account ? CARD : (buying ? INK : "#fff"),
    slippageBps: s.slippageBps,

    range: s.range, ranges: ["5M", "1H", "4H", "1D", "ALL"].map((label) => Object.assign({ label, go: () => set({ range: label }) }, block(s.range === label))),
    tab: s.tab, tabs: ["Trades", "Holders", "Comments", "Creator + liquidity"].map((label) => Object.assign({ label, go: () => set({ tab: label }) }, block(s.tab === label))),
    tabTrades: s.tab === "Trades", tabHolders: s.tab === "Holders", tabComments: s.tab === "Comments", tabCreator: s.tab === "Creator + liquidity",
    chatDraft: s.chatDraft, setChatDraft: (e) => set({ chatDraft: e.target.value }),
    postChat: () => {
      const text = s.chatDraft.trim();
      if (!text || !c) return;
      set((st) => ({
        chatDraft: "",
        coins: st.coins.map((x) => x.id === c.id ? { ...x, chat: [{ wallet: account ? shortAddress(account) : "anon", tag: "HOLDER", tagBg: "var(--paper)", tagFg: "var(--mute)", tagBd: "2px solid var(--ink)", age: "now", body: text }].concat(x.chat) } : x),
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
    quoteOptions: quoteOptionsFor(DEFAULT_QUOTE_TOKENS, s.platformTokens[s.family === "launcher" ? "launcher" : "incubation"]),
    raiseQuoteOptions: quoteOptionsFor(RAISE_DEFAULT_QUOTE_ASSETS, s.platformTokens.raise),
    createCta: !account ? "Connect wallet to launch" : s.txPending ? "Confirming…" : "Launch",
    submitCreate: ctx.submitCreate,
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
    <div style={cs("border:2px solid var(--ink);background:var(--card);box-shadow:3px 3px 0 var(--ink);padding:40px 24px;text-align:center")}>
      <div style={cs("font-family:'DM Mono',monospace;font-size:12px;letter-spacing:.1em;color:var(--mute)")}>CONFIRMING YOUR LAUNCH</div>
      <div style={cs("font-size:15px;margin-top:10px")}>This'll appear here as soon as it's indexed — usually just a few seconds.</div>
      <button onClick={v.goHome} style={cs("margin-top:18px;padding:10px 20px;border:2px solid var(--ink);background:var(--paper);color:var(--ink);font-size:13px;font-weight:600;cursor:pointer")}>Back to Discover</button>
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
  const stFg = c.campaignFailed ? "#fff" : INK;
  const contributorSupply = s.raiseDefaults ? (1_000_000_000 * Number(s.raiseDefaults.contributorBps)) / 10_000 : null;

  let actionTitle = "Contribute", actionSub = "Native ETH. Refundable in full if the goal is missed at the deadline.";
  let cta = "Contribute ETH", ctaBg = LIME, ctaFg = INK, ctaNote = "Your allocation is recorded now; tokens are claimable only after finalize.";
  let canContribute = !resolved && !deadlinePassed;
  if (!resolved && deadlinePassed) {
    actionTitle = "Ready to finalize"; actionSub = "Deadline passed — anyone can trigger finalize.";
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
    initials: c.initials, name: c.name, symbol: c.ticker, token: shortAddress(c.id), tokenAddress: c.id, status, stBg, stFg,
    desc: c.desc, socials: c.socials,
    raised: raised.toFixed(4), goal: goal.toFixed(4), pct: Math.round(pct) + "%",
    backers: detail ? String(detail.contributions?.length ?? 0) : "…",
    deadline: resolved ? (c.campaignSucceeded ? "FINALIZED" : "FINALIZED — MISSED") : deadlinePassed ? "DEADLINE PASSED" : "RAISING",
    deadlineC: c.campaignSucceeded ? "var(--pos)" : c.campaignFailed ? "var(--neg)" : INK,
    ticks: buildTicks(28, pct, c.campaignFailed ? ORANGE : INK),
    note: c.campaignSucceeded
      ? "Raise complete. The escrowed supply is released — claim your pro-rata allocation. The V4 pool is seeded and LP is locked in DuckLocker."
      : c.campaignFailed
      ? "The goal was not cleared, so no pool was seeded and the escrowed supply was never released. Contributions are refundable in full."
      : "Tokens are already deployed but held by the raise contract. Nothing is transferable or tradeable until the raise completes.",
    noteBg: c.campaignSucceeded ? LIME : c.campaignFailed ? ORANGE : "var(--paper)",
    noteFg: c.campaignFailed ? "#fff" : INK,
    facts: [
      { k: "GOAL", v: goal.toFixed(2) + " ETH" },
      { k: "QUOTE AT FINALIZE", v: c.quote },
      { k: "TOKEN STATUS", v: resolved && c.campaignSucceeded ? "released" : "escrowed" },
      { k: "TRADEABLE", v: c.campaignSucceeded ? "yes" : "no" },
    ],
    contribs: (detail?.contributions || []).map((ct) => ({
      wallet: shortAddress(ct.contributor), eth: (Number(ct.amount) / 1e18).toFixed(4),
      status: ct.claimed ? "claimed" : ct.refunded ? "refunded" : "pending", age: "",
    })),
    custody: [
      { k: "ESCROWED ETH", v: raised.toFixed(4) + " ETH", c: INK },
      { k: "ESCROWED SUPPLY", v: contributorSupply != null ? Math.round(contributorSupply).toLocaleString() : "—", c: INK },
      { k: "HELD BY", v: "DuckRaise", c: INK },
      { k: "TRANSFERS", v: c.campaignSucceeded ? "enabled" : "disabled", c: c.campaignSucceeded ? "var(--pos)" : "var(--neg)" },
    ],
    timeline: [
      { k: "Token deployed", v: "At creation — verifiable on Blockscout before a single contribution.", on: true },
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
      title: "Confirmed", sub: "Included on Ink.", glyph: "✓", headBg: LIME, headFg: INK, ringTop: INK, anim: "none", cta: "Done",
      hash: s.tx.hash, explorerUrl: `https://explorer.inkonchain.com/tx/${s.tx.hash}`,
    };
  }
  if (s.tx.stage === "reverted") {
    return {
      title: "Transaction reverted", sub: "Included on Ink, but it reverted on-chain — nothing happened.", glyph: "✕", headBg: "var(--neg)", headFg: "#fff", ringTop: INK, anim: "none", cta: "Dismiss",
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
