import "dotenv/config";
import { createPublicClient, http, defineChain, type PublicClient } from "viem";
import { ADDRESSES } from "./addresses.js";
import type { ChainSlug } from "./registry.js";

const RPC_ENV_VAR: Record<ChainSlug, string> = {
  ink: "INK_RPC_URL",
  arc: "ARC_RPC_URL",
};

const NATIVE_CURRENCY: Record<ChainSlug, { name: string; symbol: string; decimals: number }> = {
  ink: { name: "Ether", symbol: "ETH", decimals: 18 },
  // Arc's native gas token IS USDC, at 18-decimal precision (distinct from
  // the 6-decimal ERC-20 USDC mirror) -- see chain/addresses.ts.
  arc: { name: "USD Coin", symbol: "USDC", decimals: 18 },
};

// Lazy and per-chain, unlike the old single-chain module (which threw at
// import time if INK_RPC_URL was missing) -- a missing ARC_RPC_URL should
// 502 only the /arc routes that actually need RPC, not take the whole API
// down for Ink too. Memoized so each chain's client is only ever built once.
const clients = new Map<ChainSlug, PublicClient>();

export function getPublicClient(chain: ChainSlug): PublicClient {
  const cached = clients.get(chain);
  if (cached) return cached;

  const envVar = RPC_ENV_VAR[chain];
  const rpcUrl = process.env[envVar];
  if (!rpcUrl) {
    throw new Error(`${envVar} is not set`);
  }

  const viemChain = defineChain({
    id: ADDRESSES[chain].chainId,
    name: chain,
    nativeCurrency: NATIVE_CURRENCY[chain],
    rpcUrls: { default: { http: [rpcUrl] } },
  });

  const client = createPublicClient({ chain: viemChain, transport: http(rpcUrl) }) as PublicClient;
  clients.set(chain, client);
  return client;
}
