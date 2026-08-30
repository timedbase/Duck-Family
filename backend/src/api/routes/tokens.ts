import { Router } from "express";
import { querySubgraph } from "../../subgraph/client.js";

const router = Router();

const TOKEN_FIELDS = `
  id family creator quoteToken totalSupply
  createdAt createdAtBlock createdAtTx
  virtualQuote migrationTarget antibotEnabled tradingBlock migrated bcTokensSold raisedQuote
  positionManager hook tokenId
  campaign { id name symbol goal totalRaised deadline succeeded failed }
`;

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

router.get("/:address/trades", async (req, res) => {
  const address = req.params.address.toLowerCase();
  const limit = Math.min(Number(req.query.limit ?? 50), 200);

  try {
    const data = await querySubgraph<{ trades: unknown[] }>(
      `query TokenTrades($token: String!, $first: Int!) {
        trades(first: $first, orderBy: blockNumber, orderDirection: desc, where: { token: $token }) {
          id trader side quoteAmount tokenAmount tokensToDead raisedQuoteAfter timestamp blockNumber txHash
        }
      }`,
      { token: address, first: limit }
    );
    res.json(data.trades);
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
