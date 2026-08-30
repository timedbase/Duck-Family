import { BigInt } from "@graphprotocol/graph-ts";
import { TokenLaunched } from "../generated/DuckLauncher/DuckLauncher";
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

  token.positionManager = event.params.positionManager;
  token.hook = event.params.hook;
  token.tokenId = event.params.tokenId;

  token.save();

  DuckToken.create(event.params.token);
}
