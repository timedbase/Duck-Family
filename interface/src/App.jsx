import React from "react";
import { formatEther, parseEther, parseUnits } from "viem";
import { cs } from "./cs.js";
import Hoverable from "./Hoverable.jsx";
import TapeItems from "./TapeItems.jsx";
import HomePage from "./pages/HomePage.jsx";
import TokenPage from "./pages/TokenPage.jsx";
import CreatePage from "./pages/CreatePage.jsx";
import PortfolioPage from "./pages/PortfolioPage.jsx";
import BoardPage from "./pages/BoardPage.jsx";
import {
  UP, DOWN, INKD, art, ink, money, ageLabel,
} from "./data.js";
import { api, shortAddress, quoteSymbol, API_BASE } from "./api.js";
import { tokenToCoin, tradeToRow, holderToRow, buildCandles } from "./adapters.js";
import { hasInjectedWallet, connectWallet } from "./chain/client.js";
import {
  createCurveToken, buyCurve, buyCurveWithNative, sellCurve,
  launchInstant,
  createCampaign, contributeCampaign, claimCampaign, claimCampaignRefund, finalizeCampaign,
  claimFees, claimAllFees, getNativeBalance, waitForTx,
} from "./chain/actions.js";
import { buyOnPoolWithNative, sellOnPoolForNative } from "./chain/dex.js";
import { previewCurveBuy, previewCurveSell, previewCurveBuyWithNative, previewPoolBuyWithNative, previewPoolSellForNative, applySlippage } from "./chain/quotes.js";
import { ZERO_ADDRESS, DEFAULT_QUOTE_TOKENS, RAISE_DEFAULT_QUOTE_ASSETS, DUCK_HOOK } from "./chain/addresses.js";
import { fetchTokenMeta } from "./chain/tokenMeta.js";
import { findBlockedTerm } from "./moderation.js";
import { resolveTokenImage } from "./ipfs.js";

const REFRESH_MS = 15000;
// Headroom left unspent when a "max"/"all" ETH preset is used, so the
// wallet still has something to pay gas with — spending literally the
// entire native balance as tx value always fails once gas is added on top.
const GAS_RESERVE_WEI = parseEther("0.005");

// formatEther gives full precision; truncate (never round) to `decimals`
// places so the displayed amount never exceeds the real wei balance —
// toFixed() rounds half-up and can produce a string worth more than what's
// actually in the wallet.
function truncateDecimals(numStr, decimals) {
  const [whole, frac = ""] = numStr.split(".");
  return frac.length > decimals ? `${whole}.${frac.slice(0, decimals)}` : numStr;
}

// ETH first (always tradeable directly, no external-liquidity dependency),
// then the platform's default-allowed quote tokens. DuckIncubation and
// DuckLauncher share the same broad 15-token allow-list; DuckRaise's is
// narrower (see RAISE_DEFAULT_QUOTE_ASSETS's header comment).
const QUOTE_OPTIONS = [
  { label: "ETH", address: ZERO_ADDRESS },
  ...DEFAULT_QUOTE_TOKENS.map((t) => ({ label: t.symbol, address: t.address })),
];
const RAISE_QUOTE_OPTIONS = [
  { label: "ETH", address: ZERO_ADDRESS },
  ...RAISE_DEFAULT_QUOTE_ASSETS.map((t) => ({ label: t.symbol, address: t.address })),
];

function decimalsFor(address) {
  if (address.toLowerCase() === ZERO_ADDRESS) return 18;
  const t = DEFAULT_QUOTE_TOKENS.find((q) => q.address.toLowerCase() === address.toLowerCase());
  return t ? t.decimals : 18;
}

const EMPTY_IMAGE = { file: null, previewUrl: "", uploading: false, ipfsUri: "", gatewayUrl: "", error: "" };
const EMPTY_PORTFOLIO = { created: [], holdings: [], contributions: [] };

export default class App extends React.Component {
  state = {
    mobile: false, tight: false, route: "home", tokenId: null,
    account: null, nativeBalance: 0n, txPending: false,
    portfolio: EMPTY_PORTFOLIO,
    activity: [],
    coins: [], coinsLoading: true, coinsError: "",
    campaigns: [], campaignAmounts: {},
    tape: [], watch: {}, query: "", sort: 0, frame: 1, tab: 0, board: 0, view: "grid",
    toggles: { anim: true, nsfw: false, devsold: false }, minMcap: 0, filtersOpen: false,
    pane: "trades", chatDraft: "", side: "buy", amount: "0.01", slippageBps: 100,
    createFamily: "curve",
    draftCurve: { name: "", ticker: "", desc: "", quoteToken: ZERO_ADDRESS, startVirtualQuote: "1", migrationTargetQuote: "10", earlyBuyAmount: "0" },
    draftInstant: { name: "", ticker: "", desc: "", quoteToken: ZERO_ADDRESS, launchMarketCap: "10", buyAmountHype: "0" },
    draftCampaign: { name: "", ticker: "", desc: "", dexQuoteAsset: ZERO_ADDRESS, goalNative: "1" },
    draftImage: EMPTY_IMAGE,
    toast: "",
  };

  componentDidMount() {
    this.fit = () => {
      const w = window.innerWidth || 1440;
      const mob = w < 780;
      const tight = w < 1200;
      if (mob !== this.state.mobile || tight !== this.state.tight) this.setState({ mobile: mob, tight });
    };
    this.fit();
    window.addEventListener("resize", this.fit);
    this.loadCoins();
    this.loadCampaigns();
    this.timer = setInterval(() => this.loadCoins(), REFRESH_MS);
    this.campaignTimer = setInterval(() => this.loadCampaigns(), REFRESH_MS);
    // Belt-and-suspenders: the post-tx refresh in runTx covers the normal
    // case, but this self-corrects the wallet balance regardless of
    // whatever transaction-lifecycle edge case might otherwise leave it
    // stale (a missed wait, a dropped RPC call, anything) instead of
    // requiring every single path to handle balance refresh perfectly.
    this.balanceTimer = setInterval(() => this.refreshBalance(), REFRESH_MS);
    this.tryReconnect();
    if (hasInjectedWallet()) {
      window.ethereum.on?.("accountsChanged", accounts => {
        if (accounts.length === 0) this.setState({ account: null, nativeBalance: 0n });
        else this.setAccount(accounts[0]);
      });
    }
  }
  componentWillUnmount() {
    window.removeEventListener("resize", this.fit);
    clearInterval(this.timer);
    clearInterval(this.campaignTimer);
    clearInterval(this.balanceTimer);
    clearTimeout(this.toastTimer);
  }

  // Active (unresolved) campaigns for the leaderboard's dedicated
  // contribute/finalize cards. DuckRaise deploys a campaign's token
  // immediately at launch() (not at finalize()), so these campaigns are
  // *also* already indexed as Token rows and show up in loadCoins/the main
  // grid — this is a separate, purpose-built view for acting on them
  // directly, not the only place they're reachable.
  async loadCampaigns() {
    try {
      const rows = await api.campaigns();
      // The backend only stores succeeded/failed (both false until
      // resolution) — there's no separate "finalized" column.
      this.setState({ campaigns: rows.filter(c => !c.succeeded && !c.failed) });
    } catch (e) {
      console.error("failed to load campaigns", e);
    }
  }

  // Reconnect silently if this wallet already granted access before (no
  // prompt — eth_accounts, not eth_requestAccounts).
  async tryReconnect() {
    if (!hasInjectedWallet()) return;
    try {
      const accounts = await window.ethereum.request({ method: "eth_accounts" });
      if (accounts && accounts.length > 0) await this.setAccount(accounts[0]);
    } catch { /* ignore */ }
  }

  async setAccount(address) {
    this.setState({ account: address });
    await Promise.all([this.refreshBalance(), this.loadPortfolio()]);
  }

  async refreshBalance() {
    if (!this.state.account) return;
    try {
      const bal = await getNativeBalance(this.state.account);
      this.setState({ nativeBalance: bal });
    } catch (e) {
      console.error("failed to fetch balance", e);
    }
  }

  async loadPortfolio() {
    if (!this.state.account) return;
    try {
      const data = await api.portfolio(this.state.account);
      this.setState({ portfolio: data });
    } catch (e) {
      console.error("failed to load portfolio", e);
    }
  }

  // Real on-chain tokens from the Goldsky subgraph (see ../../backend) — no
  // simulated price/volume ticking. Zero rows here just means no tokens have
  // been launched on this deployment yet.
  async loadCoins() {
    try {
      const rows = await api.tokens();
      // Neither TokenCreated nor TokenLaunched carries name/symbol (only
      // CampaignCreated does) -- batch-read the real ERC20 name()/symbol()
      // for every CURVE/INSTANT token clone (see chain/tokenMeta.js).
      const metaIds = rows.filter(t => t.family !== "CAMPAIGN").map(t => t.id);
      const meta = await fetchTokenMeta(metaIds);
      this.setState(s => {
        const byId = new Map(s.coins.map(c => [c.id, c]));
        const coins = rows.map((t, i) => {
          const next = tokenToCoin(t, i, meta[t.id.toLowerCase()]);
          const prev = byId.get(next.id);
          // Preserve anything only fetched lazily when a token page is opened,
          // plus any image already resolved from a previous poll.
          return prev ? { ...next, trades: prev.trades, holderRows: prev.holderRows, chat: prev.chat, imageUrl: prev.imageUrl } : next;
        });
        return { coins, coinsLoading: false, coinsError: "" };
      });
      this.resolveCoinImages();
    } catch (e) {
      this.setState({ coinsLoading: false, coinsError: String(e.message || e) });
    }
  }

  // Best-effort, non-blocking: fetch each token's metaURI JSON (cached, see
  // ipfs.js) and fill in its real image once resolved. Tokens with no
  // metaURI, or one that isn't real JSON, just keep the colored placeholder.
  resolveCoinImages() {
    for (const coin of this.state.coins) {
      if (coin.imageUrl || !coin.metaUri) continue;
      resolveTokenImage(coin.metaUri).then((url) => {
        if (!url) return;
        this.setState((s) => ({ coins: s.coins.map((c) => (c.id === coin.id ? { ...c, imageUrl: url } : c)) }));
      });
    }
  }

  async loadTokenDetail(address) {
    try {
      const [trades, holders] = await Promise.all([api.trades(address), api.holders(address)]);
      this.setState(s => {
        const coin = s.coins.find(c => c.id === address);
        if (!coin) return null;
        const totalSupply = coin.totalSupply ? Number(coin.totalSupply) / 1e18 : 1_000_000_000;
        // Per-token creator gets labeled alongside the fixed platform-contract
        // labels adapters.js already applies for the shared contracts.
        const labels = {};
        if (coin.creator) labels[coin.creator.toLowerCase()] = "Creator";
        return {
          coins: s.coins.map(c => c.id === address ? {
            ...c,
            trades: trades.map(tr => tradeToRow(tr, labels, coin.quote)),
            rawTrades: trades,
            holderRows: holders.map((h, i) => holderToRow(h, i, totalSupply, labels)),
          } : c),
        };
      });
    } catch (e) {
      // Non-fatal — the token page just keeps showing empty trades/holders.
      console.error("failed to load token detail", e);
    }
  }

  // viem decodes a contract revert's 4-byte selector into `cause.data.errorName`
  // when the ABI includes the error (see chain/abis.js) — prefer that over
  // e.shortMessage, which for a reverted call is just the generic
  // "The contract function ... reverted." with no reason attached.
  errorText(e, fallback) {
    const decoded = e?.cause?.data?.errorName;
    if (decoded) return decoded;
    const base = e?.shortMessage || e?.message || fallback;
    const causeMsg = e?.cause?.shortMessage || e?.cause?.message;
    return causeMsg && causeMsg !== base ? `${base}: ${causeMsg}` : base;
  }

  flash(msg) {
    clearTimeout(this.toastTimer);
    this.setState({ toast: msg });
    this.toastTimer = setTimeout(() => this.setState({ toast: "" }), 3800);
  }
  requireWallet() {
    if (this.state.account) return true;
    this.flash("Connect a wallet first.");
    return false;
  }
  logAct(kind, tick, amt, color) {
    this.setState(s => ({ activity: [{ kind, tick, amt, ago: "now", color }].concat(s.activity).slice(0, 12) }));
  }
  openToken(id) {
    this.setState({ route: "token", tokenId: id, pane: "trades", side: "buy", amount: "0.01" });
    window.scrollTo(0, 0);
    this.loadTokenDetail(id);
  }

  async connect() {
    if (!hasInjectedWallet()) return this.flash("No wallet found — install MetaMask, Rabby, or similar.");
    try {
      const address = await connectWallet();
      await this.setAccount(address);
      this.flash("Wallet connected · " + shortAddress(address));
    } catch (e) {
      this.flash(e.shortMessage || e.message || "Failed to connect wallet.");
    }
  }
  disconnect() {
    this.setState({ account: null, nativeBalance: 0n, portfolio: EMPTY_PORTFOLIO });
    this.flash("Wallet disconnected");
  }

  // Real transactions below: simulateContract runs first inside each action
  // (see src/chain/actions.js) — a plain read against live chain state that
  // reverts before the wallet ever prompts for a signature.
  async runTx(label, fn) {
    if (!this.requireWallet()) return null;
    if (this.state.txPending) return null;
    this.setState({ txPending: true });
    try {
      const hash = await fn();
      this.flash(label + " submitted · " + hash.slice(0, 10) + "…");
      this.logAct(label, "", hash.slice(0, 10) + "…", "#B4B4C2");
      // The hash comes back once the wallet broadcasts, not once it's mined
      // — reading the balance immediately after this still sees the
      // pre-transaction value, so refresh only once the receipt actually
      // lands. If waiting for the receipt itself fails (timeout, RPC hiccup
      // — not just a reverted tx, which resolves normally) still attempt a
      // refresh rather than silently leaving the balance stale with no
      // recovery path until some other action happens to trigger one.
      waitForTx(hash).catch(() => {}).finally(() => this.refreshBalance());
      return hash;
    } catch (e) {
      this.flash(this.errorText(e, label + " failed."));
      return null;
    } finally {
      this.setState({ txPending: false });
    }
  }

  // Every trade is ETH-in / ETH-out from the user's side, regardless of a
  // token's underlying quote asset:
  //  - INSTANT, or CURVE once migrated: trades its real live V4 pool via the
  //    Universal Router (see chain/dex.js) -- a single hop if the pool is
  //    natively ETH-quoted, or two hops (ETH -> quoteAsset -> token) through
  //    the same real external venue the contracts themselves seed, when it
  //    isn't (USDC/USDT0 only -- anything else has no known ETH route).
  //  - CURVE pre-migration, native-quoted: buys/sells the curve directly.
  //  - CURVE pre-migration, ERC20-quoted: buys route ETH in automatically
  //    (buyWithNative); sell proceeds land in the quote asset itself, since
  //    there's no equivalent native-sell path on the curve contract.
  async buy(coin, amtEth) {
    if (coin.family === "CAMPAIGN") return this.flash("This token is a campaign — use Contribute instead of Buy.");
    if (!amtEth || amtEth <= 0) return this.flash("Enter an amount.");
    const valueWei = parseEther(String(amtEth));
    if (valueWei > this.state.nativeBalance) return this.flash("Not enough ETH. Need " + amtEth + ".");

    const isPool = coin.family === "INSTANT" || (coin.family === "CURVE" && coin.migrated);
    const isNativeQuote = coin.quoteTokenAddress.toLowerCase() === ZERO_ADDRESS;

    let hash;
    try {
      if (isPool) {
        const expected = await previewPoolBuyWithNative({ token: coin.id, hook: DUCK_HOOK, quoteAsset: coin.quoteTokenAddress, quoteSymbol: coin.quote, amountInWei: valueWei });
        if (expected === 0n) return this.flash("No ETH route available for this pool right now.");
        const minOut = applySlippage(expected, this.state.slippageBps);
        hash = await this.runTx("Buy", () => buyOnPoolWithNative({ account: this.state.account, token: coin.id, hook: DUCK_HOOK, quoteAsset: coin.quoteTokenAddress, quoteSymbol: coin.quote, amountInWei: valueWei, minOut }));
      } else if (isNativeQuote) {
        const expected = await previewCurveBuy(coin.id, valueWei);
        const minOut = applySlippage(expected, this.state.slippageBps);
        hash = await this.runTx("Buy", () => buyCurve({ account: this.state.account, token: coin.id, quoteToken: ZERO_ADDRESS, amountIn: valueWei, minOut }));
      } else {
        const { quoteOut, tokensOut } = await previewCurveBuyWithNative(coin.id, coin.quoteTokenAddress, coin.quote, valueWei);
        if (quoteOut === 0n) return this.flash("No ETH route available for this token's quote asset (" + coin.quote + ") — you'd need to already hold it.");
        const minQuoteOut = applySlippage(quoteOut, this.state.slippageBps);
        const minOut = applySlippage(tokensOut, this.state.slippageBps);
        hash = await this.runTx("Buy", () => buyCurveWithNative({ account: this.state.account, token: coin.id, amountInWei: valueWei, minQuoteOut, minOut }));
      }
    } catch (e) {
      return this.flash("Couldn't get a price quote — try again. (" + this.errorText(e, "unknown") + ")");
    }
    if (hash) {
      await Promise.all([this.loadPortfolio(), this.loadTokenDetail(coin.id)]);
      this.flash("Bought " + coin.ticker + " for " + amtEth + " ETH");
    }
  }

  async sell(coin, tokenAmount) {
    if (coin.family === "CAMPAIGN") return this.flash("Selling isn't available for campaign tokens.");
    if (!tokenAmount || tokenAmount <= 0) return this.flash("Enter an amount.");
    const amountIn = parseUnits(String(tokenAmount), 18);

    const isPool = coin.family === "INSTANT" || (coin.family === "CURVE" && coin.migrated);

    let hash;
    try {
      if (isPool) {
        const expected = await previewPoolSellForNative({ token: coin.id, hook: DUCK_HOOK, quoteAsset: coin.quoteTokenAddress, quoteSymbol: coin.quote, amountIn });
        if (expected === 0n) return this.flash("No ETH route available for this pool right now.");
        const minOut = applySlippage(expected, this.state.slippageBps);
        hash = await this.runTx("Sell", () => sellOnPoolForNative({ account: this.state.account, token: coin.id, hook: DUCK_HOOK, quoteAsset: coin.quoteTokenAddress, quoteSymbol: coin.quote, amountIn, minOut }));
      } else {
        const expected = await previewCurveSell(coin.id, amountIn);
        const minQuoteOut = applySlippage(expected, this.state.slippageBps);
        hash = await this.runTx("Sell", () => sellCurve({ account: this.state.account, token: coin.id, amountIn, minQuoteOut }));
      }
    } catch (e) {
      return this.flash("Couldn't get a price quote — try again. (" + this.errorText(e, "unknown") + ")");
    }
    if (hash) {
      await Promise.all([this.loadPortfolio(), this.loadTokenDetail(coin.id)]);
      this.flash(isPool ? "Sold " + coin.ticker : "Sold " + coin.ticker + (coin.quote !== "ETH" ? " (proceeds landed as " + coin.quote + ")" : ""));
    }
  }

  setCreateFamily(family) {
    this.setState({ createFamily: family });
  }

  onImagePick(e) {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (this.state.draftImage.previewUrl) URL.revokeObjectURL(this.state.draftImage.previewUrl);
    const previewUrl = URL.createObjectURL(file);
    this.setState({ draftImage: { file, previewUrl, uploading: true, ipfsUri: "", gatewayUrl: "", error: "" } });
    const form = new FormData();
    form.append("file", file);
    fetch(API_BASE + "/upload/image", { method: "POST", body: form })
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `upload failed (${res.status})`);
        return res.json();
      })
      .then(({ ipfsUri, gatewayUrl }) => {
        this.setState((st) => ({ draftImage: { ...st.draftImage, uploading: false, ipfsUri, gatewayUrl } }));
      })
      .catch((err) => {
        this.setState((st) => ({ draftImage: { ...st.draftImage, uploading: false, error: err.message || "upload failed" } }));
      });
  }

  clearImage() {
    this.setState((st) => {
      if (st.draftImage.previewUrl) URL.revokeObjectURL(st.draftImage.previewUrl);
      return { draftImage: EMPTY_IMAGE };
    });
  }

  async buildMetaURI(name, symbol, desc) {
    try {
      const res = await fetch(API_BASE + "/upload/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, symbol, description: desc, image: this.state.draftImage.ipfsUri || "" }),
      });
      if (!res.ok) throw new Error("metadata upload failed");
      const { ipfsUri } = await res.json();
      return ipfsUri;
    } catch {
      return desc; // metadata service unreachable — fall back to plain text so launch isn't blocked
    }
  }

  async submitCreate() {
    if (!this.requireWallet()) return;
    const { createFamily, account } = this.state;
    if (createFamily === "curve") {
      const d = this.state.draftCurve;
      if (!d.name.trim() || !d.ticker.trim()) return this.flash("Name and ticker are required.");
      if (findBlockedTerm(d.name, d.ticker, d.desc)) return this.flash("That name, ticker, or description isn't allowed. Please choose different text.");
      const symbol = d.ticker.trim().toUpperCase().slice(0, 9);
      const decimals = decimalsFor(d.quoteToken);
      const startVirtualQuote = parseUnits(d.startVirtualQuote || "1", decimals);
      const migrationTargetQuote = parseUnits(d.migrationTargetQuote || "10", decimals);
      if (startVirtualQuote === 0n || migrationTargetQuote <= startVirtualQuote) {
        return this.flash("Migration target must be greater than the start reserve (and both non-zero).");
      }
      const metaURI = await this.buildMetaURI(d.name.trim(), symbol, d.desc.trim());
      const isNativeQuoted = d.quoteToken.toLowerCase() === ZERO_ADDRESS;
      const earlyBuyAmount = d.earlyBuyAmount && Number(d.earlyBuyAmount) > 0 ? parseUnits(String(d.earlyBuyAmount), decimals) : 0n;
      const hash = await this.runTx("Launch", () => createCurveToken({
        account,
        name: d.name.trim(), symbol,
        totalSupply: parseUnits("1000000000", 18),
        curveBps: 8000n, liquidityBps: 2000n,
        quoteToken: d.quoteToken,
        startVirtualQuote, migrationTargetQuote,
        enableAntibot: false, antibotBlocks: 0n,
        metaURI,
        buyAmountWei: isNativeQuoted ? earlyBuyAmount : 0n,
        earlyBuyAmount: isNativeQuoted ? 0n : earlyBuyAmount,
      }));
      if (hash) {
        this.setState({
          draftCurve: { name: "", ticker: "", desc: "", quoteToken: ZERO_ADDRESS, startVirtualQuote: "1", migrationTargetQuote: "10", earlyBuyAmount: "0" },
          draftImage: EMPTY_IMAGE, route: "portfolio",
        });
        this.flash("Launch submitted. It'll show up here once the subgraph picks it up.");
        setTimeout(() => this.loadCoins(), 6000);
      }
    } else if (createFamily === "instant") {
      const d = this.state.draftInstant;
      if (!d.name.trim() || !d.ticker.trim()) return this.flash("Name and ticker are required.");
      if (findBlockedTerm(d.name, d.ticker, d.desc)) return this.flash("That name, ticker, or description isn't allowed. Please choose different text.");
      const instantSymbol = d.ticker.trim().toUpperCase().slice(0, 9);
      const instantMetaURI = await this.buildMetaURI(d.name.trim(), instantSymbol, d.desc.trim());
      const decimals = decimalsFor(d.quoteToken);
      const launchMarketCap = parseUnits(d.launchMarketCap || "10", decimals);
      const buyWei = d.buyAmountHype && Number(d.buyAmountHype) > 0 ? parseEther(String(d.buyAmountHype)) : 0n;
      const hash = await this.runTx("Launch", () => launchInstant({
        account, name: d.name.trim(), symbol: instantSymbol,
        metaURI: instantMetaURI, quoteToken: d.quoteToken, launchMarketCap,
        quoteAmountWei: buyWei,
      }));
      if (hash) {
        this.setState({
          draftInstant: { name: "", ticker: "", desc: "", quoteToken: ZERO_ADDRESS, launchMarketCap: "10", buyAmountHype: "0" },
          draftImage: EMPTY_IMAGE, route: "portfolio",
        });
        this.flash("Launch submitted. It'll show up here once the subgraph picks it up.");
        setTimeout(() => this.loadCoins(), 6000);
      }
    } else {
      const d = this.state.draftCampaign;
      if (!d.name.trim() || !d.ticker.trim()) return this.flash("Name and ticker are required.");
      if (findBlockedTerm(d.name, d.ticker, d.desc)) return this.flash("That name, ticker, or description isn't allowed. Please choose different text.");
      const campaignSymbol = d.ticker.trim().toUpperCase().slice(0, 9);
      const campaignMetaURI = await this.buildMetaURI(d.name.trim(), campaignSymbol, d.desc.trim());
      const goalNativeWei = parseEther(d.goalNative || "1");
      if (goalNativeWei === 0n) return this.flash("Enter a funding goal greater than zero.");
      const hash = await this.runTx("Create campaign", () => createCampaign({
        account, name: d.name.trim(), symbol: campaignSymbol,
        metaURI: campaignMetaURI, dexQuoteAsset: d.dexQuoteAsset, goalNativeWei,
      }));
      if (hash) {
        this.setState({
          draftCampaign: { name: "", ticker: "", desc: "", dexQuoteAsset: ZERO_ADDRESS, goalNative: "1" },
          draftImage: EMPTY_IMAGE, route: "portfolio",
        });
        this.flash("Campaign submitted. It'll show up here once the subgraph picks it up.");
        setTimeout(() => this.loadCoins(), 6000);
      }
    }
  }

  async contribute(coin, amtEth) {
    if (!amtEth || amtEth <= 0) return this.flash("Enter an amount.");
    const valueWei = parseEther(String(amtEth));
    const hash = await this.runTx("Contribute", () => contributeCampaign({ account: this.state.account, campaignId: BigInt(coin.campaignId), amountWei: valueWei }));
    if (hash) { await Promise.all([this.loadPortfolio(), this.loadCampaigns()]); this.flash("Contributed " + amtEth + " ETH"); }
  }

  setCampaignAmount(campaignId, value) {
    this.setState(s => ({ campaignAmounts: { ...s.campaignAmounts, [campaignId]: value.replace(/[^0-9.]/g, "") } }));
  }
  contributeToActiveCampaign(campaignId) {
    const amt = parseFloat(this.state.campaignAmounts[campaignId]) || 0;
    return this.contribute({ campaignId }, amt);
  }
  finalizeActiveCampaign(campaignId) {
    return this.finalizeCampaignAction({ campaignId }).then(() => this.loadCampaigns());
  }
  async claimCampaignTokens(coin) {
    const hash = await this.runTx("Claim", () => claimCampaign({ account: this.state.account, campaignId: BigInt(coin.campaignId) }));
    if (hash) { await Promise.all([this.loadPortfolio()]); this.flash("Claimed."); }
  }
  async claimCampaignRefundAction(coin) {
    const hash = await this.runTx("Refund", () => claimCampaignRefund({ account: this.state.account, campaignId: BigInt(coin.campaignId) }));
    if (hash) { await Promise.all([this.loadPortfolio()]); this.flash("Refunded."); }
  }
  async finalizeCampaignAction(coin) {
    const hash = await this.runTx("Finalize", () => finalizeCampaign({ account: this.state.account, campaignId: BigInt(coin.campaignId) }));
    if (hash) { await Promise.all([this.loadCoins()]); this.flash("Finalized."); }
  }
  async claimCreatorFees(tokenAddress) {
    const hash = await this.runTx("Claim fees", () => claimFees({ account: this.state.account, token: tokenAddress }));
    if (hash) { await Promise.all([this.loadPortfolio()]); this.flash("Fees claimed."); }
  }
  async claimAllCreatorFees() {
    const hash = await this.runTx("Claim all fees", () => claimAllFees({ account: this.state.account }));
    if (hash) { await Promise.all([this.loadPortfolio()]); this.flash("All fees claimed."); }
  }

  postChat() {
    const text = this.state.chatDraft.trim();
    if (!text) return;
    const id = this.state.tokenId;
    this.setState(s => ({
      chatDraft: "",
      coins: s.coins.map(c => c.id === id ? { ...c, chat: [{ who: s.account ? shortAddress(s.account) : "anon", text, ago: "now", hue: "#D9D9D9" }].concat(c.chat) } : c),
    }));
  }

  handlers(id) {
    this.hcache = this.hcache || {};
    if (!this.hcache[id]) {
      this.hcache[id] = {
        open: () => this.openToken(id),
        watch: e => { e.stopPropagation(); this.setState(st => ({ watch: { ...st.watch, [id]: !st.watch[id] } })); },
      };
    }
    return this.hcache[id];
  }

  renderVals() {
    const s = this.state;
    const routes = [
      { label: "Explore", r: "home" }, { label: "Portfolio", r: "portfolio" },
      { label: "Leaderboard", r: "board" }, { label: "Create", r: "create" },
    ];
    const sorts = ["Newest", "Market cap", "Volume", "Curve %", "Gainers"];
    const frameNames = ["5m", "1h", "6h", "24h"];

    let list = s.coins.slice();
    if (s.tab === 1) list = list.filter(c => s.watch[c.id]);
    if (s.tab === 2) list = list.filter(c => c.pct >= 90);
    if (s.tab === 3) list = list.filter(c => s.account && c.dev === shortAddress(s.account));
    const q = s.query.trim().toLowerCase();
    if (q) list = list.filter(c => (c.name + c.ticker + c.dev).toLowerCase().includes(q));
    if (s.minMcap > 0) list = list.filter(c => c.mc >= s.minMcap * 1000);
    list.sort([
      (a, b) => a.ageMin - b.ageMin, (a, b) => b.mc - a.mc, (a, b) => b.vol - a.vol,
      (a, b) => b.pct - a.pct, (a, b) => b.chg - a.chg,
    ][s.sort]);

    const shape = c => ({
      id: c.id, family: c.family, name: c.name, ticker: c.ticker, dev: c.dev, art: c.art, ink: c.ink, imageUrl: c.imageUrl, quote: c.quote,
      pair: c.ticker.replace("$", "") + " / " + c.quote, mc: money(c.mc), vol: money(c.vol), age: ageLabel(c.ageMin), pct: Math.round(c.pct) + "%",
      chg: (c.chg >= 0 ? "+" : "") + c.chg.toFixed(1) + "%", chgColor: c.chg >= 0 ? UP : DOWN,
      watchIcon: s.watch[c.id] ? "★" : "☆", watchColor: s.watch[c.id] ? "#D9D9D9" : "#9494A4",
      open: this.handlers(c.id).open,
      watch: this.handlers(c.id).watch,
    });

    const kothCoin = s.coins.slice().sort((a, b) => b.pct - a.pct)[0];
    const koth = kothCoin ? { ...shape(kothCoin), desc: kothCoin.desc } : {};

    const c = s.coins.find(x => x.id === s.tokenId);
    const amt = parseFloat(s.amount) || 0;
    const buying = s.side === "buy";
    const myBalance = c ? s.portfolio.holdings.find(h => h.token?.id === c.id)?.balance : null;
    const myBalanceTokens = myBalance ? Number(myBalance) / 1e18 : 0;
    const myContribution = c ? s.portfolio.contributions.find(ct => ct.campaign?.id === c.campaignId) : null;
    const candles = c ? buildCandles(c.rawTrades || [], c.curveSeed) : [];
    const tok = c ? {
      family: c.family, campaignId: c.campaignId, quoteTokenAddress: c.quoteTokenAddress,
      poolId: c.poolId, migrated: c.migrated,
      // DuckRaise deploys a campaign's token immediately at launch() -- not
      // at finalize() -- so this token is reachable, and needs a real
      // contribute/finalize/claim/refund UI, in every campaign state.
      campaignSucceeded: c.campaignSucceeded, campaignFailed: c.campaignFailed,
      campaignDeadlinePassed: c.campaignDeadline != null && Number(c.campaignDeadline) * 1000 <= Date.now(),
      submitContribute: () => this.contribute(c, amt),
      name: c.name, ticker: c.ticker, art: c.art, ink: c.ink, imageUrl: c.imageUrl, desc: c.desc, dev: c.dev, quote: c.quote,
      pair: c.ticker.replace("$", "") + " / " + c.quote, mint: c.mint, age: ageLabel(c.ageMin), holders: c.holders.toLocaleString(),
      price: money(c.mc / 1e9 * 1e6) + "/M",
      chg: (c.chg >= 0 ? "+" : "") + c.chg.toFixed(1) + "%", chgColor: c.chg >= 0 ? UP : DOWN,
      pct: Math.round(c.pct) + "%",
      candles,
      stats: [
        { k: "RAISED", v: money(c.mc) }, { k: "24H VOL", v: money(c.vol) },
        { k: "HOLDERS", v: c.holders.toLocaleString() }, { k: "MIGRATED", v: c.migrated ? "yes" : "no" },
      ],
      trades: c.trades, chat: c.chat,
      holderRows: c.holderRows || [],
      watchIcon: s.watch[c.id] ? "★" : "☆", watchLabel: s.watch[c.id] ? "Watching" : "Watch",
      watchColor: s.watch[c.id] ? "#D9D9D9" : "#9494A4",
      watch: this.handlers(c.id).watch,
      myBalanceTokens,
      buy: amtEth => this.buy(c, amtEth),
      sell: tokenAmt => this.sell(c, tokenAmt),
      contribute: amtEth => this.contribute(c, amtEth),
      claimTokens: () => this.claimCampaignTokens(c),
      claimRefund: () => this.claimCampaignRefundAction(c),
      finalize: () => this.finalizeCampaignAction(c),
      myContribution,
    } : { candles: [], stats: [], trades: [], chat: [], holderRows: [] };

    const presetVals = buying ? [0.01, 0.1, 1, "max"] : [0.25, 0.5, 0.75, "all"];
    const boardModes = ["Market cap", "Gainers", "Volume"];
    const boardList = s.coins.slice().sort([
      (a, b) => b.mc - a.mc, (a, b) => b.chg - a.chg, (a, b) => b.vol - a.vol,
    ][s.board]);

    const heldTokens = s.portfolio.holdings.filter(h => Number(h.balance) > 0);
    const createdTokens = s.portfolio.created;
    const coinById = new Map(s.coins.map(x => [x.id, x]));

    return {
      isMobile: s.mobile, notMobile: !s.mobile,
      shellGap: s.mobile ? "16px" : "22px",
      shellPad: s.mobile ? "14px 12px 92px" : "22px clamp(16px, 2vw, 30px) 64px",
      headPad: s.mobile ? "10px 14px" : "0 clamp(16px, 1.8vw, 26px)",
      headWrap: s.mobile ? "wrap" : "nowrap",
      showHeaderExtras: !s.mobile && !s.tight,
      navPad: s.tight ? "7px 11px" : "8px 14px",
      headGap: s.mobile ? "12px" : "clamp(10px, 1.4vw, 22px)",
      navDisplay: s.mobile ? "none" : "flex",
      heroPad: s.mobile ? "22px 18px 20px" : "38px 40px 32px",
      heroCols: s.mobile ? "minmax(0,1fr)" : "1.3fr .7fr",
      heroCopyMax: s.mobile ? "none" : "48ch",
      heroSize: s.mobile ? "clamp(26px, 8vw, 34px)" : "clamp(32px, 3.2vw, 46px)",
      cardMin: s.mobile ? "150px" : "226px",
      tokenCols: s.mobile ? "minmax(0,1fr)" : "minmax(0,1fr) 330px",
      tokHeadDir: s.mobile ? "column" : "row",
      chartH: s.mobile ? "160px" : "220px",
      statCols: s.mobile ? "repeat(2, 1fr)" : "repeat(4, 1fr)",
      quoteCols: s.mobile ? "repeat(2, 1fr)" : "repeat(3, 1fr)",
      tblOv: s.mobile ? "auto hidden" : "hidden",
      tblNarrow: s.mobile ? "330px" : "auto",
      tblMid: s.mobile ? "480px" : "auto",
      tblWide: s.mobile ? "620px" : "auto",
      toggleDisplay: s.mobile ? "none" : "flex",
      toastBottom: s.mobile ? "84px" : "28px",

      connected: !!s.account, notConnected: !s.account,
      balance: Number(formatEther(s.nativeBalance)).toFixed(4),
      account: s.account, accountShort: s.account ? shortAddress(s.account) : "",
      txPending: s.txPending,
      connect: () => this.connect(),
      disconnect: () => this.disconnect(),

      tape: s.tape, liveCount: s.coins.length.toLocaleString(),
      isHome: s.route === "home", isToken: s.route === "token", isCreate: s.route === "create",
      isPortfolio: s.route === "portfolio", isBoard: s.route === "board",
      goHome: () => this.setState({ route: "home" }),
      goCreate: () => this.setState({ route: "create" }),
      goPortfolio: () => this.setState({ route: "portfolio" }),
      goBoard: () => this.setState({ route: "board" }),

      nav: routes.map(r => ({
        label: r.label, go: () => this.setState({ route: r.r }),
        weight: s.route === r.r ? 600 : 500,
        bg: s.route === r.r ? "#D9D9D9" : "transparent",
        color: s.route === r.r ? INKD : "#9494A4",
      })),
      toggles: [{ key: "anim", label: "Animations" }, { key: "nsfw", label: "Include NSFW" }, { key: "devsold", label: "Hide dev sold" }].map(t => {
        const on = s.toggles[t.key];
        return {
          label: t.label, justify: on ? "flex-end" : "flex-start",
          track: on ? "#D9D9D9" : "rgba(255,255,255,.1)", knob: on ? INKD : "#74748A",
          flip: () => this.setState(st => ({ toggles: { ...st.toggles, [t.key]: !st.toggles[t.key] } })),
        };
      }),
      minMcap: s.minMcap, minMcapLabel: s.minMcap === 0 ? "any" : "$" + s.minMcap + "K",
      filtersOpen: s.filtersOpen,
      toggleFilters: () => this.setState(st => ({ filtersOpen: !st.filtersOpen })),
      resetFilters: () => this.setState({ minMcap: 0, sort: 0, toggles: { anim: true, nsfw: false, devsold: false } }),
      filterBadge: s.minMcap > 0 || s.sort !== 0 ? "· " + ((s.minMcap > 0 ? 1 : 0) + (s.sort !== 0 ? 1 : 0)) : "",
      filtersBg: s.filtersOpen || s.minMcap > 0 || s.sort !== 0 ? "rgba(217,217,217,.14)" : "rgba(255,255,255,.04)",
      filtersColor: s.filtersOpen || s.minMcap > 0 || s.sort !== 0 ? "#FBFAFF" : "#B4B4C2",
      setMinMcap: e => this.setState({ minMcap: +e.target.value }),

      koth,
      tabTitle: "Coins",
      shownCount: list.length + " / " + s.coins.length,
      visible: list.map(shape), isEmpty: list.length === 0,
      query: s.query, hasQuery: s.query.length > 0,
      setQuery: e => this.setState({ query: e.target.value }),
      clearQuery: () => this.setState({ query: "" }),
      frames: frameNames.map((label, i) => ({
        label, go: () => this.setState({ frame: i }),
        bg: s.frame === i ? "#D9D9D9" : "transparent", color: s.frame === i ? INKD : "#9494A4",
      })),
      sorts: sorts.map((label, i) => ({
        label, go: () => this.setState({ sort: i }),
        bg: s.sort === i ? "#D9D9D9" : "rgba(255,255,255,.06)",
        color: s.sort === i ? INKD : "#B4B4C2",
      })),
      isGrid: s.mobile || s.view === "grid", isList: !s.mobile && s.view === "list",
      setGrid: () => this.setState({ view: "grid" }), setList: () => this.setState({ view: "list" }),
      gridBg: s.view === "grid" ? "#D9D9D9" : "transparent", gridColor: s.view === "grid" ? INKD : "#9494A4",
      listBg: s.view === "list" ? "#D9D9D9" : "transparent", listColor: s.view === "list" ? INKD : "#9494A4",

      tok,
      related: s.coins.filter(x => x.id !== s.tokenId).slice(0, 4).map(x => ({
        ticker: x.ticker, art: x.art, imageUrl: x.imageUrl, chg: (x.chg >= 0 ? "+" : "") + x.chg.toFixed(1) + "%",
        chgColor: x.chg >= 0 ? UP : DOWN, open: this.handlers(x.id).open,
      })),
      pane: s.pane, paneIsTrades: s.pane === "trades", paneIsHolders: s.pane === "holders", paneIsChat: s.pane === "chat",
      setPaneTrades: () => this.setState({ pane: "trades" }),
      setPaneHolders: () => this.setState({ pane: "holders" }),
      setPaneChat: () => this.setState({ pane: "chat" }),
      paneTradesBg: s.pane === "trades" ? "#D9D9D9" : "transparent", paneTradesColor: s.pane === "trades" ? INKD : "#9494A4",
      paneHoldersBg: s.pane === "holders" ? "#D9D9D9" : "transparent", paneHoldersColor: s.pane === "holders" ? INKD : "#9494A4",
      paneChatBg: s.pane === "chat" ? "#D9D9D9" : "transparent", paneChatColor: s.pane === "chat" ? INKD : "#9494A4",
      chatCount: c ? c.chat.length : 0,
      chatDraft: s.chatDraft, setChatDraft: e => this.setState({ chatDraft: e.target.value }),
      postChat: () => this.postChat(),

      side: s.side,
      setSideBuy: () => this.setState({ side: "buy", amount: "0.01" }),
      setSideSell: () => this.setState({ side: "sell", amount: myBalanceTokens ? String(myBalanceTokens / 2) : "0" }),
      buyTabBg: buying ? "#D9D9D9" : "transparent", buyTabColor: buying ? INKD : "#9494A4",
      sellTabBg: !buying ? "#FF6B81" : "transparent", sellTabColor: !buying ? "#1A0409" : "#9494A4",
      amount: s.amount, amountUnit: buying ? "ETH" : (c ? c.ticker.replace("$", "") : ""),
      setAmount: e => this.setState({ amount: e.target.value.replace(/[^0-9.]/g, "") }),
      presets: presetVals.map(v => ({
        label: v === "max" ? "MAX" : v === "all" ? "ALL" : (buying ? v + " ETH" : v + "×"),
        go: () => {
          if (v === "max") {
            const spendable = s.nativeBalance > GAS_RESERVE_WEI ? s.nativeBalance - GAS_RESERVE_WEI : 0n;
            return this.setState({ amount: truncateDecimals(formatEther(spendable), 4) });
          }
          if (v === "all") return this.setState({ amount: String(myBalanceTokens) });
          this.setState({ amount: buying ? String(v) : String(myBalanceTokens * v) });
        },
      })),
      submitTrade: () => { buying ? this.buy(c, amt) : this.sell(c, amt); },
      ctaLabel: !s.account ? "Connect wallet to trade" : s.txPending ? "Confirming…" : (buying ? "Buy with " + (s.amount || "0") + " ETH" : "Sell " + (s.amount || "0") + " " + (c ? c.ticker.replace("$", "") : "")),
      ctaBg: buying ? "#D9D9D9" : "#FF6B81", ctaInk: buying ? INKD : "#1A0409",
      slippageLabel: (s.slippageBps / 100) + "%",
      slippageOptions: [50, 100, 300, 500].map(bps => ({
        label: (bps / 100) + "%", go: () => this.setState({ slippageBps: bps }),
        bg: s.slippageBps === bps ? "#D9D9D9" : "rgba(255,255,255,.06)",
        color: s.slippageBps === bps ? INKD : "#9494A4",
      })),

      // Create page — three real flows, one per launcher family.
      createFamily: s.createFamily,
      setCreateCurve: () => this.setCreateFamily("curve"),
      setCreateInstant: () => this.setCreateFamily("instant"),
      setCreateCampaign: () => this.setCreateFamily("campaign"),
      isCreateCurve: s.createFamily === "curve", isCreateInstant: s.createFamily === "instant", isCreateCampaign: s.createFamily === "campaign",
      draftCurve: s.draftCurve,
      setCurveName: e => this.setState(st => ({ draftCurve: { ...st.draftCurve, name: e.target.value } })),
      setCurveTicker: e => this.setState(st => ({ draftCurve: { ...st.draftCurve, ticker: e.target.value.toUpperCase() } })),
      setCurveDesc: e => this.setState(st => ({ draftCurve: { ...st.draftCurve, desc: e.target.value.slice(0, 140) } })),
      setCurveStartVirtualQuote: e => this.setState(st => ({ draftCurve: { ...st.draftCurve, startVirtualQuote: e.target.value.replace(/[^0-9.]/g, "") } })),
      setCurveMigrationTarget: e => this.setState(st => ({ draftCurve: { ...st.draftCurve, migrationTargetQuote: e.target.value.replace(/[^0-9.]/g, "") } })),
      setCurveBuy: e => this.setState(st => ({ draftCurve: { ...st.draftCurve, earlyBuyAmount: e.target.value.replace(/[^0-9.]/g, "") } })),
      curveQuoteChips: QUOTE_OPTIONS.map(q => ({
        label: q.label, go: () => this.setState(st => ({ draftCurve: { ...st.draftCurve, quoteToken: q.address } })),
        bg: s.draftCurve.quoteToken === q.address ? "#D9D9D9" : "rgba(255,255,255,.05)",
        color: s.draftCurve.quoteToken === q.address ? INKD : "#B4B4C2",
      })),
      curveQuoteUnit: quoteSymbol(s.draftCurve.quoteToken),
      draftInstant: s.draftInstant,
      setInstantName: e => this.setState(st => ({ draftInstant: { ...st.draftInstant, name: e.target.value } })),
      setInstantTicker: e => this.setState(st => ({ draftInstant: { ...st.draftInstant, ticker: e.target.value.toUpperCase() } })),
      setInstantDesc: e => this.setState(st => ({ draftInstant: { ...st.draftInstant, desc: e.target.value.slice(0, 140) } })),
      setInstantMarketCap: e => this.setState(st => ({ draftInstant: { ...st.draftInstant, launchMarketCap: e.target.value.replace(/[^0-9.]/g, "") } })),
      setInstantBuy: e => this.setState(st => ({ draftInstant: { ...st.draftInstant, buyAmountHype: e.target.value.replace(/[^0-9.]/g, "") } })),
      instantQuoteChips: QUOTE_OPTIONS.map(q => ({
        label: q.label, go: () => this.setState(st => ({ draftInstant: { ...st.draftInstant, quoteToken: q.address } })),
        bg: s.draftInstant.quoteToken === q.address ? "#D9D9D9" : "rgba(255,255,255,.05)",
        color: s.draftInstant.quoteToken === q.address ? INKD : "#B4B4C2",
      })),
      instantQuoteUnit: quoteSymbol(s.draftInstant.quoteToken),
      draftCampaign: s.draftCampaign,
      setCampaignName: e => this.setState(st => ({ draftCampaign: { ...st.draftCampaign, name: e.target.value } })),
      setCampaignTicker: e => this.setState(st => ({ draftCampaign: { ...st.draftCampaign, ticker: e.target.value.toUpperCase() } })),
      setCampaignDesc: e => this.setState(st => ({ draftCampaign: { ...st.draftCampaign, desc: e.target.value.slice(0, 140) } })),
      setCampaignGoal: e => this.setState(st => ({ draftCampaign: { ...st.draftCampaign, goalNative: e.target.value.replace(/[^0-9.]/g, "") } })),
      campaignQuoteChips: RAISE_QUOTE_OPTIONS.map(q => ({
        label: q.label, go: () => this.setState(st => ({ draftCampaign: { ...st.draftCampaign, dexQuoteAsset: q.address } })),
        bg: s.draftCampaign.dexQuoteAsset === q.address ? "#D9D9D9" : "rgba(255,255,255,.05)",
        color: s.draftCampaign.dexQuoteAsset === q.address ? INKD : "#B4B4C2",
      })),
      createCta: !s.account ? "Connect wallet to launch" : s.txPending ? "Confirming…" : "Launch",
      submitCreate: () => this.submitCreate(),
      draftArt: art(99), draftInk: ink(99),
      draftImage: s.draftImage,
      onImagePick: (e) => this.onImagePick(e),
      clearImage: () => this.clearImage(),

      portStats: [
        { k: "WALLET", v: (s.account ? Number(formatEther(s.nativeBalance)).toFixed(4) : "0") + " ETH", color: "#EDEDF2" },
        { k: "TOKENS HELD", v: String(heldTokens.length), color: "#EDEDF2" },
        { k: "TOKENS CREATED", v: String(createdTokens.length), color: "#B4B4C2" },
        { k: "CONTRIBUTIONS", v: String(s.portfolio.contributions.length), color: "#B4B4C2" },
      ],
      holdings: heldTokens.map(h => {
        const co = coinById.get(h.token?.id);
        return {
          name: co ? co.name : shortAddress(h.token?.id || ""), ticker: co ? co.ticker : "", pair: co ? (co.ticker.replace("$", "") + " / " + co.quote) : "",
          art: co ? co.art : "#D9D9D9", imageUrl: co ? co.imageUrl : null,
          balance: (Number(h.balance) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 }),
          open: co ? this.handlers(co.id).open : null,
        };
      }),
      hasHoldings: heldTokens.length > 0, noHoldings: heldTokens.length === 0,
      created: createdTokens.map(t => {
        const co = coinById.get(t.id);
        return {
          name: co ? co.name : shortAddress(t.id), ticker: co ? co.ticker : "", family: t.family,
          open: this.handlers(t.id).open,
          claimFees: () => this.claimCreatorFees(t.id),
        };
      }),
      hasCreated: createdTokens.length > 0, noCreated: createdTokens.length === 0,
      claimAllFees: () => this.claimAllCreatorFees(),
      contributions: s.portfolio.contributions.map(ct => {
        const camp = ct.campaign;
        const amountEth = (Number(ct.amount) / 1e18).toFixed(4);
        // The backend only stores succeeded/failed (both false until
        // resolution) — there's no separate "finalized" column.
        const finalized = camp ? (camp.succeeded || camp.failed) : false;
        let status = "ACTIVE", actionLabel = null, action = null;
        if (camp) {
          if (!finalized && Number(camp.deadline) * 1000 <= Date.now()) {
            status = "READY TO FINALIZE"; actionLabel = "Finalize"; action = () => this.finalizeCampaignAction({ campaignId: camp.id });
          } else if (!finalized) {
            status = "ACTIVE";
          } else if (camp.succeeded) {
            status = "SUCCEEDED";
            if (!ct.claimed) { actionLabel = "Claim tokens"; action = () => this.claimCampaignTokens({ campaignId: camp.id }); }
            else status = "CLAIMED";
          } else {
            status = "FAILED";
            if (!ct.refunded) { actionLabel = "Claim refund"; action = () => this.claimCampaignRefundAction({ campaignId: camp.id }); }
            else status = "REFUNDED";
          }
        }
        return {
          name: camp ? camp.name : "Campaign", ticker: camp ? "$" + camp.symbol : "",
          amount: amountEth + " ETH", status, actionLabel, action,
          open: camp?.token ? this.handlers(camp.token.id).open : null,
        };
      }),
      hasContributions: s.portfolio.contributions.length > 0, noContributions: s.portfolio.contributions.length === 0,
      activity: s.activity, hasActivity: s.activity.length > 0, noActivity: s.activity.length === 0,

      boardTabs: boardModes.map((label, i) => ({
        label, go: () => this.setState({ board: i }),
        bg: s.board === i ? "#D9D9D9" : "transparent", color: s.board === i ? INKD : "#9494A4",
      })),
      board: boardList.map((x, i) => ({
        rank: String(i + 1), rankColor: i < 3 ? "#D9D9D9" : "#56566A",
        name: x.name, ticker: x.ticker, dev: x.dev, art: x.art, imageUrl: x.imageUrl,
        mc: money(x.mc), vol: money(x.vol), pct: Math.round(x.pct) + "%",
        chg: (x.chg >= 0 ? "+" : "") + x.chg.toFixed(1) + "%", chgColor: x.chg >= 0 ? UP : DOWN,
        open: this.handlers(x.id).open,
      })),

      // Active (unresolved) DuckRaise campaigns — also independently
      // reachable via the main grid/leaderboard above (their token exists
      // from launch() onward, see loadCampaigns' comment), but this card
      // gives a direct contribute/finalize action without opening the token
      // page first.
      activeCampaigns: s.campaigns.map(camp => {
        const raised = Number(camp.totalRaised) / 1e18;
        const goal = Number(camp.goal) / 1e18;
        const pct = goal > 0 ? Math.min(100, (raised / goal) * 100) : 0;
        const deadlinePassed = Number(camp.deadline) * 1000 <= Date.now();
        return {
          campaignId: camp.id, name: camp.name, ticker: "$" + camp.symbol,
          quote: quoteSymbol(camp.dexQuoteAsset),
          raised: raised.toFixed(4) + " ETH", goalUsd: goal.toLocaleString(undefined, { maximumFractionDigits: 4 }) + " ETH",
          pct: Math.round(pct) + "%",
          deadlinePassed,
          amount: s.campaignAmounts[camp.id] || "",
          setAmount: e => this.setCampaignAmount(camp.id, e.target.value),
          contribute: () => this.contributeToActiveCampaign(camp.id),
          finalize: () => this.finalizeActiveCampaign(camp.id),
        };
      }),
      hasActiveCampaigns: s.campaigns.length > 0, noActiveCampaigns: s.campaigns.length === 0,

      toast: s.toast,
    };
  }

  render() {
    const v = this.renderVals();
    return (
      <div style={cs("width: 100%; position: relative; min-height: 100vh; background: #06060A; color: #D9D9D9; font-family: 'Space Grotesk', Helvetica, sans-serif; overflow-x: hidden;")}>
        <div style={cs("position: absolute; left: 0; right: 0; top: 0; height: 380px; background: #0A0A0E;")}></div>

        <div style={cs("position: relative; z-index: 1;")}>
          {/* ticker tape */}
          <div style={cs("position: relative; overflow: hidden; height: 36px; display: flex; align-items: center; background: #0A0A10; border-bottom: 1px solid rgba(255,255,255,.06);")}>
            <div style={cs("display: flex; width: max-content; animation: tape 42s linear infinite; will-change: transform;")}>
              <div style={cs("display: flex; gap: 26px; width: max-content; flex: none; padding-left: 26px; align-items: center; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #7E7E8C; white-space: nowrap;")}>
                <TapeItems list={v.tape} />
              </div>
              <div aria-hidden="true" style={cs("display: flex; gap: 26px; width: max-content; flex: none; padding-left: 26px; align-items: center; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #7E7E8C; white-space: nowrap;")}>
                <TapeItems list={v.tape} />
              </div>
            </div>
          </div>

          {/* header */}
          <header style={cs(`position: sticky; top: 0; z-index: 30; min-height: 60px; padding: ${v.headPad}; flex-wrap: ${v.headWrap}; display: flex; align-items: center; gap: ${v.headGap}; background: rgba(6,6,10,.86); backdrop-filter: blur(16px); border-bottom: 1px solid rgba(255,255,255,.06);`)}>
            <button onClick={v.goHome} style={cs("border: none; background: transparent; cursor: pointer; display: flex; align-items: center; gap: 11px; padding: 0;")}>
              <div style={cs("width: 34px; height: 34px; border-radius: 11px; background: #D9D9D9; display: flex; align-items: center; justify-content: center; flex: none;")}>
                <div style={cs("width: 13px; height: 13px; background: #12061F; transform: rotate(45deg); border-radius: 3px;")}></div>
              </div>
              <div style={cs("display: flex; flex-direction: column; line-height: 1; align-items: flex-start;")}>
                <span style={cs("font-size: 16.5px; font-weight: 700; letter-spacing: -.03em; color: #F6F6F9;")}>duck<span style={cs("color: #6600FF;")}>.family</span></span>
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 8.5px; letter-spacing: .22em; color: #56566A; margin-top: 3px;")}>LAUNCHPAD</span>
              </div>
            </button>
            <nav style={cs(`display: ${v.navDisplay}; gap: 2px; align-items: center; flex: none; background: rgba(255,255,255,.035); border: 1px solid rgba(255,255,255,.07); border-radius: 99px; padding: 4px;`)}>
              {v.nav.map((n, i) => (
                <button key={i} onClick={n.go} style={cs(`border: none; cursor: pointer; padding: ${v.navPad}; border-radius: 99px; font-size: 13px; white-space: nowrap; font-weight: ${n.weight}; background: ${n.bg}; color: ${n.color};`)}>{n.label}</button>
              ))}
            </nav>
            <div style={cs("display: flex; align-items: center; gap: 10px; margin-left: auto; flex: none;")}>
              {v.showHeaderExtras && (
                <Hoverable tag="button" onClick={v.goCreate} style={cs("border: none; cursor: pointer; font-size: 13px; font-weight: 600; color: #D9D9D9; background: rgba(255,255,255,.06); border-radius: 99px; padding: 10px 18px; box-shadow: 0 0 0 1px rgba(255,255,255,.12) inset;")} hover={cs("background:rgba(255,255,255,.12);color:#fff")}>+ Create</Hoverable>
              )}
              {v.connected && (
                <div style={cs("display: flex; align-items: center; gap: 10px;")}>
                  <button onClick={v.goPortfolio} style={cs("border: none; cursor: pointer; background: transparent; display: flex; flex-direction: column; align-items: flex-end; line-height: 1.25; padding: 0;")}>
                    <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #EDEDF2;")}>{v.balance} ETH</span>
                    <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 9.5px; color: #6A6A7C;")}>{v.accountShort}</span>
                  </button>
                  <Hoverable tag="button" onClick={v.disconnect} style={cs("border: none; cursor: pointer; width: 34px; height: 34px; border-radius: 99px; background: rgba(255,255,255,.06); color: #B4B4C2; box-shadow: 0 0 0 1px rgba(255,255,255,.12) inset; font-size: 13px; font-weight: 700;")} hover={cs("background:rgba(255,107,129,.2);color:#FF6B81")}>×</Hoverable>
                </div>
              )}
              {v.notConnected && (
                <Hoverable tag="button" onClick={v.connect} style={cs("border: none; cursor: pointer; font-size: 13.5px; font-weight: 600; color: #12061F; background: #D9D9D9; border-radius: 99px; padding: 11px 22px;")} hover={cs("background:#fff")}>Connect Wallet</Hoverable>
              )}
            </div>
          </header>

          <div style={cs(`display: grid; grid-template-columns: minmax(0,1fr); gap: ${v.shellGap}; padding: ${v.shellPad}; max-width: 1560px; margin: 0 auto; width: 100%;`)}>
            <main style={cs("display: flex; flex-direction: column; gap: 20px; min-width: 0;")}>
              {v.isHome && <HomePage v={v} />}
              {v.isToken && <TokenPage v={v} />}
              {v.isCreate && <CreatePage v={v} />}
              {v.isPortfolio && <PortfolioPage v={v} />}
              {v.isBoard && <BoardPage v={v} />}
            </main>
          </div>
        </div>

        {v.isMobile && (
          <div style={cs("position: fixed; left: 0; right: 0; bottom: 0; z-index: 40; display: flex; align-items: stretch; gap: 2px; padding: 8px 10px 12px; background: rgba(8,8,12,.94); backdrop-filter: blur(14px); border-top: 1px solid rgba(255,255,255,.08);")}>
            {v.nav.map((n, i) => (
              <button key={i} onClick={n.go} style={cs(`flex: 1; border: none; cursor: pointer; min-height: 46px; border-radius: 12px; font-size: 12.5px; font-weight: ${n.weight}; background: ${n.bg}; color: ${n.color};`)}>{n.label}</button>
            ))}
          </div>
        )}

        {v.toast && (
          <div style={cs(`position: fixed; z-index: 60; left: 50%; bottom: ${v.toastBottom}; transform: translateX(-50%); display: flex; align-items: center; gap: 10px; padding: 13px 20px; border-radius: 13px; background: #101016; box-shadow: 0 0 0 1px rgba(217,217,217,.35) inset; animation: slidein .22s ease both; max-width: 90vw;`)}>
            <span style={cs("width: 7px; height: 7px; border-radius: 99px; background: #D9D9D9; flex: none;")}></span>
            <span style={cs("font-size: 13px; color: #EDEDF2;")}>{v.toast}</span>
          </div>
        )}
      </div>
    );
  }
}
