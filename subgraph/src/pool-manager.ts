import { Address, BigInt, BigDecimal } from "@graphprotocol/graph-ts";
import { Swap, ModifyLiquidity } from "../generated/PoolManager/PoolManager";
import { Pool, PoolSwap, PoolLiquidityChange, Token } from "../generated/schema";
import { recordTrade, updateReferencePrice } from "./lib";

const ZERO_ADDRESS_HEX = Address.zero().toHexString();

// The real, hookless, fee=3000/tickSpacing=60 external pools this
// platform's own buyWithNative routing uses -- the only real ETH<->
// stablecoin liquidity on Ink. PoolKey-hash computed and verified directly
// against live chain state (getSlot0 on both returns a real, initialized
// sqrtPriceX96) before hardcoding, not derived/guessed in-mapping.
const ETH_USDC_POOL_ID = "0x45a5aed4efc11ff55290b5504f357d6204f7027d14de4af56c1c23faecfb2583";
const ETH_USDT0_POOL_ID = "0x426354d494b48cc544076d4afe855b5bf224e6a5d4e403bbbf04cbc7f25790b0";
const Q96 = BigDecimal.fromString("79228162514264337593543950336"); // 2^96

// currency0 is always native ETH (18 decimals) on both reference pools,
// currency1 the stablecoin (6 decimals) -- sqrtPriceX96 encodes
// sqrt(currency1/currency0) in raw-unit terms; squaring and rescaling by
// the decimals difference gives real USD per ETH.
function ethUsdFromSqrtPriceX96(sqrtPriceX96: BigInt): BigDecimal {
  let ratio = sqrtPriceX96.toBigDecimal().div(Q96);
  let rawPrice = ratio.times(ratio);
  return rawPrice.times(BigDecimal.fromString("1000000000000")); // *10^(18-6)
}

export function handleSwap(event: Swap): void {
  let poolId = event.params.id.toHexString();
  if (poolId == ETH_USDC_POOL_ID || poolId == ETH_USDT0_POOL_ID) {
    updateReferencePrice(ethUsdFromSqrtPriceX96(event.params.sqrtPriceX96), event.block.timestamp, event.block.number);
    return;
  }

  // PoolManager is a shared singleton -- this fires for every pool on Ink,
  // not just ones this platform created. Skip anything we don't recognize.
  let pool = Pool.load(poolId);
  if (pool == null) return;

  pool.swapCount = pool.swapCount.plus(BigInt.fromI32(1));
  pool.save();

  let swap = new PoolSwap(event.transaction.hash.toHexString() + "-" + event.logIndex.toString());
  swap.pool = pool.id;
  // event.params.sender is whatever contract called PoolManager.swap --
  // the Universal Router for every trade made through this platform's own
  // UI (and any other router/aggregator), never the real trader. The
  // transaction's own sender is the actual signing wallet in every one of
  // this platform's real flows (no meta-tx/smart-wallet relaying layer
  // exists here), so that's the correct field to attribute a trade to.
  swap.sender = event.transaction.from;
  swap.amount0 = event.params.amount0;
  swap.amount1 = event.params.amount1;
  swap.sqrtPriceX96 = event.params.sqrtPriceX96;
  swap.liquidity = event.params.liquidity;
  swap.tick = event.params.tick;
  swap.fee = event.params.fee;
  swap.timestamp = event.block.timestamp;
  swap.blockNumber = event.block.number;
  swap.txHash = event.transaction.hash;
  swap.save();

  let token = Token.load(pool.token);
  if (token != null) {
    // currency0/1 ordering is "lower address wins" -- comparing the two
    // addresses' own lowercase hex strings gives the identical ordering as
    // a numeric comparison here (same length, canonical hex), with none of
    // the endianness pitfalls of converting Bytes to BigInt by hand.
    let quoteHex = token.quoteToken !== null ? token.quoteToken!.toHexString() : ZERO_ADDRESS_HEX;
    let tokenIsCurrency0 = token.id < quoteHex;
    let tokenAmount = tokenIsCurrency0 ? event.params.amount0 : event.params.amount1;
    let quoteAmount = tokenIsCurrency0 ? event.params.amount1 : event.params.amount0;
    // Swap event amounts are the POOL's balance delta -- direction doesn't
    // matter for price/volume, only magnitude, so this doesn't need the
    // buy/sell sign convention the backend's trade merge does.
    let absTokenAmount = tokenAmount.lt(BigInt.zero()) ? tokenAmount.neg() : tokenAmount;
    let absQuoteAmount = quoteAmount.lt(BigInt.zero()) ? quoteAmount.neg() : quoteAmount;
    recordTrade(token.id, event.block.timestamp, absQuoteAmount, absTokenAmount, quoteHex);
  }
}

export function handleModifyLiquidity(event: ModifyLiquidity): void {
  let pool = Pool.load(event.params.id.toHexString());
  if (pool == null) return;

  let change = new PoolLiquidityChange(event.transaction.hash.toHexString() + "-" + event.logIndex.toString());
  change.pool = pool.id;
  change.sender = event.params.sender;
  change.tickLower = event.params.tickLower;
  change.tickUpper = event.params.tickUpper;
  change.liquidityDelta = event.params.liquidityDelta;
  change.timestamp = event.block.timestamp;
  change.blockNumber = event.block.number;
  change.txHash = event.transaction.hash;
  change.save();
}
