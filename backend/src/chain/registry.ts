// The one place that knows which chains this API serves. Adding a chain
// means adding it here (and to chain/addresses.ts + client.ts + subgraph
// URL env var) -- every route is a factory function parameterized by
// ChainSlug (see api/routes/*.ts), mounted once per chain in api/index.ts.

export type ChainSlug = "ink" | "arc";

export const CHAIN_SLUGS: ChainSlug[] = ["ink", "arc"];

export function isChainSlug(value: string): value is ChainSlug {
  return (CHAIN_SLUGS as string[]).includes(value);
}
