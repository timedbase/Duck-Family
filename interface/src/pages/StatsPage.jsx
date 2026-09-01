import { useState, useEffect, useRef } from "react";
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
  const [fetchedAt, setFetchedAt] = useState(null);
  const [nowTick, setNowTick] = useState(Date.now());
  const loadingRef = useRef(false);

  useEffect(() => {
    const load = () => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      api.stats().then((d) => { setStats(d); setFetchedAt(Date.now()); setError(""); }).catch((e) => setError(String(e.message || e))).finally(() => { loadingRef.current = false; });
    };
    load();
    const poll = setInterval(load, 30000);
    const tick = setInterval(() => setNowTick(Date.now()), 1000);
    return () => { clearInterval(poll); clearInterval(tick); };
  }, []);

  const money = (n) => n >= 1e6 ? "$" + (n / 1e6).toFixed(2) + "M" : n >= 1e3 ? "$" + (n / 1e3).toFixed(1) + "K" : "$" + n.toFixed(0);
  const updatedSecondsAgo = fetchedAt ? Math.max(0, Math.round((nowTick - fetchedAt) / 1000)) : null;

  const cards = stats ? [
    { k: "24H VOLUME", v: money(stats.tradingVolumeUsd), sub: "DEX pools + bonding curves, USD-resolved trades only", bg: "var(--lime)", fg: "var(--on)", subFg: "var(--acc)" },
    { k: "24H LAUNCHES", v: String(stats.launches24h), sub: "across three families", bg: "var(--card)", fg: "var(--ink)", subFg: "var(--mute)" },
    { k: "24H TRADES", v: stats.trades24h.toLocaleString(), sub: "curve trades + V4 pool swaps", bg: "var(--card)", fg: "var(--ink)", subFg: "var(--mute)" },
    { k: "30D VOLUME", v: money(stats.volume30dUsd), sub: "USD-resolved trades only", bg: "var(--card)", fg: "var(--ink)", subFg: "var(--mute)" },
    { k: "ALL-TIME VOLUME", v: money(stats.volumeAllTimeUsd), sub: "USD-resolved trades only", bg: "var(--card)", fg: "var(--ink)", subFg: "var(--mute)" },
  ] : [];

  const fmtAmt = (n) => (n === 0 ? "0" : n < 0.001 ? n.toFixed(6) : n.toFixed(4));

  return (
    <div>
      <div style={cs("display:flex;align-items:flex-end;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-bottom:18px")}>
        <div>
          <h1 style={cs(`margin:0;font-size:${v.isMobile ? "26px" : "38px"};letter-spacing:-.04em;font-weight:700;line-height:1`)}>Stats</h1>
          <div style={cs("font-family:'JetBrains Mono',monospace;font-size:11px;letter-spacing:.1em;color:var(--mute);margin-top:9px")}>PLATFORM-WIDE ACTIVITY</div>
        </div>
        {updatedSecondsAgo != null && (
          <div style={cs("display:flex;align-items:center;gap:8px;padding:7px 13px;border:1px solid var(--line);border-radius:999px;background:var(--card);font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--mute)")}>
            <span style={cs("width:6px;height:6px;border-radius:999px;background:var(--pos)")}></span>updated {updatedSecondsAgo < 1 ? "just now" : updatedSecondsAgo + "s ago"}
          </div>
        )}
      </div>

      {error && <div style={cs("border:1px solid var(--line);border-radius:10px;background:var(--card);padding:24px;color:var(--neg);font-size:13.5px;margin-bottom:16px")}>Couldn't load stats: {error}</div>}

      {!stats && !error && <div style={cs("border:1px solid var(--line);border-radius:10px;background:var(--card);padding:40px;text-align:center;color:var(--mute);font-size:13.5px")}>Loading…</div>}

      {stats && (
        <>
          <div style={cs("display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:12px;margin-bottom:16px")}>
            {cards.map((c, i) => (
              <div key={i} style={cs(`border:1px solid var(--line);border-radius:10px;background:${c.bg};color:${c.fg};box-shadow:var(--sh);padding:20px`)}>
                <div style={cs(`font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.14em;color:${c.subFg}`)}>{c.k}</div>
                <div style={cs("font-family:'JetBrains Mono',monospace;font-size:32px;font-weight:500;letter-spacing:-.03em;margin-top:9px")}>{c.v}</div>
                <div style={cs(`font-size:11.5px;color:${c.subFg};margin-top:5px`)}>{c.sub}</div>
              </div>
            ))}
          </div>

          <div style={cs("border:1px solid var(--line);border-radius:10px;background:var(--card);box-shadow:var(--sh);padding:20px")}>
            <div style={cs("display:flex;align-items:baseline;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:18px")}>
              <h2 style={cs("margin:0;font-size:17px;font-weight:700;letter-spacing:-.03em")}>24h volume by venue</h2>
              <span style={cs("font-family:'JetBrains Mono',monospace;font-size:11.5px;color:var(--mute)")}>{money(stats.tradingVolumeUsd)} total</span>
            </div>
            <div style={cs("display:flex;height:14px;border-radius:999px;overflow:hidden;background:var(--soft);margin-bottom:18px")}>
              {stats.venues.map((venue, i) => (
                <div key={i} style={cs(`width:${venue.pct}%;background:${i === 0 ? "var(--ink)" : "var(--lime)"}`)}></div>
              ))}
            </div>
            <div style={cs("display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px")}>
              {stats.venues.map((venue, i) => (
                <div key={i} style={cs("display:flex;align-items:flex-start;gap:11px")}>
                  <span style={cs(`width:11px;height:11px;border-radius:3px;background:${i === 0 ? "var(--ink)" : "var(--lime)"};flex:none;margin-top:4px`)}></span>
                  <div style={cs("min-width:0")}>
                    <div style={cs("font-size:13.5px;font-weight:600;letter-spacing:-.01em")}>{venue.label}</div>
                    <div style={cs("font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:500;margin-top:4px")}>{money(venue.volumeUsd)}</div>
                    <div style={cs("font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--mute);margin-top:3px")}>{venue.pct.toFixed(1)}% of volume</div>
                  </div>
                </div>
              ))}
              <div style={cs("display:flex;align-items:flex-start;gap:11px")}>
                <span style={cs("width:11px;height:11px;border-radius:3px;background:var(--orange);flex:none;margin-top:4px")}></span>
                <div style={cs("min-width:0")}>
                  <div style={cs("font-size:13.5px;font-weight:600;letter-spacing:-.01em")}>Crowdlaunch</div>
                  <div style={cs("font-family:'JetBrains Mono',monospace;font-size:15px;font-weight:500;margin-top:4px")}>{stats.raiseContributedEth.toFixed(4)} ETH</div>
                  <div style={cs("font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--mute);margin-top:3px")}>ETH contributed, not trading volume</div>
                </div>
              </div>
            </div>
          </div>

          <div style={cs("border:1px solid var(--line);border-radius:10px;background:var(--card);box-shadow:var(--sh);padding:20px;margin-top:16px")}>
            <div style={cs("display:flex;align-items:baseline;justify-content:space-between;gap:14px;flex-wrap:wrap;margin-bottom:18px")}>
              <h2 style={cs("margin:0;font-size:17px;font-weight:700;letter-spacing:-.03em")}>Fees, all-time</h2>
              <span style={cs("font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--mute)")}>by quote asset -- not USD-blended</span>
            </div>
            <div style={cs("display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px")}>
              <div>
                <div style={cs("font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.14em;color:var(--mute);margin-bottom:9px")}>CREATOR FEES PAID</div>
                {stats.creatorFeesPaid.length === 0 && <div style={cs("font-size:13px;color:var(--mute)")}>None claimed yet.</div>}
                {stats.creatorFeesPaid.map((row, i) => (
                  <div key={i} style={cs("display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-top:1px solid var(--soft)")}>
                    <span style={cs("font-size:13px;color:var(--mute)")}>{row.symbol}</span>
                    <span style={cs("font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:500")}>{fmtAmt(row.amount)}</span>
                  </div>
                ))}
              </div>
              <div>
                <div style={cs("font-family:'JetBrains Mono',monospace;font-size:10px;letter-spacing:.14em;color:var(--mute);margin-bottom:9px")}>PLATFORM REVENUE</div>
                {stats.platformRevenue.length === 0 && <div style={cs("font-size:13px;color:var(--mute)")}>None collected yet.</div>}
                {stats.platformRevenue.map((row, i) => (
                  <div key={i} style={cs("display:flex;justify-content:space-between;gap:12px;padding:8px 0;border-top:1px solid var(--soft)")}>
                    <span style={cs("font-size:13px;color:var(--mute)")}>{row.symbol}</span>
                    <span style={cs("font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:500")}>{fmtAmt(row.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
