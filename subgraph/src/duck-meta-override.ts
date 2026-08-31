import { TokenRegistered, MetaURIUpdated, TokenUnregistered } from "../generated/DuckMetaOverride/DuckMetaOverride";
import { Token } from "../generated/schema";

// Skips (no-ops) if the Token entity doesn't exist yet -- shouldn't happen in
// practice (the platform only registers real, already-indexed tokens), but
// matches the defensive load-and-check pattern used everywhere else in this
// subgraph for events that reference another contract's token address.

export function handleTokenRegistered(event: TokenRegistered): void {
  let token = Token.load(event.params.token.toHexString());
  if (token == null) return;
  token.metaOverrideUri = event.params.metaURI;
  token.save();
}

export function handleMetaURIUpdated(event: MetaURIUpdated): void {
  let token = Token.load(event.params.token.toHexString());
  if (token == null) return;
  token.metaOverrideUri = event.params.metaURI;
  token.save();
}

export function handleTokenUnregistered(event: TokenUnregistered): void {
  let token = Token.load(event.params.token.toHexString());
  if (token == null) return;
  token.metaOverrideUri = null;
  token.save();
}
