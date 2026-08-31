import { cs } from "../cs.js";

function HeroSlide({ t }) {
  return (
    <div
      onClick={t.open}
      className="d-hover-line"
      style={cs(`flex:${t.flex} 0 ${t.basis};min-width:${t.minw};cursor:pointer;display:flex;flex-direction:column;gap:12px;border:1px solid var(--line);border-radius:14px;padding:14px;background:var(--card)`)}
    >
      <div style={cs("display:flex;gap:12px;min-width:0")}>
        <div style={cs(`width:${t.logoSize};height:${t.logoSize};flex:none;border-radius:11px;background:${t.famBg};color:${t.famFg};display:flex;align-items:center;justify-content:center;font-size:${t.logoType};font-weight:700;letter-spacing:-.04em;overflow:hidden`)}>{t.initials}</div>
        <div style={cs("flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center")}>
          <div style={cs("display:flex;align-items:baseline;gap:7px;min-width:0")}>
            <span style={cs(`font-size:${t.symType};font-weight:700;letter-spacing:-.03em;flex:none`)}>{t.symbol}</span>
            <span style={cs("font-family:'DM Mono',monospace;font-size:11px;color:var(--mute);min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{t.name}</span>
          </div>
          <div style={cs("font-family:'DM Mono',monospace;font-size:10.5px;color:var(--mute);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>by {t.creator} · {t.age}</div>
          <div style={cs("display:flex;align-items:baseline;gap:8px;margin-top:8px;font-family:'DM Mono',monospace;flex-wrap:wrap")}>
            <span style={cs(`font-size:${t.priceType};font-weight:500;letter-spacing:-.03em;color:var(--pos);flex:none`)}>MC {t.mcap}</span>
            <span style={cs(`font-size:12px;color:${t.chgColor};flex:none`)}>{t.chg}</span>
          </div>
        </div>
      </div>

      <div style={cs(`display:flex;align-items:flex-end;gap:2px;height:${t.sparkH}`)}>
        {t.bars.map((b, bi) => <div key={bi} style={cs(`flex:1;height:${b.h}%;background:${b.c};border-radius:2px;min-height:2px`)}></div>)}
      </div>

      <div style={cs("flex:1;min-height:0")}></div>

      <div>
        <div style={cs("display:flex;align-items:center;justify-content:space-between;gap:10px;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.08em;color:var(--mute);margin-bottom:6px")}>
          <span style={cs("min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{t.progLabel}</span>
          <span style={cs("flex:none;color:var(--ink)")}>{t.progPct}</span>
        </div>
        {t.showProg && (
          <div style={cs("height:6px;border-radius:99px;background:var(--soft);overflow:hidden")}>
            <div style={cs(`height:100%;width:${t.progWidth}%;background:${t.progFill};border-radius:99px`)}></div>
          </div>
        )}
      </div>

      <div style={cs("display:flex;gap:12px;font-family:'DM Mono',monospace;font-size:10.5px;color:var(--mute);min-width:0")}>
        <span style={cs("white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>VOL <span style={cs("color:var(--ink)")}>{t.vol}</span></span>
        <span style={cs("margin-left:auto;flex:none;white-space:nowrap")}>{t.sideMetric} <span style={cs("color:var(--ink)")}>{t.sideValue}</span></span>
      </div>
    </div>
  );
}

export default function DiscoverPage({ v }) {
  return (
    <div>
      <div style={cs("border:1px solid var(--line);border-radius:10px;background:var(--card);overflow:hidden;margin-bottom:18px")}>
        <div style={cs("display:flex;align-items:stretch;border-bottom:1px solid var(--line);flex-wrap:wrap")}>
          <div style={cs("display:flex;overflow-x:auto")}>
            {v.heroTabs.map((h, i) => (
              <button key={i} onClick={h.go} style={cs(`padding:12px 18px;border:0;border-right:1px solid var(--line);background:${h.bg};color:${h.fg};font-size:13.5px;font-weight:600;letter-spacing:-.01em;cursor:pointer;white-space:nowrap`)}>{h.label}</button>
            ))}
          </div>
          {!v.isMobile && <div style={cs("flex:1;display:flex;align-items:center;padding:0 18px;font-family:'DM Mono',monospace;font-size:10.5px;letter-spacing:.12em;color:var(--mute)")}>{v.heroCaption}</div>}
          <div style={cs("display:flex;flex:none")}>
            <button onClick={v.heroPrev} className="d-hover-lime" style={cs("width:46px;border:0;border-left:1px solid var(--line);background:var(--card);font-size:15px;cursor:pointer")}>←</button>
            <button onClick={v.heroNext} className="d-hover-lime" style={cs("width:46px;border:0;border-left:1px solid var(--line);background:var(--card);font-size:15px;cursor:pointer")}>→</button>
          </div>
        </div>

        <div style={cs("display:flex;align-items:stretch;gap:12px;overflow-x:auto;padding:14px")}>
          {v.heroSlides.length === 0 && <div style={cs("padding:20px;color:var(--mute);font-size:13px")}>Nothing launched yet.</div>}
          {v.heroSlides.map((t) => <HeroSlide key={t.id} t={t} />)}
        </div>
      </div>

      <div style={cs("display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:16px")}>
        <div style={cs(`display:flex;border:1px solid var(--line);border-radius:8px;overflow-x:auto;max-width:100%;${v.isMobile ? "width:100%" : ""}`)}>
          {v.filters.map((f, i) => (
            <button key={i} onClick={f.go} style={cs(`padding:${v.isMobile ? "7px 8px" : "8px 15px"};border:0;flex:${v.isMobile ? "1" : "none"};white-space:nowrap;border-left:${f.dv};background:${f.bg};color:${f.fg};font-size:${v.isMobile ? "10.5px" : "12.5px"};font-weight:600;cursor:pointer`)}>{f.label}</button>
          ))}
        </div>
        {!v.isMobile && <div style={cs("flex:1")}></div>}
        {!v.isMobile && (
          <div style={cs("display:flex;gap:0;border:1px solid var(--line);border-radius:8px;overflow:hidden;flex:none")}>
            <button onClick={v.setLayoutCards} style={cs(`padding:8px 15px;border:0;background:${v.lcBg};color:${v.lcFg};font-size:12.5px;font-weight:600;cursor:pointer`)}>Cards</button>
            <button onClick={v.setLayoutTable} style={cs(`padding:8px 15px;border:0;border-left:1px solid var(--line);background:${v.ltBg};color:${v.ltFg};font-size:12.5px;font-weight:600;cursor:pointer`)}>Table</button>
          </div>
        )}
        <div style={cs(`display:flex;align-items:center;gap:9px;padding:8px 13px;border:1px solid var(--line);border-radius:8px;background:var(--card);min-width:${v.isMobile ? "0" : "230px"};width:${v.isMobile ? "100%" : "auto"}`)}>
          <span style={cs("color:var(--mute);font-size:13px")}>⌕</span>
          <input value={v.query} onChange={v.setQuery} placeholder="Name, symbol or address" style={cs("border:0;outline:0;background:transparent;font-size:13px;width:100%")} />
        </div>
      </div>

      {(v.layoutCards || v.isMobile) && (
        <div style={cs(`display:grid;grid-template-columns:repeat(auto-fill,minmax(${v.isMobile ? "100%" : "330px"},1fr));gap:12px`)}>
          {v.feed.map((t) => (
            <div key={t.id} onClick={t.open} className="d-hover-line" style={cs("border:1px solid var(--line);background:var(--card);border-radius:14px;cursor:pointer;display:flex;gap:14px;padding:14px")}>
              <div style={cs(`width:104px;height:104px;flex:none;border-radius:11px;background:${t.famBg};color:${t.famFg};display:flex;align-items:center;justify-content:center;font-size:30px;font-weight:700;letter-spacing:-.04em;overflow:hidden`)}>{t.initials}</div>

              <div style={cs("flex:1;min-width:0;display:flex;flex-direction:column")}>
                <div style={cs("display:flex;align-items:baseline;gap:7px;min-width:0")}>
                  <span style={cs("font-size:15.5px;font-weight:700;letter-spacing:-.025em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{t.name}</span>
                  <span style={cs("font-family:'DM Mono',monospace;font-size:12px;color:var(--mute);flex:none")}>{t.symbol}</span>
                </div>

                <div style={cs("font-family:'DM Mono',monospace;font-size:11px;color:var(--mute);margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>by {t.creator} · {t.age}</div>

                <div style={cs("display:flex;align-items:baseline;gap:8px;margin-top:9px;font-family:'DM Mono',monospace")}>
                  <span style={cs("font-size:15px;font-weight:500;letter-spacing:-.02em;color:var(--pos)")}>MC {t.mcap}</span>
                  <span style={cs(`font-size:12px;color:${t.chgColor}`)}>{t.chg}</span>
                </div>

                <div style={cs("flex:1;min-height:8px")}></div>

                <div style={cs("display:flex;align-items:center;justify-content:space-between;gap:10px;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.08em;color:var(--mute);margin-bottom:6px")}>
                  <span style={cs("white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{t.progLabel}</span>
                  <span style={cs("flex:none;color:var(--ink)")}>{t.progPct}</span>
                </div>
                {t.showProg && (
                  <div style={cs("height:6px;border-radius:99px;background:var(--soft);overflow:hidden")}>
                    <div style={cs(`height:100%;width:${t.progWidth}%;background:${t.progFill};border-radius:99px`)}></div>
                  </div>
                )}

                <div style={cs("display:flex;gap:14px;margin-top:10px;font-family:'DM Mono',monospace;font-size:10.5px;color:var(--mute)")}>
                  <span>VOL <span style={cs("color:var(--ink)")}>{t.vol}</span></span>
                  <span>{t.holders} holders</span>
                  <span style={cs("margin-left:auto")}>{t.quote}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {v.layoutTable && !v.isMobile && (
        <div style={cs("border:1px solid var(--line);background:var(--card);border-radius:10px;overflow:hidden")}>
          <div style={cs("display:grid;min-width:760px;grid-template-columns:2.2fr .9fr .8fr .9fr .9fr 1.4fr;gap:14px;padding:11px 18px;border-bottom:1px solid var(--line);background:var(--paper);font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;color:var(--mute)")}>
            <span>TOKEN</span><span style={cs("text-align:right")}>PRICE</span><span style={cs("text-align:right")}>24H</span><span style={cs("text-align:right")}>MCAP</span><span style={cs("text-align:right")}>VOLUME</span><span>PROGRESS</span>
          </div>
          {v.feed.map((t) => (
            <div key={t.id} onClick={t.open} style={cs("display:grid;min-width:760px;grid-template-columns:2.2fr .9fr .8fr .9fr .9fr 1.4fr;gap:14px;padding:12px 18px;border-bottom:1px solid var(--soft);align-items:center;cursor:pointer;font-family:'DM Mono',monospace;font-size:12.5px")}>
              <div style={cs("display:flex;align-items:center;gap:11px;min-width:0")}>
                <div style={cs(`width:26px;height:26px;border:1px solid var(--line);background:${t.famBg};color:${t.famFg};flex:none;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;font-family:'Space Grotesk',sans-serif;letter-spacing:-.03em`)}>{t.initials}</div>
                <span style={cs("font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:14px;letter-spacing:-.02em")}>{t.symbol}</span>
                <span style={cs("color:var(--mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{t.name}</span>
                <span style={cs("font-size:9.5px;letter-spacing:.1em;color:var(--mute);flex:none")}>{t.family}</span>
              </div>
              <span style={cs("text-align:right;font-weight:500")}>{t.price}</span>
              <span style={cs(`text-align:right;color:${t.chgColor}`)}>{t.chg}</span>
              <span style={cs("text-align:right")}>{t.mcap}</span>
              <span style={cs("text-align:right")}>{t.vol}</span>
              <div style={cs("display:flex;align-items:center;gap:10px")}>
                {t.showProg && (
                  <div style={cs("flex:1;display:flex;gap:2px;height:14px;border:1px solid var(--line);border-radius:5px;padding:2px")}>
                    {t.ticks.map((c2, ci) => <div key={ci} style={cs(`flex:1;background:${c2}`)}></div>)}
                  </div>
                )}
                <span style={cs("color:var(--mute);font-size:11px;min-width:34px;white-space:nowrap;text-align:right")}>{t.progPct}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {v.isEmpty && (
        <div style={cs("border:1px solid var(--line);border-radius:10px;background:var(--card);padding:56px 0;display:flex;flex-direction:column;align-items:center;gap:10px")}>
          <div style={cs("font-size:15px;font-weight:700")}>Nothing matches that.</div>
          <div style={cs("font-size:13px;color:var(--mute)")}>Loosen the filters, or launch it yourself.</div>
          <button onClick={v.goCreate} style={cs("margin-top:6px;border:1px solid var(--line);border-radius:9px;cursor:pointer;font-size:13px;font-weight:700;background:var(--lime);color:var(--ink);padding:11px 22px")}>Launch a coin</button>
        </div>
      )}
    </div>
  );
}
