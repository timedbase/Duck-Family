import "dotenv/config";
import { createPublicClient, http, defineChain } from "viem";
import { INK_CHAIN_ID } from "./addresses.js";

const rpcUrl = process.env.INK_RPC_URL;
if (!rpcUrl) {
  throw new Error("INK_RPC_URL is not set");
}

export const ink = defineChain({
  id: INK_CHAIN_ID,
  name: "Ink",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [rpcUrl] } },
});

export const publicClient = createPublicClient({
  chain: ink,
  transport: http(rpcUrl),
});
