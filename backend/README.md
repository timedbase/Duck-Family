# duckfun.family backend

A small Express API (Node/TypeScript) for the duckfun.family contracts on
Ink chain (57073). Meant to run on Render's Starter plan, per
`render.yaml` in the Duck-Family repo's root.

## Architecture

There is no indexer or database here anymore. Chain activity (tokens,
trades, campaigns, LP positions, hook pools, holder balances, raw V4 pool
swaps) is indexed by a Goldsky subgraph (`../subgraph/`) — this API is a
thin layer in front of it:

- **Activity/lifecycle data** (tokens, trades, campaigns, contributions,
  positions, pools, holders) — proxied from the subgraph's GraphQL endpoint
  (`src/subgraph/client.ts`), reshaped into a plain REST API for the
  frontend in `../interface/`.
- **Platform config** (`platformWallet`, fees, quote-token whitelists, DEX
  wiring) — read live via `viem` RPC calls straight from the contracts
  (`src/api/routes/platform.ts`). This is deliberately *not* pulled from the
  subgraph: it's rarely-changing owner-only config, and the subgraph
  deliberately doesn't index those setter events (see
  `../subgraph/README.md`) — a handful of on-demand `eth_call`s is simpler
  than maintaining entities for it.
- **Uploads** (`src/api/routes/upload.ts`) — pins images/metadata to IPFS
  via Pinata for token creation. Untouched by this migration; never touched
  chain data or a database.

An earlier version of this backend ran its own RPC-polling indexer writing
into Postgres (Drizzle ORM), targeting the previous HyperEVM deployment.
That's been retired in favor of the subgraph now that one exists and is
live — no reason to run two indexing pipelines for the same data.

## Local setup

```bash
cp .env.example .env   # fill in SUBGRAPH_URL, INK_RPC_URL, PINATA_JWT
npm install
npm run api:dev
```

`npm run build` type-checks and compiles to `dist/`.

## Design notes

- **Contract addresses/ABIs** live in `src/chain/addresses.ts` and
  `src/chain/abis.ts`. Addresses are kept in lockstep with
  the [Duck-Family-Contract](https://github.com/timedbase/Duck-Family-Contract) repo's `deploy/deployments/ink.json` — if the contracts are ever
  redeployed, update both.
- **Quote-token whitelists aren't enumerable on-chain** (`quoteTokenAllowed`
  etc. are plain mappings, no getter returns the full set) — the
  `/quote-tokens` and `/quote-assets` routes check a hardcoded candidate
  list (`DEFAULT_QUOTE_TOKENS`/`RAISE_DEFAULT_QUOTE_ASSETS` in
  `addresses.ts`, matching each contract's on-chain default) against the
  live contract state. If the owner ever adds a quote token beyond that
  default set via `setQuoteTokenAllowed`, this list needs a manual update to
  surface it — there's no way to discover it automatically without indexing
  the `QuoteTokenUpdated`/`QuoteTokenAdded`/`QuoteAssetUpdated` events (which
  the subgraph currently doesn't).
- **Subgraph errors surface as 502s.** `querySubgraph` throws on a
  GraphQL-level error or a non-OK HTTP response; every route's try/catch
  turns that into `502 { error }` rather than a raw 500, since it's an
  upstream-dependency failure, not a bug in this API.

## Deploying

`render.yaml` (Duck-Family repo root) defines a single web service (Starter plan). From the
Render dashboard: New → Blueprint → point at this repo → it reads
`render.yaml` from the repo root. You'll be prompted for `INK_RPC_URL` and
`PINATA_JWT` (both marked `sync: false`) since those are real
credentials/URLs that shouldn't live in the blueprint file.
