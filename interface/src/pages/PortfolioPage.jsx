import { cs } from "../cs.js";
import { money, ageLabel } from "../data.js";

export default function PortfolioPage({ v }) {
  if (!v.connected) {
    return (
      <div style={cs("border:2px solid var(--ink);background:var(--card);box-shadow:3px 3px 0 var(--ink);padding:56px;display:flex;flex-direction:column;align-items:center;gap:14px")}>
        <span style={cs("font-size:18px;font-weight:700")}>Connect a wallet to see your portfolio.</span>
        <button onClick={v.toggleWallet} style={cs("border:2px solid var(--ink);cursor:pointer;font-size:13.5px;font-weight:700;background:var(--lime);color:var(--ink);padding:12px 22px")}>Connect wallet</button>
      </div>
    );
  }

  const coinById = new Map(v.coins.map((c) => [c.id, c]));
  const held = v.portfolio.holdings.filter((h) => Number(h.balance) > 0);
  const created = v.portfolio.created;
  const contributions = v.portfolio.contributions;

  const pfStats = [
    { label: "WALLET", value: v.balance + " ETH", sub: v.accountShort, bg: "var(--card)" },
    { label: "TOKENS HELD", value: String(held.length), sub: "positions", bg: "var(--card)" },
    { label: "TOKENS CREATED", value: String(created.length), sub: "launches", bg: "var(--lime)" },
    { label: "CONTRIBUTIONS", value: String(contributions.length), sub: "campaigns backed", bg: "var(--card)" },
  ];

  const claims = contributions
    .map((ct) => {
      const camp = ct.campaign;
      if (!camp) return null;
      const resolved = camp.succeeded || camp.failed;
      if (!resolved) return null;
      if (camp.succeeded && !ct.claimed) return { title: camp.name + " allocation", sub: "DuckRaise · succeeded", cta: "Claim", bg: "var(--lime)", fg: "var(--ink)", open: camp.token ? () => v.openToken(camp.token.id) : null };
      if (camp.failed && !ct.refunded) return { title: camp.name + " refund", sub: (Number(ct.amount) / 1e18).toFixed(4) + " ETH · goal missed", cta: "Refund", bg: "var(--orange)", fg: "#fff", open: camp.token ? () => v.openToken(camp.token.id) : null };
      return null;
    })
    .filter(Boolean);

  return (
    <div>
      <div style={cs("border:2px solid var(--ink);background:var(--card);box-shadow:3px 3px 0 var(--ink);margin-bottom:18px")}>
        <div style={cs("padding:24px 22px 20px;border-bottom:2px solid var(--ink)")}>
          <h1 style={cs(`margin:0 0 8px;font-size:${v.isMobile ? "26px" : "36px"};letter-spacing:-.045em;font-weight:700;line-height:1.05`)}>Portfolio</h1>
          <div style={cs("font-family:'DM Mono',monospace;font-size:12.5px;color:var(--mute)")}>{v.accountShort} · INK</div>
        </div>
        <div style={cs("display:flex;flex-wrap:wrap")}>
          {pfStats.map((st, i) => (
            <div key={i} style={cs(`flex:1;min-width:180px;padding:16px 22px;border-right:2px solid var(--ink);background:${st.bg}`)}>
              <div style={cs("font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;color:var(--mute)")}>{st.label}</div>
              <div style={cs("font-family:'DM Mono',monospace;font-size:26px;font-weight:500;letter-spacing:-.03em;margin-top:7px")}>{st.value}</div>
              <div style={cs("font-size:11.5px;color:var(--mute);margin-top:3px")}>{st.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={cs("border:2px solid var(--ink);background:var(--card);box-shadow:3px 3px 0 var(--ink);margin-bottom:16px;overflow-x:auto")}>
        <div style={cs("padding:13px 18px;border-bottom:2px solid var(--ink);font-size:15px;font-weight:700;letter-spacing:-.02em")}>Holdings</div>
        <div style={cs("display:grid;min-width:600px;grid-template-columns:1.8fr 1fr 90px;gap:14px;padding:10px 18px;border-bottom:2px solid var(--ink);background:var(--paper);font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;color:var(--mute)")}>
          <span>TOKEN</span><span style={cs("text-align:right")}>BALANCE</span><span></span>
        </div>
        {held.length === 0 && (
          <div style={cs("padding:40px 0;display:flex;flex-direction:column;align-items:center;gap:10px")}>
            <span style={cs("font-size:14.5px;font-weight:700")}>No token holdings yet.</span>
            <button onClick={v.goHome} style={cs("border:2px solid var(--ink);cursor:pointer;font-size:13px;font-weight:700;background:var(--lime);color:var(--ink);padding:11px 22px")}>Browse coins</button>
          </div>
        )}
        {held.map((h, i) => {
          const co = coinById.get(h.token?.id);
          return (
            <div key={i} style={cs("display:grid;min-width:600px;grid-template-columns:1.8fr 1fr 90px;gap:14px;padding:12px 18px;border-bottom:1px solid var(--soft);align-items:center;font-family:'DM Mono',monospace;font-size:12.5px")}>
              <div style={cs("display:flex;align-items:center;gap:11px;min-width:0")}>
                <div style={cs(`width:26px;height:26px;border:2px solid var(--ink);background:${co ? co.famBg : "var(--card)"};color:${co ? co.famFg : "var(--ink)"};flex:none;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;font-family:'Space Grotesk',sans-serif`)}>{co ? co.initials : "??"}</div>
                <span style={cs("font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:14px;letter-spacing:-.02em")}>{co ? co.ticker : h.token?.id?.slice(0, 8)}</span>
              </div>
              <span style={cs("text-align:right")}>{(Number(h.balance) / 1e18).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
              <div style={cs("text-align:right")}><button onClick={() => co && v.openToken(co.id)} style={cs("padding:6px 12px;border:2px solid var(--ink);background:var(--card);font-size:11.5px;font-weight:600;cursor:pointer;font-family:'Space Grotesk',sans-serif")}>Open</button></div>
            </div>
          );
        })}
      </div>

      <div style={cs("display:grid;grid-template-columns:repeat(auto-fit,minmax(340px,1fr));gap:16px")}>
        <div style={cs("border:2px solid var(--ink);background:var(--card);box-shadow:3px 3px 0 var(--ink)")}>
          <div style={cs("padding:13px 18px;border-bottom:2px solid var(--ink);font-size:15px;font-weight:700;letter-spacing:-.02em")}>Claims &amp; refunds</div>
          {claims.length === 0 && <div style={cs("padding:24px 18px;font-size:13px;color:var(--mute)")}>Nothing to claim right now.</div>}
          {claims.map((cl, i) => (
            <div key={i} style={cs("display:flex;align-items:center;gap:14px;padding:14px 18px;border-bottom:1px solid var(--soft)")}>
              <div style={cs("min-width:0;flex:1")}>
                <div style={cs("font-size:13.5px;font-weight:600;letter-spacing:-.01em")}>{cl.title}</div>
                <div style={cs("font-family:'DM Mono',monospace;font-size:11.5px;color:var(--mute);margin-top:4px")}>{cl.sub}</div>
              </div>
              <button onClick={cl.open || (() => {})} style={cs(`padding:9px 16px;border:2px solid var(--ink);background:${cl.bg};color:${cl.fg};font-size:12.5px;font-weight:700;cursor:pointer;flex:none`)}>{cl.cta}</button>
            </div>
          ))}
        </div>
        <div style={cs("border:2px solid var(--ink);background:var(--card);box-shadow:3px 3px 0 var(--ink)")}>
          <div style={cs("padding:13px 18px;border-bottom:2px solid var(--ink);display:flex;align-items:center;justify-content:space-between;gap:10px")}>
            <span style={cs("font-size:15px;font-weight:700;letter-spacing:-.02em")}>Tokens you launched</span>
            {created.length > 0 && <button onClick={v.claimAllCreatorFees} style={cs("border:2px solid var(--ink);cursor:pointer;font-size:11px;font-weight:700;background:var(--card);padding:6px 12px")}>Claim all</button>}
          </div>
          {created.length === 0 && (
            <div style={cs("padding:40px 0;display:flex;flex-direction:column;align-items:center;gap:10px")}>
              <span style={cs("font-size:14.5px;font-weight:700")}>You haven't created anything yet.</span>
              <button onClick={v.goCreate} style={cs("border:2px solid var(--ink);cursor:pointer;font-size:13px;font-weight:700;background:var(--lime);color:var(--ink);padding:11px 22px")}>Launch a coin</button>
            </div>
          )}
          {created.map((t, i) => {
            const co = coinById.get(t.id);
            return (
              <div key={i} style={cs("display:flex;align-items:center;gap:14px;padding:14px 18px;border-bottom:1px solid var(--soft)")}>
                <div style={cs("min-width:0;flex:1")}>
                  <button onClick={() => v.openToken(t.id)} style={cs("border:0;background:transparent;cursor:pointer;padding:0;text-align:left;font-size:13.5px;font-weight:600;letter-spacing:-.01em")}>{co ? co.ticker + " · " + co.name : t.id.slice(0, 10)}</button>
                  <div style={cs("font-family:'DM Mono',monospace;font-size:11.5px;color:var(--mute);margin-top:4px")}>{t.family} · {ageLabel(Math.round((Date.now() / 1000 - Number(t.createdAt)) / 60))} old</div>
                </div>
                <button onClick={() => v.claimCreatorFees(t.id)} style={cs("padding:7px 13px;border:2px solid var(--ink);background:var(--card);font-size:11.5px;font-weight:600;cursor:pointer;flex:none")}>Claim fees</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
