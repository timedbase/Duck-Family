import { getPublicClient } from "./client.js";
import { mineVanitySalt } from "./vanity.js";
import { simulateAndSend, simulateAndSendWithResult } from "./tx.js";
import {
  DUCK_INCUBATION_ABI, DUCK_LAUNCHER_ABI, DUCK_RAISE_ABI, DUCK_LOCKER_ABI, DUCK_HOOK_ABI, ERC20_ABI,
} from "./abis.js";
import { ZERO_ADDRESS } from "./addresses.js";

// Every function here takes the resolved CHAINS[slug] config (see
// chain/addresses.js) as its first `chain` param, resolved once by the
// caller from the app's currently-selected chain -- same pattern as
// chain/dex.js and chain/quotes.js.

export async function waitForTx(chain, hash) {
  return getPublicClient(chain).waitForTransactionReceipt({ hash });
}

// Each family's platformToken() is independently owner-settable and starts
// at address(0) (unset). When set, fee-waived trading/creation routes
// through it -- see DuckRaise.launch's feeWaived check for one example.
// Fetched live rather than hardcoded since it can change and has no event
// to index. Returns null per family when unset.
export async function getPlatformTokens(chain) {
  const publicClient = getPublicClient(chain);
  const [incubation, launcher, raise] = await publicClient.multicall({
    contracts: [
      { address: chain.DUCK_INCUBATION, abi: DUCK_INCUBATION_ABI, functionName: "platformToken" },
      { address: chain.DUCK_LAUNCHER, abi: DUCK_LAUNCHER_ABI, functionName: "platformToken" },
      { address: chain.DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "platformToken" },
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

export async function getCurveCreationFee(chain) {
  return getPublicClient(chain).readContract({ address: chain.DUCK_INCUBATION, abi: DUCK_INCUBATION_ABI, functionName: "creationFee" });
}

// quoteToken = ZERO_ADDRESS for native currency, or one of the whitelisted
// ERC20s. buyAmountWei: only meaningful for a native-quoted token -- any
// value sent above the creation fee is swept into an immediate buy in the
// same transaction (see DuckIncubation._collectCreationFee/createToken), no
// separate call needed and no sandwich risk since the curve doesn't exist
// until this same tx creates it.
// earlyBuyAmount: for an ERC20-quoted token instead -- the amount to
// early-buy with, pulled via transferFrom in the same call. Requires the
// token already approved to chain.DUCK_INCUBATION for at least this amount.
export async function createCurveToken(chain, {
  account, name, symbol, totalSupply, curveBps, liquidityBps, quoteToken = ZERO_ADDRESS,
  startVirtualQuote, migrationTargetQuote, hookFeeBps = 0n, enableAntibot = false, antibotBlocks = 0n,
  metaURI, buyAmountWei = 0n, earlyBuyAmount = 0n, dryRun = false,
}) {
  const { userSalt } = mineVanitySalt({ deployer: chain.DUCK_INCUBATION, impl: chain.DUCK_INCUBATION_TOKEN_IMPL, caller: account });
  const fee = await getCurveCreationFee(chain);
  const isNativeQuoted = quoteToken.toLowerCase() === ZERO_ADDRESS.toLowerCase();

  // A dry run must never send a real transaction -- including the ERC20
  // approve() an early buy would otherwise need. simulateContract below
  // still proves the createToken call itself would succeed either way.
  if (!dryRun && !isNativeQuoted && earlyBuyAmount > 0n) {
    await approveToken(chain, { account, token: quoteToken, spender: chain.DUCK_INCUBATION, amount: earlyBuyAmount });
  }

  const { hash, result: tokenAddress } = await simulateAndSendWithResult(chain, {
    address: chain.DUCK_INCUBATION,
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

export async function buyCurve(chain, { account, token, quoteToken = ZERO_ADDRESS, amountIn, minOut = 0n, deadlineSeconds = 1800 }) {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds);
  const isNativeQuoted = quoteToken.toLowerCase() === ZERO_ADDRESS.toLowerCase();

  if (!isNativeQuoted) {
    await ensureAllowance(chain, { account, token: quoteToken, spender: chain.DUCK_INCUBATION, amount: amountIn });
  }

  return simulateAndSend(chain, {
    address: chain.DUCK_INCUBATION, abi: DUCK_INCUBATION_ABI, functionName: "buy",
    args: [token, isNativeQuoted ? 0n : amountIn, minOut, deadline],
    value: isNativeQuoted ? amountIn : 0n,
    account,
  });
}

// Lets a buyer who only holds native currency still buy into an
// ERC20-quoted curve token -- the incoming value is atomically routed into
// the quote asset first (see DuckIncubation.buyWithNative / setRoutes), then
// bought. Only works for quote tokens with a real configured route
// (Ink's USDC/USDT0 by default -- the only two with real Ink liquidity
// today; Arc has none seeded yet).
export async function buyCurveWithNative(chain, { account, token, amountInWei, minQuoteOut = 0n, minOut = 0n, deadlineSeconds = 1800 }) {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds);
  return simulateAndSend(chain, {
    address: chain.DUCK_INCUBATION, abi: DUCK_INCUBATION_ABI, functionName: "buyWithNative",
    args: [token, minQuoteOut, minOut, deadline], value: amountInWei, account,
  });
}

export async function sellCurve(chain, { account, token, amountIn, minQuoteOut = 0n, deadlineSeconds = 1800 }) {
  await ensureAllowance(chain, { account, token, spender: chain.DUCK_INCUBATION, amount: amountIn });
  const deadline = BigInt(Math.floor(Date.now() / 1000) + deadlineSeconds);
  return simulateAndSend(chain, {
    address: chain.DUCK_INCUBATION, abi: DUCK_INCUBATION_ABI, functionName: "sell",
    args: [token, amountIn, minQuoteOut, deadline], account,
  });
}

export async function claimCurveFee(chain, { account, token }) {
  return simulateAndSend(chain, { address: chain.DUCK_INCUBATION, abi: DUCK_INCUBATION_ABI, functionName: "claimCurveFee", args: [token], account });
}

export async function getCurveTokenConfig(chain, token) {
  return getPublicClient(chain).readContract({ address: chain.DUCK_INCUBATION, abi: DUCK_INCUBATION_ABI, functionName: "getToken", args: [token] });
}

export async function isQuoteTokenAllowed(chain, token) {
  return getPublicClient(chain).readContract({ address: chain.DUCK_INCUBATION, abi: DUCK_INCUBATION_ABI, functionName: "quoteTokenAllowed", args: [token] });
}

// ---------- DuckLauncher (instant DEX-launch family) ----------

export async function getLaunchFee(chain) {
  return getPublicClient(chain).readContract({ address: chain.DUCK_LAUNCHER, abi: DUCK_LAUNCHER_ABI, functionName: "launchFee" });
}

// launchMarketCap: creator-chosen virtual FDV, in the quote token's own raw
// units (e.g. wei for native, 6-decimal units for USDC).
// quoteAmountWei: an optional same-tx instant buy -- native currency, routed
// into the quote asset first if it isn't native itself (same
// buyWithNative-style routing as the curve; only works for Ink's USDC/USDT0
// by default).
// dex: "v4" (default) or "v3" -- DuckLauncherArc-only (registered via
// addDexV3; chain.V3_POSITION_MANAGER is null everywhere else). The
// contract dispatches V4-vs-V3 setup purely off which positionManager was
// passed (it's the key into the launcher's own dexes mapping, which already
// knows isV3 from how that entry was registered) -- no other param differs.
// Callers must enforce V3's two hard constraints themselves before calling:
// quoteToken can't be native (NativeNotSupportedOnV3) and hookFeeBps must be
// 0 (HookFeeNotSupportedOnV3) -- see CreateFormPage's dex selector.
export async function launchInstant(chain, {
  account, name, symbol, metaURI, quoteToken = ZERO_ADDRESS, launchMarketCap,
  minQuoteOut = 0n, minTokensOut = 0n, hookFeeBps = 0n, revertOnInstantBuyFailure = false, quoteAmountWei = 0n,
  dex = "v4", dryRun = false,
}) {
  const positionManager = dex === "v3" ? chain.V3_POSITION_MANAGER : chain.V4_POSITION_MANAGER;
  if (!positionManager) throw new Error(`${dex.toUpperCase()} launch isn't available on ${chain.name}.`);
  const { userSalt } = mineVanitySalt({ deployer: chain.DUCK_LAUNCHER, impl: chain.DUCK_LAUNCHER_TOKEN_IMPL, caller: account });
  const fee = await getLaunchFee(chain);
  const { hash, result } = await simulateAndSendWithResult(chain, {
    address: chain.DUCK_LAUNCHER,
    abi: DUCK_LAUNCHER_ABI,
    functionName: "launch",
    args: [{
      name, symbol, metaURI: metaURI || "", feeWallet: account, positionManager,
      quoteToken, vanitySalt: userSalt, launchMarketCap, minQuoteOut, minTokensOut, hookFeeBps, revertOnInstantBuyFailure,
    }],
    value: fee + quoteAmountWei,
    account,
    dryRun,
  });
  return { hash, tokenAddress: result?.[0] };
}

export async function isLauncherQuoteTokenAllowed(chain, token) {
  return getPublicClient(chain).readContract({ address: chain.DUCK_LAUNCHER, abi: DUCK_LAUNCHER_ABI, functionName: "quoteTokens", args: [token] });
}

// ---------- DuckRaise (crowdfund-campaign family) ----------

export async function getCampaignFee(chain) {
  return getPublicClient(chain).readContract({ address: chain.DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "campaignFee" });
}

// Global, owner-configured -- not a per-campaign creator choice, so the
// create form shows these read-only rather than as editable inputs.
export async function getRaiseDefaults(chain) {
  const publicClient = getPublicClient(chain);
  const [duration, contributorBps, lpBps, campaignFee] = await Promise.all([
    publicClient.readContract({ address: chain.DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "campaignDuration" }),
    publicClient.readContract({ address: chain.DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "contributorBps" }),
    publicClient.readContract({ address: chain.DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "lpBps" }),
    publicClient.readContract({ address: chain.DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "campaignFee" }),
  ]);
  return { duration, contributorBps, lpBps, campaignFee };
}

// goalNativeWei: creator-specified soft floor, in native wei -- contribute()
// is always native-only regardless of dexQuoteAsset (that only determines
// what the raised native currency gets swapped into when seeding the pool
// at finalize).
export async function createCampaign(chain, { account, name, symbol, metaURI, dexQuoteAsset = ZERO_ADDRESS, goalNativeWei, startTimeSeconds, hookFeeBps = 0n, dryRun = false }) {
  const { userSalt } = mineVanitySalt({ deployer: chain.DUCK_RAISE, impl: chain.DUCK_RAISE_TOKEN_IMPL, caller: account });
  const fee = await getCampaignFee(chain);
  const startTime = BigInt(startTimeSeconds ?? Math.floor(Date.now() / 1000));
  const { hash, result } = await simulateAndSendWithResult(chain, {
    address: chain.DUCK_RAISE,
    abi: DUCK_RAISE_ABI,
    functionName: "launch",
    args: [name, symbol, metaURI || "", dexQuoteAsset, goalNativeWei, startTime, userSalt, hookFeeBps],
    value: fee,
    account,
    dryRun,
  });
  return { hash, campaignId: result?.[0], tokenAddress: result?.[1] };
}

export async function contributeCampaign(chain, { account, campaignId, amountWei }) {
  return simulateAndSend(chain, {
    address: chain.DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "contribute", args: [campaignId], value: amountWei, account,
  });
}

export async function claimCampaign(chain, { account, campaignId }) {
  return simulateAndSend(chain, { address: chain.DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "claim", args: [campaignId], account });
}

export async function claimCampaignRefund(chain, { account, campaignId }) {
  return simulateAndSend(chain, { address: chain.DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "claimRefund", args: [campaignId], account });
}

export async function finalizeCampaign(chain, { account, campaignId }) {
  return simulateAndSend(chain, { address: chain.DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "finalize", args: [campaignId], account });
}

export async function getCampaign(chain, campaignId) {
  return getPublicClient(chain).readContract({ address: chain.DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "campaigns", args: [campaignId] });
}

export async function isRaiseQuoteAssetAllowed(chain, token) {
  return getPublicClient(chain).readContract({ address: chain.DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "quoteAssetAllowed", args: [token] });
}

// ---------- DuckLocker (shared LP-fee claiming, all three families) ----------

export async function claimFees(chain, { account, token }) {
  return simulateAndSend(chain, { address: chain.DUCK_LOCKER, abi: DUCK_LOCKER_ABI, functionName: "claimFees", args: [token], account });
}

export async function claimAllFees(chain, { account }) {
  return simulateAndSend(chain, { address: chain.DUCK_LOCKER, abi: DUCK_LOCKER_ABI, functionName: "claimAllFees", args: [], account });
}

export async function getPosition(chain, token) {
  return getPublicClient(chain).readContract({ address: chain.DUCK_LOCKER, abi: DUCK_LOCKER_ABI, functionName: "positions", args: [token] });
}

export async function getPositionCreator(chain, token) {
  return getPublicClient(chain).readContract({ address: chain.DUCK_LOCKER, abi: DUCK_LOCKER_ABI, functionName: "creatorOf", args: [token] });
}

// ---------- DuckHookV4 (shared sell-fee skim + CTO, all three families) ----------
//
// `hook` defaults to the chain's own original DuckHookV4 for back-compat,
// but every real caller should pass the pool's OWN hook address (coin.hook,
// indexed by the subgraph per-token) -- a pool's hook is fixed forever at
// creation, and once a second hook exists on that chain, a token registered
// against it would silently no-op (or revert) against the wrong hook
// contract otherwise.

export async function getPool(chain, poolId, hook = chain.DUCK_HOOK) {
  return getPublicClient(chain).readContract({ address: hook, abi: DUCK_HOOK_ABI, functionName: "pools", args: [poolId] });
}

export async function getCtoFee(chain, hook = chain.DUCK_HOOK) {
  return getPublicClient(chain).readContract({ address: hook, abi: DUCK_HOOK_ABI, functionName: "ctoFee" });
}

export async function getHookAccruedFees(chain, poolId, hook = chain.DUCK_HOOK) {
  return getPublicClient(chain).readContract({ address: hook, abi: DUCK_HOOK_ABI, functionName: "accruedFees", args: [poolId] });
}

export async function getCtoApplication(chain, poolId, hook = chain.DUCK_HOOK) {
  return getPublicClient(chain).readContract({ address: hook, abi: DUCK_HOOK_ABI, functionName: "ctoApplications", args: [poolId] });
}

export async function applyForCTO(chain, { account, poolId, newCreator, hook = chain.DUCK_HOOK }) {
  const fee = await getCtoFee(chain, hook);
  return simulateAndSend(chain, {
    address: hook, abi: DUCK_HOOK_ABI, functionName: "applyForCTO", args: [poolId, newCreator], value: fee, account,
  });
}

export async function approveCTO(chain, { account, poolId, hook = chain.DUCK_HOOK }) {
  return simulateAndSend(chain, { address: hook, abi: DUCK_HOOK_ABI, functionName: "approveCTO", args: [poolId], account });
}

export async function rejectCTO(chain, { account, poolId, hook = chain.DUCK_HOOK }) {
  return simulateAndSend(chain, { address: hook, abi: DUCK_HOOK_ABI, functionName: "rejectCTO", args: [poolId], account });
}

export async function claimHookFees(chain, { account, poolId, hook = chain.DUCK_HOOK }) {
  return simulateAndSend(chain, { address: hook, abi: DUCK_HOOK_ABI, functionName: "claimFees", args: [poolId], account });
}

// splits: [{ wallet, bps }, ...] -- bps must sum to 10000 (or be empty to
// reset to "creator receives it all directly").
export async function setHookFeeSplits(chain, { account, poolId, splits, hook = chain.DUCK_HOOK }) {
  return simulateAndSend(chain, { address: hook, abi: DUCK_HOOK_ABI, functionName: "setFeeSplits", args: [poolId, splits], account });
}

export async function getHookFeeSplits(chain, poolId, hook = chain.DUCK_HOOK) {
  return getPublicClient(chain).readContract({ address: hook, abi: DUCK_HOOK_ABI, functionName: "getFeeSplits", args: [poolId] });
}

// ---------- ERC20 (approve/allowance/balance for any launched or quote token) ----------

export async function ensureAllowance(chain, { account, token, spender, amount }) {
  const allowance = await getPublicClient(chain).readContract({
    address: token, abi: ERC20_ABI, functionName: "allowance", args: [account, spender],
  });
  if (allowance < amount) {
    await approveToken(chain, { account, token, spender, amount });
  }
}

export async function approveToken(chain, { account, token, spender, amount }) {
  return simulateAndSend(chain, { address: token, abi: ERC20_ABI, functionName: "approve", args: [spender, amount], account });
}

export async function getTokenBalance(chain, token, account) {
  return getPublicClient(chain).readContract({ address: token, abi: ERC20_ABI, functionName: "balanceOf", args: [account] });
}

export async function getNativeBalance(chain, account) {
  return getPublicClient(chain).getBalance({ address: account });
}
