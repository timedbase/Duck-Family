import { cs } from "../cs.js";
import Thumb from "../Thumb.jsx";
import Sparkline from "../Sparkline.jsx";

// Square, image-first block shared by the hero rail and the feed grid --
// the token's own art is the card's visual anchor, with age/family as small
// pinned badges on top of it rather than a separate text row.
function ImageBlock({ t, badgeSize = "9px" }) {
  return (
    <div style={cs("position:relative;width:100%;padding-top:100%;overflow:hidden;flex:none")}>
      <Thumb url={t.imageUrl} bg={t.famBg} fg={t.famFg} initials={t.initials} size="100%" radius="0" fontSize={t.logoType || "44px"} style="position:absolute;top:0;left:0" />
      <span style={cs(`position:absolute;top:8px;left:8px;padding:3px 8px;border-radius:999px;background:rgba(26,25,23,.72);color:#fff;font-family:'DM Mono',monospace;font-size:${badgeSize};letter-spacing:.04em;white-space:nowrap`)}>{t.age}</span>
      <span style={cs(`position:absolute;top:8px;right:8px;padding:3px 8px;border-radius:999px;background:${t.famBg};color:${t.famFg};font-family:'DM Mono',monospace;font-size:${badgeSize};letter-spacing:.04em;white-space:nowrap`)}>{t.family}</span>
    </div>
  );
}

function ProgressRow({ t, height = "6px", fontSize = "10px" }) {
  return (
    <div>
      <div style={cs(`display:flex;align-items:center;justify-content:space-between;gap:10px;font-family:'DM Mono',monospace;font-size:${fontSize};letter-spacing:.07em;color:var(--mute);margin-bottom:6px`)}>
        <span style={cs("min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{t.progLabel}</span>
        <span style={cs("flex:none;color:var(--ink)")}>{t.progPct}</span>
      </div>
      {t.showProg && (
        <div style={cs(`height:${height};border-radius:99px;background:var(--soft);overflow:hidden`)}>
          <div style={cs(`height:100%;width:${t.progWidth}%;background:${t.progFill};border-radius:99px`)}></div>
        </div>
      )}
    </div>
  );
}

function HeroSlide({ t }) {
  return (
    <div onClick={t.open} className="d-lift" style={cs(`flex:${t.flex} 0 ${t.basis};min-width:${t.minw};cursor:pointer;display:flex;flex-direction:column;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:var(--card)`)}>
      <ImageBlock t={t} badgeSize={t.symType === "19px" ? "10px" : "9px"} />
      <div style={cs("padding:12px 14px;display:flex;flex-direction:column;gap:10px;flex:1")}>
        <div>
          <div style={cs("display:flex;align-items:baseline;gap:7px;min-width:0")}>
            <span style={cs(`font-size:${t.symType};font-weight:700;letter-spacing:-.03em;flex:none`)}>{t.symbol}</span>
            <span style={cs("font-family:'DM Mono',monospace;font-size:11px;color:var(--mute);min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{t.name}</span>
          </div>
          <div style={cs("font-family:'DM Mono',monospace;font-size:10.5px;color:var(--mute);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>by {t.creator}</div>
        </div>

        <div style={cs("display:flex;align-items:baseline;gap:8px;font-family:'DM Mono',monospace;flex-wrap:wrap")}>
          <span style={cs(`font-size:${t.priceType};font-weight:500;letter-spacing:-.03em;color:var(--pos);flex:none`)}>MC {t.mcap}</span>
          <span style={cs(`font-size:12px;color:${t.chgColor};flex:none`)}>{t.chg}</span>
        </div>

        <div style={cs(`height:${t.sparkH}`)}>
          <Sparkline bars={t.bars} height={t.sparkH} />
        </div>

        <div style={cs("flex:1;min-height:0")}></div>

        <ProgressRow t={t} />

        <div style={cs("display:flex;gap:12px;font-family:'DM Mono',monospace;font-size:10.5px;color:var(--mute);min-width:0")}>
          <span style={cs("white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>VOL <span style={cs("color:var(--ink)")}>{t.vol}</span></span>
          <span style={cs("margin-left:auto;flex:none;white-space:nowrap")}>{t.sideMetric} <span style={cs("color:var(--ink)")}>{t.sideValue}</span></span>
        </div>
      </div>
    </div>
  );
}

function FeedCard({ t }) {
  return (
    <div onClick={t.open} className="d-lift" style={cs("border:1px solid var(--line);background:var(--card);border-radius:14px;cursor:pointer;overflow:hidden;display:flex;flex-direction:column")}>
      <ImageBlock t={t} />
      <div style={cs("padding:12px 14px;display:flex;flex-direction:column;gap:8px;flex:1")}>
        <div>
          <div style={cs("display:flex;align-items:baseline;gap:7px;min-width:0")}>
            <span style={cs("font-size:15px;font-weight:700;letter-spacing:-.025em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{t.name}</span>
            <span style={cs("font-family:'DM Mono',monospace;font-size:11.5px;color:var(--mute);flex:none")}>{t.symbol}</span>
          </div>
          <div style={cs("font-family:'DM Mono',monospace;font-size:10.5px;color:var(--mute);margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>by {t.creator} · {t.age}</div>
        </div>

        <div style={cs("display:flex;align-items:baseline;gap:8px;font-family:'DM Mono',monospace")}>
          <span style={cs("font-size:14.5px;font-weight:500;letter-spacing:-.02em;color:var(--pos)")}>MC {t.mcap}</span>
          <span style={cs(`font-size:11.5px;color:${t.chgColor}`)}>{t.chg}</span>
        </div>

        <div style={cs("flex:1;min-height:4px")}></div>

        <ProgressRow t={t} height="5px" fontSize="9.5px" />

        <div style={cs("display:flex;gap:10px;font-family:'DM Mono',monospace;font-size:10px;color:var(--mute)")}>
          <span style={cs("white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>VOL <span style={cs("color:var(--ink)")}>{t.vol}</span></span>
          <span style={cs("margin-left:auto;white-space:nowrap")}>{t.holders} hldrs</span>
        </div>
      </div>
    </div>
  );
}

function FilterSelect({ value, onChange, options, isMobile }) {
  return (
    <select value={value} onChange={onChange} style={cs(`border:1px solid var(--line);border-radius:8px;background:var(--card);padding:${isMobile ? "7px 8px" : "8px 12px"};font-family:'DM Mono',monospace;font-size:${isMobile ? "11px" : "12px"};color:var(--ink);cursor:pointer;flex:1 1 110px;min-width:0`)}>
      {options.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
    </select>
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

        <div style={cs(`display:flex;align-items:stretch;gap:12px;overflow-x:auto;padding:14px`)}>
          {v.heroSlides.length === 0 && <div style={cs("padding:20px;color:var(--mute);font-size:13px")}>Nothing launched yet.</div>}
          {v.heroSlides.map((t) => <HeroSlide key={t.id} t={t} />)}
        </div>
      </div>

      <div style={cs("display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-bottom:10px")}>
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

      <div style={cs("display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px")}>
        <FilterSelect value={v.mcapFilter} onChange={v.setMcapFilter} options={v.mcapPresets} isMobile={v.isMobile} />
        <FilterSelect value={v.launchedFilter} onChange={v.setLaunchedFilter} options={v.launchedPresets} isMobile={v.isMobile} />
        <FilterSelect value={v.quoteFilter} onChange={v.setQuoteFilter} options={v.quoteFilterOptions.map((q) => ({ key: q, label: q === "any" ? "Any pair" : q }))} isMobile={v.isMobile} />
      </div>

      {(v.layoutCards || v.isMobile) && (
        <div style={cs(`display:grid;grid-template-columns:repeat(auto-fill,minmax(${v.isMobile ? "150px" : "220px"},1fr));gap:12px`)}>
          {v.feed.map((t) => <FeedCard key={t.id} t={t} />)}
        </div>
      )}

      {v.layoutTable && !v.isMobile && (
        <div style={cs("border:1px solid var(--line);background:var(--card);border-radius:10px;overflow:hidden")}>
          <div style={cs("display:grid;min-width:760px;grid-template-columns:2.2fr .9fr .8fr .9fr .9fr 1.4fr;gap:14px;padding:11px 18px;border-bottom:1px solid var(--line);background:var(--paper);font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;color:var(--mute)")}>
            <span>TOKEN</span><span style={cs("text-align:right")}>PRICE</span><span style={cs("text-align:right")}>24H</span><span style={cs("text-align:right")}>MCAP</span><span style={cs("text-align:right")}>VOLUME</span><span>PROGRESS</span>
          </div>
          {v.feed.map((t) => (
            <div key={t.id} onClick={t.open} className="d-hover-paper" style={cs("display:grid;min-width:760px;grid-template-columns:2.2fr .9fr .8fr .9fr .9fr 1.4fr;gap:14px;padding:12px 18px;border-bottom:1px solid var(--soft);align-items:center;cursor:pointer;font-family:'DM Mono',monospace;font-size:12.5px")}>
              <div style={cs("display:flex;align-items:center;gap:11px;min-width:0")}>
                <Thumb url={t.imageUrl} bg={t.famBg} fg={t.famFg} initials={t.initials} size="26px" fontSize="11px" />
                <span style={cs("font-family:'Space Grotesk',sans-serif;font-weight:700;font-size:14px;letter-spacing:-.02em")}>{t.symbol}</span>
                <span style={cs("color:var(--mute);white-space:nowrap;overflow:hidden;text-overflow:ellipsis")}>{t.name}</span>
                <span style={cs(`flex:none;font-family:'DM Mono',monospace;font-size:9px;letter-spacing:.08em;padding:3px 7px;border-radius:999px;background:${t.famBg};color:${t.famFg}`)}>{t.family}</span>
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
