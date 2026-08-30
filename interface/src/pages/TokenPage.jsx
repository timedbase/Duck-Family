import { cs } from "../cs.js";
import Hoverable from "../Hoverable.jsx";
import PriceChart from "../PriceChart.jsx";
import CoinArt from "../CoinArt.jsx";

export default function TokenPage({ v }) {
  const tok = v.tok;
  return (
    <div style={cs("display: flex; flex-direction: column; gap: 16px; animation: popin .26s ease both;")}>
      <Hoverable tag="button" onClick={v.goHome} style={cs("border: none; background: transparent; cursor: pointer; align-self: flex-start; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: .14em; color: #74748A; padding: 0;")} hover={cs("color:#D9D9D9")}>← ALL COINS</Hoverable>

      <div style={cs(`display: grid; grid-template-columns: ${v.tokenCols}; gap: 16px; align-items: start;`)}>
        <div style={cs("display: flex; flex-direction: column; gap: 16px; min-width: 0;")}>
          <div style={cs(`border-radius: 20px; padding: 20px; background: #0D0D12; box-shadow: 0 0 0 1px rgba(255,255,255,.09) inset; display: flex; flex-direction: ${v.tokHeadDir}; gap: 18px;`)}>
            <CoinArt art={tok.art} ink={tok.ink} imageUrl={tok.imageUrl} label={<>COIN<br />ART</>} size={108} radius={15} fontSize={9} />
            <div style={cs("display: flex; flex-direction: column; gap: 9px; min-width: 0; flex: 1;")}>
              <div style={cs("display: flex; align-items: baseline; gap: 10px; flex-wrap: wrap;")}>
                <span style={cs("font-size: 26px; font-weight: 700; letter-spacing: -.03em; color: #FBFAFF;")}>{tok.name}</span>
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 13px; color: #8E8E9C;")}>{tok.ticker}</span>
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #D9D9D9; background: rgba(255,255,255,.07); border-radius: 7px; padding: 4px 8px;")}>{tok.pair}</span>
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 9px; color: #6A6A7C; background: rgba(255,255,255,.05); border-radius: 6px; padding: 3px 7px; letter-spacing: .08em;")}>{tok.family}</span>
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #6A6A7C;")}>{tok.mint}</span>
              </div>
              <div style={cs("font-size: 13.5px; line-height: 1.5; color: #9E9EAE; max-width: 62ch;")}>{tok.desc}</div>
              <div style={cs("display: flex; gap: 8px; align-items: center; flex-wrap: wrap; margin-top: 2px;")}>
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #B4B4C2; background: rgba(255,255,255,.06); border-radius: 8px; padding: 5px 9px;")}>dev {tok.dev}</span>
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #B4B4C2; background: rgba(255,255,255,.06); border-radius: 8px; padding: 5px 9px;")}>{tok.age} old</span>
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #B4B4C2; background: rgba(255,255,255,.06); border-radius: 8px; padding: 5px 9px;")}>{tok.holders} holders</span>
                <Hoverable tag="button" onClick={tok.watch} style={cs(`border: none; cursor: pointer; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: ${tok.watchColor}; background: rgba(255,255,255,.06); border-radius: 8px; padding: 5px 10px;`)} hover={cs("background:rgba(255,255,255,.14)")}>{tok.watchIcon} {tok.watchLabel}</Hoverable>
              </div>
            </div>
          </div>

          <div style={cs("border-radius: 20px; padding: 18px; background: #0D0D12; box-shadow: 0 0 0 1px rgba(255,255,255,.09) inset; display: flex; flex-direction: column; gap: 10px;")}>
            <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: .18em; color: #74748A;")}>PRICE ({tok.quote} PER TOKEN)</span>
            <PriceChart candles={tok.candles} />
          </div>

          <div style={cs("border-radius: 20px; padding: 18px; background: rgba(255,255,255,.035); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset; display: flex; flex-direction: column; gap: 14px;")}>
            <div style={cs(`display: grid; grid-template-columns: ${v.statCols}; gap: 8px;`)}>
              {tok.stats.map((st, i) => (
                <div key={i} style={cs("border-radius: 12px; padding: 11px 12px; background: rgba(255,255,255,.04); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset; display: flex; flex-direction: column; gap: 4px;")}>
                  <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 8.5px; letter-spacing: .12em; color: #6A6A7C;")}>{st.k}</span>
                  <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 13.5px; color: #EDEDF2;")}>{st.v}</span>
                </div>
              ))}
            </div>
            {tok.family === "CURVE" && (
              <div style={cs("display: flex; flex-direction: column; gap: 8px;")}>
                <div style={cs("display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #74748A;")}><span>BONDING CURVE</span><span style={cs("color: #B4B4C2;")}>{tok.pct}</span></div>
                <div style={cs("height: 10px; border-radius: 99px; background: rgba(255,255,255,.08); overflow: hidden;")}>
                  <div style={cs(`height: 100%; border-radius: 99px; background: #6600FF; width: ${tok.pct};`)}></div>
                </div>
              </div>
            )}
            {(tok.family === "INSTANT" || (tok.family === "CURVE" && tok.migrated)) && (
              <div style={cs("font-size: 13px; line-height: 1.5; color: #9E9EAE;")}>Live on a real Uniswap V4 pool{tok.poolId ? " (" + tok.poolId.slice(0, 10) + "…)" : ""} with permanently locked liquidity. Trades route through that pool.</div>
            )}
            {tok.family === "CAMPAIGN" && tok.poolId && (
              <div style={cs("font-size: 13px; line-height: 1.5; color: #9E9EAE;")}>This campaign succeeded and migrated to a pool ({tok.poolId.slice(0, 10)}…).</div>
            )}
          </div>

          <div style={cs("border-radius: 20px; padding: 18px; background: rgba(255,255,255,.035); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset; display: flex; flex-direction: column; gap: 12px;")}>
            <div style={cs("display: flex; gap: 4px; padding: 4px; border-radius: 12px; background: rgba(255,255,255,.05); align-self: flex-start;")}>
              <button onClick={v.setPaneTrades} style={cs(`border: none; cursor: pointer; padding: 8px 15px; border-radius: 9px; font-size: 12.5px; font-weight: 600; background: ${v.paneTradesBg}; color: ${v.paneTradesColor};`)}>Trades</button>
              <button onClick={v.setPaneHolders} style={cs(`border: none; cursor: pointer; padding: 8px 15px; border-radius: 9px; font-size: 12.5px; font-weight: 600; background: ${v.paneHoldersBg}; color: ${v.paneHoldersColor};`)}>Holders</button>
              <button onClick={v.setPaneChat} style={cs(`border: none; cursor: pointer; padding: 8px 15px; border-radius: 9px; font-size: 12.5px; font-weight: 600; background: ${v.paneChatBg}; color: ${v.paneChatColor};`)}>Thread {v.chatCount}</button>
            </div>

            {v.paneIsTrades && (
              <div style={cs(`display: flex; flex-direction: column; overflow: ${v.tblOv};`)}>
                <div style={cs(`display: grid; min-width: ${v.tblMid}; grid-template-columns: 90px 1fr 110px 110px 70px; gap: 10px; padding: 9px 6px; font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: .12em; color: #6A6A7C; border-bottom: 1px solid rgba(255,255,255,.07);`)}>
                  <span>SIDE</span><span>WALLET</span><span>SIZE</span><span>TOKENS</span><span>AGE</span>
                </div>
                {tok.trades.length === 0 && (
                  <div style={cs("padding: 24px 6px; font-size: 13px; color: #74748A;")}>No trades yet.</div>
                )}
                {tok.trades.map((tr, i) => (
                  <div key={i} style={cs(`display: grid; min-width: ${v.tblMid}; grid-template-columns: 90px 1fr 110px 110px 70px; gap: 10px; padding: 10px 6px; align-items: center; border-bottom: 1px solid rgba(255,255,255,.045);`)}>
                    <span style={cs(`font-family: 'JetBrains Mono', monospace; font-size: 11px; color: ${tr.dirColor};`)}>{tr.side}</span>
                    <span title={tr.full} style={cs("font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #D9D9D9; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0;")}>{tr.who}</span>
                    <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #EDEDF2;")}>{tr.amt} <span style={cs("color: #6A6A7C;")}>{tr.quote}</span></span>
                    <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #9494A4;")}>{tr.tokens}</span>
                    <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #6A6A7C;")}>{tr.ago}</span>
                  </div>
                ))}
              </div>
            )}

            {v.paneIsHolders && (
              <div style={cs("display: flex; flex-direction: column; gap: 9px;")}>
                {tok.holderRows.length === 0 && (
                  <div style={cs("font-size: 13px; color: #74748A;")}>No holders indexed yet.</div>
                )}
                {tok.holderRows.map((h, i) => (
                  <div key={i} style={cs("display: flex; align-items: center; gap: 12px;")}>
                    <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #6A6A7C; width: 18px; flex: none;")}>{h.rank}</span>
                    <span title={h.full} style={cs("font-family: 'JetBrains Mono', monospace; font-size: 11.5px; color: #D9D9D9; width: 150px; flex: none; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;")}>{h.who}</span>
                    <div style={cs("flex: 1; height: 8px; border-radius: 99px; background: rgba(255,255,255,.07); overflow: hidden;")}>
                      <div style={cs(`height: 100%; border-radius: 99px; background: ${h.color}; width: ${h.share};`)}></div>
                    </div>
                    <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #EDEDF2; width: 58px; text-align: right; flex: none;")}>{h.share}</span>
                    <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 10px; color: #6A6A7C; width: 62px; text-align: right; flex: none;")}>{h.tag}</span>
                  </div>
                ))}
              </div>
            )}

            {v.paneIsChat && (
              <div style={cs("display: flex; flex-direction: column; gap: 12px;")}>
                <div style={cs("display: flex; gap: 9px;")}>
                  <input value={v.chatDraft} onChange={v.setChatDraft} placeholder="Say something to the family" style={cs("flex: 1; min-width: 0; border: none; border-radius: 11px; padding: 12px 14px; background: rgba(255,255,255,.05); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset; color: #EDEDF2; font-size: 13px;")} />
                  <Hoverable tag="button" onClick={v.postChat} style={cs("border: none; cursor: pointer; font-size: 13px; font-weight: 700; color: #12061F; background: #D9D9D9; border-radius: 11px; padding: 12px 20px; flex: none;")} hover={cs("background:#fff")}>Post</Hoverable>
                </div>
                <div style={cs("display: flex; flex-direction: column; gap: 9px;")}>
                  {tok.chat.map((m, i) => (
                    <div key={i} style={cs("display: flex; gap: 11px; padding: 12px; border-radius: 13px; background: rgba(255,255,255,.04);")}>
                      <span style={cs(`width: 28px; height: 28px; border-radius: 9px; flex: none; background: ${m.hue};`)}></span>
                      <div style={cs("display: flex; flex-direction: column; gap: 4px; min-width: 0;")}>
                        <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #8E8E9C;")}>{m.who} · {m.ago}</span>
                        <span style={cs("font-size: 13px; line-height: 1.5; color: #E4E4EC;")}>{m.text}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={cs("position: sticky; top: 90px; display: flex; flex-direction: column; gap: 14px;")}>
          {(tok.family === "CURVE" || tok.family === "INSTANT") && (
            <div style={cs("border-radius: 20px; padding: 18px; background: #0C0C14; box-shadow: 0 0 0 1px #D9D9D9 inset; display: flex; flex-direction: column; gap: 13px;")}>
              <div style={cs("display: flex; gap: 4px; padding: 4px; border-radius: 12px; background: rgba(255,255,255,.05);")}>
                <button onClick={v.setSideBuy} style={cs(`flex: 1; border: none; cursor: pointer; padding: 10px 0; border-radius: 9px; font-size: 13px; font-weight: 700; background: ${v.buyTabBg}; color: ${v.buyTabColor};`)}>Buy</button>
                <button onClick={v.setSideSell} style={cs(`flex: 1; border: none; cursor: pointer; padding: 10px 0; border-radius: 9px; font-size: 13px; font-weight: 700; background: ${v.sellTabBg}; color: ${v.sellTabColor};`)}>Sell</button>
              </div>
              <div style={cs("display: flex; align-items: center; gap: 10px; border-radius: 12px; padding: 13px 15px; background: rgba(255,255,255,.05); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset;")}>
                <input value={v.amount} onChange={v.setAmount} placeholder="0.00" style={cs("flex: 1; min-width: 0; border: none; background: transparent; color: #FBFAFF; font-family: 'JetBrains Mono', monospace; font-size: 20px; padding: 0;")} />
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #74748A;")}>{v.amountUnit}</span>
              </div>
              <div style={cs("display: flex; gap: 7px;")}>
                {v.presets.map((p, i) => (
                  <Hoverable key={i} tag="button" onClick={p.go} style={cs("flex: 1; border: none; cursor: pointer; padding: 9px 0; border-radius: 9px; font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #D9D9D9; background: rgba(217,217,217,.12);")} hover={cs("background:#D9D9D9;color:#12061F")}>{p.label}</Hoverable>
                ))}
              </div>
              <div style={cs("display: flex; flex-direction: column; gap: 6px;")}>
                <div style={cs("display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: .1em; color: #74748A;")}><span>MAX SLIPPAGE</span><span style={cs("color: #D9D9D9;")}>{v.slippageLabel}</span></div>
                <div style={cs("display: flex; gap: 6px;")}>
                  {v.slippageOptions.map((o, i) => (
                    <button key={i} onClick={o.go} style={cs(`flex: 1; border: none; cursor: pointer; padding: 7px 0; border-radius: 8px; font-family: 'JetBrains Mono', monospace; font-size: 11px; background: ${o.bg}; color: ${o.color};`)}>{o.label}</button>
                  ))}
                </div>
              </div>
              <div style={cs("display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #6A6A7C;")}><span>YOUR BALANCE</span><span style={cs("color: #D9D9D9;")}>{tok.myBalanceTokens.toLocaleString(undefined, { maximumFractionDigits: 2 })} {tok.ticker.replace("$", "")}</span></div>
              <div style={cs("display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #6A6A7C;")}><span>WALLET</span><span style={cs("color: #D9D9D9;")}>{v.balance} ETH</span></div>
              <Hoverable tag="button" onClick={v.submitTrade} style={cs(`border: none; cursor: pointer; width: 100%; padding: 15px 0; border-radius: 13px; font-size: 15px; font-weight: 700; color: ${v.ctaInk}; background: ${v.ctaBg};`)} hover={cs("filter:brightness(1.1)")}>{v.ctaLabel}</Hoverable>
              {(tok.family === "INSTANT" || (tok.family === "CURVE" && tok.migrated)) && (
                <span style={cs("font-size: 11px; line-height: 1.5; color: #6A6A7C;")}>Routes through the real Uniswap V4 pool via the Universal Router. Both buy and sell settle in native ETH.</span>
              )}
              {tok.family === "CURVE" && !tok.migrated && tok.quote !== "ETH" && (
                <span style={cs("font-size: 11px; line-height: 1.5; color: #6A6A7C;")}>Buys route native ETH in automatically. Sell proceeds land as {tok.quote}, not native ETH.</span>
              )}
            </div>
          )}

          {tok.family === "CAMPAIGN" && !tok.campaignSucceeded && !tok.campaignFailed && (
            <div style={cs("border-radius: 20px; padding: 18px; background: #0C0C14; box-shadow: 0 0 0 1px #D9D9D9 inset; display: flex; flex-direction: column; gap: 13px;")}>
              <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: .18em; color: #74748A;")}>CAMPAIGN ACTIVE</span>
              <div style={cs("display: flex; justify-content: space-between; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; color: #74748A;")}><span>RAISED</span><span style={cs("color: #B4B4C2;")}>{tok.pct}</span></div>
              <div style={cs("height: 8px; border-radius: 99px; background: rgba(255,255,255,.08); overflow: hidden;")}>
                <div style={cs(`height: 100%; border-radius: 99px; background: #6600FF; width: ${tok.pct};`)}></div>
              </div>
              {tok.campaignDeadlinePassed ? (
                <Hoverable tag="button" onClick={tok.finalize} style={cs("border: none; cursor: pointer; width: 100%; padding: 15px 0; border-radius: 13px; font-size: 15px; font-weight: 700; color: #12061F; background: #D9D9D9;")} hover={cs("filter:brightness(1.1)")}>{v.txPending ? "Confirming…" : "Finalize"}</Hoverable>
              ) : (
                <>
                  <div style={cs("display: flex; align-items: center; gap: 10px; border-radius: 12px; padding: 13px 15px; background: rgba(255,255,255,.05); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset;")}>
                    <input value={v.amount} onChange={v.setAmount} placeholder="0.00" style={cs("flex: 1; min-width: 0; border: none; background: transparent; color: #FBFAFF; font-family: 'JetBrains Mono', monospace; font-size: 20px; padding: 0;")} />
                    <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #74748A;")}>ETH</span>
                  </div>
                  <Hoverable tag="button" onClick={tok.submitContribute} style={cs("border: none; cursor: pointer; width: 100%; padding: 15px 0; border-radius: 13px; font-size: 15px; font-weight: 700; color: #12061F; background: #D9D9D9;")} hover={cs("filter:brightness(1.1)")}>{v.txPending ? "Confirming…" : "Contribute"}</Hoverable>
                </>
              )}
            </div>
          )}

          {tok.family === "CAMPAIGN" && tok.campaignSucceeded && (
            <div style={cs("border-radius: 20px; padding: 18px; background: #0C0C14; box-shadow: 0 0 0 1px #D9D9D9 inset; display: flex; flex-direction: column; gap: 13px;")}>
              <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: .18em; color: #74748A;")}>CAMPAIGN SUCCEEDED</span>
              <span style={cs("font-size: 13px; line-height: 1.5; color: #E4E4EC;")}>The token exists — contributors claim their allocation here.</span>
              {tok.myContribution ? (
                tok.myContribution.claimed ? (
                  <span style={cs("font-size: 13px; color: #6BE59A;")}>Already claimed.</span>
                ) : (
                  <Hoverable tag="button" onClick={tok.claimTokens} style={cs("border: none; cursor: pointer; width: 100%; padding: 15px 0; border-radius: 13px; font-size: 15px; font-weight: 700; color: #12061F; background: #D9D9D9;")} hover={cs("filter:brightness(1.1)")}>{v.txPending ? "Confirming…" : "Claim your tokens"}</Hoverable>
                )
              ) : (
                <span style={cs("font-size: 13px; color: #74748A;")}>You didn't contribute to this campaign.</span>
              )}
            </div>
          )}

          {tok.family === "CAMPAIGN" && tok.campaignFailed && (
            <div style={cs("border-radius: 20px; padding: 18px; background: #0C0C14; box-shadow: 0 0 0 1px #D9D9D9 inset; display: flex; flex-direction: column; gap: 13px;")}>
              <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: .18em; color: #74748A;")}>CAMPAIGN FAILED</span>
              {tok.myContribution ? (
                tok.myContribution.refunded ? (
                  <span style={cs("font-size: 13px; color: #6BE59A;")}>Already refunded.</span>
                ) : (
                  <Hoverable tag="button" onClick={tok.claimRefund} style={cs("border: none; cursor: pointer; width: 100%; padding: 15px 0; border-radius: 13px; font-size: 15px; font-weight: 700; color: #12061F; background: #D9D9D9;")} hover={cs("filter:brightness(1.1)")}>{v.txPending ? "Confirming…" : "Claim refund"}</Hoverable>
                )
              ) : (
                <span style={cs("font-size: 13px; color: #74748A;")}>You didn't contribute to this campaign.</span>
              )}
            </div>
          )}

          <div style={cs("border-radius: 20px; padding: 16px; background: rgba(255,255,255,.035); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset; display: flex; flex-direction: column; gap: 11px;")}>
            <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: .18em; color: #74748A;")}>MORE FROM THE FAMILY</span>
            {v.related.map((r, i) => (
              <Hoverable key={i} tag="button" onClick={r.open} style={cs("border: none; cursor: pointer; background: transparent; padding: 0; display: flex; align-items: center; gap: 10px; width: 100%;")} hover={cs("opacity:.75")}>
                <CoinArt art={r.art} imageUrl={r.imageUrl} size={26} radius={8} />
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 11px; color: #E4E4EC; flex: 1; text-align: left; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;")}>{r.ticker}</span>
                <span style={cs(`font-family: 'JetBrains Mono', monospace; font-size: 11px; color: ${r.chgColor};`)}>{r.chg}</span>
              </Hoverable>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
