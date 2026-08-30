import { cs } from "../cs.js";
import Hoverable from "../Hoverable.jsx";
import CoinArt from "../CoinArt.jsx";

export default function PortfolioPage({ v }) {
  return (
    <div style={cs("display: flex; flex-direction: column; gap: 16px; animation: popin .26s ease both;")}>
      <Hoverable tag="button" onClick={v.goHome} style={cs("border: none; background: transparent; cursor: pointer; align-self: flex-start; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: .14em; color: #74748A; padding: 0;")} hover={cs("color:#D9D9D9")}>← ALL COINS</Hoverable>

      {v.notConnected && (
        <div style={cs("border-radius: 20px; padding: 40px; background: rgba(255,255,255,.035); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset; display: flex; flex-direction: column; align-items: center; gap: 12px;")}>
          <span style={cs("font-size: 15px; font-weight: 600; color: #D9D9D9;")}>Connect a wallet to see your portfolio.</span>
          <Hoverable tag="button" onClick={v.connect} style={cs("border: none; cursor: pointer; font-size: 13.5px; font-weight: 600; color: #12061F; background: #D9D9D9; border-radius: 99px; padding: 11px 22px;")} hover={cs("background:#fff")}>Connect Wallet</Hoverable>
        </div>
      )}

      {v.connected && (
        <>
          <div style={cs(`display: grid; grid-template-columns: ${v.statCols}; gap: 12px;`)}>
            {v.portStats.map((p, i) => (
              <div key={i} style={cs("border-radius: 18px; padding: 16px; background: rgba(255,255,255,.035); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset; display: flex; flex-direction: column; gap: 6px;")}>
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: .14em; color: #6A6A7C;")}>{p.k}</span>
                <span style={cs(`font-family: 'JetBrains Mono', monospace; font-size: 21px; color: ${p.color};`)}>{p.v}</span>
              </div>
            ))}
          </div>

          <div style={cs("border-radius: 20px; overflow: hidden; background: rgba(255,255,255,.03); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset;")}>
            <div style={cs(`display: grid; min-width: ${v.tblMid}; grid-template-columns: 1fr 130px 90px; gap: 12px; padding: 13px 18px; font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: .14em; color: #6A6A7C; border-bottom: 1px solid rgba(255,255,255,.07);`)}>
              <span>TOKEN HOLDINGS</span><span>BALANCE</span><span></span>
            </div>
            {v.holdings.map((h, i) => (
              <div key={i} style={cs(`display: grid; min-width: ${v.tblMid}; grid-template-columns: 1fr 130px 90px; gap: 12px; padding: 13px 18px; align-items: center; border-bottom: 1px solid rgba(255,255,255,.045);`)}>
                <div style={cs("display: flex; align-items: center; gap: 11px; min-width: 0;")}>
                  <CoinArt art={h.art} imageUrl={h.imageUrl} size={28} radius={9} />
                  <div style={cs("display: flex; flex-direction: column; gap: 2px; min-width: 0;")}>
                    <span style={cs("font-size: 13.5px; font-weight: 600; color: #F2F2F5;")}>{h.name}</span>
                    <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #8E8E9C;")}>{h.pair}</span>
                  </div>
                </div>
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #EDEDF2;")}>{h.balance}</span>
                <Hoverable tag="button" onClick={h.open} style={cs("border: none; cursor: pointer; font-size: 12px; font-weight: 600; color: #D9D9D9; background: rgba(255,255,255,.07); border-radius: 9px; padding: 9px 0;")} hover={cs("background:rgba(255,255,255,.14);color:#fff")}>Open</Hoverable>
              </div>
            ))}
            {v.noHoldings && (
              <div style={cs("padding: 40px 0; display: flex; flex-direction: column; align-items: center; gap: 10px;")}>
                <span style={cs("font-size: 14.5px; font-weight: 600; color: #D9D9D9;")}>No token holdings yet.</span>
                <Hoverable tag="button" onClick={v.goHome} style={cs("border: none; cursor: pointer; font-size: 13px; font-weight: 600; color: #12061F; background: #D9D9D9; border-radius: 11px; padding: 11px 22px;")} hover={cs("background:#fff")}>Browse coins</Hoverable>
              </div>
            )}
          </div>

          <div style={cs("border-radius: 20px; overflow: hidden; background: rgba(255,255,255,.03); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset;")}>
            <div style={cs(`display: grid; min-width: ${v.tblMid}; grid-template-columns: 1fr 100px 130px; gap: 12px; padding: 13px 18px; font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: .14em; color: #6A6A7C; border-bottom: 1px solid rgba(255,255,255,.07); align-items: center;`)}>
              <span>TOKENS YOU CREATED</span><span>FAMILY</span>
              {v.hasCreated ? (
                <Hoverable tag="button" onClick={v.claimAllFees} style={cs("border: none; cursor: pointer; font-size: 10.5px; font-weight: 600; letter-spacing: normal; color: #D9D9D9; background: rgba(255,255,255,.07); border-radius: 8px; padding: 7px 0; text-transform: none;")} hover={cs("background:rgba(255,255,255,.14);color:#fff")}>Claim all</Hoverable>
              ) : <span></span>}
            </div>
            {v.created.map((t, i) => (
              <div key={i} style={cs(`display: grid; min-width: ${v.tblMid}; grid-template-columns: 1fr 100px 130px; gap: 12px; padding: 13px 18px; align-items: center; border-bottom: 1px solid rgba(255,255,255,.045);`)}>
                <button onClick={t.open} style={cs("border: none; background: transparent; cursor: pointer; text-align: left; padding: 0;")}>
                  <span style={cs("font-size: 13.5px; font-weight: 600; color: #F2F2F5;")}>{t.name} </span>
                  <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #8E8E9C;")}>{t.ticker}</span>
                </button>
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #6A6A7C;")}>{t.family}</span>
                <Hoverable tag="button" onClick={t.claimFees} style={cs("border: none; cursor: pointer; font-size: 12px; font-weight: 600; color: #D9D9D9; background: rgba(255,255,255,.07); border-radius: 9px; padding: 9px 0;")} hover={cs("background:rgba(255,255,255,.14);color:#fff")}>Claim LP fees</Hoverable>
              </div>
            ))}
            {v.noCreated && (
              <div style={cs("padding: 40px 0; display: flex; flex-direction: column; align-items: center; gap: 10px;")}>
                <span style={cs("font-size: 14.5px; font-weight: 600; color: #D9D9D9;")}>You haven't created anything yet.</span>
                <Hoverable tag="button" onClick={v.goCreate} style={cs("border: none; cursor: pointer; font-size: 13px; font-weight: 600; color: #12061F; background: #D9D9D9; border-radius: 11px; padding: 11px 22px;")} hover={cs("background:#fff")}>Launch a coin</Hoverable>
              </div>
            )}
          </div>

          <div style={cs("border-radius: 20px; overflow: hidden; background: rgba(255,255,255,.03); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset;")}>
            <div style={cs(`display: grid; min-width: ${v.tblMid}; grid-template-columns: 1fr 110px 110px 130px; gap: 12px; padding: 13px 18px; font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: .14em; color: #6A6A7C; border-bottom: 1px solid rgba(255,255,255,.07);`)}>
              <span>CAMPAIGN CONTRIBUTIONS</span><span>AMOUNT</span><span>STATUS</span><span></span>
            </div>
            {v.contributions.map((ct, i) => (
              <div key={i} style={cs(`display: grid; min-width: ${v.tblMid}; grid-template-columns: 1fr 110px 110px 130px; gap: 12px; padding: 13px 18px; align-items: center; border-bottom: 1px solid rgba(255,255,255,.045);`)}>
                <div>
                  {ct.open ? (
                    <button onClick={ct.open} style={cs("border: none; background: transparent; cursor: pointer; text-align: left; padding: 0; font-size: 13.5px; font-weight: 600; color: #F2F2F5;")}>{ct.name} {ct.ticker}</button>
                  ) : (
                    <span style={cs("font-size: 13.5px; font-weight: 600; color: #F2F2F5;")}>{ct.name} {ct.ticker}</span>
                  )}
                </div>
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #EDEDF2;")}>{ct.amount}</span>
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #B4B4C2;")}>{ct.status}</span>
                {ct.action ? (
                  <Hoverable tag="button" onClick={ct.action} style={cs("border: none; cursor: pointer; font-size: 12px; font-weight: 600; color: #12061F; background: #D9D9D9; border-radius: 9px; padding: 9px 0;")} hover={cs("background:#fff")}>{ct.actionLabel}</Hoverable>
                ) : <span></span>}
              </div>
            ))}
            {v.noContributions && (
              <div style={cs("padding: 40px 0; display: flex; flex-direction: column; align-items: center; gap: 6px;")}>
                <span style={cs("font-size: 13px; color: #74748A;")}>No campaign contributions yet.</span>
              </div>
            )}
          </div>

          <div style={cs("border-radius: 20px; padding: 18px; background: rgba(255,255,255,.035); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset; display: flex; flex-direction: column; gap: 12px;")}>
            <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: .18em; color: #74748A;")}>RECENT ACTIONS</span>
            {v.hasActivity && (
              <div style={cs("display: flex; flex-direction: column;")}>
                {v.activity.map((a, i) => (
                  <div key={i} style={cs("display: grid; grid-template-columns: 110px 1fr 130px 90px; gap: 12px; padding: 11px 0; align-items: center; border-bottom: 1px solid rgba(255,255,255,.045);")}>
                    <span style={cs(`font-family: 'JetBrains Mono', monospace; font-size: 11px; color: ${a.color};`)}>{a.kind}</span>
                    <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 11.5px; color: #D9D9D9;")}>{a.tick}</span>
                    <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 11.5px; color: #EDEDF2;")}>{a.amt}</span>
                    <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #6A6A7C; text-align: right;")}>{a.ago}</span>
                  </div>
                ))}
              </div>
            )}
            {v.noActivity && (
              <span style={cs("font-size: 13px; color: #74748A;")}>Transactions you submit this session show up here.</span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
