# duckfun.family

Launchpad backend, frontend, and subgraph for duckfun.family on Ink chain (57073). Contracts live
in the separate [Duck-Family-Contract](https://github.com/timedbase/Duck-Family-Contract) repo.

## Layout

| Path | What |
|---|---|
| [`backend/`](backend) | Thin Express API in front of the subgraph + live chain reads. Deploys to Render — see [`render.yaml`](render.yaml). |
| [`interface/`](interface) | React (Vite) launchpad UI — real wallet connection, real Uniswap V4 trading via the Universal Router, real contract calls for every create/buy/sell/contribute action. Deploys to Vercel. |
| [`subgraph/`](subgraph) | Goldsky subgraph indexing all three launcher families, the shared locker/hook, and raw Uniswap V4 pool activity. |

## Deployment

1. **Subgraph** — deploy first; both the backend and frontend consume its GraphQL endpoint.
   See [`subgraph/README.md`](subgraph/README.md).
2. **Backend** — deploy to Render (`render.yaml` at this repo's root, `rootDir: backend`). Set
   `INK_RPC_URL` and `PINATA_JWT` in Render's dashboard (not committed). See
   [`backend/README.md`](backend/README.md).
3. **Frontend** — deploy to Vercel, framework preset "Vite", root directory `interface`. Set
   `VITE_API_URL` to the backend's public Render URL.

Live contract addresses and the verified Ink infrastructure they wire into are recorded in
[Duck-Family-Contract's `deploy/deployments/ink.json`](https://github.com/timedbase/Duck-Family-Contract/blob/main/deploy/deployments/ink.json).
