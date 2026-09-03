import { getAddress, type Address } from "viem";
import type { ChainSlug } from "./registry.js";

export type QuoteToken = { address: Address; symbol: string };

export type ChainAddresses = {
  chainId: number;
  // Native gas token -- ETH on Ink, USDC (18-decimal) on Arc. Every route
  // that labels the native-currency quote asset reads this instead of
  // hardcoding "ETH".
  nativeSymbol: string;
  DUCK_INCUBATION: Address;
  DUCK_LAUNCHER: Address;
  DUCK_RAISE: Address;
  DUCK_LOCKER: Address;
  DUCK_HOOK: Address;
  // null where the registry hasn't been deployed on this chain yet (Arc).
  DUCK_META_OVERRIDE: Address | null;
  // null on a chain with no WETH-equivalent (Arc).
  WETH: Address | null;
  V4_POOL_MANAGER: Address;
  V4_POSITION_MANAGER: Address;
  V4_STATE_VIEW: Address | null;
  PERMIT2: Address;
  // Empty until the owner seeds real quote assets on-chain (see
  // Duck-Family-Contract's deploy-arc/deployments/arc.json notes) -- Arc has
  // none yet.
  DEFAULT_QUOTE_TOKENS: QuoteToken[];
  RAISE_DEFAULT_QUOTE_ASSETS: QuoteToken[];
};

// Kept in lockstep with the Duck-Family-Contract repo's
// deploy/deployments/ink.json -- same deployment, referenced from both.
const ink: ChainAddresses = {
  chainId: 57073,
  nativeSymbol: "ETH",
  DUCK_INCUBATION: getAddress("0xB9f7213262FE429387eAD6EB63e547Ba05E0D935"),
  DUCK_LAUNCHER: getAddress("0x2A84711A5c0Ee62118CEee1A37C0dA46a6980353"),
  DUCK_RAISE: getAddress("0xdEb4D7fe8BEA866B91A2be8ED35D171F8312269b"),
  DUCK_LOCKER: getAddress("0x74738a87e4D4E0eB2706724a9314d1b4452ecdFE"),
  DUCK_HOOK: getAddress("0x067A168DA351d40e086B974F16F94CB0f3dF00c4"),
  // Standalone, platform-owned metadata-override registry -- see
  // contracts/common/DuckMetaOverride.sol. No route reads this directly
  // today (the subgraph indexes its events onto Token.metaOverrideUri
  // instead); kept here for parity / future use.
  DUCK_META_OVERRIDE: getAddress("0x0BC85b468f74959d743551948a5474Ab95Db73B1"),
  WETH: getAddress("0x4200000000000000000000000000000000000006"),
  V4_POOL_MANAGER: getAddress("0x360E68faCcca8cA495c1B759Fd9EEe466db9FB32"),
  V4_POSITION_MANAGER: getAddress("0x1b35d13a2E2528f192637F14B05f0Dc0e7dEB566"),
  V4_STATE_VIEW: getAddress("0x76Fd297e2D437cd7f76d50F01AfE6160f86e9990"),
  PERMIT2: getAddress("0x000000000022D473030F116dDEE9F6B43aC78BA3"),
  // Deliberately narrow: ETH, USDC, and USDT0 are the only quote assets with
  // real Ink liquidity (verified on-chain) and a real buyWithNative/early-buy
  // route wired up. Not enumerable on-chain (quoteTokenAllowed is a plain
  // mapping), so this list has to be kept in sync by hand if the owner ever
  // changes the allow-list.
  DEFAULT_QUOTE_TOKENS: [
    { address: getAddress("0x2D270e6886d130D724215A266106e6832161EAEd"), symbol: "USDC" },
    { address: getAddress("0x0200C29006150606B650577BBE7B6248F58470c1"), symbol: "USD₮0" },
  ],
  get RAISE_DEFAULT_QUOTE_ASSETS() {
    return this.DEFAULT_QUOTE_TOKENS;
  },
};

// Kept in lockstep with the Duck-Family-Contract repo's
// deploy-arc/deployments/arc.json -- same deployment, referenced from both.
const arc: ChainAddresses = {
  chainId: 5042,
  // Arc's native gas token IS USDC (18-decimal precision) -- there's no
  // WETH-equivalent, see WETH: null below.
  nativeSymbol: "USDC",
  DUCK_INCUBATION: getAddress("0x5c4f0938FC434b60b57209BbC971544b73876675"),
  DUCK_LAUNCHER: getAddress("0x2A84711A5c0Ee62118CEee1A37C0dA46a6980353"),
  DUCK_RAISE: getAddress("0x9AE7383af6ea77037c09459a9aF8f4AEC038f083"),
  DUCK_LOCKER: getAddress("0x74738a87e4D4E0eB2706724a9314d1b4452ecdFE"),
  DUCK_HOOK: getAddress("0x5C53161656C8b13883b2CD9936Acf6FcA56100c4"),
  // Not deployed on Arc yet (a separate script, not run as part of the
  // initial contract deploy).
  DUCK_META_OVERRIDE: null,
  WETH: null,
  V4_POOL_MANAGER: getAddress("0x8366a39CC670B4001A1121B8F6A443A643e40951"),
  V4_POSITION_MANAGER: getAddress("0x6049c9a0e26405C0985f9E3685C87d0aE917f82B"),
  // Not confirmed live on Arc -- no route here reads it (StateView isn't
  // used by any of the RPC calls in routes/platform.ts), so left unset
  // rather than guessed.
  V4_STATE_VIEW: null,
  PERMIT2: getAddress("0x000000000022D473030F116dDEE9F6B43aC78BA3"),
  // Nothing seeded yet -- Arc's contracts don't default-allow any quote
  // tokens on deploy (see arc.json's notes). Add real entries here once the
  // owner seeds them on-chain via setQuoteTokenAllowed/setRoutes.
  DEFAULT_QUOTE_TOKENS: [],
  get RAISE_DEFAULT_QUOTE_ASSETS() {
    return this.DEFAULT_QUOTE_TOKENS;
  },
};

export const ADDRESSES: Record<ChainSlug, ChainAddresses> = { ink, arc };
