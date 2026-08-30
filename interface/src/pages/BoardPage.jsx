import { cs } from "../cs.js";
import Hoverable from "../Hoverable.jsx";
import CoinArt from "../CoinArt.jsx";

export default function BoardPage({ v }) {
  return (
    <div style={cs("display: flex; flex-direction: column; gap: 16px; animation: popin .26s ease both;")}>
      <Hoverable tag="button" onClick={v.goHome} style={cs("border: none; background: transparent; cursor: pointer; align-self: flex-start; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: .14em; color: #74748A; padding: 0;")} hover={cs("color:#D9D9D9")}>← ALL COINS</Hoverable>
      <div style={cs("display: flex; align-items: center; gap: 12px; flex-wrap: wrap;")}>
        <h2 style={cs("margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -.03em; color: #F6F6F9;")}>Leaderboard</h2>
        <div style={cs("display: flex; gap: 3px; border-radius: 11px; padding: 3px; background: rgba(255,255,255,.04); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset;")}>
          {v.boardTabs.map((b, i) => (
            <button key={i} onClick={b.go} style={cs(`border: none; cursor: pointer; padding: 8px 14px; border-radius: 8px; font-size: 12.5px; font-weight: 600; background: ${b.bg}; color: ${b.color};`)}>{b.label}</button>
          ))}
        </div>
      </div>
      <div style={cs(`border-radius: 20px; overflow: ${v.tblOv}; background: rgba(255,255,255,.03); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset;`)}>
        <div style={cs(`display: grid; min-width: ${v.tblWide}; grid-template-columns: 54px 1fr 120px 120px 100px 160px; gap: 12px; padding: 13px 18px; font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: .14em; color: #6A6A7C; border-bottom: 1px solid rgba(255,255,255,.07);`)}>
          <span>RANK</span><span>COIN</span><span>MCAP</span><span>VOL</span><span>CHG</span><span>CURVE</span>
        </div>
        {v.board.map((b, i) => (
          <Hoverable key={i} tag="div" onClick={b.open} style={cs(`display: grid; min-width: ${v.tblWide}; grid-template-columns: 54px 1fr 120px 120px 100px 160px; gap: 12px; padding: 13px 18px; align-items: center; cursor: pointer; border-bottom: 1px solid rgba(255,255,255,.045);`)} hover={cs("background:rgba(255,255,255,.05)")}>
            <span style={cs(`font-family: 'JetBrains Mono', monospace; font-size: 13px; color: ${b.rankColor};`)}>{b.rank}</span>
            <div style={cs("display: flex; align-items: center; gap: 11px; min-width: 0;")}>
              <CoinArt art={b.art} imageUrl={b.imageUrl} size={28} radius={9} />
              <div style={cs("display: flex; flex-direction: column; gap: 2px; min-width: 0;")}>
                <span style={cs("font-size: 13.5px; font-weight: 600; color: #F2F2F5; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;")}>{b.name}</span>
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #6A6A7C;")}>{b.ticker} · by {b.dev}</span>
              </div>
            </div>
            <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 12.5px; color: #EDEDF2;")}>{b.mc}</span>
            <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 12.5px; color: #9494A4;")}>{b.vol}</span>
            <span style={cs(`font-family: 'JetBrains Mono', monospace; font-size: 12.5px; color: ${b.chgColor};`)}>{b.chg}</span>
            <div style={cs("display: flex; align-items: center; gap: 9px;")}>
              <div style={cs("flex: 1; height: 7px; border-radius: 99px; background: rgba(255,255,255,.08); overflow: hidden;")}>
                <div style={cs(`height: 100%; border-radius: 99px; background: #8A8A9A; width: ${b.pct};`)}></div>
              </div>
              <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #8A8A9A;")}>{b.pct}</span>
            </div>
          </Hoverable>
        ))}
      </div>

      <h2 style={cs("margin: 8px 0 0; font-size: 20px; font-weight: 700; letter-spacing: -.025em; color: #F6F6F9;")}>Active campaigns</h2>
      <span style={cs("font-size: 12.5px; color: #74748A; margin-top: -10px;")}>Funding campaigns that haven't resolved yet — contribute here, or finalize one whose deadline has passed.</span>
      {v.hasActiveCampaigns && (
        <div style={cs("display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 14px;")}>
          {v.activeCampaigns.map((c, i) => (
            <div key={i} style={cs("border-radius: 18px; padding: 16px; background: rgba(255,255,255,.035); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset; display: flex; flex-direction: column; gap: 10px;")}>
              <div style={cs("display: flex; justify-content: space-between; align-items: baseline; gap: 8px;")}>
                <span style={cs("font-size: 14.5px; font-weight: 700; color: #F2F2F5;")}>{c.name}</span>
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #8E8E9C;")}>{c.ticker}</span>
              </div>
              <div style={cs("display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #74748A;")}>
                <span>{c.raised} raised</span><span>goal {c.goalUsd}</span>
              </div>
              <div style={cs("height: 7px; border-radius: 99px; background: rgba(255,255,255,.08); overflow: hidden;")}>
                <div style={cs(`height: 100%; border-radius: 99px; background: #6600FF; width: ${c.pct};`)}></div>
              </div>
              {c.deadlinePassed ? (
                <Hoverable tag="button" onClick={c.finalize} style={cs("border: none; cursor: pointer; width: 100%; padding: 10px 0; border-radius: 9px; font-size: 12.5px; font-weight: 700; color: #12061F; background: #D9D9D9;")} hover={cs("background:#fff")}>Finalize</Hoverable>
              ) : (
                <div style={cs("display: flex; gap: 7px;")}>
                  <input value={c.amount} onChange={c.setAmount} placeholder="0.00 ETH" style={cs("flex: 1; min-width: 0; border: none; border-radius: 9px; padding: 9px 11px; background: rgba(255,255,255,.05); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset; color: #EDEDF2; font-family: 'JetBrains Mono', monospace; font-size: 12px;")} />
                  <Hoverable tag="button" onClick={c.contribute} style={cs("border: none; cursor: pointer; padding: 9px 14px; border-radius: 9px; font-size: 12px; font-weight: 700; color: #12061F; background: #D9D9D9; flex: none;")} hover={cs("background:#fff")}>Contribute</Hoverable>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      {v.noActiveCampaigns && (
        <span style={cs("font-size: 13px; color: #74748A;")}>No active campaigns right now.</span>
      )}
    </div>
  );
}
