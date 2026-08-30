import { cs } from "../cs.js";
import Hoverable from "../Hoverable.jsx";
import CoinArt from "../CoinArt.jsx";

export default function HomePage({ v }) {
  return (
    <div style={cs("display: flex; flex-direction: column; gap: 20px;")}>
      <section style={cs(`position: relative; overflow: hidden; border-radius: 26px; padding: ${v.heroPad}; background: #0D0D12; box-shadow: 0 0 0 1px rgba(255,255,255,.09) inset; display: grid; grid-template-columns: ${v.heroCols}; gap: 34px; align-items: center;`)}>
        <div style={cs("position: absolute; left: 0; top: 0; bottom: 0; width: 3px; background: #D9D9D9;")}></div>
        <div style={cs("display: flex; flex-direction: column; gap: 17px;")}>
          <h1 style={cs(`margin: 0; font-size: ${v.heroSize}; line-height: 1.02; letter-spacing: -.04em; font-weight: 700; color: #FBFAFF; text-wrap: balance;`)}>Launch a token against<br />a stock, a stable, or ETH.<br /><span style={cs("color: #9E9EAE;")}>Every trade is real.</span></h1>
          <p style={cs(`margin: 0; max-width: ${v.heroCopyMax}; font-size: 15.5px; line-height: 1.55; color: #9E9EAE; text-wrap: pretty;`)}>Built on Ink, on real Uniswap V4 pools. Pick any quote token — USDC, ETH or a tokenized stock like NVDAx — and launch on a fair bonding curve, straight onto a real DEX pool, or as a funding campaign. No demos, no simulated fills.</p>
          <div style={cs("display: flex; gap: 12px; align-items: center; margin-top: 6px; flex-wrap: wrap;")}>
            <Hoverable tag="button" onClick={v.goCreate} style={cs("border: none; cursor: pointer; font-size: 15px; font-weight: 700; color: #12061F; background: #D9D9D9; border-radius: 14px; padding: 16px 30px;")} hover={cs("background:#fff")}>Create a coin →</Hoverable>
            <Hoverable tag="button" onClick={v.goBoard} style={cs("border: none; cursor: pointer; font-size: 15px; font-weight: 500; color: #D9D9D9; background: rgba(255,255,255,.06); border-radius: 14px; padding: 16px 24px; box-shadow: 0 0 0 1px rgba(255,255,255,.12) inset;")} hover={cs("background:rgba(255,255,255,.12);color:#fff")}>See the leaderboard</Hoverable>
          </div>
        </div>
        <div style={cs("border-radius: 20px; padding: 18px; background: #0C0C14; box-shadow: 0 0 0 1px #D9D9D9 inset; display: flex; flex-direction: column; gap: 13px;")}>
          <div style={cs("display: flex; justify-content: space-between; align-items: center;")}>
            <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: .18em; color: #74748A;")}>KING OF THE HILL</span>
            <span style={cs(`font-family: 'JetBrains Mono', monospace; font-size: 10px; color: ${v.koth.chgColor};`)}>{v.koth.chg}</span>
          </div>
          <div style={cs("display: flex; gap: 13px;")}>
            <CoinArt art={v.koth.art} ink={v.koth.ink} imageUrl={v.koth.imageUrl} label={<>COIN<br />ART</>} size={84} radius={13} />
            <div style={cs("display: flex; flex-direction: column; gap: 6px; min-width: 0; flex: 1;")}>
              <span style={cs("font-size: 16px; font-weight: 700; color: #FBFAFF; letter-spacing: -.02em;")}>{v.koth.name}</span>
              <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #8E8E9C;")}>{v.koth.ticker}</span>
              <span style={cs("font-size: 12px; line-height: 1.45; color: #8A8A9A;")}>{v.koth.desc}</span>
            </div>
          </div>
          <div style={cs("display: flex; flex-direction: column; gap: 7px;")}>
            <div style={cs("display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #74748A;")}><span>CURVE</span><span style={cs("color: #B4B4C2;")}>{v.koth.pct}</span></div>
            <div style={cs("height: 8px; border-radius: 99px; background: rgba(255,255,255,.08); overflow: hidden;")}>
              <div style={cs(`height: 100%; border-radius: 99px; background: #8A8A9A; width: ${v.koth.pct};`)}></div>
            </div>
          </div>
          <Hoverable tag="button" onClick={v.koth.open} style={cs("border: none; cursor: pointer; font-size: 13px; font-weight: 700; color: #12061F; background: #D9D9D9; border-radius: 11px; padding: 12px 0;")} hover={cs("background:#fff")}>Open {v.koth.ticker}</Hoverable>
        </div>
      </section>

      <div style={cs("display: flex; align-items: center; gap: 10px; flex-wrap: wrap;")}>
        <div style={cs("display: flex; align-items: baseline; gap: 9px; margin-right: 6px;")}>
          <h2 style={cs("margin: 0; font-size: 21px; font-weight: 700; letter-spacing: -.025em; color: #F6F6F9;")}>{v.tabTitle}</h2>
          <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #D9D9D9; background: rgba(217,217,217,.1); border-radius: 99px; padding: 4px 9px; box-shadow: 0 0 0 1px rgba(217,217,217,.22) inset;")}>{v.shownCount}</span>
        </div>
        <div style={cs("flex: 1; min-width: 200px; max-width: 380px; display: flex; align-items: center; gap: 10px; border-radius: 12px; padding: 11px 14px; background: rgba(255,255,255,.04); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset;")}>
          <div style={cs("width: 12px; height: 12px; border: 1.5px solid #6A6A7C; border-radius: 99px; flex: none;")}></div>
          <input value={v.query} onChange={v.setQuery} placeholder="Search ticker, name or dev" style={cs("flex: 1; min-width: 0; border: none; background: transparent; color: #EDEDF2; font-size: 13px; padding: 0;")} />
          {v.hasQuery && (
            <button onClick={v.clearQuery} style={cs("border: none; cursor: pointer; background: transparent; color: #74748A; font-size: 14px; padding: 0;")}>×</button>
          )}
        </div>
        <div style={cs("display: flex; gap: 3px; border-radius: 11px; padding: 3px; background: rgba(255,255,255,.04); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset;")}>
          {v.frames.map((f, i) => (
            <button key={i} onClick={f.go} style={cs(`border: none; cursor: pointer; padding: 7px 11px; border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 11px; background: ${f.bg}; color: ${f.color};`)}>{f.label}</button>
          ))}
        </div>
        <div style={cs("position: relative;")}>
          <Hoverable tag="button" onClick={v.toggleFilters} style={cs(`border: none; cursor: pointer; display: flex; align-items: center; gap: 8px; border-radius: 11px; padding: 10px 14px; font-size: 12.5px; color: ${v.filtersColor}; background: ${v.filtersBg}; box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset;`)} hover={cs("color:#fff")}>Filters {v.filterBadge} <span style={cs("color: #6A6A7C;")}>▾</span></Hoverable>
          {v.filtersOpen && (
            <div style={cs("position: absolute; z-index: 25; top: calc(100% + 8px); right: 0; width: 268px; display: flex; flex-direction: column; gap: 12px; padding: 15px 14px; border-radius: 16px; background: #101016; box-shadow: 0 0 0 1px rgba(255,255,255,.12) inset, 0 24px 60px -20px rgba(0,0,0,.9); animation: popin .18s ease both;")}>
              <div style={cs("display: flex; align-items: baseline; justify-content: space-between;")}>
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: .18em; color: #74748A;")}>FILTERS</span>
                <button onClick={v.resetFilters} style={cs("border: none; background: transparent; cursor: pointer; font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: .12em; color: #B4B4C2; padding: 0;")}>RESET</button>
              </div>
              {v.toggles.map((t, i) => (
                <div key={i} onClick={t.flip} style={cs("display: flex; align-items: center; justify-content: space-between; font-size: 13px; color: #B4B4C2; cursor: pointer;")}>
                  <span>{t.label}</span>
                  <div style={cs(`width: 36px; height: 20px; border-radius: 99px; padding: 3px; display: flex; justify-content: ${t.justify}; background: ${t.track};`)}><div style={cs(`width: 14px; height: 14px; border-radius: 99px; background: ${t.knob};`)}></div></div>
                </div>
              ))}
              <div style={cs("height: 1px; background: rgba(255,255,255,.09);")}></div>
              <div style={cs("display: flex; flex-direction: column; gap: 8px;")}>
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #74748A;")}>SORT BY</span>
                <div style={cs("display: flex; flex-wrap: wrap; gap: 6px;")}>
                  {v.sorts.map((o, i) => (
                    <button key={i} onClick={o.go} style={cs(`border: none; cursor: pointer; padding: 7px 11px; border-radius: 9px; font-size: 12px; background: ${o.bg}; color: ${o.color};`)}>{o.label}</button>
                  ))}
                </div>
              </div>
              <div style={cs("height: 1px; background: rgba(255,255,255,.09);")}></div>
              <div style={cs("display: flex; flex-direction: column; gap: 8px;")}>
                <div style={cs("display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #74748A;")}><span>MIN MCAP</span><span style={cs("color: #D9D9D9;")}>{v.minMcapLabel}</span></div>
                <input type="range" min="0" max="100" step="1" value={v.minMcap} onChange={v.setMinMcap} style={cs("width: 100%; accent-color: #D9D9D9; cursor: pointer;")} />
              </div>
            </div>
          )}
        </div>
        <div style={cs(`display: ${v.toggleDisplay}; gap: 3px; border-radius: 11px; padding: 3px; background: rgba(255,255,255,.04); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset;`)}>
          <button onClick={v.setGrid} style={cs(`border: none; cursor: pointer; padding: 7px 11px; border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 11px; background: ${v.gridBg}; color: ${v.gridColor};`)}>GRID</button>
          <button onClick={v.setList} style={cs(`border: none; cursor: pointer; padding: 7px 11px; border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 11px; background: ${v.listBg}; color: ${v.listColor};`)}>LIST</button>
        </div>
      </div>

      {v.isGrid && (
        <div style={cs(`display: grid; grid-template-columns: repeat(auto-fill, minmax(${v.cardMin}, 1fr)); gap: 14px;`)}>
          {v.visible.map(c => (
            <Hoverable key={c.id} tag="div" onClick={c.open} style={cs("position: relative; border-radius: 18px; padding: 12px; background: rgba(255,255,255,.035); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset; display: flex; flex-direction: column; gap: 12px; cursor: pointer; animation: popin .3s ease both;")} hover={cs("box-shadow:0 0 0 1px rgba(217,217,217,.55) inset;background:rgba(255,255,255,.06)")}>
              <div style={cs("position: relative; aspect-ratio: 1 / 1; border-radius: 13px; overflow: hidden;")}>
                <CoinArt art={c.art} ink={c.ink} imageUrl={c.imageUrl} label="COIN ART" boxStyle="width: 100%; height: 100%; border-radius: 13px;" fontSize={9} />
                <span style={cs("position: absolute; top: 9px; left: 9px; font-family: 'JetBrains Mono', monospace; font-size: 9.5px; color: #E4E4EC; background: rgba(6,6,10,.76); border-radius: 7px; padding: 4px 7px;")}>{c.age}</span>
                <span style={cs(`position: absolute; top: 9px; right: 9px; font-family: 'JetBrains Mono', monospace; font-size: 9.5px; color: ${c.chgColor}; background: rgba(6,6,10,.76); border-radius: 7px; padding: 4px 7px;`)}>{c.chg}</span>
                <button onClick={c.watch} style={cs(`position: absolute; bottom: 9px; right: 9px; border: none; cursor: pointer; font-family: 'JetBrains Mono', monospace; font-size: 9.5px; color: ${c.watchColor}; background: rgba(6,6,10,.76); border-radius: 7px; padding: 4px 7px;`)}>{c.watchIcon}</button>
              </div>
              <div style={cs("display: flex; flex-direction: column; gap: 8px;")}>
                <div style={cs("display: flex; justify-content: space-between; align-items: baseline; gap: 8px;")}>
                  <span style={cs("font-size: 14.5px; font-weight: 700; color: #F2F2F5; letter-spacing: -.01em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;")}>{c.name}</span>
                  <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #8E8E9C; flex: none;")}>{c.ticker}</span>
                </div>
                <div style={cs("display: flex; justify-content: space-between; align-items: center; gap: 8px; font-family: 'JetBrains Mono', monospace; font-size: 10px;")}>
                  <span style={cs("color: #B4B4C2; background: rgba(255,255,255,.07); border-radius: 6px; padding: 3px 7px;")}>{c.pair}</span>
                  <span style={cs("color: #74748A;")}>5x</span>
                </div>
                <div style={cs("display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #74748A;")}>
                  <span>MC <span style={cs("color: #D9D9D9;")}>{c.mc}</span></span>
                  <span>V <span style={cs("color: #D9D9D9;")}>{c.vol}</span></span>
                </div>
                <div style={cs("display: flex; gap: 8px; align-items: center;")}>
                  <div style={cs("flex: 1; height: 6px; border-radius: 99px; background: rgba(255,255,255,.08); overflow: hidden;")}>
                    <div style={cs(`height: 100%; border-radius: 99px; background: #8A8A9A; width: ${c.pct};`)}></div>
                  </div>
                  <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #8A8A9A; flex: none;")}>{c.pct}</span>
                </div>
                <div style={cs("display: flex; justify-content: space-between; align-items: center; padding-top: 2px; gap: 8px;")}>
                  <span style={cs("font-size: 11.5px; color: #6A6A7C; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;")}>by {c.dev}</span>
                  <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #6A6A7C; background: rgba(255,255,255,.05); border-radius: 6px; padding: 4px 7px;")}>{c.family}</span>
                </div>
              </div>
            </Hoverable>
          ))}
        </div>
      )}

      {v.isList && (
        <div style={cs(`border-radius: 18px; overflow: ${v.tblOv}; background: rgba(255,255,255,.03); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset;`)}>
          <div style={cs(`display: grid; min-width: ${v.tblWide}; grid-template-columns: 34px 1fr 96px 96px 92px 150px 78px; gap: 12px; padding: 12px 16px; font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: .14em; color: #6A6A7C; border-bottom: 1px solid rgba(255,255,255,.07);`)}>
            <span>#</span><span>COIN</span><span>MCAP</span><span>VOL</span><span>CHG</span><span>CURVE</span><span>FAMILY</span>
          </div>
          {v.visible.map(c => (
            <Hoverable key={c.id} tag="div" onClick={c.open} style={cs(`display: grid; min-width: ${v.tblWide}; grid-template-columns: 34px 1fr 96px 96px 92px 150px 78px; gap: 12px; padding: 12px 16px; align-items: center; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,.045);`)} hover={cs("background:rgba(255,255,255,.05)")}>
              <CoinArt art={c.art} ink={c.ink} imageUrl={c.imageUrl} size={26} radius={8} />
              <div style={cs("display: flex; flex-direction: column; gap: 3px; min-width: 0;")}>
                <span style={cs("font-size: 13.5px; font-weight: 600; color: #F2F2F5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;")}>{c.name} <span style={cs("color: #8E8E9C; font-family: 'JetBrains Mono', monospace; font-size: 11px;")}>{c.ticker}</span></span>
                <span style={cs("font-size: 11px; color: #6A6A7C;")}>{c.pair} · by {c.dev} · {c.age}</span>
              </div>
              <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #D9D9D9;")}>{c.mc}</span>
              <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #9494A4;")}>{c.vol}</span>
              <span style={cs(`font-family: 'JetBrains Mono', monospace; font-size: 12px; color: ${c.chgColor};`)}>{c.chg}</span>
              <div style={cs("display: flex; align-items: center; gap: 8px;")}>
                <div style={cs("flex: 1; height: 6px; border-radius: 99px; background: rgba(255,255,255,.08); overflow: hidden;")}>
                  <div style={cs(`height: 100%; border-radius: 99px; background: #8A8A9A; width: ${c.pct};`)}></div>
                </div>
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #8A8A9A;")}>{c.pct}</span>
              </div>
              <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #6A6A7C; text-align: right;")}>{c.family}</span>
            </Hoverable>
          ))}
        </div>
      )}

      {v.isEmpty && (
        <div style={cs("display: flex; flex-direction: column; align-items: center; gap: 10px; padding: 56px 0; border-radius: 18px; background: rgba(255,255,255,.025); box-shadow: 0 0 0 1px rgba(255,255,255,.06) inset;")}>
          <div style={cs("font-size: 15px; font-weight: 600; color: #D9D9D9;")}>Nothing matches that.</div>
          <div style={cs("font-size: 13px; color: #74748A;")}>Loosen the filters, or launch it yourself.</div>
          <Hoverable tag="button" onClick={v.goCreate} style={cs("margin-top: 6px; border: none; cursor: pointer; font-size: 13px; font-weight: 600; color: #12061F; background: #D9D9D9; border-radius: 11px; padding: 11px 22px;")} hover={cs("background:#fff")}>Create a coin</Hoverable>
        </div>
      )}
    </div>
  );
}
