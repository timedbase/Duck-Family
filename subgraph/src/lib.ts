import { BigInt, BigDecimal } from "@graphprotocol/graph-ts";
import { Token, TokenHourData, ReferencePrice } from "../generated/schema";

const HOUR_SECONDS = BigInt.fromI32(3600);

// The platform's only three real quote assets (see interface/backend's
// DEFAULT_QUOTE_TOKENS -- kept in sync by hand, same as those). A platform
// token, if one is ever set, falls through to the 18-decimals/unresolvable
// default below -- its own USD value isn't knowable without its own market.
const USDC = "0x2d270e6886d130d724215a266106e6832161eaed";
const USDT0 = "0x0200c29006150606b650577bbe7b6248f58470c1";
const ZERO_ADDRESS_HEX = "0x0000000000000000000000000000000000000000";

export function quoteHexOf(token: Token): string {
  return token.quoteToken !== null ? token.quoteToken!.toHexString() : ZERO_ADDRESS_HEX;
}

function quoteDecimals(quoteHex: string): i32 {
  if (quoteHex == USDC || quoteHex == USDT0) return 6;
  return 18; // native ETH, or an unknown/platform quote token (standard ERC20 default)
}

function toHuman(raw: BigInt, decimals: i32): BigDecimal {
  return raw.toBigDecimal().div(BigInt.fromI32(10).pow(decimals as u8).toBigDecimal());
}

// USDC/USDT0 treated as pegged 1:1 to USD (no separate market needed).
// Native ETH converted via the live ReferencePrice singleton. Anything else
// (a platform token) returns null -- honestly unresolvable without that
// token's own tracked market, never fabricated.
function resolveUsd(quoteHex: string, humanQuoteAmount: BigDecimal): BigDecimal | null {
  if (quoteHex == USDC || quoteHex == USDT0) return humanQuoteAmount;
  if (quoteHex == ZERO_ADDRESS_HEX) {
    let ref = ReferencePrice.load("eth-usd");
    if (ref == null) return null;
    let ethUsd: BigDecimal = ref.ethUsd;
    let usd: BigDecimal = humanQuoteAmount.times(ethUsd);
    return usd;
  }
  return null;
}

export function updateReferencePrice(ethUsd: BigDecimal, timestamp: BigInt, blockNumber: BigInt): void {
  let ref = ReferencePrice.load("eth-usd");
  if (ref == null) ref = new ReferencePrice("eth-usd");
  ref.ethUsd = ethUsd;
  ref.updatedAt = timestamp;
  ref.updatedAtBlock = blockNumber;
  ref.save();
}

// Shared by curve Trade handling (duck-incubation.ts) and pool-based
// PoolSwap handling (pool-manager.ts) -- both real trade paths, quoteAmount/
// tokenAmount always the absolute RAW magnitudes actually exchanged (token
// side always 18 decimals -- every token clone this platform creates is a
// plain 18-decimal ERC20). Updates Token.lastPrice/lastPriceUsd,
// volumeAllTime/volumeAllTimeUsd, and this hour's TokenHourData bucket
// (volume + a closePrice/closePriceUsd snapshot -- the last trade's price
// each hour naturally becomes that hour's "close" as later trades overwrite
// it) in one pass, avoiding two separate Token.load()/save() round-trips.
export function recordTrade(tokenId: string, timestamp: BigInt, quoteAmountRaw: BigInt, tokenAmountRaw: BigInt, quoteHex: string): void {
  let token = Token.load(tokenId);
  if (token == null) return;

  let price: BigDecimal | null = null;
  let priceUsd: BigDecimal | null = null;
  if (!tokenAmountRaw.equals(BigInt.zero())) {
    let humanQuote = toHuman(quoteAmountRaw, quoteDecimals(quoteHex));
    let humanToken = toHuman(tokenAmountRaw, 18);
    let p: BigDecimal = humanQuote.div(humanToken);
    price = p;
    token.lastPrice = p;
    let usd = resolveUsd(quoteHex, p);
    if (usd === null) {
      token.lastPriceUsd = null;
    } else {
      let usdValue: BigDecimal = usd;
      priceUsd = usdValue;
      token.lastPriceUsd = usdValue;
    }
  }

  let humanQuoteVol = toHuman(quoteAmountRaw, quoteDecimals(quoteHex));
  let volUsd = resolveUsd(quoteHex, humanQuoteVol);
  token.volumeAllTime = token.volumeAllTime.plus(quoteAmountRaw);
  if (volUsd !== null) {
    let usdValue: BigDecimal = volUsd;
    token.volumeAllTimeUsd = token.volumeAllTimeUsd.plus(usdValue);
  }
  token.save();

  let hourIndex = timestamp.div(HOUR_SECONDS);
  let bucketId = tokenId + "-" + hourIndex.toString();
  let bucket = TokenHourData.load(bucketId);
  if (bucket == null) {
    bucket = new TokenHourData(bucketId);
    bucket.token = tokenId;
    bucket.hourStartUnix = hourIndex.times(HOUR_SECONDS);
    bucket.volumeQuote = BigInt.zero();
    bucket.volumeUsd = BigDecimal.zero();
  }
  bucket.volumeQuote = bucket.volumeQuote.plus(quoteAmountRaw);
  if (volUsd !== null) {
    let usdValue: BigDecimal = volUsd;
    bucket.volumeUsd = bucket.volumeUsd.plus(usdValue);
  }
  if (price !== null) {
    let p: BigDecimal = price;
    bucket.closePrice = p;
  }
  if (priceUsd !== null) {
    let p: BigDecimal = priceUsd;
    bucket.closePriceUsd = p;
  }
  bucket.save();
}
