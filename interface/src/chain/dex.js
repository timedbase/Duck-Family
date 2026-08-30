import { encodeAbiParameters, encodePacked, maxUint160 } from "viem";
import { publicClient } from "./client.js";
import { simulateAndSend } from "./tx.js";
import { ERC20_ABI, PERMIT2_ABI, UNIVERSAL_ROUTER_ABI, V4_QUOTER_ABI } from "./abis.js";
import { UNIVERSAL_ROUTER, PERMIT2, V4_QUOTER, V4_FEE_TIER, V4_TICK_SPACING, ZERO_ADDRESS } from "./addresses.js";

// Trading on a token's REAL, live Uniswap V4 pool -- applies once a CURVE
// token has migrated, or always for INSTANT tokens. Verified directly
// against Ink's real deployed UniversalRouter source (Commands.sol,
// Actions.sol, IV4Router.sol, PathKey.sol, BaseActionsRouter.sol,
// V4Router.sol, DeltaResolver.sol, CalldataDecoder.sol) before writing a
// single line here -- real funds move through this, no guessed encoding.
//
// Our own pools are always token<->quoteAsset directly (single-hop). A
// buyer/seller who only holds native ETH but the pool's quote asset is an
// ERC20 needs a second hop first -- ETH<->quoteAsset on a REAL external
// pool. Only USDC and USDT0 have one on Ink today (verified on-chain: the
// real liquidity sits in the native-ETH-paired, hookless V4 pool at
// fee=3000/tickSpacing=60 -- the exact same route DuckIncubation/
// DuckLauncher/DuckRaise's own contracts seed for buyWithNative). Any other
// ERC20 quote asset has no known route -- there is genuinely nowhere to
// swap ETH into it on Ink right now, so this throws a clear error rather
// than a router revert with no explanation.

const V4_SWAP_COMMAND = "0x10"; // Commands.V4_SWAP
const ACTION_SWAP_EXACT_IN_SINGLE = 0x06;
const ACTION_SWAP_EXACT_IN = 0x07;
const ACTION_SETTLE_ALL = 0x0c;
const ACTION_TAKE_ALL = 0x0f;

// Same external venue DuckIncubationMigration.seedDefaultRoutes wires up on
// the contract side -- see contracts/common/DuckIncubationMigration.sol.
const EXTERNAL_ETH_ROUTE_FEE = 3000;
const EXTERNAL_ETH_ROUTE_TICK_SPACING = 60;
const EXTERNAL_ETH_ROUTE_HOOK = ZERO_ADDRESS;
const LIQUID_QUOTE_SYMBOLS_LOWER = new Set(["usdc", "usd₮0"]);

function isNative(currency) {
  return currency.toLowerCase() === ZERO_ADDRESS.toLowerCase();
}

// null if there's no known external liquidity to route ETH into this quote
// asset -- callers must fall back to requiring the asset be held directly.
function externalEthRouteFor(quoteAsset, quoteSymbol) {
  if (isNative(quoteAsset)) return null; // no second hop needed at all
  if (!LIQUID_QUOTE_SYMBOLS_LOWER.has((quoteSymbol || "").toLowerCase())) return null;
  return { fee: EXTERNAL_ETH_ROUTE_FEE, tickSpacing: EXTERNAL_ETH_ROUTE_TICK_SPACING, hooks: EXTERNAL_ETH_ROUTE_HOOK };
}

const PATH_KEY_ABI_COMPONENTS = [
  { type: "address", name: "intermediateCurrency" },
  { type: "uint24", name: "fee" },
  { type: "int24", name: "tickSpacing" },
  { type: "address", name: "hooks" },
  { type: "bytes", name: "hookData" },
];

const EXACT_IN_SINGLE_PARAMS_ABI = [
  {
    type: "tuple",
    components: [
      {
        type: "tuple", name: "poolKey", components: [
          { type: "address", name: "currency0" },
          { type: "address", name: "currency1" },
          { type: "uint24", name: "fee" },
          { type: "int24", name: "tickSpacing" },
          { type: "address", name: "hooks" },
        ],
      },
      { type: "bool", name: "zeroForOne" },
      { type: "uint128", name: "amountIn" },
      { type: "uint128", name: "amountOutMinimum" },
      { type: "bytes", name: "hookData" },
    ],
  },
];

const EXACT_IN_PARAMS_ABI = [
  {
    type: "tuple",
    components: [
      { type: "address", name: "currencyIn" },
      { type: "tuple[]", name: "path", components: PATH_KEY_ABI_COMPONENTS },
      { type: "uint128", name: "amountIn" },
      { type: "uint128", name: "amountOutMinimum" },
    ],
  },
];

function buildPoolKey(currencyA, currencyB, hook) {
  const [currency0, currency1] = BigInt(currencyA) < BigInt(currencyB) ? [currencyA, currencyB] : [currencyB, currencyA];
  return { currency0, currency1, fee: V4_FEE_TIER, tickSpacing: V4_TICK_SPACING, hooks: hook };
}

function actionsAndTail(...actions) {
  return encodePacked(actions.map(() => "uint8"), actions);
}

// hops: [{ intermediateCurrency, fee, tickSpacing, hooks }, ...] -- the
// currency arrived at after each hop, starting from `currencyIn`.
function buildSwapInput({ currencyIn, currencyOut, amountIn, minOut, singleHop }) {
  const settleParams = encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [currencyIn, amountIn]);
  const takeParams = encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [currencyOut, minOut]);

  if (singleHop) {
    const { poolKey, zeroForOne } = singleHop;
    const actions = actionsAndTail(ACTION_SWAP_EXACT_IN_SINGLE, ACTION_SETTLE_ALL, ACTION_TAKE_ALL);
    const swapParams = encodeAbiParameters(EXACT_IN_SINGLE_PARAMS_ABI, [
      { poolKey, zeroForOne, amountIn, amountOutMinimum: minOut, hookData: "0x" },
    ]);
    return encodeAbiParameters([{ type: "bytes" }, { type: "bytes[]" }], [actions, [swapParams, settleParams, takeParams]]);
  }

  return null; // multi-hop built by buildMultiHopSwapInput below
}

function buildMultiHopSwapInput({ currencyIn, path, amountIn, minOut }) {
  const currencyOut = path[path.length - 1].intermediateCurrency;
  const actions = actionsAndTail(ACTION_SWAP_EXACT_IN, ACTION_SETTLE_ALL, ACTION_TAKE_ALL);
  const swapParams = encodeAbiParameters(EXACT_IN_PARAMS_ABI, [
    { currencyIn, path: path.map((p) => ({ ...p, hookData: "0x" })), amountIn, amountOutMinimum: minOut },
  ]);
  const settleParams = encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [currencyIn, amountIn]);
  const takeParams = encodeAbiParameters([{ type: "address" }, { type: "uint256" }], [currencyOut, minOut]);
  return encodeAbiParameters([{ type: "bytes" }, { type: "bytes[]" }], [actions, [swapParams, settleParams, takeParams]]);
}

async function ensurePermit2Allowance({ account, token, amount }) {
  const erc20Allowance = await publicClient.readContract({
    address: token, abi: ERC20_ABI, functionName: "allowance", args: [account, PERMIT2],
  });
  if (erc20Allowance < amount) {
    await simulateAndSend({ address: token, abi: ERC20_ABI, functionName: "approve", args: [PERMIT2, maxUint160], account });
  }

  const [permit2Amount, expiration] = await publicClient.readContract({
    address: PERMIT2, abi: PERMIT2_ABI, functionName: "allowance", args: [account, token, UNIVERSAL_ROUTER],
  });
  const expired = expiration !== 0 && BigInt(expiration) < BigInt(Math.floor(Date.now() / 1000));
  if (permit2Amount < amount || expired) {
    const oneYear = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;
    await simulateAndSend({
      address: PERMIT2, abi: PERMIT2_ABI, functionName: "approve",
      args: [token, UNIVERSAL_ROUTER, maxUint160, oneYear], account,
    });
  }
}

async function executeRouterSwap({ account, input, valueIn }) {
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800);
  return simulateAndSend({
    address: UNIVERSAL_ROUTER, abi: UNIVERSAL_ROUTER_ABI, functionName: "execute",
    args: [V4_SWAP_COMMAND, [input], deadline],
    value: valueIn,
    account,
  });
}

// Buys `token` on its live V4 pool, paid in native ETH. If the pool's quote
// asset isn't native, routes ETH -> quoteAsset -> token in one call when a
// real external ETH<->quoteAsset venue is known (USDC/USDT0 today);
// otherwise throws, since there is nowhere to source the quote asset from.
export async function buyOnPoolWithNative({ account, token, hook, quoteAsset, quoteSymbol, amountInWei, minOut = 0n }) {
  if (isNative(quoteAsset)) {
    const poolKey = buildPoolKey(token, ZERO_ADDRESS, hook);
    const zeroForOne = true; // address(0) is always numerically smallest
    const input = buildSwapInput({
      currencyIn: ZERO_ADDRESS, currencyOut: token, amountIn: amountInWei, minOut,
      singleHop: { poolKey, zeroForOne },
    });
    return executeRouterSwap({ account, input, valueIn: amountInWei });
  }

  const route = externalEthRouteFor(quoteAsset, quoteSymbol);
  if (!route) {
    throw new Error(`No ETH route available for this token's quote asset (${quoteSymbol || quoteAsset}) -- you'd need to already hold it to trade this pool.`);
  }
  const path = [
    { intermediateCurrency: quoteAsset, fee: route.fee, tickSpacing: route.tickSpacing, hooks: route.hooks },
    { intermediateCurrency: token, fee: V4_FEE_TIER, tickSpacing: V4_TICK_SPACING, hooks: hook },
  ];
  const input = buildMultiHopSwapInput({ currencyIn: ZERO_ADDRESS, path, amountIn: amountInWei, minOut });
  return executeRouterSwap({ account, input, valueIn: amountInWei });
}

// Sells `token` on its live V4 pool, proceeds landing as native ETH. Same
// routing logic as buyOnPoolWithNative, reversed.
export async function sellOnPoolForNative({ account, token, hook, quoteAsset, quoteSymbol, amountIn, minOut = 0n }) {
  await ensurePermit2Allowance({ account, token, amount: amountIn });

  if (isNative(quoteAsset)) {
    const poolKey = buildPoolKey(token, ZERO_ADDRESS, hook);
    const zeroForOne = false; // token is never address(0), so token is always currency1 here
    const input = buildSwapInput({
      currencyIn: token, currencyOut: ZERO_ADDRESS, amountIn, minOut,
      singleHop: { poolKey, zeroForOne },
    });
    return executeRouterSwap({ account, input, valueIn: 0n });
  }

  const route = externalEthRouteFor(quoteAsset, quoteSymbol);
  if (!route) {
    throw new Error(`No ETH route available for this token's quote asset (${quoteSymbol || quoteAsset}) -- proceeds would need to stay in that asset.`);
  }
  const path = [
    { intermediateCurrency: quoteAsset, fee: V4_FEE_TIER, tickSpacing: V4_TICK_SPACING, hooks: hook },
    { intermediateCurrency: ZERO_ADDRESS, fee: route.fee, tickSpacing: route.tickSpacing, hooks: route.hooks },
  ];
  const input = buildMultiHopSwapInput({ currencyIn: token, path, amountIn, minOut });
  return executeRouterSwap({ account, input, valueIn: 0n });
}

// Read-only preview via Ink's real deployed V4Quoter -- technically a
// `nonpayable` function (it reverts internally to capture the simulated
// result, a standard V4 quoter pattern), but safe and correct to call via
// a plain eth_call / readContract since it's never actually broadcast.
async function quoteSingleHop({ tokenIn, tokenOut, hook, amountIn }) {
  const poolKey = buildPoolKey(tokenIn, tokenOut, hook);
  const zeroForOne = BigInt(tokenIn) < BigInt(tokenOut);
  const [amountOut] = await publicClient.readContract({
    address: V4_QUOTER, abi: V4_QUOTER_ABI, functionName: "quoteExactInputSingle",
    args: [{ poolKey, zeroForOne, exactAmount: amountIn, hookData: "0x" }],
  });
  return amountOut;
}

export async function previewBuyWithNative({ token, hook, quoteAsset, quoteSymbol, amountInWei }) {
  try {
    if (isNative(quoteAsset)) {
      return await quoteSingleHop({ tokenIn: ZERO_ADDRESS, tokenOut: token, hook, amountIn: amountInWei });
    }
    const route = externalEthRouteFor(quoteAsset, quoteSymbol);
    if (!route) return 0n;
    const quoteOut = await quoteSingleHop({ tokenIn: ZERO_ADDRESS, tokenOut: quoteAsset, hook: route.hooks, amountIn: amountInWei });
    return await quoteSingleHop({ tokenIn: quoteAsset, tokenOut: token, hook, amountIn: quoteOut });
  } catch {
    return 0n;
  }
}

export async function previewSellForNative({ token, hook, quoteAsset, quoteSymbol, amountIn }) {
  try {
    if (isNative(quoteAsset)) {
      return await quoteSingleHop({ tokenIn: token, tokenOut: ZERO_ADDRESS, hook, amountIn });
    }
    const route = externalEthRouteFor(quoteAsset, quoteSymbol);
    if (!route) return 0n;
    const quoteOut = await quoteSingleHop({ tokenIn: token, tokenOut: quoteAsset, hook, amountIn });
    return await quoteSingleHop({ tokenIn: quoteAsset, tokenOut: ZERO_ADDRESS, hook: route.hooks, amountIn: quoteOut });
  } catch {
    return 0n;
  }
}

export function hasEthRoute(quoteAsset, quoteSymbol) {
  return isNative(quoteAsset) || externalEthRouteFor(quoteAsset, quoteSymbol) !== null;
}

// Just the ETH -> quoteAsset hop (the same external venue used above), with
// no second hop onto any platform pool -- used to preview/execute buying an
// ERC20-quoted bonding-curve token with native ETH (see
// actions.js's buyCurveWithNative), where the "pool" for the second leg is
// the curve contract itself, not a V4 pool.
export async function previewEthToQuote({ quoteAsset, quoteSymbol, amountInWei }) {
  if (isNative(quoteAsset)) return amountInWei;
  const route = externalEthRouteFor(quoteAsset, quoteSymbol);
  if (!route) return 0n;
  try {
    return await quoteSingleHop({ tokenIn: ZERO_ADDRESS, tokenOut: quoteAsset, hook: route.hooks, amountIn: amountInWei });
  } catch {
    return 0n;
  }
}
