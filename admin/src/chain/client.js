import { createPublicClient, http, defineChain } from "viem";
import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { getWalletClient as wagmiGetWalletClient } from "wagmi/actions";
import { INK_CHAIN_ID, PUBLIC_RPC_URL, BLOCK_EXPLORER_URL } from "./addresses.js";

// Without a `contracts.multicall3` entry, viem has nowhere to send a
// multicall aggregate3 call and throws on every publicClient.multicall(...)
// -- used by fetchTokenMeta (name/symbol batching, loadCoins' hard
// dependency) and getPlatformTokens. Verified deployed at the standard
// canonical address on Ink (real bytecode present), same as almost every
// EVM chain via the deterministic deployment proxy.
export const ink = defineChain({
  id: INK_CHAIN_ID,
  name: "Ink",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [PUBLIC_RPC_URL] } },
  blockExplorers: { default: { name: "Ink Explorer", url: BLOCK_EXPLORER_URL } },
  contracts: { multicall3: { address: "0xcA11bde05977b3631167028862bE2a173976CA11" } },
});

// Reads always go through the public RPC (works with no wallet connected).
export const publicClient = createPublicClient({ chain: ink, transport: http(PUBLIC_RPC_URL) });

// RainbowKit's default connector set (injected, WalletConnect, Coinbase
// Wallet, and more) needs a WalletConnect Cloud project id for the
// WalletConnect connector specifically -- injected wallets (MetaMask, Rabby)
// work regardless. Get a free one at https://cloud.reown.com and set
// VITE_WALLETCONNECT_PROJECT_ID (see .env.example).
export const config = getDefaultConfig({
  appName: "duckfun.family",
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "",
  chains: [ink],
  transports: { [ink.id]: http(PUBLIC_RPC_URL) },
});

// Writes go through whichever wallet the user connected via RainbowKit --
// wagmi's non-hook action API, so this stays a plain async function callable
// from chain/tx.js instead of needing every caller to be a component.
export async function getWalletClient() {
  return wagmiGetWalletClient(config);
}
