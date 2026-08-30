import { Router } from "express";
import { querySubgraph } from "../../subgraph/client.js";

const router = Router();

const TOKEN_FIELDS = `
  id family creator quoteToken totalSupply
  createdAt createdAtBlock createdAtTx
  name symbol metaUri
  virtualQuote migrationTarget antibotEnabled tradingBlock migrated bcTokensSold raisedQuote
  positionManager hook tokenId
  campaign { id name symbol goal totalRaised deadline succeeded failed }
`;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

router.get("/", async (req, res) => {
  const family = typeof req.query.family === "string" ? req.query.family.toUpperCase() : undefined;
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const offset = Number(req.query.offset ?? 0);

  try {
    const data = await querySubgraph<{ tokens: unknown[] }>(
      `query Tokens($first: Int!, $skip: Int!, $where: Token_filter) {
        tokens(first: $first, skip: $skip, orderBy: createdAtBlock, orderDirection: desc, where: $where) {
          ${TOKEN_FIELDS}
        }
      }`,
      { first: limit, skip: offset, where: family ? { family } : {} }
    );
    res.json(data.tokens);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/:address", async (req, res) => {
  const address = req.params.address.toLowerCase();

  try {
    const data = await querySubgraph<{
      token: Record<string, unknown> | null;
      position: Record<string, unknown> | null;
      pool: Record<string, unknown> | null;
    }>(
      `query TokenDetail($id: ID!) {
        token(id: $id) {
          ${TOKEN_FIELDS}
          campaign { id creator name symbol dexQuoteAsset goal startTime deadline totalRaised succeeded failed }
        }
        position(id: $id) {
          tokenId poolId hook positionManager registeredAt registeredAtBlock registeredAtTx totalBurned totalToPlatform
        }
        pool(id: $id) { id creator hookFeeBps registeredAt registeredAtBlock swapCount }
      }`,
      { id: address }
    );

    if (data.token == null) return res.status(404).json({ error: "not found" });
    res.json({ ...data.token, position: data.position, pool: data.pool });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

type SubgraphTrade = {
  id: string; trader: string; side: "BUY" | "SELL"; quoteAmount: string; tokenAmount: string;
  tokensToDead: string | null; raisedQuoteAfter: string; timestamp: string; blockNumber: string; txHash: string;
};
type PoolSwapRow = {
  id: string; sender: string; amount0: string; amount1: string; timestamp: string; blockNumber: string; txHash: string;
};

// Trade only exists for pre-migration curve activity (DuckIncubation's
// TokenBought/TokenSold). Once a token migrates -- or always, for INSTANT/
// CAMPAIGN-post-success tokens -- its real trading is Uniswap V4 swaps,
// indexed as PoolSwap (a raw per-swap record on the shared PoolManager
// singleton, not scoped to "our" tokens by itself -- Pool.token is what
// scopes it). Without this merge, any token past the curve phase has zero
// trade/chart data despite genuinely trading.
function poolSwapToTrade(swap: PoolSwapRow, tokenIsCurrency0: boolean): SubgraphTrade {
  const rawTokenAmount = BigInt(tokenIsCurrency0 ? swap.amount0 : swap.amount1);
  const rawQuoteAmount = BigInt(tokenIsCurrency0 ? swap.amount1 : swap.amount0);
  // Swap event amounts are the POOL's balance delta (verified against
  // Uniswap V4's real IPoolManager.sol doc comments) -- positive = pool
  // received it (the trader gave it away), negative = pool paid it out (the
  // trader received it). This is the opposite framing from a hook's
  // afterSwap BalanceDelta, which is the swapper's own delta -- don't reuse
  // that sign convention here.
  const side: "BUY" | "SELL" = rawTokenAmount < 0n ? "BUY" : "SELL";
  return {
    id: swap.id,
    trader: swap.sender,
    side,
    quoteAmount: (rawQuoteAmount < 0n ? -rawQuoteAmount : rawQuoteAmount).toString(),
    tokenAmount: (rawTokenAmount < 0n ? -rawTokenAmount : rawTokenAmount).toString(),
    tokensToDead: null,
    raisedQuoteAfter: "0", // curve-only concept, doesn't apply to a real pool
    timestamp: swap.timestamp,
    blockNumber: swap.blockNumber,
    txHash: swap.txHash,
  };
}

router.get("/:address/trades", async (req, res) => {
  const address = req.params.address.toLowerCase();
  const limit = Math.min(Number(req.query.limit ?? 50), 200);

  try {
    const data = await querySubgraph<{
      trades: SubgraphTrade[];
      token: { quoteToken: string | null } | null;
      pools: { id: string }[];
    }>(
      `query TokenTrades($token: String!, $first: Int!) {
        trades(first: $first, orderBy: blockNumber, orderDirection: desc, where: { token: $token }) {
          id trader side quoteAmount tokenAmount tokensToDead raisedQuoteAfter timestamp blockNumber txHash
        }
        token(id: $token) { quoteToken }
        pools(where: { token: $token }) { id }
      }`,
      { token: address, first: limit }
    );

    let poolTrades: SubgraphTrade[] = [];
    if (data.pools.length > 0) {
      const quoteToken = data.token?.quoteToken ?? ZERO_ADDRESS;
      const tokenIsCurrency0 = BigInt(address) < BigInt(quoteToken);
      const swapData = await querySubgraph<{ poolSwaps: PoolSwapRow[] }>(
        `query PoolSwaps($pools: [String!]!, $first: Int!) {
          poolSwaps(first: $first, orderBy: blockNumber, orderDirection: desc, where: { pool_in: $pools }) {
            id sender amount0 amount1 timestamp blockNumber txHash
          }
        }`,
        { pools: data.pools.map((p) => p.id), first: limit }
      );
      poolTrades = swapData.poolSwaps.map((s) => poolSwapToTrade(s, tokenIsCurrency0));
    }

    const merged = [...data.trades, ...poolTrades]
      .sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber))
      .slice(0, limit);
    res.json(merged);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/:address/holders", async (req, res) => {
  const address = req.params.address.toLowerCase();
  const limit = Math.min(Number(req.query.limit ?? 50), 200);

  try {
    const data = await querySubgraph<{ holders: unknown[] }>(
      `query TokenHolders($token: String!, $first: Int!) {
        holders(first: $first, orderBy: balance, orderDirection: desc, where: { token: $token, balance_gt: "0" }) {
          account balance updatedAt updatedAtBlock
        }
      }`,
      { token: address, first: limit }
    );
    res.json(data.holders);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
