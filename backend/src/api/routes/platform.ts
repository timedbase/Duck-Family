import { Router } from "express";
import { publicClient } from "../../chain/client.js";
import { querySubgraph } from "../../subgraph/client.js";
import {
  DUCK_INCUBATION,
  DUCK_LAUNCHER,
  DUCK_RAISE,
  DUCK_LOCKER,
  DUCK_HOOK,
  V4_POSITION_MANAGER,
  DEFAULT_QUOTE_TOKENS,
  RAISE_DEFAULT_QUOTE_ASSETS,
} from "../../chain/addresses.js";
import {
  DUCK_INCUBATION_ABI,
  DUCK_LAUNCHER_ABI,
  DUCK_RAISE_ABI,
  DUCK_LOCKER_ABI,
  DUCK_HOOK_ABI,
} from "../../chain/abis.js";

const router = Router();

// Rarely-changing owner config, read live via RPC rather than indexed --
// see subgraph/README.md's "What's deliberately NOT indexed" section for
// why. Each of these is a handful of cheap eth_call reads, fine to do
// per-request without caching for this traffic volume; add caching here
// first if that ever stops being true.

router.get("/locker", async (_req, res) => {
  try {
    const [owner, platformWallet, platformToken] = await Promise.all([
      publicClient.readContract({ address: DUCK_LOCKER, abi: DUCK_LOCKER_ABI, functionName: "owner" }),
      publicClient.readContract({ address: DUCK_LOCKER, abi: DUCK_LOCKER_ABI, functionName: "platformWallet" }),
      publicClient.readContract({ address: DUCK_LOCKER, abi: DUCK_LOCKER_ABI, functionName: "platformToken" }),
    ]);
    res.json({ address: DUCK_LOCKER, owner, platformWallet, platformToken });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/hook", async (_req, res) => {
  try {
    const [owner, platformWallet, ctoFee, hookFeeDefaultBps] = await Promise.all([
      publicClient.readContract({ address: DUCK_HOOK, abi: DUCK_HOOK_ABI, functionName: "owner" }),
      publicClient.readContract({ address: DUCK_HOOK, abi: DUCK_HOOK_ABI, functionName: "platformWallet" }),
      publicClient.readContract({ address: DUCK_HOOK, abi: DUCK_HOOK_ABI, functionName: "ctoFee" }),
      publicClient.readContract({ address: DUCK_HOOK, abi: DUCK_HOOK_ABI, functionName: "HOOK_FEE_DEFAULT_BPS" }),
    ]);
    res.json({ address: DUCK_HOOK, owner, platformWallet, ctoFee: ctoFee.toString(), hookFeeDefaultBps: Number(hookFeeDefaultBps) });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/curve", async (_req, res) => {
  try {
    const [platformWallet, platformToken, creationFee, v4PositionManager, v4Singleton, v4Permit2, v4Hook] = await Promise.all([
      publicClient.readContract({ address: DUCK_INCUBATION, abi: DUCK_INCUBATION_ABI, functionName: "platformWallet" }),
      publicClient.readContract({ address: DUCK_INCUBATION, abi: DUCK_INCUBATION_ABI, functionName: "platformToken" }),
      publicClient.readContract({ address: DUCK_INCUBATION, abi: DUCK_INCUBATION_ABI, functionName: "creationFee" }),
      publicClient.readContract({ address: DUCK_INCUBATION, abi: DUCK_INCUBATION_ABI, functionName: "v4PositionManager" }),
      publicClient.readContract({ address: DUCK_INCUBATION, abi: DUCK_INCUBATION_ABI, functionName: "v4Singleton" }),
      publicClient.readContract({ address: DUCK_INCUBATION, abi: DUCK_INCUBATION_ABI, functionName: "v4Permit2" }),
      publicClient.readContract({ address: DUCK_INCUBATION, abi: DUCK_INCUBATION_ABI, functionName: "v4Hook" }),
    ]);
    res.json({
      address: DUCK_INCUBATION,
      platformWallet,
      platformToken,
      creationFee: creationFee.toString(),
      dex: { positionManager: v4PositionManager, singleton: v4Singleton, permit2: v4Permit2, hook: v4Hook },
    });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/launcher", async (_req, res) => {
  try {
    const [platformWallet, platformToken, launchFee, dex] = await Promise.all([
      publicClient.readContract({ address: DUCK_LAUNCHER, abi: DUCK_LAUNCHER_ABI, functionName: "platformWallet" }),
      publicClient.readContract({ address: DUCK_LAUNCHER, abi: DUCK_LAUNCHER_ABI, functionName: "platformToken" }),
      publicClient.readContract({ address: DUCK_LAUNCHER, abi: DUCK_LAUNCHER_ABI, functionName: "launchFee" }),
      publicClient.readContract({
        address: DUCK_LAUNCHER,
        abi: DUCK_LAUNCHER_ABI,
        functionName: "dexes",
        args: [V4_POSITION_MANAGER],
      }),
    ]);
    res.json({
      address: DUCK_LAUNCHER,
      platformWallet,
      platformToken,
      launchFee: launchFee.toString(),
      dex: { positionManager: V4_POSITION_MANAGER, singleton: dex[0], permit2: dex[1], hook: dex[2], enabled: dex[3] },
    });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/raise", async (_req, res) => {
  try {
    const [platformWallet, platformToken, campaignFee, v4PositionManager, v4Singleton, v4Permit2, v4Hook] = await Promise.all([
      publicClient.readContract({ address: DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "platformWallet" }),
      publicClient.readContract({ address: DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "platformToken" }),
      publicClient.readContract({ address: DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "campaignFee" }),
      publicClient.readContract({ address: DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "v4PositionManager" }),
      publicClient.readContract({ address: DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "v4Singleton" }),
      publicClient.readContract({ address: DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "v4Permit2" }),
      publicClient.readContract({ address: DUCK_RAISE, abi: DUCK_RAISE_ABI, functionName: "v4Hook" }),
    ]);
    res.json({
      address: DUCK_RAISE,
      platformWallet,
      platformToken,
      campaignFee: campaignFee.toString(),
      dex: { positionManager: v4PositionManager, singleton: v4Singleton, permit2: v4Permit2, hook: v4Hook },
    });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Native currency is always a valid quote asset for curve/launcher (no
// whitelist check applies to address(0)) -- included here so a frontend
// doesn't need to special-case it separately from the ERC20 list.
router.get("/quote-tokens", async (req, res) => {
  const family = typeof req.query.family === "string" ? req.query.family.toLowerCase() : "curve";
  const target = family === "launcher" ? DUCK_LAUNCHER : DUCK_INCUBATION;
  const abi = family === "launcher" ? DUCK_LAUNCHER_ABI : DUCK_INCUBATION_ABI;
  const functionName = family === "launcher" ? "quoteTokens" : "quoteTokenAllowed";

  try {
    const results = await Promise.all(
      DEFAULT_QUOTE_TOKENS.map((t) =>
        publicClient.readContract({ address: target, abi, functionName, args: [t.address] } as never)
      )
    );
    const tokens = [
      { address: "0x0000000000000000000000000000000000000000", symbol: "ETH", allowed: true },
      ...DEFAULT_QUOTE_TOKENS.map((t, i) => ({ address: t.address, symbol: t.symbol, allowed: results[i] as boolean })),
    ];
    res.json(tokens);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

router.get("/quote-assets", async (_req, res) => {
  try {
    const results = await Promise.all(
      RAISE_DEFAULT_QUOTE_ASSETS.map((t) =>
        publicClient.readContract({
          address: DUCK_RAISE,
          abi: DUCK_RAISE_ABI,
          functionName: "quoteAssetAllowed",
          args: [t.address],
        })
      )
    );
    const assets = [
      { address: "0x0000000000000000000000000000000000000000", symbol: "ETH", allowed: true },
      ...RAISE_DEFAULT_QUOTE_ASSETS.map((t, i) => ({ address: t.address, symbol: t.symbol, allowed: results[i] })),
    ];
    res.json(assets);
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// Stats-page aggregates, queried from the subgraph rather than the chain
// directly (unlike every other route in this file). `first: 1000` on each
// query is a real cap -- fine at today's trade volume, not fine forever;
// revisit with a paginated or bucketed count once any of these routinely
// hits it.
router.get("/stats", async (_req, res) => {
  const now = Math.floor(Date.now() / 1000);
  const cutoff24h = now - 24 * 60 * 60;

  try {
    const data = await querySubgraph<{
      tokens: { id: string; family: "CURVE" | "INSTANT" | "CAMPAIGN"; createdAt: string }[];
      tokenHourDatas: { token: { family: "CURVE" | "INSTANT" | "CAMPAIGN"; migrated: boolean | null }; volumeUsd: string }[];
      trades: { id: string }[];
      poolSwaps: { id: string }[];
      contributions: { amount: string }[];
    }>(
      `query PlatformStats($cutoff: BigInt!) {
        tokens(first: 1000) { id family createdAt }
        tokenHourDatas(first: 1000, where: { hourStartUnix_gte: $cutoff }) {
          token { family migrated }
          volumeUsd
        }
        trades(first: 1000, where: { timestamp_gte: $cutoff }) { id }
        poolSwaps(first: 1000, where: { timestamp_gte: $cutoff }) { id }
        contributions(first: 1000, where: { firstContributedAt_gte: $cutoff }) { amount }
      }`,
      { cutoff: String(cutoff24h) }
    );

    const launches24h = data.tokens.filter((t) => Number(t.createdAt) >= cutoff24h).length;
    const trades24h = data.trades.length + data.poolSwaps.length;

    let dexVolumeUsd = 0;
    let curveVolumeUsd = 0;
    for (const row of data.tokenHourDatas) {
      const usd = Number(row.volumeUsd || 0);
      if (row.token.migrated || row.token.family === "INSTANT") dexVolumeUsd += usd;
      else if (row.token.family === "CURVE") curveVolumeUsd += usd;
    }
    const tradingVolumeUsd = dexVolumeUsd + curveVolumeUsd;

    // Crowdlaunch contributions are raw native ETH, not USD-resolved volume
    // -- reported separately rather than blended into the same percentage
    // split as dex/curve (which IS real USD), to avoid implying a false
    // apples-to-apples comparison the way a single fabricated pie would.
    const raiseContributedEth = data.contributions.reduce((sum, c) => sum + Number(c.amount) / 1e18, 0);

    res.json({
      launches24h,
      trades24h,
      tradingVolumeUsd,
      venues: [
        { key: "dex", label: "DEX pools (V4)", volumeUsd: dexVolumeUsd, pct: tradingVolumeUsd > 0 ? (dexVolumeUsd / tradingVolumeUsd) * 100 : 0 },
        { key: "curve", label: "Bonding curves", volumeUsd: curveVolumeUsd, pct: tradingVolumeUsd > 0 ? (curveVolumeUsd / tradingVolumeUsd) * 100 : 0 },
      ],
      raiseContributedEth,
    });
  } catch (err) {
    res.status(502).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

export default router;
