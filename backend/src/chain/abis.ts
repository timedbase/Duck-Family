// Minimal read-only ABI fragments -- just the getters the API's light,
// infrequent RPC reads need (platform config that isn't worth indexing in
// the subgraph; see ../../../subgraph/README.md's "What's deliberately NOT
// indexed" section). Everything else (tokens, trades, campaigns,
// positions, pools, holders) comes from the subgraph instead.

export const DUCK_LOCKER_ABI = [
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "platformWallet", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "platformToken", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;

export const DUCK_HOOK_ABI = [
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "platformWallet", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "ctoFee", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  // Public constant -- the sell-fee bps applied unless a pool was created
  // with a nonzero hookFeeBps override (rare; the platform's own launch
  // flows all pass 0, meaning "use this default").
  { type: "function", name: "HOOK_FEE_DEFAULT_BPS", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
] as const;

export const DUCK_INCUBATION_ABI = [
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "platformWallet", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "platformToken", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "creationFee", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "quoteTokenAllowed", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "v4PositionManager", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "v4Singleton", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "v4Permit2", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "v4Hook", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;

export const DUCK_LAUNCHER_ABI = [
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "platformWallet", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "platformToken", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "launchFee", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "quoteTokens", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "bool" }] },
  {
    type: "function",
    name: "dexes",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [
      { type: "address", name: "singleton" },
      { type: "address", name: "permit2" },
      { type: "address", name: "hook" },
      { type: "bool", name: "enabled" },
    ],
  },
] as const;

// DuckLauncherArc's DexConfig struct isn't just Ink's plus trailing fields --
// it INSERTS `router` (V3 SwapRouter) before `enabled` and adds `isV3` after
// it: (singleton, permit2, hook, router, enabled, isV3) vs Ink's (singleton,
// permit2, hook, enabled). Decoding Arc's dexes() with Ink's 4-output ABI
// silently reads `router` as if it were `enabled` (index 3 in both, but a
// different real field) -- for the V4 entry, router is always address(0),
// which decodes as a truthy-looking `false` bool, so this doesn't throw, it
// just lies. Confirmed live via a manual 6-field `cast call` before adding
// this: the real enabled value was `true` the whole time.
export const DUCK_LAUNCHER_ARC_ABI = [
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "platformWallet", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "platformToken", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "launchFee", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "quoteTokens", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "bool" }] },
  {
    type: "function",
    name: "dexes",
    stateMutability: "view",
    inputs: [{ type: "address" }],
    outputs: [
      { type: "address", name: "singleton" },
      { type: "address", name: "permit2" },
      { type: "address", name: "hook" },
      { type: "address", name: "router" },
      { type: "bool", name: "enabled" },
      { type: "bool", name: "isV3" },
    ],
  },
] as const;

export const DUCK_RAISE_ABI = [
  { type: "function", name: "owner", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "platformWallet", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "platformToken", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "campaignFee", stateMutability: "view", inputs: [], outputs: [{ type: "uint256" }] },
  { type: "function", name: "quoteAssetAllowed", stateMutability: "view", inputs: [{ type: "address" }], outputs: [{ type: "bool" }] },
  { type: "function", name: "v4Singleton", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "v4PositionManager", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "v4Permit2", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
  { type: "function", name: "v4Hook", stateMutability: "view", inputs: [], outputs: [{ type: "address" }] },
] as const;
