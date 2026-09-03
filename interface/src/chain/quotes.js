import { getPublicClient } from "./client.js";
import { DUCK_INCUBATION_ABI } from "./abis.js";
import { previewBuyWithNative, previewSellForNative, previewNativeToQuote } from "./dex.js";

// Pre-migration bonding-curve preview -- exact, since these are the same
// view functions buy()/sell() price against internally (no slippage risk
// from an external pool's state changing between quote and execution the
// way a real AMM preview has).
export async function previewCurveBuy(chain, token, quoteInWei) {
  const [tokensOut] = await getPublicClient(chain).readContract({
    address: chain.DUCK_INCUBATION, abi: DUCK_INCUBATION_ABI, functionName: "getAmountOut", args: [token, quoteInWei],
  });
  return tokensOut;
}

export async function previewCurveSell(chain, token, amountIn) {
  const [quoteOut] = await getPublicClient(chain).readContract({
    address: chain.DUCK_INCUBATION, abi: DUCK_INCUBATION_ABI, functionName: "getAmountOutSell", args: [token, amountIn],
  });
  return quoteOut;
}

// Preview for buyWithNative on an ERC20-quoted (not-yet-migrated) curve
// token: native -> quoteAsset over the real external venue (Ink only), then
// quoteAsset -> curve tokens via the same exact math buy() prices against.
// Returns zeros if there's no known native route for this quote asset (see
// dex.js).
export async function previewCurveBuyWithNative(chain, token, quoteAsset, quoteSymbol, amountInWei) {
  const quoteOut = await previewNativeToQuote(chain, { quoteAsset, quoteSymbol, amountInWei });
  if (quoteOut === 0n) return { quoteOut: 0n, tokensOut: 0n };
  const tokensOut = await previewCurveBuy(chain, token, quoteOut);
  return { quoteOut, tokensOut };
}

// Post-migration / instant-launch preview, native-in/native-out -- via the
// chain's real V4Quoter (Ink only today -- see dex.js), 1 or 2 hops
// depending on the pool's quote asset. Approximate (real AMM pools can move
// between quote and execution) — always apply slippage tolerance on top
// before using as minOut.
export const previewPoolBuyWithNative = previewBuyWithNative;
export const previewPoolSellForNative = previewSellForNative;

// slippageBps: 100 = 1%. Applied as expected * (10000 - slippageBps) / 10000.
export function applySlippage(expected, slippageBps) {
  return (expected * BigInt(10000 - slippageBps)) / 10000n;
}
