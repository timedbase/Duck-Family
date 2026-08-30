import { BigInt } from "@graphprotocol/graph-ts";
import { PositionRegistered, FeesClaimed } from "../generated/DuckLocker/DuckLocker";
import { Position, LPFeeClaim } from "../generated/schema";

export function handlePositionRegistered(event: PositionRegistered): void {
  let position = new Position(event.params.token.toHexString());
  position.token = event.params.token.toHexString();
  position.tokenId = event.params.tokenId;
  position.poolId = event.params.poolId;
  position.hook = event.params.hook;
  position.positionManager = event.params.positionManager;
  position.registeredAt = event.block.timestamp;
  position.registeredAtBlock = event.block.number;
  position.registeredAtTx = event.transaction.hash;
  position.totalBurned = BigInt.zero();
  position.totalToPlatform = BigInt.zero();
  position.save();
}

export function handleFeesClaimed(event: FeesClaimed): void {
  let position = Position.load(event.params.token.toHexString());
  if (position == null) return;
  position.totalBurned = position.totalBurned.plus(event.params.burned);
  position.totalToPlatform = position.totalToPlatform.plus(event.params.toPlatform);
  position.save();

  let claim = new LPFeeClaim(event.transaction.hash.toHexString() + "-" + event.logIndex.toString());
  claim.position = position.id;
  claim.burned = event.params.burned;
  claim.toPlatform = event.params.toPlatform;
  claim.timestamp = event.block.timestamp;
  claim.blockNumber = event.block.number;
  claim.txHash = event.transaction.hash;
  claim.save();
}
