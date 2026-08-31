import { publicClient } from "./client.js";
import { mineVanitySalt } from "./vanity.js";
import { simulateAndSend, simulateAndSendWithResult } from "./tx.js";
import {
  DUCK_INCUBATION_ABI, DUCK_LAUNCHER_ABI, DUCK_RAISE_ABI, DUCK_LOCKER_ABI, DUCK_HOOK_ABI, ERC20_ABI,
} from "./abis.js";
import {
  DUCK_INCUBATION, DUCK_LAUNCHER, DUCK_RAISE, DUCK_LOCKER, DUCK_HOOK,
  DUCK_INCUBATION_TOKEN_IMPL, DUCK_LAUNCHER_TOKEN_IMPL, DUCK_RAISE_TOKEN_IMPL,
  V4_POSITION_MANAGER, ZERO_ADDRESS,
} from "./addresses.js";

export async function waitForTx(hash) {
  return publicClient.waitForTransactionReceipt({ hash });
}

// Each family's platformToken() is independently owner-settable and starts
// at address(0) (unset). When set, fee-waived trading/creation routes
// through it -- see DuckRaise.launch's feeWaived check for one example.
// Fetched live rather than hardcoded since it can change and has no event
// to index. Returns null per family when unset.
export async function getPlatformTokens() {
  const [incubation, launcher, raise] = await publicClient.multicall({
    contracts: [
      { address: DUCK_INCUBATION, abi: DUCK_INCUBATION_ABI, functionName: "platformToken" },
      { address: DUCK_LAUNCHER, abi: DUCK_LAUNCHER_ABI, functionName: "platformToken" },
      { address: DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "platformToken" },
    ],
    allowFailure: true,
  });
  const clean = (r) => (r.status === "success" && r.result !== ZERO_ADDRESS ? r.result : null);
  const tokens = { incubation: clean(incubation), launcher: clean(launcher), raise: clean(raise) };

  const addresses = [...new Set(Object.values(tokens).filter(Boolean))];
  if (addresses.length === 0) return { incubation: null, launcher: null, raise: null };

  const metaResults = await publicClient.multicall({
    contracts: addresses.flatMap((address) => [
      { address, abi: ERC20_ABI, functionName: "symbol" },
      { address, abi: ERC20_ABI, functionName: "decimals" },
    ]),
    allowFailure: true,
  });
  const metaByAddress = {};
  addresses.forEach((address, i) => {
    const symbolResult = metaResults[i * 2];
    const decimalsResult = metaResults[i * 2 + 1];
    metaByAddress[address.toLowerCase()] = {
      symbol: symbolResult.status === "success" ? symbolResult.result : "???",
      decimals: decimalsResult.status === "success" ? decimalsResult.result : 18,
    };
  });

  const withMeta = (address) => (address ? { address, ...metaByAddress[address.toLowerCase()] } : null);
  return { incubation: withMeta(tokens.incubation), launcher: withMeta(tokens.launcher), raise: withMeta(tokens.raise) };
}

// ---------- DuckIncubation (bonding curve family) ----------

export async function getCurveCreationFee() {
  return publicClient.readContract({ address: DUCK_INCUBATION, abi: DUCK_INCUBATION_ABI, functionName: "creationFee" });
}

// quoteToken = ZERO_ADDRESS for native ETH, or one of the whitelisted ERC20s.
// buyAmountWei: only meaningful for a native-quoted token -- any value sent
// above the creation fee is swept into an immediate buy in the same
// transaction (see DuckIncubation._collectCreationFee/createToken), no
// separate call needed and no sandwich risk since the curve doesn't exist
// until this same tx creates it.
// earlyBuyAmount: for an ERC20-quoted token instead -- the amount to
// early-buy with, pulled via transferFrom in the same call. Requires the
// token already approved to DUCK_INCUBATION for at least this amount.
export async function createCurveToken({
  account, name, symbol, totalSupply, curveBps, liquidityBps, quoteToken = ZERO_ADDRESS,
  startVirtualQuote, migrationTargetQuote, hookFeeBps = 0n, enableAntibot = false, antibotBlocks = 0n,
  metaURI, buyAmountWei = 0n, earlyBuyAmount = 0n, dryRun = false,
}) {
  const { userSalt } = mineVanitySalt({ deployer: DUCK_INCUBATION, impl: DUCK_INCUBATION_TOKEN_IMPL, caller: account });
  const fee = await getCurveCreationFee();
  const isNativeQuoted = quoteToken.toLowerCase() === ZERO_ADDRESS.toLowerCase();

  // A dry run must never send a real transaction -- including the ERC20
  // approve() an early buy would otherwise need. simulateContract below
  // still proves the createToken call itself would succeed either way.
  if (!dryRun && !isNativeQuoted && earlyBuyAmount > 0n) {
    await approveToken({ account, token: quoteToken, spender: DUCK_INCUBATION, amount: earlyBuyAmount });
  }

  const { hash, result: tokenAddress } = await simulateAndSendWithResult({
    address: DUCK_INCUBATION,
    abi: DUCK_INCUBATION_ABI,
    functionName: "createToken",
    args: [{
      name, symbol, totalSupply, curveBps, liquidityBps, quoteToken,
      startVirtualQuote, migrationTargetQuote,
      earlyBuyAmount: isNativeQuoted ? 0n : earlyBuyAmount,
      hookFeeBps, enableAntibot, antibotBlocks,
      metaURI: metaURI || "", salt: userSalt,
    }],
    value: isNativeQuoted ? fee + buyAmountWei : fee,
    account,
    dryRun,
  });
  return { hash, tokenAddress };
}

export async function buyCurve({ account, token, quoteToken = ZERO_ADDRESS, amountIn, minOut = 0n, deadlineSeconds = 1800 }) {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds);
  const isNativeQuoted = quoteToken.toLowerCase() === ZERO_ADDRESS.toLowerCase();

  if (!isNativeQuoted) {
    await ensureAllowance({ account, token: quoteToken, spender: DUCK_INCUBATION, amount: amountIn });
  }

  return simulateAndSend({
    address: DUCK_INCUBATION, abi: DUCK_INCUBATION_ABI, functionName: "buy",
    args: [token, isNativeQuoted ? 0n : amountIn, minOut, deadline],
    value: isNativeQuoted ? amountIn : 0n,
    account,
  });
}

// Lets a buyer who only holds native ETH still buy into an ERC20-quoted
// curve token -- the incoming value is atomically routed into the quote
// asset first (see DuckIncubation.buyWithNative / setRoutes), then bought.
// Only works for quote tokens with a real configured route (USDC/USDT0 by
// default -- the only two with real Ink liquidity today).
export async function buyCurveWithNative({ account, token, amountInWei, minQuoteOut = 0n, minOut = 0n, deadlineSeconds = 1800 }) {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds);
  return simulateAndSend({
    address: DUCK_INCUBATION, abi: DUCK_INCUBATION_ABI, functionName: "buyWithNative",
    args: [token, minQuoteOut, minOut, deadline], value: amountInWei, account,
  });
}

export async function sellCurve({ account, token, amountIn, minQuoteOut = 0n, deadlineSeconds = 1800 }) {
  await ensureAllowance({ account, token, spender: DUCK_INCUBATION, amount: amountIn });
  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds);
  return simulateAndSend({
    address: DUCK_INCUBATION, abi: DUCK_INCUBATION_ABI, functionName: "sell",
    args: [token, amountIn, minQuoteOut, deadline], account,
  });
}

export async function claimCurveFee({ account, token }) {
  return simulateAndSend({ address: DUCK_INCUBATION, abi: DUCK_INCUBATION_ABI, functionName: "claimCurveFee", args: [token], account });
}

export async function getCurveTokenConfig(token) {
  return publicClient.readContract({ address: DUCK_INCUBATION, abi: DUCK_INCUBATION_ABI, functionName: "getToken", args: [token] });
}

export async function isQuoteTokenAllowed(token) {
  return publicClient.readContract({ address: DUCK_INCUBATION, abi: DUCK_INCUBATION_ABI, functionName: "quoteTokenAllowed", args: [token] });
}

// ---------- DuckLauncher (instant DEX-launch family) ----------

export async function getLaunchFee() {
  return publicClient.readContract({ address: DUCK_LAUNCHER, abi: DUCK_LAUNCHER_ABI, functionName: "launchFee" });
}

// launchMarketCap: creator-chosen virtual FDV, in the quote token's own raw
// units (e.g. wei for native, 6-decimal units for USDC).
// quoteAmountWei: an optional same-tx instant buy -- native ETH, routed into
// the quote asset first if it isn't native itself (same buyWithNative-style
// routing as the curve; only works for USDC/USDT0 by default).
export async function launchInstant({
  account, name, symbol, metaURI, quoteToken = ZERO_ADDRESS, launchMarketCap,
  minQuoteOut = 0n, minTokensOut = 0n, hookFeeBps = 0n, revertOnInstantBuyFailure = false, quoteAmountWei = 0n,
  dryRun = false,
}) {
  const { userSalt } = mineVanitySalt({ deployer: DUCK_LAUNCHER, impl: DUCK_LAUNCHER_TOKEN_IMPL, caller: account });
  const fee = await getLaunchFee();
  const { hash, result } = await simulateAndSendWithResult({
    address: DUCK_LAUNCHER,
    abi: DUCK_LAUNCHER_ABI,
    functionName: "launch",
    args: [{
      name, symbol, metaURI: metaURI || "", feeWallet: account, positionManager: V4_POSITION_MANAGER,
      quoteToken, vanitySalt: userSalt, launchMarketCap, minQuoteOut, minTokensOut, hookFeeBps, revertOnInstantBuyFailure,
    }],
    value: fee + quoteAmountWei,
    account,
    dryRun,
  });
  return { hash, tokenAddress: result?.[0] };
}

export async function isLauncherQuoteTokenAllowed(token) {
  return publicClient.readContract({ address: DUCK_LAUNCHER, abi: DUCK_LAUNCHER_ABI, functionName: "quoteTokens", args: [token] });
}

// ---------- DuckRaise (crowdfund-campaign family) ----------

export async function getCampaignFee() {
  return publicClient.readContract({ address: DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "campaignFee" });
}

// Global, owner-configured -- not a per-campaign creator choice, so the
// create form shows these read-only rather than as editable inputs.
export async function getRaiseDefaults() {
  const [duration, contributorBps, lpBps, campaignFee] = await Promise.all([
    publicClient.readContract({ address: DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "campaignDuration" }),
    publicClient.readContract({ address: DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "contributorBps" }),
    publicClient.readContract({ address: DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "lpBps" }),
    publicClient.readContract({ address: DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "campaignFee" }),
  ]);
  return { duration, contributorBps, lpBps, campaignFee };
}

// goalNativeWei: creator-specified soft floor, in native wei -- contribute()
// is always native-only regardless of dexQuoteAsset (that only determines
// what the raised ETH gets swapped into when seeding the pool at finalize).
export async function createCampaign({ account, name, symbol, metaURI, dexQuoteAsset = ZERO_ADDRESS, goalNativeWei, startTimeSeconds, hookFeeBps = 0n, dryRun = false }) {
  const { userSalt } = mineVanitySalt({ deployer: DUCK_RAISE, impl: DUCK_RAISE_TOKEN_IMPL, caller: account });
  const fee = await getCampaignFee();
  const startTime = BigInt(startTimeSeconds ?? Math.floor(Date.now() / 1000));
  const { hash, result } = await simulateAndSendWithResult({
    address: DUCK_RAISE,
    abi: DUCK_RAISE_ABI,
    functionName: "launch",
    args: [name, symbol, metaURI || "", dexQuoteAsset, goalNativeWei, startTime, userSalt, hookFeeBps],
    value: fee,
    account,
    dryRun,
  });
  return { hash, campaignId: result?.[0], tokenAddress: result?.[1] };
}

export async function contributeCampaign({ account, campaignId, amountWei }) {
  return simulateAndSend({
    address: DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "contribute", args: [campaignId], value: amountWei, account,
  });
}

export async function claimCampaign({ account, campaignId }) {
  return simulateAndSend({ address: DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "claim", args: [campaignId], account });
}

export async function claimCampaignRefund({ account, campaignId }) {
  return simulateAndSend({ address: DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "claimRefund", args: [campaignId], account });
}

export async function finalizeCampaign({ account, campaignId }) {
  return simulateAndSend({ address: DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "finalize", args: [campaignId], account });
}

export async function getCampaign(campaignId) {
  return publicClient.readContract({ address: DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "campaigns", args: [campaignId] });
}

export async function isRaiseQuoteAssetAllowed(token) {
  return publicClient.readContract({ address: DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "quoteAssetAllowed", args: [token] });
}

// ---------- DuckLocker (shared LP-fee claiming, all three families) ----------

export async function claimFees({ account, token }) {
  return simulateAndSend({ address: DUCK_LOCKER, abi: DUCK_LOCKER_ABI, functionName: "claimFees", args: [token], account });
}

export async function claimAllFees({ account }) {
  return simulateAndSend({ address: DUCK_LOCKER, abi: DUCK_LOCKER_ABI, functionName: "claimAllFees", args: [], account });
}

export async function getPosition(token) {
  return publicClient.readContract({ address: DUCK_LOCKER, abi: DUCK_LOCKER_ABI, functionName: "positions", args: [token] });
}

export async function getPositionCreator(token) {
  return publicClient.readContract({ address: DUCK_LOCKER, abi: DUCK_LOCKER_ABI, functionName: "creatorOf", args: [token] });
}

// ---------- DuckHookV4 (shared sell-fee skim + CTO, all three families) ----------
//
// `hook` defaults to the original DuckHookV4 for back-compat, but every real
// caller should pass the pool's OWN hook address (coin.hook, indexed by the
// subgraph per-token) -- a pool's hook is fixed forever at creation, and
// once a second hook exists, a token registered against it would silently
// no-op (or revert) against the wrong hook contract otherwise.

export async function getPool(poolId, hook = DUCK_HOOK) {
  return publicClient.readContract({ address: hook, abi: DUCK_HOOK_ABI, functionName: "pools", args: [poolId] });
}

export async function getCtoFee(hook = DUCK_HOOK) {
  return publicClient.readContract({ address: hook, abi: DUCK_HOOK_ABI, functionName: "ctoFee" });
}

export async function getHookAccruedFees(poolId, hook = DUCK_HOOK) {
  return publicClient.readContract({ address: hook, abi: DUCK_HOOK_ABI, functionName: "accruedFees", args: [poolId] });
}

export async function getCtoApplication(poolId, hook = DUCK_HOOK) {
  return publicClient.readContract({ address: hook, abi: DUCK_HOOK_ABI, functionName: "ctoApplications", args: [poolId] });
}

export async function applyForCTO({ account, poolId, newCreator, hook = DUCK_HOOK }) {
  const fee = await getCtoFee(hook);
  return simulateAndSend({
    address: hook, abi: DUCK_HOOK_ABI, functionName: "applyForCTO", args: [poolId, newCreator], value: fee, account,
  });
}

export async function approveCTO({ account, poolId, hook = DUCK_HOOK }) {
  return simulateAndSend({ address: hook, abi: DUCK_HOOK_ABI, functionName: "approveCTO", args: [poolId], account });
}

export async function rejectCTO({ account, poolId, hook = DUCK_HOOK }) {
  return simulateAndSend({ address: hook, abi: DUCK_HOOK_ABI, functionName: "rejectCTO", args: [poolId], account });
}

export async function claimHookFees({ account, poolId, hook = DUCK_HOOK }) {
  return simulateAndSend({ address: hook, abi: DUCK_HOOK_ABI, functionName: "claimFees", args: [poolId], account });
}

// splits: [{ wallet, bps }, ...] -- bps must sum to 10000 (or be empty to
// reset to "creator receives it all directly").
export async function setHookFeeSplits({ account, poolId, splits, hook = DUCK_HOOK }) {
  return simulateAndSend({ address: hook, abi: DUCK_HOOK_ABI, functionName: "setFeeSplits", args: [poolId, splits], account });
}

export async function getHookFeeSplits(poolId, hook = DUCK_HOOK) {
  return publicClient.readContract({ address: hook, abi: DUCK_HOOK_ABI, functionName: "getFeeSplits", args: [poolId] });
}

// ---------- ERC20 (approve/allowance/balance for any launched or quote token) ----------

export async function ensureAllowance({ account, token, spender, amount }) {
  const allowance = await publicClient.readContract({
    address: token, abi: ERC20_ABI, functionName: "allowance", args: [account, spender],
  });
  if (allowance < amount) {
    await approveToken({ account, token, spender, amount });
  }
}

export async function approveToken({ account, token, spender, amount }) {
  return simulateAndSend({ address: token, abi: ERC20_ABI, functionName: "approve", args: [spender, amount], account });
}

export async function getTokenBalance(token, account) {
  return publicClient.readContract({ address: token, abi: ERC20_ABI, functionName: "balanceOf", args: [account] });
}

export async function getNativeBalance(account) {
  return publicClient.getBalance({ address: account });
}
