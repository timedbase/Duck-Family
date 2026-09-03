import { Router } from "express";
import { querySubgraph } from "../../subgraph/client.js";
import type { ChainSlug } from "../../chain/registry.js";

const CAMPAIGN_FIELDS = `
  id creator name symbol dexQuoteAsset goal startTime deadline totalRaised succeeded failed
  createdAt createdAtBlock createdAtTx resolvedAt resolvedAtBlock
  token { id }
`;

export default function createCampaignsRouter(chain: ChainSlug) {
  const router = Router();

  router.get("/", async (req, res) => {
    const limit = Math.min(Number(req.query.limit ?? 50), 200);
    const offset = Number(req.query.offset ?? 0);

    try {
      const data = await querySubgraph<{ campaigns: unknown[] }>(
        chain,
        `query Campaigns($first: Int!, $skip: Int!) {
          campaigns(first: $first, skip: $skip, orderBy: createdAtBlock, orderDirection: desc) {
            ${CAMPAIGN_FIELDS}
          }
        }`,
        { first: limit, skip: offset }
      );
      res.json(data.campaigns);
    } catch (err) {
      res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  router.get("/:id", async (req, res) => {
    try {
      const data = await querySubgraph<{ campaign: Record<string, unknown> | null }>(
        chain,
        `query CampaignDetail($id: ID!) {
          campaign(id: $id) {
            ${CAMPAIGN_FIELDS}
            contributions {
              id contributor amount claimed claimedAmount refunded refundedAmount firstContributedAt lastContributedAt
            }
          }
        }`,
        { id: req.params.id }
      );
      if (data.campaign == null) return res.status(404).json({ error: "not found" });
      res.json(data.campaign);
    } catch (err) {
      res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
    }
  });

  return router;
}
