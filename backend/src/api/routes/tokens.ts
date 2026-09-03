import { Router } from "express";
import { querySubgraph } from "../../subgraph/client.js";
import type { ChainSlug } from "../../chain/registry.js";

const TOKEN_FIELDS = `
  id family creator quoteToken totalSupply
  createdAt createdAtBlock createdAtTx
  name symbol metaUri metaOverrideUri burnedSupply holderCount lastPrice lastPriceUsd lastTradeAt volumeAllTime volumeAllTimeUsd
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
// even for a token that hasn't traded in the last day. A token younger than
// 24h has no such bucket by definition -- rather than showing nothing,
// falls back to its EARLIEST tracked bucket (i.e. "change since we first
// saw a price for it"), which is still a real, honest number; only a token
// with zero trade history at all (no buckets in the window) gets null.
async function attachDerivedStats<T extends { id: string; lastPrice: string | null; lastPriceUsd: string | null }>(
  chain: ChainSlug,
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
    chain,
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
  // Rows arrive newest-first per token, so overwriting this on every row
  // (rather than only-if-absent) leaves each token's LAST-seen row --
  // chronologically its oldest -- once the loop finishes.
  const earliestBucket = new Map<string, { price: number | null; priceUsd: number | null }>();
  for (const row of data.tokenHourDatas) {
    const hourStart = Number(row.hourStartUnix);
    if (hourStart >= cutoff24h) {
      volSums.set(row.token.id, (volSums.get(row.token.id) ?? 0n) + BigInt(row.volumeQuote));
      volUsdSums.set(row.token.id, (volUsdSums.get(row.token.id) ?? 0) + Number(row.volumeUsd));
    }
    // The first one at-or-before the cutoff we see per token is the
    // closest available "price 24h ago".
    if (hourStart <= cutoff24h && !priceBefore24h.has(row.token.id)) {
      priceBefore24h.set(row.token.id, {
        price: row.closePrice != null ? Number(row.closePrice) : null,
        priceUsd: row.closePriceUsd != null ? Number(row.closePriceUsd) : null,
      });
    }
    earliestBucket.set(row.token.id, {
      price: row.closePrice != null ? Number(row.closePrice) : null,
      priceUsd: row.closePriceUsd != null ? Number(row.closePriceUsd) : null,
    });
  }

  const pctChange = (curr: number | null, prev: number | null | undefined) =>
    curr != null && prev != null && prev !== 0 ? ((curr - prev) / prev) * 100 : null;

  return tokens.map((t) => {
    const prev = priceBefore24h.get(t.id) ?? earliestBucket.get(t.id);
    return {
      ...t,
      volume24h: (volSums.get(t.id) ?? 0n).toString(),
      volume24hUsd: String(volUsdSums.get(t.id) ?? 0),
      priceChange24h: pctChange(t.lastPrice != null ? Number(t.lastPrice) : null, prev?.price),
      priceChange24hUsd: pctChange(t.lastPriceUsd != null ? Number(t.lastPriceUsd) : null, prev?.priceUsd),
    };
  });
}

// Token has no reverse relation to Pool in the subgraph schema (only
// Pool.token -> Token forward), so a poolId can't just be nested onto
// TOKEN_FIELDS -- batch-fetch pools for the whole page in one extra query
// and merge poolId onto each token, same shape as attachDerivedStats above.
async function attachPoolIds<T extends { id: string }>(chain: ChainSlug, tokens: T[]): Promise<(T & { poolId: string | null })[]> {
  if (tokens.length === 0) return [];
  const data = await querySubgraph<{ pools: { id: string; token: { id: string } }[] }>(
    chain,
    `query TokenPools($tokens: [String!]!) {
      pools(where: { token_in: $tokens }, first: 1000) { id token { id } }
    }`,
    { tokens: tokens.map((t) => t.id) }
  );
  const poolIdByToken = new Map(data.pools.map((p) => [p.token.id, p.id]));
  return tokens.map((t) => ({ ...t, poolId: poolIdByToken.get(t.id) ?? null }));
}

const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs/";
function ipfsToHttp(uri: string | null | undefined): string | null {
  if (!uri) return null;
  if (uri.startsWith("ipfs://")) return PINATA_GATEWAY + uri.slice("ipfs://".length);
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  return null;
}

type ResolvedMeta = { imageUrl: string | null; socials: { website?: string; twitter?: string; telegram?: string } };
const EMPTY_SOCIALS = {};

// Every browser was independently doing this exact fetch (metaURI JSON off
// IPFS, just to read its `image` field) and hitting Pinata's slow shared
// public gateway cold every time -- the reported "images load really slow"
// complaint. Resolving it here once, cached process-wide, means every user
// after the first gets it instantly instead of each of them paying that
// gateway round trip themselves. Keyed by the URI string itself, so a
// *changed* URI (a new DuckMetaOverride registration) is simply a different
// cache key -- there's no staleness to reason about, only ever the current
// metaUri/metaOverrideUri a token has right now (see duck-meta-override.ts:
// the subgraph already only ever tracks the latest override, nothing here
// needs to re-derive that). A failed resolution is deliberately NOT cached
// (evicted before returning), so a transient gateway hiccup self-heals on
// the next request instead of permanently pinning a token to "no image".
//
// `socials` rides along on this same fetch -- the metadata JSON already has
// it (see App.jsx's buildMetaURI), so surfacing it here for Discover's
// per-card social icons costs nothing extra; a second, separate fetch just
// to read the same document would undo the point of caching it at all.
const metaCache = new Map<string, Promise<ResolvedMeta>>();
function resolveMeta(metaUri: string | null | undefined): Promise<ResolvedMeta> {
  if (!metaUri) return Promise.resolve({ imageUrl: null, socials: EMPTY_SOCIALS });
  const cached = metaCache.get(metaUri);
  if (cached) return cached;
  const promise = (async (): Promise<ResolvedMeta> => {
    try {
      const url = ipfsToHttp(metaUri);
      if (!url) return { imageUrl: null, socials: EMPTY_SOCIALS };
      const res = await fetch(url);
      if (!res.ok) throw new Error(`gateway ${res.status}`);
      const data = (await res.json()) as { image?: string; socials?: ResolvedMeta["socials"] };
      const imageUrl = ipfsToHttp(data.image);
      if (!imageUrl) metaCache.delete(metaUri);
      return { imageUrl, socials: data.socials || EMPTY_SOCIALS };
    } catch {
      metaCache.delete(metaUri);
      return { imageUrl: null, socials: EMPTY_SOCIALS };
    }
  })();
  metaCache.set(metaUri, promise);
  return promise;
}

async function attachImageUrls<T extends { metaUri: string | null; metaOverrideUri: string | null }>(
  tokens: T[]
): Promise<(T & ResolvedMeta)[]> {
  const metas = await Promise.all(tokens.map((t) => resolveMeta(t.metaOverrideUri || t.metaUri)));
  return tokens.map((t, i) => ({ ...t, ...metas[i] }));
}

export default function createTokensRouter(chain: ChainSlug) {
  const router = Router();

  router.get("/", async (req, res) => {
    const family = typeof req.query.family === "string" ? req.query.family.toUpperCase() : undefined;
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const offset = Number(req.query.offset ?? 0);

    try {
      const data = await querySubgraph<{
        tokens: { id: string; lastPrice: string | null; lastPriceUsd: string | null; metaUri: string | null; metaOverrideUri: string | null }[];
      }>(
        chain,
        `query Tokens($first: Int!, $skip: Int!, $where: Token_filter) {
          tokens(first: $first, skip: $skip, orderBy: createdAtBlock, orderDirection: desc, where: $where) {
            ${TOKEN_FIELDS}
          }
        }`,
        { first: limit, skip: offset, where: family ? { family } : {} }
      );
      res.json(await attachImageUrls(await attachPoolIds(chain, await attachDerivedStats(chain, data.tokens))));
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
        chain,
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
      const [withStats] = await attachDerivedStats(chain, [
        data.token as { id: string; lastPrice: string | null; lastPriceUsd: string | null },
      ]);
      const [withImage] = await attachImageUrls([
        withStats as typeof withStats & { metaUri: string | null; metaOverrideUri: string | null },
      ]);
      res.json({ ...withImage, position: data.position, pool: data.pools[0] ?? null });
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
  const offset = Math.max(Number(req.query.offset ?? 0), 0);
  // Trades merge two independently-paginated subgraph sources (curve Trade
  // entities + raw PoolSwap rows) before sorting -- there's no single cursor
  // that pages both at once, and no running total-trade-count field on
  // either Token or Pool, so real (not "next page exists") pagination needs
  // an actual count. Fetching up to CAP from each side unconditionally
  // (regardless of the requested page) gives an exact total for anything up
  // to CAP combined trades -- fine at today's volume, same "revisit once
  // this routinely hits it" tradeoff as platform.ts's /stats route.
  const CAP = 1000;

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
      chain,
      `query TokenTrades($token: String!, $first: Int!) {
        trades(first: $first, orderBy: blockNumber, orderDirection: desc, where: { token: $token }) {
          id trader side quoteAmount tokenAmount tokensToDead raisedQuoteAfter timestamp blockNumber txHash
        }
        token(id: $token) { quoteToken }
        position(id: $token) { poolId }
      }`,
      { token: address, first: CAP }
    );

    let poolTrades: SubgraphTrade[] = [];
    if (data.position?.poolId) {
      const quoteToken = data.token?.quoteToken ?? ZERO_ADDRESS;
      const tokenIsCurrency0 = BigInt(address) < BigInt(quoteToken);
      const swapData = await querySubgraph<{ poolSwaps: PoolSwapRow[] }>(
        chain,
        `query PoolSwaps($pool: String!, $first: Int!) {
          poolSwaps(first: $first, orderBy: blockNumber, orderDirection: desc, where: { pool: $pool }) {
            id sender amount0 amount1 timestamp blockNumber txHash
          }
        }`,
        { pool: data.position.poolId, first: CAP }
      );
      poolTrades = swapData.poolSwaps.map((s) => poolSwapToTrade(s, tokenIsCurrency0));
    }

    const merged = [...data.trades, ...poolTrades].sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));
    res.json({ items: merged.slice(offset, offset + limit), total: merged.length });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
  });

  router.get("/:address/holders", async (req, res) => {
    const address = req.params.address.toLowerCase();
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const offset = Math.max(Number(req.query.offset ?? 0), 0);

    try {
      // Token.holderCount is a running counter maintained on every
      // zero-balance crossing (see schema.graphql), so it's already exactly
      // "accounts with balance > 0" -- the same set this query filters to --
      // with no separate count query needed.
      const data = await querySubgraph<{ holders: unknown[]; token: { holderCount: number } | null }>(
        chain,
        `query TokenHolders($token: String!, $first: Int!, $skip: Int!) {
          holders(first: $first, skip: $skip, orderBy: balance, orderDirection: desc, where: { token: $token, balance_gt: "0" }) {
            account balance updatedAt updatedAtBlock
          }
          token(id: $token) { holderCount }
        }`,
        { token: address, first: limit, skip: offset }
      );
      res.json({ items: data.holders, total: data.token?.holderCount ?? data.holders.length });
    } catch (err) {
      res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  return router;
}
