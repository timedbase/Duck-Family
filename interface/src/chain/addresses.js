import { getAddress } from "viem";

// Mirrors ../../../backend/src/chain/addresses.ts and
// the Duck-Family-Contract repo's deploy/deployments/ink.json — same deployment, cross-repo consumers.

export const INK_CHAIN_ID = 57073;
export const PUBLIC_RPC_URL = "https://rpc-gel.inkonchain.com";
export const BLOCK_EXPLORER_URL = "https://explorer.inkonchain.com";

export const DUCK_INCUBATION = getAddress("0xB9f7213262FE429387eAD6EB63e547Ba05E0D935");
export const DUCK_LAUNCHER = getAddress("0x2A84711A5c0Ee62118CEee1A37C0dA46a6980353");
export const DUCK_RAISE = getAddress("0xdEb4D7fe8BEA866B91A2be8ED35D171F8312269b");
export const DUCK_LOCKER = getAddress("0x74738a87e4D4E0eB2706724a9314d1b4452ecdFE");
export const DUCK_HOOK = getAddress("0x067A168DA351d40e086B974F16F94CB0f3dF00c4");
// Standalone, platform-owned metadata-override registry -- see
// contracts/common/DuckMetaOverride.sol. Not used for any on-chain reads
// today (the subgraph indexes its events onto Token.metaOverrideUri
// instead); kept here for parity with the rest of this file and in case a
// direct read is ever needed.
export const DUCK_META_OVERRIDE = getAddress("0x0BC85b468f74959d743551948a5474Ab95Db73B1");

// EIP-1167 clone-template implementations each launcher clones via CREATE2 —
// needed client-side to predict vanity token addresses before submitting.
export const DUCK_INCUBATION_TOKEN_IMPL = getAddress("0xeEe2e78E82d75DF85b691CFAed1C28A0Df7f8A43");
export const DUCK_LAUNCHER_TOKEN_IMPL = getAddress("0x4deba89765cFB2A9aC906828d91602c87100a9EA");
export const DUCK_RAISE_TOKEN_IMPL = getAddress("0x2561AaCAeeD852477eA547831A1e55F20B67f382");

// Verified Ink-chain (57073) infrastructure.
export const WETH = getAddress("0x4200000000000000000000000000000000000006");
export const V4_POOL_MANAGER = getAddress("0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32");
export const V4_POSITION_MANAGER = getAddress("0x1b35d13a2E2528f192637F14B05f0Dc0e7dEB566");
export const V4_STATE_VIEW = getAddress("0x76Fd297e2D437cd7f76d50F01AfE6160f86e9990");
export const V4_QUOTER = getAddress("0x3972c00f7ed4885e145823eb7c655375d275a1c5");
export const UNIVERSAL_ROUTER = getAddress("0x112908dac86e20e7241b0927479ea3bf935d1fa0");
export const PERMIT2 = getAddress("0x000000000022D473030F116dDEE9F6B43aC78BA3");

// Every pool this platform creates uses this same 1% tier / 200 tick
// spacing convention (see DuckIncubation/DuckLauncher/DuckRaise contracts).
export const V4_FEE_TIER = 10000;
export const V4_TICK_SPACING = 200;

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Deliberately narrow: ETH, USDC, and USDT0 are the only quote assets with
// real Ink liquidity (verified on-chain -- see
// contracts/deploy/deployments/ink.json's notes), and the only ones with a
// real buyWithNative/early-buy route wired up. DuckIncubation/DuckLauncher
// used to default-allow 12 more (LINK, tokenized-equity "xStock" assets,
// etc.) with no real liquidity behind them -- disabled on-chain via
// setQuoteTokenAllowed/disableQuoteToken, this list follows suit rather than
// offering a quote asset the create form can't actually route ETH into.
// A platform token, once DuckIncubation/DuckLauncher/DuckRaise's
// `platformToken()` is set to a nonzero address, is fetched live and added
// on top of this list -- see App.jsx's platformToken state.
export const DEFAULT_QUOTE_TOKENS = [
  { address: getAddress("0x2D270e6886d130D724215A266106e6832161EAEd"), symbol: "USDC", decimals: 6 },
  { address: getAddress("0x0200C29006150606B650577BBE7B6248F58470c1"), symbol: "USD₮0", decimals: 6 },
];

// A different, newer set of tokenized-equity "xStock" assets (not the 12
// disabled ones above) -- real, verified liquidity confirmed on-chain
// against a genuine Uniswap V3 factory on Ink (0x640887A9...), but every
// one of them is only paired with USDG there, and USDG itself has no
// liquid path back to ETH/USDC/USDT0 on that factory (checked exhaustively:
// no WETH/USDG pool at any fee tier, no direct USDT0- or USDC-quote pool
// for any of these six, and the USDT0/USDG pools that do exist have zero
// liquidity). wNVDAx is the one exception with its own direct WETH pool
// (fee 10000, real liquidity) -- LaunchRouting.sol already has a
// UNIVERSAL_ROUTER_STYLE route shape ready for it, just not wired via
// setRoutes yet. Until a real Uniswap-only bridge into USDG opens up (or
// more direct WETH pools appear), none of these six get "optional instant
// buy" -- see LIQUID_QUOTE_TOKEN_SYMBOLS below.
export const STOCK_QUOTE_TOKENS = [
  { address: getAddress("0xE7E553Cd128F0011777323A0b44a7b96EA1CB540"), symbol: "wSPYx", decimals: 18 },
  { address: getAddress("0x943BF64D566c32A2Bcd41AC92FB63C111cC9De8f"), symbol: "wAAPLx", decimals: 18 },
  { address: getAddress("0xc3FdBe3A68EE5dE461D30415a8165cf9Aefe1171"), symbol: "wTSLAx", decimals: 18 },
  { address: getAddress("0x7d87fD6A379714194a797c0bBB8B40c30D250856"), symbol: "wNFLXx", decimals: 18 },
  { address: getAddress("0x30987adF0B11dc698438a99BA04ec3a1AB2c7EaB"), symbol: "wMSTRx", decimals: 18 },
  { address: getAddress("0xa8ddb5Cd96b5222AFe198316E9A57CAA642850D5"), symbol: "wNVDAx", decimals: 18 },
];

// Incubation/Launcher can quote in any of the above, liquid or not -- their
// "optional instant buy" is just skipped client-side for the illiquid ones
// (see LIQUID_QUOTE_TOKEN_SYMBOLS). Raise has no such fallback: finalize()
// always swaps the raised ETH into the quote asset to seed the pool, so an
// illiquid quote asset would make the raise permanently unfinalizable.
// Keep this one strictly to assets with a real route.
export const CURVE_LAUNCHER_QUOTE_TOKENS = [...DEFAULT_QUOTE_TOKENS, ...STOCK_QUOTE_TOKENS];
export const RAISE_DEFAULT_QUOTE_ASSETS = DEFAULT_QUOTE_TOKENS;

// USDC/USDT0 are the only quote assets with real Ink liquidity confirmed all
// the way back to native ETH -- the ones buyWithNative/early-buy routing
// actually works against out of the box. Every STOCK_QUOTE_TOKENS entry is
// deliberately excluded (see the comment above), including wNVDAx, until
// its route is actually wired on-chain via setRoutes.
export const LIQUID_QUOTE_TOKEN_SYMBOLS = ["USDC", "USD₮0"];
