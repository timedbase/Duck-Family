import { getAddress } from "viem";

// Kept in lockstep with the Duck-Family-Contract repo's deploy/deployments/ink.json --
// same deployment, referenced from both.

export const INK_CHAIN_ID = 57073;

export const DUCK_INCUBATION = getAddress("0xB9f7213262FE429387eAD6EB63e547Ba05E0D935");
export const DUCK_LAUNCHER = getAddress("0x2A84711A5c0Ee62118CEee1A37C0dA46a6980353");
export const DUCK_RAISE = getAddress("0xdEb4D7fe8BEA866B91A2be8ED35D171F8312269b");
export const DUCK_LOCKER = getAddress("0x74738a87e4D4E0eB2706724a9314d1b4452ecdFE");
export const DUCK_HOOK = getAddress("0x067A168DA351d40e086B974F16F94CB0f3dF00c4");
// Standalone, platform-owned metadata-override registry -- see
// contracts/common/DuckMetaOverride.sol. The backend has no route reading
// this directly today (the subgraph indexes its events onto
// Token.metaOverrideUri instead); kept here for parity / future use.
export const DUCK_META_OVERRIDE = getAddress("0x0BC85b468f74959d743551948a5474Ab95Db73B1");

// Verified Ink-chain (57073) infrastructure.
export const WETH = getAddress("0x4200000000000000000000000000000000000006");
export const V4_POOL_MANAGER = getAddress("0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32");
export const V4_POSITION_MANAGER = getAddress("0x1b35d13a2E2528f192637F14B05f0Dc0e7dEB566");
export const V4_STATE_VIEW = getAddress("0x76Fd297e2D437cd7f76d50F01AfE6160f86e9990");
export const PERMIT2 = getAddress("0x000000000022D473030F116dDEE9F6B43aC78BA3");

// Deliberately narrow: ETH, USDC, and USDT0 are the only quote assets with
// real Ink liquidity (verified on-chain) and a real buyWithNative/early-buy
// route wired up. DuckIncubation/DuckLauncher used to default-allow 12 more
// with no real liquidity behind them -- disabled on-chain via
// setQuoteTokenAllowed/disableQuoteToken, this list follows suit. Not
// enumerable on-chain (quoteTokenAllowed is a plain mapping), so this list
// has to be kept in sync by hand if the owner ever changes the allow-list.
// A platform token, once set, is fetched live via platformToken() rather
// than hardcoded here -- see routes/platform.ts.
export const DEFAULT_QUOTE_TOKENS: { address: `0x${string}`; symbol: string }[] = [
  { address: getAddress("0x2D270e6886d130D724215A266106e6832161EAEd"), symbol: "USDC" },
  { address: getAddress("0x0200C29006150606B650577BBE7B6248F58470c1"), symbol: "USD₮0" },
];

// DuckRaise's quoteAssetAllowed is the same narrow set.
export const RAISE_DEFAULT_QUOTE_ASSETS = DEFAULT_QUOTE_TOKENS;
