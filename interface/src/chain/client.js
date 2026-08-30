import { createPublicClient, createWalletClient, custom, http, defineChain } from "viem";
import { INK_CHAIN_ID, PUBLIC_RPC_URL, BLOCK_EXPLORER_URL } from "./addresses.js";

export const ink = defineChain({
  id: INK_CHAIN_ID,
  name: "Ink",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [PUBLIC_RPC_URL] } },
  blockExplorers: { default: { name: "Ink Explorer", url: BLOCK_EXPLORER_URL } },
});

// Reads always go through the public RPC (works with no wallet connected).
export const publicClient = createPublicClient({ chain: ink, transport: http(PUBLIC_RPC_URL) });

export function hasInjectedWallet() {
  return typeof window !== "undefined" && !!window.ethereum;
}

// Writes go through whatever wallet the user connected (MetaMask, Rabby,
// etc.) via EIP-1193 window.ethereum — created fresh per call since the
// injected provider can change (account/network switch) between actions.
export function getWalletClient() {
  if (!hasInjectedWallet()) throw new Error("No injected wallet found (e.g. MetaMask, Rabby).");
  return createWalletClient({ chain: ink, transport: custom(window.ethereum) });
}

export async function connectWallet() {
  const wallet = getWalletClient();
  const [address] = await wallet.requestAddresses();
  await ensureInkChain();
  return address;
}

// Most injected wallets default to Ethereum mainnet or whatever was last
// used — force a switch (or add the chain if the wallet's never seen it).
export async function ensureInkChain() {
  if (!hasInjectedWallet()) return;
  const chainIdHex = "0x" + INK_CHAIN_ID.toString(16);
  try {
    await window.ethereum.request({ method: "wallet_switchEthereumChain", params: [{ chainId: chainIdHex }] });
  } catch (err) {
    if (err && err.code === 4902) {
      await window.ethereum.request({
        method: "wallet_addEthereumChain",
        params: [{
          chainId: chainIdHex,
          chainName: "Ink",
          nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
          rpcUrls: [PUBLIC_RPC_URL],
          blockExplorerUrls: [BLOCK_EXPLORER_URL],
        }],
      });
    } else {
      throw err;
    }
  }
}
