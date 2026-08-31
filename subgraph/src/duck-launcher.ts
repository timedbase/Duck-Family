import { BigInt, BigDecimal } from "@graphprotocol/graph-ts";
import { TokenLaunched } from "../generated/DuckLauncher/DuckLauncher";
import { TokenMetadata } from "../generated/DuckLauncher/TokenMetadata";
import { Token } from "../generated/schema";
import { DuckToken } from "../generated/templates";

// DuckLauncher.TOTAL_SUPPLY -- fixed for every instant launch, not carried
// in the TokenLaunched event itself.
const TOTAL_SUPPLY = BigInt.fromString("1000000000000000000000000000");

export function handleTokenLaunched(event: TokenLaunched): void {
  let token = new Token(event.params.token.toHexString());
  token.family = "INSTANT";
  token.creator = event.params.creator;
  token.quoteToken = event.params.quoteToken;
  token.totalSupply = TOTAL_SUPPLY;
  token.createdAt = event.block.timestamp;
  token.createdAtBlock = event.block.number;
  token.createdAtTx = event.transaction.hash;

  let meta = TokenMetadata.bind(event.params.token);
  let nameResult = meta.try_name();
  let symbolResult = meta.try_symbol();
  let metaUriResult = meta.try_metaURI();
  token.name = nameResult.reverted ? null : nameResult.value;
  token.symbol = symbolResult.reverted ? null : symbolResult.value;
  token.metaUri = metaUriResult.reverted ? null : metaUriResult.value;

  token.positionManager = event.params.positionManager;
  token.hook = event.params.hook;
  token.tokenId = event.params.tokenId;
  token.burnedSupply = BigInt.zero();
  token.holderCount = 0;
  token.volumeAllTime = BigInt.zero();
  token.volumeAllTimeUsd = BigDecimal.zero();

  token.save();

  DuckToken.create(event.params.token);
}
