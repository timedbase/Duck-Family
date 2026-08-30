import { publicClient } from "./client.js";
import { DUCK_INCUBATION_ABI } from "./abis.js";
import { DUCK_INCUBATION } from "./addresses.js";
import { previewBuyWithNative, previewSellForNative, previewEthToQuote } from "./dex.js";

// Pre-migration bonding-curve preview -- exact, since these are the same
// view functions buy()/sell() price against internally (no slippage risk
// from an external pool's state changing between quote and execution the
// way a real AMM preview has).
export async function previewCurveBuy(token, quoteInWei) {
  const [tokensOut] = await publicClient.readContract({
    address: DUCK_INCUBATION, abi: DUCK_INCUBATION_ABI, functionName: "getAmountOut", args: [token, quoteInWei],
  });
  return tokensOut;
}

export async function previewCurveSell(token, amountIn) {
  const [quoteOut] = await publicClient.readContract({
    address: DUCK_INCUBATION, abi: DUCK_INCUBATION_ABI, functionName: "getAmountOutSell", args: [token, amountIn],
  });
  return quoteOut;
}

// Preview for buyWithNative on an ERC20-quoted (not-yet-migrated) curve
// token: ETH -> quoteAsset over the real external venue, then quoteAsset ->
// curve tokens via the same exact math buy() prices against. Returns zeros
// if there's no known ETH route for this quote asset (see dex.js).
export async function previewCurveBuyWithNative(token, quoteAsset, quoteSymbol, amountInWei) {
  const quoteOut = await previewEthToQuote({ quoteAsset, quoteSymbol, amountInWei });
  if (quoteOut === 0n) return { quoteOut: 0n, tokensOut: 0n };
  const tokensOut = await previewCurveBuy(token, quoteOut);
  return { quoteOut, tokensOut };
}

// Post-migration / instant-launch preview, ETH-in/ETH-out -- via Ink's real
// V4Quoter, 1 or 2 hops depending on the pool's quote asset (see
// chain/dex.js). Approximate (real AMM pools can move between quote and
// execution) — always apply slippage tolerance on top before using as minOut.
export const previewPoolBuyWithNative = previewBuyWithNative;
export const previewPoolSellForNative = previewSellForNative;

// slippageBps: 100 = 1%. Applied as expected * (10000 - slippageBps) / 10000.
export function applySlippage(expected, slippageBps) {
  return (expected * BigInt(10000 - slippageBps)) / 10000n;
}
