import { Router } from "express";
import { querySubgraph } from "../../subgraph/client.js";

const router = Router();

const TOKEN_FIELDS = `
  id family creator quoteToken totalSupply
  createdAt createdAtBlock createdAtTx
  name symbol metaUri burnedSupply holderCount lastPrice lastPriceUsd volumeAllTime volumeAllTimeUsd
  virtualQuote migrationTarget antibotEnabled tradingBlock migrated bcTokensSold raisedQuote
  positionManager hook tokenId
  campaign { id name symbol goal totalRaised deadline succeeded failed }
`;

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// "Last 24 hours from now" is a moving target TokenHourData's static hourly
// rows can't represent by themselves -- summing the buckets whose hour
// started within the last day approximates a rolling 24h window at hourly
// granularity (the edge bucket can be a few minutes short/over), which is
// the standard tradeoff for this kind of rollup and far cheaper than
// re-scanning raw trades on every request.
//
// 24h price change reuses the same query: each bucket's closePrice/
// closePriceUsd is the token's price as of its last trade that hour, so the
// most recent bucket at-or-before the 24h-ago cutoff is "price ~24h ago" --
// compared against the token's current lastPrice/lastPriceUsd. A 7-day
// lookback window (not just 24h) gives that comparison something to find
// even for a token that hasn't traded in the last day; genuinely no prior
// bucket (too new, or never traded before that point) leaves the change
// honestly null rather than fabricating 0%.
async function attachDerivedStats<T extends { id: string; lastPrice: string | null; lastPriceUsd: string | null }>(
  tokens: T[]
): Promise<
  (T & { volume24h: string; volume24hUsd: string; priceChange24h: number | null; priceChange24hUsd: number | null })[]
> {
  if (tokens.length === 0) return [];
  const now = Math.floor(Date.now() / 1000);
  const cutoff24h = now - 24 * 60 * 60;
  const cutoff7d = now - 7 * 24 * 60 * 60;
  const data = await querySubgraph<{
    tokenHourDatas: { token: { id: string }; hourStartUnix: string; volumeQuote: string; volumeUsd: string; closePrice: string | null; closePriceUsd: string | null }[];
  }>(
    `query DerivedStats($tokens: [String!]!, $cutoff: BigInt!) {
      tokenHourDatas(first: 1000, orderBy: hourStartUnix, orderDirection: desc, where: { token_in: $tokens, hourStartUnix_gte: $cutoff }) {
        token { id }
        hourStartUnix
        volumeQuote
        volumeUsd
        closePrice
        closePriceUsd
      }
    }`,
    { tokens: tokens.map((t) => t.id), cutoff: String(cutoff7d) }
  );

  const volSums = new Map<string, bigint>();
  const volUsdSums = new Map<string, number>();
  const priceBefore24h = new Map<string, { price: number | null; priceUsd: number | null }>();
  for (const row of data.tokenHourDatas) {
    const hourStart = Number(row.hourStartUnix);
    if (hourStart >= cutoff24h) {
      volSums.set(row.token.id, (volSums.get(row.token.id) ?? 0n) + BigInt(row.volumeQuote));
      volUsdSums.set(row.token.id, (volUsdSums.get(row.token.id) ?? 0) + Number(row.volumeUsd));
    }
    // Rows arrive newest-first; the first one at-or-before the cutoff we
    // see per token is the closest available "price 24h ago".
    if (hourStart <= cutoff24h && !priceBefore24h.has(row.token.id)) {
      priceBefore24h.set(row.token.id, {
        price: row.closePrice != null ? Number(row.closePrice) : null,
        priceUsd: row.closePriceUsd != null ? Number(row.closePriceUsd) : null,
      });
    }
  }

  const pctChange = (curr: number | null, prev: number | null | undefined) =>
    curr != null && prev != null && prev !== 0 ? ((curr - prev) / prev) * 100 : null;

  return tokens.map((t) => {
    const prev = priceBefore24h.get(t.id);
    return {
      ...t,
      volume24h: (volSums.get(t.id) ?? 0n).toString(),
      volume24hUsd: String(volUsdSums.get(t.id) ?? 0),
      priceChange24h: pctChange(t.lastPrice != null ? Number(t.lastPrice) : null, prev?.price),
      priceChange24hUsd: pctChange(t.lastPriceUsd != null ? Number(t.lastPriceUsd) : null, prev?.priceUsd),
    };
  });
}

router.get("/", async (req, res) => {
  const family = typeof req.query.family === "string" ? req.query.family.toUpperCase() : undefined;
  const limit = Math.min(Number(req.query.limit ?? 50), 200);
  const offset = Number(req.query.offset ?? 0);

  try {
    const data = await querySubgraph<{ tokens: { id: string; lastPrice: string | null; lastPriceUsd: string | null }[] }>(
      `query Tokens($first: Int!, $skip: Int!, $where: Token_filter) {
        tokens(first: $first, skip: $skip, orderBy: createdAtBlock, orderDirection: desc, where: $where) {
          ${TOKEN_FIELDS}
        }
      }`,
      { first: limit, skip: offset, where: family ? { family } : {} }
    );
    res.json(await attachDerivedStats(data.tokens));
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
      // Pool.id is the poolId (bytes32), never the token address -- unlike
      // Position.id, which really is the token address -- so this has to be
      // a filtered plural query, not pool(id: $id) (that would always
      // return null; a token address can never equal a poolId).
      pools: Record<string, unknown>[];
    }>(
      `query TokenDetail($id: ID!) {
        token(id: $id) {
          ${TOKEN_FIELDS}
          campaign { id creator name symbol dexQuoteAsset goal startTime deadline totalRaised succeeded failed }
        }
        position(id: $id) {
          tokenId poolId hook positionManager registeredAt registeredAtBlock registeredAtTx totalBurned totalToPlatform
        }
        pools(where: { token: $id }, first: 1) { id creator hookFeeBps registeredAt registeredAtBlock swapCount }
      }`,
      { id: address }
    );

    if (data.token == null) return res.status(404).json({ error: "not found" });
    const [withStats] = await attachDerivedStats([data.token as { id: string; lastPrice: string | null; lastPriceUsd: string | null }]);
    res.json({ ...withStats, position: data.position, pool: data.pools[0] ?? null });
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
  // IPoolManager.sol's doc comment reads "the delta of the currencyN
  // balance of the pool", which reads as positive=pool-receives -- that
  // turned out to be backwards in practice. Verified against two real,
  // independent transactions on this exact pool by checking the token's
  // actual ERC20 Transfer log in each: a positive token-side amount here
  // corresponds to the pool sending the token OUT to the trader (a BUY);
  // negative corresponds to the trader sending it IN to the pool (a SELL).
  const side: "BUY" | "SELL" = rawTokenAmount > 0n ? "BUY" : "SELL";
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
      // A token can only ever get one locked LP position, ever --
      // DuckLocker.registerPosition reverts if positions[token] is already
      // set (Position.id is the token address itself, a 1:1 mapping
      // enforced on-chain). Position.poolId is therefore THE one real pool
      // this token trades on, if any -- reading it this way, instead of
      // searching Pool by token, holds regardless of whether Pool's own
      // schema happens to allow more than one row per token.
      position: { poolId: string } | null;
    }>(
      `query TokenTrades($token: String!, $first: Int!) {
        trades(first: $first, orderBy: blockNumber, orderDirection: desc, where: { token: $token }) {
          id trader side quoteAmount tokenAmount tokensToDead raisedQuoteAfter timestamp blockNumber txHash
        }
        token(id: $token) { quoteToken }
        position(id: $token) { poolId }
      }`,
      { token: address, first: limit }
    );

    let poolTrades: SubgraphTrade[] = [];
    if (data.position?.poolId) {
      const quoteToken = data.token?.quoteToken ?? ZERO_ADDRESS;
      const tokenIsCurrency0 = BigInt(address) < BigInt(quoteToken);
      const swapData = await querySubgraph<{ poolSwaps: PoolSwapRow[] }>(
        `query PoolSwaps($pool: String!, $first: Int!) {
          poolSwaps(first: $first, orderBy: blockNumber, orderDirection: desc, where: { pool: $pool }) {
            id sender amount0 amount1 timestamp blockNumber txHash
          }
        }`,
        { pool: data.position.poolId, first: limit }
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
