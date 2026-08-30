import { cs } from "../cs.js";

export default function DiscoverPage({ v }) {
  return (
    <div>
      <div style={cs("border:2px solid var(--ink);background:var(--card);box-shadow:3px 3px 0 var(--ink);margin-bottom:18px")}>
        <div style={cs("display:flex;align-items:flex-end;justify-content:space-between;gap:20px;flex-wrap:wrap;padding:24px 22px 20px;border-bottom:2px solid var(--ink)")}>
          <div style={cs("max-width:60ch")}>
            <h1 style={cs("margin:0 0 8px;font-size:36px;letter-spacing:-.04em;font-weight:700;line-height:1")}>Launches on Ink</h1>
            <p style={cs("margin:0;color:var(--mute);font-size:14px;line-height:1.55")}>Bonding curves, instant V4 launches and crowdfund raises. One anti-MEV hook, one permanent LP vault, no oracle anywhere.</p>
          </div>
          <div style={cs("display:flex;gap:0;border:2px solid var(--ink)")}>
            <button onClick={v.setLayoutCards} style={cs(`padding:8px 15px;border:0;background:${v.lcBg};color:${v.lcFg};font-size:12.5px;font-weight:600;cursor:pointer`)}>Cards</button>
            <button onClick={v.setLayoutTable} style={cs(`padding:8px 15px;border:0;border-left:2px solid var(--ink);background:${v.ltBg};color:${v.ltFg};font-size:12.5px;font-weight:600;cursor:pointer`)}>Table</button>
          </div>
        </div>
        <div style={cs("display:flex;flex-wrap:wrap")}>
          {v.stats.map((st, i) => (
            <div key={i} style={cs(`flex:1;min-width:180px;padding:16px 22px;border-right:2px solid var(--ink);background:${st.bg}`)}>
              <div style={cs("font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;color:var(--mute)")}>{st.label}</div>
              <div style={cs("font-family:'DM Mono',monospace;font-size:26px;font-weight:500;letter-spacing:-.03em;margin-top:7px")}>{st.value}</div>
              <div style={cs("font-size:11.5px;color:var(--mute);margin-top:3px")}>{st.sub}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={cs("display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:16px")}>
        <div style={cs("display:flex;border:2px solid var(--ink);flex-wrap:wrap")}>
          {v.filters.map((f, i) => (
            <button key={i} onClick={f.go} style={cs(`padding:8px 15px;border:0;border-left:${f.dv};background:${f.bg};color:${f.fg};font-size:12.5px;font-weight:600;cursor:pointer`)}>{f.label}</button>
          ))}
        </div>
        <div style={cs("flex:1")}></div>
        <div style={cs("display:flex;align-items:center;gap:9px;padding:8px 13px;border:2px solid var(--ink);background:var(--card);min-width:230px")}>
          <span style={cs("color:var(--mute);font-size:13px")}>⌕</span>
          <input value={v.query} onChange={v.setQuery} placeholder="Name, symbol or address" style={cs("border:0;outline:0;background:transparent;font-size:13px;width:100%")} />
        </div>
      </div>

      {v.layoutCards && (
        <div style={cs("display:grid;grid-template-columns:repeat(auto-fill,minmax(336px,1fr));gap:16px")}>
          {v.feed.map((t) => (
            <div key={t.id} onClick={t.open} style={cs("border:2px solid var(--ink);background:var(--card);box-shadow:3px 3px 0 var(--ink);cursor:pointer")}>
              <div style={cs("display:flex;align-items:stretch;border-bottom:2px solid var(--ink)")}>
                <div style={cs(`width:58px;flex:none;border-right:2px solid var(--ink);background:${t.famBg};color:${t.famFg};display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:700;letter-spacing:-.02em`)}>{t.initials}</div>
                <div style={cs("flex:1;min-width:0;padding:11px 14px")}>
                  <div style={cs("display:flex;align-items:baseline;gap:8px")}>
                    <span style={cs("font-size:16px;font-weight:700;letter-spacing:-.02em")}>{t.symbol}</span>
                    <span style={cs("font-family:'DM Mono',monospace;font-size:9.5px;letter-spacing:.1em;color:var(--mute)")}>{t.family}</span>
                  </div>
                  <div style={cs("font-size:12.5px;color:var(--mute);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{t.name}</div>
                </div>
                <div style={cs("border-left:2px solid var(--ink);padding:11px 14px;text-align:right;flex:none")}>
                  <div style={cs("font-family:'DM Mono',monospace;font-size:15px;font-weight:500;letter-spacing:-.02em")}>{t.price}</div>
                  <div style={cs(`font-family:'DM Mono',monospace;font-size:12px;color:${t.chgColor};margin-top:2px`)}>{t.chg}</div>
                </div>
              </div>
              <div style={cs("display:flex;align-items:flex-end;gap:2px;height:52px;padding:12px 14px 0")}>
                {t.bars.map((b, bi) => (
                  <div key={bi} style={cs(`flex:1;height:${b.h}%;background:${b.c};min-height:2px`)}></div>
                ))}
              </div>
              <div style={cs("padding:12px 14px 14px")}>
                <div style={cs("display:flex;justify-content:space-between;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.1em;color:var(--mute);margin-bottom:6px")}>
                  <span>{t.progLabel}</span><span>{t.progPct}</span>
                </div>
                <div style={cs("display:flex;gap:2px;height:16px;border:2px solid var(--ink);padding:2px;background:var(--card)")}>
                  {t.ticks.map((c2, ci) => (
                    <div key={ci} style={cs(`flex:1;background:${c2}`)}></div>
                  ))}
                </div>
              </div>
              <div style={cs("display:flex;border-top:2px solid var(--ink);font-family:'DM Mono',monospace;font-size:10.5px")}>
                <span style={cs("flex:1;padding:8px 10px;border-right:1px solid var(--soft);color:var(--mute)")}>MC <span style={cs("color:var(--ink)")}>{t.mcap}</span></span>
                <span style={cs("flex:1;padding:8px 10px;border-right:1px solid var(--soft);color:var(--mute)")}>VOL <span style={cs("color:var(--ink)")}>{t.vol}</span></span>
                <span style={cs("flex:1;padding:8px 10px;color:var(--mute)")}>{t.holders} HLD</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {v.layoutTable && (
        <div style={cs("border:2px solid var(--ink);background:var(--card);box-shadow:3px 3px 0 var(--ink);overflow-x:auto")}>
          <div style={cs("display:grid;min-width:760px;grid-template-columns:2.2fr .9fr .8fr .9fr .9fr 1.4fr;gap:14px;padding:11px 18px;border-bottom:2px solid var(--ink);background:var(--paper);font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;color:var(--mute)")}>
            <span>TOKEN</span><span style={cs("text-align:right")}>PRICE</span><span style={cs("text-align:right")}>24H</span><span style={cs("text-align:right")}>MCAP</span><span style={cs("text-align:right")}>VOLUME</span><span>PROGRESS</span>
          </div>
          {v.feed.map((t) => (
            <div key={t.id} onClick={t.open} style={cs("display:grid;min-width:760px;grid-template-columns:2.2fr .9fr .8fr .9fr .9fr 1.4fr;gap:14px;padding:12px 18px;border-bottom:1px solid var(--soft);align-items:center;cursor:pointer;font-family:'DM Mono',monospace;font-size:12.5px")}>
              <div style={cs("display:flex;align-items:center;gap:11px;min-width:0")}>
                <div style={cs(`width:26px;height:26px;border:2px solid var(--ink);background:${t.famBg};color:${t.famFg};flex:none;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;font-family:'Space Grotesk',sans-serif`)}>{t.initials}</div>
                <span style={cs("font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:14px;letter-spacing:-.02em")}>{t.symbol}</span>
                <span style={cs("color:var(--mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{t.name}</span>
                <span style={cs("font-size:9.5px;letter-spacing:.1em;color:var(--mute);flex:none")}>{t.family}</span>
              </div>
              <span style={cs("text-align:right;font-weight:500")}>{t.price}</span>
              <span style={cs(`text-align:right;color:${t.chgColor}`)}>{t.chg}</span>
              <span style={cs("text-align:right")}>{t.mcap}</span>
              <span style={cs("text-align:right")}>{t.vol}</span>
              <div style={cs("display:flex;align-items:center;gap:10px")}>
                <div style={cs("flex:1;display:flex;gap:2px;height:14px;border:2px solid var(--ink);padding:2px")}>
                  {t.ticks.map((c2, ci) => (
                    <div key={ci} style={cs(`flex:1;background:${c2}`)}></div>
                  ))}
                </div>
                <span style={cs("color:var(--mute);font-size:11px;width:34px;text-align:right")}>{t.progPct}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {v.isEmpty && (
        <div style={cs("border:2px solid var(--ink);background:var(--card);box-shadow:3px 3px 0 var(--ink);padding:56px 0;display:flex;flex-direction:column;align-items:center;gap:10px")}>
          <div style={cs("font-size:15px;font-weight:700")}>Nothing matches that.</div>
          <div style={cs("font-size:13px;color:var(--mute)")}>Loosen the filters, or launch it yourself.</div>
          <button onClick={v.goCreate} style={cs("margin-top:6px;border:2px solid var(--ink);cursor:pointer;font-size:13px;font-weight:700;background:var(--lime);color:var(--ink);padding:11px 22px")}>Launch a coin</button>
        </div>
      )}
    </div>
  );
}
