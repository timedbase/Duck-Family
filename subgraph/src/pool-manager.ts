import { BigInt } from "@graphprotocol/graph-ts";
import { Swap, ModifyLiquidity } from "../generated/PoolManager/PoolManager";
import { Pool, PoolSwap, PoolLiquidityChange } from "../generated/schema";

export function handleSwap(event: Swap): void {
  // PoolManager is a shared singleton -- this fires for every pool on Ink,
  // not just ones this platform created. Skip anything we don't recognize.
  let pool = Pool.load(event.params.id.toHexString());
  if (pool == null) return;

  pool.swapCount = pool.swapCount.plus(BigInt.fromI32(1));
  pool.save();

  let swap = new PoolSwap(event.transaction.hash.toHexString() + "-" + event.logIndex.toString());
  swap.pool = pool.id;
  swap.sender = event.params.sender;
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
