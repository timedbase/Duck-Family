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
