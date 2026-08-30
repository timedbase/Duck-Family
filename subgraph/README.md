# duckfun.family subgraph

Indexes activity across all three launcher families (`DuckIncubation`,
`DuckLauncher`, `DuckRaise`), the shared `DuckLocker` and `DuckHookV4`, and
raw Uniswap V4 `PoolManager` swap/liquidity activity for pools this platform
created — on Ink chain (57073).

Addresses are pinned to the live deployment recorded in
the [Duck-Family-Contract](https://github.com/timedbase/Duck-Family-Contract) repo's `deploy/deployments/ink.json`.

**Live endpoint** (deployed, fully synced, zero indexing errors as of
2026-08-30 — verified via `_meta`, see that file's `subgraph` entry):

```
https://api.goldsky.com/api/public/project_cmhtxnzpqm81001w94ksmgira/subgraphs/duckfun-ink/1.0.0/gn
```

## What's indexed

- **Token lifecycle** — creation/launch (`Token`, one per contract-created
  ERC20, tagged `CURVE`/`INSTANT`/`CAMPAIGN`), bonding-curve buys/sells
  (`Trade`), migration (`Migration`), curve-fee claims (`CurveFeeClaim`).
- **Crowdfunding** — `Campaign` + `Contribution` (contribute/claim/refund).
- **LP position / hook** — `Position` + `LPFeeClaim` (DuckLocker's 1% LP-tier
  fee), `Pool` + `HookFeeClaim` (DuckHookV4's 2% sell-fee skim) +
  `CTOApplication` (creator-takeover flow).
- **Raw pool activity** — `PoolSwap` / `PoolLiquidityChange`, read off the
  real Uniswap V4 `PoolManager` singleton and filtered in the mapping to
  only the pools this platform registered (`PoolManager` emits for every
  pool on Ink, not just ours — see `src/pool-manager.ts`).
- **Holder balances** — `Holder`, via a per-token `Transfer` template
  (`DuckToken`) dynamically instantiated the moment each token is created.

## What's deliberately NOT indexed

Governance/admin config that rarely changes and is cheap to read directly
via a `cast call` when needed, rather than maintaining entities for: DEX/
quote-token/route setters, platform-wallet/platform-token setters, timelock
queue/execute/cancel, rescue events, launcher/impl updates. If any of this
becomes worth querying historically, add the handler the same way as the
existing ones — nothing about the schema forecloses it.

## Local build

```bash
npm install
npm run codegen   # generates generated/ from subgraph.yaml + schema.graphql + abis/
npm run build     # compiles the AssemblyScript mappings to build/*.wasm
```

Both were run clean while building this out — zero codegen/compile errors
across all 7 mapping files.

## Deploying to Goldsky

```bash
cd subgraph
npm run codegen && npm run build
npx @goldskycom/cli login   # opens a browser to authenticate
npx @goldskycom/cli subgraph deploy duckfun-ink/1.0.0 --path .
```

`npx` avoids the `npm install -g @goldskycom/cli` route entirely, which fails
with `EACCES` on setups where npm's global prefix (e.g. `/usr/lib`) isn't
user-writable. If you'd rather have `goldsky` as a bare command on your
`PATH`, either fix npm's global prefix (`npm config set prefix ~/.npm-global`
and add `~/.npm-global/bin` to `PATH`) or run the install with `sudo` — `npx`
sidesteps needing either.

Notes:

- `network: ink` in `subgraph.yaml` assumes Goldsky has Ink (57073)
  pre-registered under that network slug. If `goldsky subgraph deploy`
  rejects it, check Goldsky's supported-networks list for the exact slug
  they use for Ink, or use their "instant subgraph" / custom-RPC flow if
  Ink isn't in their managed network list yet — either way, only the
  `network:` fields in `subgraph.yaml` need to change, nothing else.
- `startBlock: 54557753` on every data source is the deployment block from
  the Duck-Family-Contract repo's `deploy/deployments/ink.json` — nothing before that block is
  relevant, so this keeps the initial sync fast.
- If any of the five core contracts are ever upgraded to add new events
  worth indexing (they're all UUPS-upgradeable), this subgraph does **not**
  need redeploying for the upgrade itself — only if you want to add
  handlers for genuinely new events, since the proxy address and existing
  event signatures stay the same across an implementation upgrade.
- Re-deploying with the same `name/version` (e.g. `duckfun-ink/1.0.0`)
  updates in place; bump the version tag for a fresh resync.

## Schema conventions

- IDs: `Token`/`Position`/`Migration` are keyed by token address;
  `Pool`/`CTOApplication` by the hook's `poolId`; `Campaign`/`Contribution`
  by DuckRaise's own campaign counter; everything else event-shaped
  (`Trade`, `*FeeClaim`, `PoolSwap`, `PoolLiquidityChange`) is
  `txHash-logIndex`.
- `Pool`/`Position`/`Migration` are **not** back-referenced from `Token` —
  query them directly by the token's address as their id instead. This
  sidesteps a real cross-contract event-ordering issue: `PositionRegistered`
  (DuckLocker) and `PoolRegistered` (DuckHookV4) both fire *before*
  `TokenLaunched`/`CampaignSucceeded` in the same transaction for
  INSTANT/CAMPAIGN tokens, so the `Token` entity wouldn't exist yet if the
  child tried to set a back-reference on it at that point. CURVE tokens
  don't have this issue (`TokenCreated` always comes first), but the same
  direct-by-id convention is used uniformly for consistency.
