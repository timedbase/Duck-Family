import { getAddress } from "viem";

// Mirrors ../../../backend/src/chain/addresses.ts and
// ../../../contracts/deploy/deployments/ink.json — same deployment, three consumers.

export const INK_CHAIN_ID = 57073;
export const PUBLIC_RPC_URL = "https://rpc-gel.inkonchain.com";
export const BLOCK_EXPLORER_URL = "https://explorer.inkonchain.com";

export const DUCK_INCUBATION = getAddress("0x5c4f0938FC434b60b57209BbC971544b73876675");
export const DUCK_LAUNCHER = getAddress("0x2A84711A5c0Ee62118CEee1A37C0dA46a6980353");
export const DUCK_RAISE = getAddress("0x39D17950BaaD5737d08b027F0494E2C261B37Cf2");
export const DUCK_LOCKER = getAddress("0x74738a87e4D4E0eB2706724a9314d1b4452ecdFE");
export const DUCK_HOOK = getAddress("0xA547E097bCcA60737b8264C4dDB9bC3bE74880C4");

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

// The 15 tokens DuckIncubation/DuckLauncher default-allow as quote assets
// (see contracts/common/DuckIncubationMigration.sol's seedDefaultQuoteTokens)
// -- only USDC and USDT0 have real Ink liquidity today, but all 15 are valid
// to trade against directly on the bonding curve / at instant-launch time.
export const DEFAULT_QUOTE_TOKENS = [
  { address: getAddress("0x2D270e6886d130D724215A266106e6832161EAEd"), symbol: "USDC", decimals: 6 },
  { address: getAddress("0x71052BAe71C25C78E37fD12E5ff1101A71d9018F"), symbol: "LINK", decimals: 18 },
  { address: getAddress("0x0200C29006150606B650577BBE7B6248F58470c1"), symbol: "USD₮0", decimals: 6 },
  { address: getAddress("0xe343167631d89B6Ffc58B88d6b7fB0228795491D"), symbol: "USDG", decimals: 6 },
  { address: getAddress("0x142cdc44890978B506e745bB3Bd11607B7f7faEf"), symbol: "PYUSD", decimals: 6 },
  { address: getAddress("0xc3eACf0612346366Db554C991D7858716db09f58"), symbol: "rsETH", decimals: 18 },
  { address: getAddress("0xF50258D3c1dd88946C567920B986A12e65b50dAc"), symbol: "XAUt0", decimals: 6 },
  { address: getAddress("0xc845b2894dBddd03858fd2D643B4eF725fE0849d"), symbol: "NVDAx", decimals: 18 },
  { address: getAddress("0xb63EFBc28860c8097e341DE1fCF59456161E9D98"), symbol: "SNDKx", decimals: 18 },
  { address: getAddress("0x53Ad50D3B6FCaCB8965d3A49cB722917C7DAE1F3"), symbol: "ACRED", decimals: 18 },
  { address: getAddress("0x6F75AC3b1b6Fbe8Bb5F948e25aF03620f26Ae838"), symbol: "XLEx", decimals: 18 },
  { address: getAddress("0xeFD30445A4ec1f4b3E0a6f4d9bDbd215F805047F"), symbol: "MRNAx", decimals: 18 },
  { address: getAddress("0xBca703C64f616A17b4f2763F34f93400Dbe20F17"), symbol: "ETNx", decimals: 18 },
  { address: getAddress("0x7636244Bab612264e1B2dFd4bA6E26d0311b1Eb7"), symbol: "CEGx", decimals: 18 },
  { address: getAddress("0x06A0138F8c3e5110fd98e34a4473Fb08F1304b87"), symbol: "MOOx", decimals: 18 },
];

// DuckRaise's quoteAssetAllowed is deliberately narrower -- only assets a
// campaign's raised ETH can actually be swapped into at finalize.
export const RAISE_DEFAULT_QUOTE_ASSETS = DEFAULT_QUOTE_TOKENS.filter(
  (t) => t.symbol === "USDC" || t.symbol === "USD₮0"
);

// USDC/USDT0 are the only two of the 15 with real Ink liquidity today (see
// contracts/deploy/deployments/ink.json's notes) -- the ones buyWithNative/
// early-buy routing actually works against out of the box.
export const LIQUID_QUOTE_TOKEN_SYMBOLS = ["USDC", "USD₮0"];
