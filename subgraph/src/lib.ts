import { BigInt } from "@graphprotocol/graph-ts";
import { Token, TokenHourData } from "../generated/schema";

const HOUR_SECONDS = BigInt.fromI32(3600);

// Shared by curve Trade handling (duck-incubation.ts) and pool-based
// PoolSwap handling (pool-manager.ts) -- both real trade paths, quoteAmount/
// tokenAmount always the absolute magnitudes actually exchanged.
export function recordPrice(tokenId: string, quoteAmount: BigInt, tokenAmount: BigInt): void {
  if (tokenAmount.equals(BigInt.zero())) return;
  let token = Token.load(tokenId);
  if (token == null) return;
  token.lastPrice = quoteAmount.toBigDecimal().div(tokenAmount.toBigDecimal());
  token.save();
}

export function recordVolume(tokenId: string, timestamp: BigInt, quoteAmount: BigInt): void {
  let token = Token.load(tokenId);
  if (token == null) return;
  token.volumeAllTime = token.volumeAllTime.plus(quoteAmount);
  token.save();

  let hourIndex = timestamp.div(HOUR_SECONDS);
  let bucketId = tokenId + "-" + hourIndex.toString();
  let bucket = TokenHourData.load(bucketId);
  if (bucket == null) {
    bucket = new TokenHourData(bucketId);
    bucket.token = tokenId;
    bucket.hourStartUnix = hourIndex.times(HOUR_SECONDS);
    bucket.volumeQuote = BigInt.zero();
  }
  bucket.volumeQuote = bucket.volumeQuote.plus(quoteAmount);
  bucket.save();
}
