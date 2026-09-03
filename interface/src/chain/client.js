import { createPublicClient, http, defineChain } from "viem";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { getWalletClient as wagmiGetWalletClient } from "wagmi/actions";
import { CHAINS } from "./addresses.js";

// Without a `contracts.multicall3` entry, viem has nowhere to send a
// multicall aggregate3 call and throws on every publicClient.multicall(...)
// -- used by fetchTokenMeta (name/symbol batching, loadCoins' hard
// dependency) and getPlatformTokens. Verified deployed at the standard
// canonical address via the deterministic deployment proxy on BOTH chains
// (real bytecode present on Ink and, separately confirmed via `cast code`,
// on Arc too).
const MULTICALL3 = { address: "0xcA11bde05977b3631167028862bE2a173976CA11" };

export const ink = defineChain({
  id: CHAINS.ink.chainId,
  name: CHAINS.ink.name,
  nativeCurrency: { name: "Ether", symbol: CHAINS.ink.nativeSymbol, decimals: CHAINS.ink.nativeDecimals },
  rpcUrls: { default: { http: [CHAINS.ink.rpcUrl] } },
  blockExplorers: { default: { name: "Ink Explorer", url: CHAINS.ink.blockExplorerUrl } },
  contracts: { multicall3: MULTICALL3 },
});

export const arc = defineChain({
  id: CHAINS.arc.chainId,
  name: CHAINS.arc.name,
  // Arc's native gas token IS USDC (18-decimal) -- see chain/addresses.js.
  nativeCurrency: { name: "USD Coin", symbol: CHAINS.arc.nativeSymbol, decimals: CHAINS.arc.nativeDecimals },
  rpcUrls: { default: { http: [CHAINS.arc.rpcUrl] } },
  contracts: { multicall3: MULTICALL3 },
});

const VIEM_CHAINS = { ink, arc };

// Reads always go through the public RPC (works with no wallet connected).
// Memoized per chain -- callers pass the resolved CHAINS[slug] entry (not
// the slug string) so this stays a plain lookup, matching how every other
// chain-aware function in chain/*.js takes the resolved config object.
const publicClients = new Map();
export function getPublicClient(chain) {
  const cached = publicClients.get(chain.chainId);
  if (cached) return cached;
  const viemChain = VIEM_CHAINS[chain.chainId === CHAINS.arc.chainId ? "arc" : "ink"];
  const client = createPublicClient({ chain: viemChain, transport: http(chain.rpcUrl) });
  publicClients.set(chain.chainId, client);
  return client;
}

// RainbowKit's default connector set (injected, WalletConnect, Coinbase
// Wallet, and more) needs a WalletConnect Cloud project id for the
// WalletConnect connector specifically -- injected wallets (MetaMask, Rabby)
// work regardless. Get a free one at https://cloud.reown.com and set
// VITE_WALLETCONNECT_PROJECT_ID (see .env.example).
export const config = getDefaultConfig({
  appName: "duckfun.family",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "",
  chains: [ink, arc],
  transports: { [ink.id]: http(CHAINS.ink.rpcUrl), [arc.id]: http(CHAINS.arc.rpcUrl) },
});

// Writes go through whichever wallet the user connected via RainbowKit --
// wagmi's non-hook action API, so this stays a plain async function callable
// from chain/tx.js instead of needing every caller to be a component. This
// already returns a client scoped to whatever chain the wallet is CURRENTLY
// on (wagmi's own behavior) -- the caller's job (see App.jsx's write-action
// guard) is making sure that's the chain the user actually meant to act on
// before ever getting here, not this function's.
export async function getWalletClient() {
  return wagmiGetWalletClient(config);
}
