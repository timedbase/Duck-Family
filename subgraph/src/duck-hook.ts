import { BigInt } from "@graphprotocol/graph-ts";
import {
  PoolRegistered,
  FeesClaimed,
  CTOApplied,
  CTOApproved,
  CTORejected,
} from "../generated/DuckHookV4/DuckHookV4";
import { Pool, HookFeeClaim, CTOApplication } from "../generated/schema";

export function handlePoolRegistered(event: PoolRegistered): void {
  let pool = new Pool(event.params.poolId.toHexString());
  pool.token = event.params.token.toHexString();
  pool.creator = event.params.creator;
  pool.hookFeeBps = event.params.hookFeeBps;
  pool.registeredAt = event.block.timestamp;
  pool.registeredAtBlock = event.block.number;
  pool.swapCount = BigInt.zero();
  pool.save();
}

export function handleFeesClaimed(event: FeesClaimed): void {
  let pool = Pool.load(event.params.poolId.toHexString());
  if (pool == null) return;

  let claim = new HookFeeClaim(event.transaction.hash.toHexString() + "-" + event.logIndex.toString());
  claim.pool = pool.id;
  claim.amount = event.params.amount;
  claim.timestamp = event.block.timestamp;
  claim.blockNumber = event.block.number;
  claim.txHash = event.transaction.hash;
  claim.save();
}

export function handleCTOApplied(event: CTOApplied): void {
  let pool = Pool.load(event.params.poolId.toHexString());
  if (pool == null) return;

  let id = event.params.poolId.toHexString() + "-" + event.transaction.hash.toHexString() + "-" + event.logIndex.toString();
  let application = new CTOApplication(id);
  application.pool = pool.id;
  application.applicant = event.params.applicant;
  application.newCreator = event.params.newCreator;
  application.paid = event.params.paid;
  application.status = "PENDING";
  application.appliedAt = event.block.timestamp;
  application.appliedAtBlock = event.block.number;
  application.appliedAtTx = event.transaction.hash;
  application.save();

  pool.pendingCTO = id;
  pool.save();
}

export function handleCTOApproved(event: CTOApproved): void {
  let pool = Pool.load(event.params.poolId.toHexString());
  if (pool == null || pool.pendingCTO == null) return;

  let application = CTOApplication.load(pool.pendingCTO!);
  if (application == null) return;
  application.status = "APPROVED";
  application.resolvedAt = event.block.timestamp;
  application.resolvedAtBlock = event.block.number;
  application.save();

  pool.creator = event.params.newCreator;
  pool.pendingCTO = null;
  pool.save();
}

export function handleCTORejected(event: CTORejected): void {
  let pool = Pool.load(event.params.poolId.toHexString());
  if (pool == null || pool.pendingCTO == null) return;

  let application = CTOApplication.load(pool.pendingCTO!);
  if (application == null) return;
  application.status = "REJECTED";
  application.resolvedAt = event.block.timestamp;
  application.resolvedAtBlock = event.block.number;
  application.save();

  pool.pendingCTO = null;
  pool.save();
}
