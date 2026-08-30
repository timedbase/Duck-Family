import { useState } from "react";
import { cs } from "../cs.js";

export default function TokenPage({ v }) {
  const sel = v.sel;
  const tok = v.coin;
  const [splitWallet, setSplitWallet] = useState("");
  const [splitPct, setSplitPct] = useState("");
  if (!sel || !tok) return null;

  const submitSplits = () => {
    const poolId = v.liq && v.creatorData?.poolId;
    if (!poolId) return;
    const pct = parseFloat(splitPct) || 0;
    if (!splitWallet.trim() || pct <= 0 || pct >= 100) {
      v.saveFeeSplits(poolId, []); // empty resets to 100% direct to creator
      return;
    }
    v.saveFeeSplits(poolId, [
      { wallet: splitWallet.trim(), bps: Math.round(pct * 100) },
      { wallet: v.account, bps: 10000 - Math.round(pct * 100) },
    ]);
  };

  return (
    <div>
      <button onClick={v.goHome} style={cs("border:0;background:transparent;font-family:'DM Mono',monospace;font-size:11.5px;letter-spacing:.1em;color:var(--mute);cursor:pointer;padding:0 0 14px")}>← DISCOVER</button>

      <div style={cs("border:2px solid var(--ink);background:var(--card);box-shadow:3px 3px 0 var(--ink);margin-bottom:16px")}>
        <div style={cs("display:flex;align-items:stretch;border-bottom:2px solid var(--ink);flex-wrap:wrap")}>
          <div style={cs(`width:${v.isMobile ? "56px" : "84px"};flex:none;border-right:2px solid var(--ink);background:${sel.famBg};color:${sel.famFg};display:flex;align-items:center;justify-content:center;font-size:${v.isMobile ? "18px" : "26px"};font-weight:700;letter-spacing:-.03em`)}>{sel.initials}</div>
          <div style={cs("flex:1;min-width:260px;padding:16px 20px")}>
            <div style={cs("display:flex;align-items:baseline;gap:11px;flex-wrap:wrap")}>
              <h1 style={cs(`margin:0;font-size:${v.isMobile ? "20px" : "28px"};font-weight:700;letter-spacing:-.04em`)}>{sel.name}</h1>
              <span style={cs("font-family:'DM Mono',monospace;font-size:14px;color:var(--mute)")}>{sel.symbol}</span>
              <span style={cs(`font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.1em;padding:3px 9px;border:2px solid var(--ink);background:${sel.famBg};color:${sel.famFg}`)}>{sel.family}</span>
            </div>
            <div style={cs("display:flex;gap:15px;margin-top:10px;font-family:'DM Mono',monospace;font-size:11.5px;color:var(--mute);flex-wrap:wrap")}>
              <span>{sel.address}</span>
              <a href={`https://explorer.inkonchain.com/address/${tok.id}`} target="_blank" rel="noreferrer">Blockscout</a>
            </div>
          </div>
          <div style={cs("border-left:2px solid var(--ink);padding:16px 22px;text-align:right;flex:none")}>
            <div style={cs("font-family:'DM Mono',monospace;font-size:34px;font-weight:500;letter-spacing:-.04em;line-height:1")}>{sel.price}</div>
            <div style={cs(`font-family:'DM Mono',monospace;font-size:13px;color:${sel.chgColor};margin-top:5px`)}>{sel.chg} / window</div>
          </div>
        </div>
        <div style={cs("display:flex;flex-wrap:wrap")}>
          {v.tokenStats.map((st, i) => (
            <div key={i} style={cs("flex:1;min-width:130px;padding:12px 18px;border-right:2px solid var(--ink);background:var(--card)")}>
              <div style={cs("font-family:'DM Mono',monospace;font-size:9.5px;letter-spacing:.14em;color:var(--mute)")}>{st.k}</div>
              <div style={cs("font-family:'DM Mono',monospace;font-size:18px;font-weight:500;letter-spacing:-.02em;margin-top:5px")}>{st.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={cs(`display:grid;grid-template-columns:${v.isMobile ? "minmax(0,1fr)" : "minmax(0,1fr) 366px"};gap:16px;align-items:start`)}>
        <div style={cs("display:flex;flex-direction:column;gap:16px;min-width:0")}>

          <div style={cs("border:2px solid var(--ink);background:var(--card);box-shadow:3px 3px 0 var(--ink)")}>
            <div style={cs("display:flex;align-items:stretch;border-bottom:2px solid var(--ink);flex-wrap:wrap")}>
              <div style={cs("display:flex")}>
                {v.ranges.map((r, i) => (
                  <button key={i} onClick={r.go} style={cs(`padding:9px 14px;border:0;border-right:2px solid var(--ink);background:${r.bg};color:${r.fg};font-family:'DM Mono',monospace;font-size:11.5px;cursor:pointer`)}>{r.label}</button>
                ))}
              </div>
              <div style={cs("flex:1")}></div>
              {v.ohlc && (
                <div style={cs("display:flex;align-items:center;gap:16px;padding:0 18px;font-family:'DM Mono',monospace;font-size:11px;color:var(--mute)")}>
                  <span>O <span style={cs("color:var(--ink)")}>{v.ohlc.o}</span></span>
                  <span>H <span style={cs("color:var(--ink)")}>{v.ohlc.h}</span></span>
                  <span>L <span style={cs("color:var(--ink)")}>{v.ohlc.l}</span></span>
                  <span>C <span style={cs(`color:${sel.chgColor}`)}>{v.ohlc.c}</span></span>
                </div>
              )}
            </div>
            {v.candles.length > 0 ? (
              <div style={cs("display:flex;padding:18px")}>
                <div style={cs("flex:1;min-width:0")}>
                  <div style={cs("display:flex;align-items:stretch;gap:2px;height:262px")}>
                    {v.candles.map((k, i) => (
                      <div key={i} style={cs("flex:1;position:relative;min-width:2px")}>
                        <div style={cs(`position:absolute;left:50%;transform:translateX(-50%);width:2px;top:${k.wt}%;height:${k.wh}%;background:var(--ink)`)}></div>
                        <div style={cs(`position:absolute;left:0;right:0;top:${k.bt}%;height:${k.bh}%;background:${k.c};border:2px solid var(--ink);min-height:3px`)}></div>
                      </div>
                    ))}
                  </div>
                  <div style={cs("display:flex;align-items:flex-end;gap:2px;height:44px;margin-top:12px;border-top:2px solid var(--ink);padding-top:9px")}>
                    {v.candles.map((k, i) => (
                      <div key={i} style={cs(`flex:1;height:${k.vh}%;background:${k.vc};min-height:2px`)}></div>
                    ))}
                  </div>
                </div>
                <div style={cs("width:72px;flex:none;display:flex;flex-direction:column;justify-content:space-between;font-family:'DM Mono',monospace;font-size:10.5px;color:var(--mute);text-align:right;height:262px;padding-left:12px")}>
                  {v.axis.map((a, i) => <span key={i}>{a}</span>)}
                </div>
              </div>
            ) : (
              <div style={cs("padding:60px 18px;text-align:center;color:var(--mute);font-size:13px")}>No trades in this window yet.</div>
            )}
          </div>

          {v.curve && (
            <div style={cs("border:2px solid var(--ink);background:var(--lime);box-shadow:3px 3px 0 var(--ink);padding:20px")}>
              <div style={cs("display:flex;justify-content:space-between;align-items:baseline;gap:14px;flex-wrap:wrap;margin-bottom:14px")}>
                <span style={cs("font-size:19px;font-weight:700;letter-spacing:-.03em")}>{v.curve.title}</span>
                <span style={cs("font-family:'DM Mono',monospace;font-size:11.5px")}>{v.curve.headline}</span>
              </div>
              <div style={cs("display:flex;gap:3px;height:24px;border:2px solid var(--ink);background:var(--card);padding:3px")}>
                {v.curve.ticks.map((c, i) => <div key={i} style={cs(`flex:1;background:${c}`)}></div>)}
              </div>
              <div style={cs("font-size:12.5px;line-height:1.55;margin-top:14px;max-width:76ch")}>{v.curve.blurb}</div>
            </div>
          )}

          <div style={cs("border:2px solid var(--ink);background:var(--card);box-shadow:3px 3px 0 var(--ink)")}>
            <div style={cs("display:flex;border-bottom:2px solid var(--ink);flex-wrap:wrap")}>
              {v.tabs.map((t, i) => (
                <button key={i} onClick={t.go} style={cs(`padding:12px 17px;border:0;border-right:2px solid var(--ink);background:${t.bg};color:${t.fg};font-size:13.5px;font-weight:600;letter-spacing:-.01em;cursor:pointer`)}>{t.label}</button>
              ))}
            </div>

            {v.tabTrades && (
              <div style={cs("overflow-x:auto")}>
                <div style={cs("display:grid;min-width:460px;grid-template-columns:86px 1fr 1fr 1.3fr 70px;gap:14px;padding:10px 18px;border-bottom:2px solid var(--ink);background:var(--paper);font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;color:var(--mute)")}>
                  <span>SIDE</span><span style={cs("text-align:right")}>{sel.quote}</span><span style={cs("text-align:right")}>{sel.symbol.replace("$", "")}</span><span>WALLET</span><span style={cs("text-align:right")}>AGE</span>
                </div>
                {tok.trades.length === 0 && <div style={cs("padding:24px 18px;font-size:13px;color:var(--mute)")}>No trades yet.</div>}
                {tok.trades.map((r, i) => (
                  <div key={i} style={cs("display:grid;min-width:460px;grid-template-columns:86px 1fr 1fr 1.3fr 70px;gap:14px;padding:11px 18px;border-bottom:1px solid var(--soft);font-family:'DM Mono',monospace;font-size:12.5px;align-items:center")}>
                    <span><span style={cs(`padding:2px 9px;border:2px solid var(--ink);background:${r.bg};color:${r.fg};font-size:10px;letter-spacing:.08em`)}>{r.side}</span></span>
                    <span style={cs("text-align:right")}>{r.quote}</span>
                    <span style={cs("text-align:right")}>{r.amount}</span>
                    <a href={`https://explorer.inkonchain.com/address/${r.full}`} target="_blank" rel="noreferrer" title={r.full}>{r.who}</a>
                    <span style={cs("text-align:right;color:var(--mute)")}>{r.ago}</span>
                  </div>
                ))}
              </div>
            )}

            {v.tabHolders && (
              <div style={cs("overflow-x:auto")}>
                <div style={cs("display:grid;min-width:460px;grid-template-columns:44px 1.4fr 1fr .8fr 90px;gap:14px;padding:10px 18px;border-bottom:2px solid var(--ink);background:var(--paper);font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;color:var(--mute)")}>
                  <span>#</span><span>WALLET</span><span style={cs("text-align:right")}>BALANCE</span><span style={cs("text-align:right")}>SHARE</span><span style={cs("text-align:right")}>TAG</span>
                </div>
                {tok.holderRows.length === 0 && <div style={cs("padding:24px 18px;font-size:13px;color:var(--mute)")}>No holders indexed yet.</div>}
                {tok.holderRows.map((h, i) => (
                  <div key={i} style={cs("display:grid;min-width:460px;grid-template-columns:44px 1.4fr 1fr .8fr 90px;gap:14px;padding:11px 18px;border-bottom:1px solid var(--soft);font-family:'DM Mono',monospace;font-size:12.5px;align-items:center")}>
                    <span style={cs("color:var(--mute)")}>{h.rank}</span>
                    <a href={`https://explorer.inkonchain.com/address/${h.full}`} target="_blank" rel="noreferrer" title={h.full}>{h.who}</a>
                    <span style={cs("text-align:right")}>{h.balance}</span>
                    <span style={cs("text-align:right;font-weight:500")}>{h.share}</span>
                    <div style={cs("text-align:right")}><span style={cs(`font-size:10px;letter-spacing:.08em;padding:2px 8px;border:${h.tagBd};background:${h.tagBg};color:${h.tagFg}`)}>{h.tag}</span></div>
                  </div>
                ))}
              </div>
            )}

            {v.tabComments && (
              <div>
                <div style={cs("display:flex;gap:0;border-bottom:2px solid var(--ink)")}>
                  <input value={v.chatDraft} onChange={v.setChatDraft} placeholder={`Say something about ${sel.symbol}…`} style={cs("flex:1;min-width:0;padding:14px 18px;border:0;outline:0;background:var(--card);font-size:13.5px")} />
                  <button onClick={v.postChat} style={cs("padding:0 22px;border:0;border-left:2px solid var(--ink);background:var(--ink);color:var(--card);font-size:13px;font-weight:600;cursor:pointer;flex:none")}>Post</button>
                </div>
                {tok.chat.length === 0 && <div style={cs("padding:24px 18px;font-size:13px;color:var(--mute)")}>No comments yet — this session only, not persisted.</div>}
                {tok.chat.map((c, i) => (
                  <div key={i} style={cs("padding:15px 18px;border-bottom:1px solid var(--soft)")}>
                    <div style={cs("display:flex;align-items:center;gap:10px;flex-wrap:wrap")}>
                      <span style={cs("font-family:'DM Mono',monospace;font-size:12px")}>{c.wallet}</span>
                      <span style={cs(`font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.08em;padding:2px 8px;border:${c.tagBd};background:${c.tagBg};color:${c.tagFg}`)}>{c.tag}</span>
                      <span style={cs("font-family:'DM Mono',monospace;font-size:11px;color:var(--mute)")}>{c.age}</span>
                    </div>
                    <p style={cs("margin:9px 0 0;font-size:14px;line-height:1.5")}>{c.body}</p>
                  </div>
                ))}
              </div>
            )}

            {v.tabCreator && (
              <div>
                {v.creatorLoading && <div style={cs("padding:24px;font-size:13px;color:var(--mute)")}>Loading on-chain position + hook data…</div>}
                {!v.creatorLoading && v.liq && (
                  <>
                    <div style={cs("padding:20px;border-bottom:2px solid var(--ink)")}>
                      <div style={cs("display:flex;align-items:center;gap:11px;margin-bottom:14px;flex-wrap:wrap")}>
                        <span style={cs("font-size:17px;font-weight:700;letter-spacing:-.03em")}>Liquidity</span>
                        <span style={cs(`font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.1em;padding:3px 9px;border:2px solid var(--ink);background:${v.liq.stBg};color:${v.liq.stFg}`)}>{v.liq.status}</span>
                      </div>
                      <div style={cs("display:flex;flex-wrap:wrap;border:2px solid var(--ink)")}>
                        {v.liq.facts.map((f, i) => (
                          <div key={i} style={cs("flex:1;min-width:150px;padding:12px 15px;border-right:2px solid var(--ink);background:var(--card)")}>
                            <div style={cs("font-family:'DM Mono',monospace;font-size:9.5px;letter-spacing:.14em;color:var(--mute)")}>{f.k}</div>
                            <div style={cs("font-family:'DM Mono',monospace;font-size:15px;font-weight:500;margin-top:5px")}>{f.v}</div>
                          </div>
                        ))}
                      </div>
                      <div style={cs("font-size:12.5px;color:var(--mute);margin-top:12px;line-height:1.55;max-width:76ch")}>The position is minted full-range and held by DuckLocker. It can never be withdrawn — only accrued trading fees are claimable.</div>
                    </div>

                    <div style={cs("padding:20px;border-bottom:2px solid var(--ink)")}>
                      <div style={cs("font-size:17px;font-weight:700;letter-spacing:-.03em;margin-bottom:14px")}>Creator fees</div>
                      <div style={cs("display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;align-items:start")}>
                        <div style={cs("border:2px solid var(--ink);background:var(--lime);padding:18px")}>
                          <div style={cs("font-family:'DM Mono',monospace;font-size:9.5px;letter-spacing:.14em;color:var(--mute)")}>HOOK SELL-FEE ACCRUED</div>
                          <div style={cs("font-family:'DM Mono',monospace;font-size:32px;font-weight:500;letter-spacing:-.04em;margin:7px 0 3px")}>{v.hookAccrued.toFixed(5)} {sel.quote}</div>
                          <div style={cs("font-family:'DM Mono',monospace;font-size:11.5px;margin-bottom:16px")}>LP-side fee amount is only known at claim time (V4 has no pending-fee view)</div>
                          <button onClick={v.claimCreatorAndHookFees} disabled={v.txPending} style={cs("width:100%;padding:13px;border:2px solid var(--ink);background:var(--ink);color:var(--card);font-size:14px;font-weight:700;cursor:pointer")}>Claim LP + hook fees</button>
                        </div>
                        {tok.family === "CURVE" && (
                          <div style={cs("border:2px solid var(--ink);background:var(--card);padding:18px")}>
                            <div style={cs("font-family:'DM Mono',monospace;font-size:9.5px;letter-spacing:.14em;color:var(--mute)")}>CURVE TRADING FEE (1%)</div>
                            <div style={cs("font-size:12.5px;color:var(--mute);margin:9px 0 16px;line-height:1.5")}>{tok.migrated ? "Accrued during the curve phase, split 50/50 creator/platform." : "Claimable only after migration."}</div>
                            <button onClick={v.claimCurveFeeAction} disabled={v.txPending || !tok.migrated} style={cs(`width:100%;padding:13px;border:2px solid var(--ink);background:${tok.migrated ? "var(--card)" : "var(--paper)"};color:var(--ink);font-size:14px;font-weight:700;cursor:pointer`)}>Claim curve fee</button>
                          </div>
                        )}
                      </div>

                      <div style={cs("border:2px solid var(--ink);margin-top:16px;background:var(--card)")}>
                        <div style={cs("padding:11px 15px;border-bottom:2px solid var(--ink);background:var(--paper);font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;color:var(--mute)")}>HOOK FEE ROUTING</div>
                        {!v.liq || v.liq.status === "NO POOL YET" ? (
                          <div style={cs("padding:16px;font-size:12.5px;color:var(--mute)")}>Not available until this token has a real V4 pool.</div>
                        ) : (
                          <>
                            <div style={cs("padding:16px;display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:14px")}>
                              <label style={cs("display:flex;flex-direction:column;gap:7px")}>
                                <span style={cs("font-family:'DM Mono',monospace;font-size:9.5px;letter-spacing:.14em;color:var(--mute)")}>SPLIT WALLET (OPTIONAL)</span>
                                <input value={splitWallet} onChange={(e) => setSplitWallet(e.target.value)} placeholder="0x…" style={cs("padding:11px 12px;border:2px solid var(--ink);background:var(--paper);font-family:'DM Mono',monospace;font-size:13px;outline:0")} />
                              </label>
                              <label style={cs("display:flex;flex-direction:column;gap:7px")}>
                                <span style={cs("font-family:'DM Mono',monospace;font-size:9.5px;letter-spacing:.14em;color:var(--mute)")}>% TO THAT WALLET</span>
                                <input value={splitPct} onChange={(e) => setSplitPct(e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0" style={cs("padding:11px 12px;border:2px solid var(--ink);background:var(--paper);font-family:'DM Mono',monospace;font-size:13px;outline:0")} />
                              </label>
                            </div>
                            <div style={cs("padding:0 16px 16px")}>
                              <button onClick={submitSplits} disabled={v.txPending} style={cs("padding:12px 20px;border:2px solid var(--ink);background:var(--card);font-size:13.5px;font-weight:600;cursor:pointer")}>Save fee settings</button>
                              <div style={cs("font-size:12px;color:var(--mute);margin-top:12px;line-height:1.55;max-width:76ch")}>Leave blank to reset to 100% direct to the creator. This only routes the hook's sell-fee skim — not the LP-position fee.</div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {v.cto && (
                      <div style={cs("padding:20px")}>
                        <div style={cs("display:flex;align-items:center;gap:11px;margin-bottom:8px;flex-wrap:wrap")}>
                          <span style={cs("font-size:17px;font-weight:700;letter-spacing:-.03em")}>Community takeover</span>
                          <span style={cs("font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.1em;padding:3px 9px;border:2px solid var(--ink);background:var(--orange);color:#fff")}>{v.cto.status}</span>
                        </div>
                        <p style={cs("margin:0 0 16px;font-size:13px;color:var(--mute);line-height:1.6;max-width:76ch")}>{v.cto.blurb}</p>
                        <div style={cs("display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:16px;align-items:start")}>
                          <div style={cs("border:2px solid var(--ink);background:var(--card);padding:18px")}>
                            <div style={cs("font-family:'DM Mono',monospace;font-size:9.5px;letter-spacing:.14em;color:var(--mute)")}>CTO PRICE</div>
                            <div style={cs("font-family:'DM Mono',monospace;font-size:30px;font-weight:500;letter-spacing:-.04em;margin:7px 0 16px")}>{v.cto.price}</div>
                            <button onClick={() => v.buyTakeover(v.creatorData.poolId)} disabled={v.txPending || v.cto.status === "PENDING"} style={cs("width:100%;padding:13px;border:2px solid var(--ink);background:var(--orange);color:#fff;font-size:14px;font-weight:700;cursor:pointer")}>{v.cto.status === "PENDING" ? "Application pending" : "Apply for takeover"}</button>
                          </div>
                          <div style={cs("border:2px solid var(--ink);background:var(--card)")}>
                            <div style={cs("display:flex;justify-content:space-between;gap:12px;padding:11px 15px;border-bottom:1px solid var(--soft);font-family:'DM Mono',monospace;font-size:12px")}><span style={cs("color:var(--mute)")}>CURRENT CREATOR</span><span style={cs("font-weight:500")}>{v.cto.creator}</span></div>
                            <div style={cs("display:flex;justify-content:space-between;gap:12px;padding:11px 15px;border-bottom:1px solid var(--soft);font-family:'DM Mono',monospace;font-size:12px")}><span style={cs("color:var(--mute)")}>PENDING APPLICANT</span><span style={cs("font-weight:500")}>{v.cto.applicant || "none"}</span></div>
                            <div style={cs("display:flex;justify-content:space-between;gap:12px;padding:11px 15px;border-bottom:1px solid var(--soft);font-family:'DM Mono',monospace;font-size:12px")}><span style={cs("color:var(--mute)")}>CANNOT CHANGE</span><span style={cs("font-weight:500")}>supply, pool, LP, socials</span></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
                {!v.creatorLoading && !v.liq && (
                  <div style={cs("padding:24px;font-size:13px;color:var(--mute)")}>Open this tab to load real on-chain position and hook data.</div>
                )}
              </div>
            )}
          </div>
        </div>

        <div style={cs(`display:flex;flex-direction:column;gap:16px;${v.isMobile ? "" : "position:sticky;top:80px"}`)}>
          <div style={cs("border:2px solid var(--ink);background:var(--card);box-shadow:3px 3px 0 var(--ink)")}>
            <div style={cs("display:flex;border-bottom:2px solid var(--ink)")}>
              <button onClick={v.setBuy} style={cs(`flex:1;padding:14px;border:0;border-right:2px solid var(--ink);background:${v.buyBg};color:${v.buyFg};font-size:15px;font-weight:700;letter-spacing:-.01em;cursor:pointer`)}>Buy</button>
              <button onClick={v.setSell} style={cs(`flex:1;padding:14px;border:0;background:${v.sellBg};color:${v.sellFg};font-size:15px;font-weight:700;letter-spacing:-.01em;cursor:pointer`)}>Sell</button>
            </div>
            <div style={cs("padding:18px")}>
              <div style={cs("display:flex;justify-content:space-between;font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;color:var(--mute);margin-bottom:9px")}>
                <span>PAY {v.payAsset}</span><span>BAL {v.payBalance}</span>
              </div>
              <div style={cs("display:flex;align-items:stretch;border:2px solid var(--ink);background:var(--paper)")}>
                <input value={v.amount} onChange={v.onAmount} style={cs("flex:1;min-width:0;border:0;outline:0;background:transparent;font-family:'DM Mono',monospace;font-size:28px;font-weight:500;letter-spacing:-.03em;padding:13px 14px")} />
                <span style={cs("padding:0 14px;border-left:2px solid var(--ink);display:flex;align-items:center;font-family:'DM Mono',monospace;font-size:13px")}>{v.payAsset}</span>
              </div>
              <div style={cs("display:flex;margin-top:10px;border:2px solid var(--ink)")}>
                {v.presets.map((p, i) => (
                  <button key={i} onClick={p.go} style={cs(`flex:1;padding:9px 0;border:0;border-left:${p.dv};background:var(--card);font-family:'DM Mono',monospace;font-size:11.5px;cursor:pointer`)}>{p.label}</button>
                ))}
              </div>
              <div style={cs("display:flex;justify-content:space-between;font-family:'DM Mono',monospace;font-size:10.5px;color:var(--mute);margin-top:16px")}><span>YOUR BALANCE</span><span style={cs("color:var(--ink)")}>{v.myBalanceTokens.toLocaleString(undefined, { maximumFractionDigits: 2 })} {sel.symbol.replace("$", "")}</span></div>
              <button onClick={v.submitTx} disabled={v.txPending} style={cs(`width:100%;padding:16px;margin-top:14px;border:2px solid var(--ink);background:${v.ctaBg};color:${v.ctaFg};font-size:16px;font-weight:700;letter-spacing:-.01em;cursor:pointer;box-shadow:3px 3px 0 var(--ink)`)}>{v.ctaLabel}</button>
              <div style={cs("font-size:12px;color:var(--mute);line-height:1.55;margin-top:14px")}>{tok.family === "CURVE" && !tok.migrated ? "Buys route native ETH in automatically for ERC20-quoted curves. Sell proceeds land in the quote asset directly." : "Routes through the real Uniswap V4 pool via the Universal Router. Both buy and sell settle in native ETH. Anti-MEV blocks same-block buy/sell pairs from one address."}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
