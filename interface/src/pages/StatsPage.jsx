import { useState, useEffect } from "react";
import { cs } from "../cs.js";
import { api } from "../api.js";

// Real platform-wide aggregates from GET /stats (backend/src/api/routes/platform.ts),
// itself computed from the subgraph's TokenHourData/Trade/PoolSwap/Contribution
// entities -- nothing here is a placeholder or a seeded random number.
// The mockup this page is based on also included a "Duckboard" top-50
// trader leaderboard (win-rate/PnL per wallet) -- dropped per explicit
// scoping decision, since ranking traders honestly would require new
// cost-basis-tracking subgraph infrastructure that hasn't been built.
export default function StatsPage({ v }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.stats().then(setStats).catch((e) => setError(String(e.message || e)));
  }, []);

  const money = (n) => n >= 1e6 ? "$" + (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? "$" + (n / 1e3).toFixed(1) + "K" : "$" + n.toFixed(0);

  const cards = stats ? [
    { k: "24H VOLUME", v: money(stats.tradingVolumeUsd), sub: "DEX pools + bonding curves, USD-resolved trades only", bg: "var(--lime)" },
    { k: "24H LAUNCHES", v: String(stats.launches24h), sub: "across three families", bg: "var(--card)" },
    { k: "24H TRADES", v: stats.trades24h.toLocaleString(), sub: "curve trades + V4 pool swaps", bg: "var(--card)" },
  ] : [];

  return (
    <div>
      <div style={cs("border:1px solid var(--line);border-radius:10px;background:var(--card);padding:26px 24px;margin-bottom:18px")}>
        <h1 style={cs(`margin:0 0 9px;font-size:${v.isMobile ? "26px" : "38px"};letter-spacing:-.045em;font-weight:700;line-height:1.05`)}>Stats</h1>
        <p style={cs("margin:0;color:var(--mute);font-size:14.5px;line-height:1.55;max-width:66ch")}>Real-time aggregates from the subgraph — every number here is computed from actual on-chain trades, launches and contributions, not sampled or estimated.</p>
      </div>

      {error && <div style={cs("border:1px solid var(--line);border-radius:10px;background:var(--card);padding:24px;color:var(--neg);font-size:13.5px;margin-bottom:16px")}>Couldn't load stats: {error}</div>}

      {!stats && !error && <div style={cs("border:1px solid var(--line);border-radius:10px;background:var(--card);padding:40px;text-align:center;color:var(--mute);font-size:13.5px")}>Loading…</div>}

      {stats && (
        <>
          <div style={cs("display:flex;flex-wrap:wrap;gap:16px;margin-bottom:16px")}>
            {cards.map((c, i) => (
              <div key={i} style={cs(`flex:1;min-width:220px;border:1px solid var(--line);border-radius:10px;background:${c.bg};padding:20px`)}>
                <div style={cs("font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;color:var(--mute)")}>{c.k}</div>
                <div style={cs("font-family:'DM Mono',monospace;font-size:32px;font-weight:500;letter-spacing:-.03em;margin-top:9px")}>{c.v}</div>
                <div style={cs("font-size:11.5px;color:var(--mute);margin-top:5px")}>{c.sub}</div>
              </div>
            ))}
          </div>

          <div style={cs("border:1px solid var(--line);border-radius:10px;background:var(--card);overflow:hidden")}>
            <div style={cs("padding:13px 18px;border-bottom:1px solid var(--line);font-size:15px;font-weight:700;letter-spacing:-.02em")}>Volume by venue (24h)</div>
            {stats.venues.map((venue, i) => (
              <div key={i} style={cs("padding:14px 18px;border-bottom:1px solid var(--soft)")}>
                <div style={cs("display:flex;justify-content:space-between;font-family:'DM Mono',monospace;font-size:12.5px;margin-bottom:8px")}>
                  <span>{venue.label}</span>
                  <span style={cs("font-weight:500")}>{money(venue.volumeUsd)} · {venue.pct.toFixed(1)}%</span>
                </div>
                <div style={cs("height:6px;border-radius:99px;background:var(--soft);overflow:hidden")}>
                  <div style={cs(`height:100%;width:${venue.pct}%;background:${i === 0 ? "var(--ink)" : "var(--lime)"};border-radius:99px`)}></div>
                </div>
              </div>
            ))}
            <div style={cs("padding:14px 18px;display:flex;justify-content:space-between;font-family:'DM Mono',monospace;font-size:12.5px;color:var(--mute)")}>
              <span>Crowdlaunch (ETH contributed, 24h)</span>
              <span style={cs("color:var(--ink);font-weight:500")}>{stats.raiseContributedEth.toFixed(4)} ETH</span>
            </div>
            <div style={cs("padding:0 18px 16px;font-size:11.5px;color:var(--mute);line-height:1.5")}>Shown separately from the DEX/curve split above — contributions are escrowed native ETH, not a resolved USD trading volume, so blending it into the same percentage split would overstate precision that isn't really there.</div>
          </div>
        </>
      )}
    </div>
  );
}
