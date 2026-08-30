import { cs } from "../cs.js";
import Hoverable from "../Hoverable.jsx";

function ImagePicker({ v }) {
  const img = v.draftImage;
  return (
    <div style={cs("display: flex; flex-direction: column; gap: 6px; flex: none;")}>
      <label style={cs(`width: 116px; height: 116px; border-radius: 15px; background: ${img.previewUrl ? "#000" : v.draftArt}; display: flex; align-items: center; justify-content: center; cursor: pointer; position: relative; overflow: hidden; box-shadow: 0 0 0 1px rgba(255,255,255,.09) inset;`)}>
        <input type="file" accept="image/*" onChange={v.onImagePick} style={cs("display: none;")} />
        {img.previewUrl ? (
          <img src={img.previewUrl} alt="" style={cs("width: 100%; height: 100%; object-fit: cover;")} />
        ) : (
          <span style={cs(`font-family: 'JetBrains Mono', monospace; font-size: 8.5px; letter-spacing: .1em; color: ${v.draftInk}; text-align: center; line-height: 1.5;`)}>DROP<br />ART</span>
        )}
        {img.uploading && (
          <div style={cs("position: absolute; inset: 0; background: rgba(0,0,0,.6); display: flex; align-items: center; justify-content: center; font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: .1em; color: #fff;")}>UPLOADING…</div>
        )}
      </label>
      {img.previewUrl && !img.uploading && (
        <button type="button" onClick={v.clearImage} style={cs("border: none; background: transparent; cursor: pointer; font-family: 'JetBrains Mono', monospace; font-size: 9px; letter-spacing: .08em; color: #74748A; padding: 0;")}>REMOVE</button>
      )}
      {img.error && (
        <span style={cs("font-size: 9.5px; color: #E8607A; max-width: 116px; line-height: 1.4;")}>{img.error}</span>
      )}
    </div>
  );
}

export default function CreatePage({ v }) {
  return (
    <div style={cs("display: flex; flex-direction: column; gap: 16px; animation: popin .26s ease both;")}>
      <Hoverable tag="button" onClick={v.goHome} style={cs("border: none; background: transparent; cursor: pointer; align-self: flex-start; font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: .14em; color: #74748A; padding: 0;")} hover={cs("color:#D9D9D9")}>← ALL COINS</Hoverable>

      <div style={cs("display: flex; gap: 3px; border-radius: 11px; padding: 3px; background: rgba(255,255,255,.04); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset; align-self: flex-start;")}>
        <button onClick={v.setCreateCurve} style={cs(`border: none; cursor: pointer; padding: 9px 14px; border-radius: 8px; font-size: 12.5px; font-weight: 600; background: ${v.isCreateCurve ? "#D9D9D9" : "transparent"}; color: ${v.isCreateCurve ? "#12061F" : "#9494A4"};`)}>Bonding curve</button>
        <button onClick={v.setCreateInstant} style={cs(`border: none; cursor: pointer; padding: 9px 14px; border-radius: 8px; font-size: 12.5px; font-weight: 600; background: ${v.isCreateInstant ? "#D9D9D9" : "transparent"}; color: ${v.isCreateInstant ? "#12061F" : "#9494A4"};`)}>Instant DEX launch</button>
        <button onClick={v.setCreateCampaign} style={cs(`border: none; cursor: pointer; padding: 9px 14px; border-radius: 8px; font-size: 12.5px; font-weight: 600; background: ${v.isCreateCampaign ? "#D9D9D9" : "transparent"}; color: ${v.isCreateCampaign ? "#12061F" : "#9494A4"};`)}>Campaign</button>
      </div>

      <div style={cs(`display: grid; grid-template-columns: ${v.tokenCols}; gap: 16px; align-items: start;`)}>
        <div style={cs("border-radius: 20px; padding: 24px; background: #0D0D12; box-shadow: 0 0 0 1px rgba(255,255,255,.09) inset; display: flex; flex-direction: column; gap: 18px;")}>

          {v.isCreateCurve && (
            <>
              <div style={cs("display: flex; flex-direction: column; gap: 6px;")}>
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: .18em; color: #8E8E9C;")}>DUCKINCUBATION</span>
                <span style={cs("font-size: 26px; font-weight: 700; letter-spacing: -.03em; color: #FBFAFF;")}>Launch on a bonding curve</span>
                <span style={cs("font-size: 12.5px; color: #74748A;")}>80% of supply sells through the curve, 20% seeds the migration pool. Migrates to a real Uniswap V4 pool once it hits the target.</span>
              </div>
              <div style={cs("display: flex; gap: 16px;")}>
                <ImagePicker v={v} />
                <div style={cs("display: flex; flex-direction: column; gap: 10px; flex: 1; min-width: 0;")}>
                  <input value={v.draftCurve.name} onChange={v.setCurveName} placeholder="Coin name" style={cs("border: none; border-radius: 11px; padding: 13px 15px; background: rgba(255,255,255,.05); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset; color: #FBFAFF; font-size: 14.5px;")} />
                  <input value={v.draftCurve.ticker} onChange={v.setCurveTicker} placeholder="TICKER" style={cs("border: none; border-radius: 11px; padding: 13px 15px; background: rgba(255,255,255,.05); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset; color: #FBFAFF; font-family: 'JetBrains Mono', monospace; font-size: 13px; letter-spacing: .08em;")} />
                </div>
              </div>
              <textarea value={v.draftCurve.desc} onChange={v.setCurveDesc} placeholder="Tell the family why this exists (max 140) — stored as metaURI" style={cs("border: none; border-radius: 11px; padding: 13px 15px; background: rgba(255,255,255,.05); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset; color: #EDEDF2; font-size: 13.5px; min-height: 88px; resize: none; line-height: 1.5;")} />
              <div style={cs("display: flex; flex-direction: column; gap: 9px;")}>
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: .12em; color: #74748A;")}>QUOTE ASSET</span>
                <div style={cs(`display: grid; grid-template-columns: ${v.quoteCols}; gap: 8px;`)}>
                  {v.curveQuoteChips.map((q, i) => (
                    <button key={i} onClick={q.go} style={cs(`border: none; cursor: pointer; padding: 11px 10px; border-radius: 11px; font-family: 'JetBrains Mono', monospace; font-size: 12.5px; font-weight: 700; background: ${q.bg}; color: ${q.color};`)}>{q.label}</button>
                  ))}
                </div>
              </div>
              <div style={cs(`display: grid; grid-template-columns: ${v.quoteCols}; gap: 10px;`)}>
                <div style={cs("display: flex; flex-direction: column; gap: 6px;")}>
                  <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: .12em; color: #74748A;")}>START VIRTUAL RESERVE ({v.curveQuoteUnit})</span>
                  <input value={v.draftCurve.startVirtualQuote} onChange={v.setCurveStartVirtualQuote} placeholder="1" style={cs("border: none; border-radius: 11px; padding: 12px 14px; background: rgba(255,255,255,.05); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset; color: #FBFAFF; font-family: 'JetBrains Mono', monospace; font-size: 13px;")} />
                </div>
                <div style={cs("display: flex; flex-direction: column; gap: 6px;")}>
                  <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: .12em; color: #74748A;")}>MIGRATION TARGET ({v.curveQuoteUnit})</span>
                  <input value={v.draftCurve.migrationTargetQuote} onChange={v.setCurveMigrationTarget} placeholder="10" style={cs("border: none; border-radius: 11px; padding: 12px 14px; background: rgba(255,255,255,.05); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset; color: #FBFAFF; font-family: 'JetBrains Mono', monospace; font-size: 13px;")} />
                </div>
              </div>
              <div style={cs("display: flex; flex-direction: column; gap: 6px;")}>
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: .12em; color: #74748A;")}>OPTIONAL INSTANT BUY ({v.curveQuoteUnit})</span>
                <input value={v.draftCurve.earlyBuyAmount} onChange={v.setCurveBuy} placeholder="0" style={cs("border: none; border-radius: 11px; padding: 12px 14px; background: rgba(255,255,255,.05); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset; color: #FBFAFF; font-family: 'JetBrains Mono', monospace; font-size: 13px;")} />
                <span style={cs("font-size: 12px; color: #74748A;")}>Bought off the curve in the same transaction as creation. Leave 0 to just launch.</span>
              </div>
              <span style={cs("font-size: 12px; color: #74748A;")}>Fixed 1B supply, 80/20 curve/liquidity split, no antibot. A vanity address (ending 0x8888) is mined in your browser before you sign — this can take a few seconds.</span>
              <Hoverable tag="button" onClick={v.submitCreate} style={cs("border: none; cursor: pointer; width: 100%; padding: 16px 0; border-radius: 13px; font-size: 15px; font-weight: 700; color: #12061F; background: #D9D9D9;")} hover={cs("background:#fff")}>{v.createCta}</Hoverable>
            </>
          )}

          {v.isCreateInstant && (
            <>
              <div style={cs("display: flex; flex-direction: column; gap: 6px;")}>
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: .18em; color: #8E8E9C;")}>DUCKLAUNCHER</span>
                <span style={cs("font-size: 26px; font-weight: 700; letter-spacing: -.03em; color: #FBFAFF;")}>Launch straight onto a DEX pool</span>
                <span style={cs("font-size: 12.5px; color: #74748A;")}>No curve — a real Uniswap V4 pool is created and the LP locked permanently in one transaction.</span>
              </div>
              <div style={cs("display: flex; gap: 16px;")}>
                <ImagePicker v={v} />
                <div style={cs("display: flex; flex-direction: column; gap: 10px; flex: 1; min-width: 0;")}>
                  <input value={v.draftInstant.name} onChange={v.setInstantName} placeholder="Coin name" style={cs("border: none; border-radius: 11px; padding: 13px 15px; background: rgba(255,255,255,.05); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset; color: #FBFAFF; font-size: 14.5px;")} />
                  <input value={v.draftInstant.ticker} onChange={v.setInstantTicker} placeholder="TICKER" style={cs("border: none; border-radius: 11px; padding: 13px 15px; background: rgba(255,255,255,.05); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset; color: #FBFAFF; font-family: 'JetBrains Mono', monospace; font-size: 13px; letter-spacing: .08em;")} />
                </div>
              </div>
              <textarea value={v.draftInstant.desc} onChange={v.setInstantDesc} placeholder="Tell the family why this exists (max 140) — stored as metaURI" style={cs("border: none; border-radius: 11px; padding: 13px 15px; background: rgba(255,255,255,.05); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset; color: #EDEDF2; font-size: 13.5px; min-height: 88px; resize: none; line-height: 1.5;")} />
              <div style={cs("display: flex; flex-direction: column; gap: 9px;")}>
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: .12em; color: #74748A;")}>POOL QUOTE TOKEN</span>
                <div style={cs(`display: grid; grid-template-columns: ${v.quoteCols}; gap: 8px;`)}>
                  {v.instantQuoteChips.map((q, i) => (
                    <button key={i} onClick={q.go} style={cs(`border: none; cursor: pointer; padding: 11px 10px; border-radius: 11px; font-family: 'JetBrains Mono', monospace; font-size: 12.5px; font-weight: 700; background: ${q.bg}; color: ${q.color};`)}>{q.label}</button>
                  ))}
                </div>
              </div>
              <div style={cs("display: flex; flex-direction: column; gap: 6px;")}>
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: .12em; color: #74748A;")}>LAUNCH MARKET CAP ({v.instantQuoteUnit})</span>
                <input value={v.draftInstant.launchMarketCap} onChange={v.setInstantMarketCap} placeholder="10" style={cs("border: none; border-radius: 11px; padding: 12px 14px; background: rgba(255,255,255,.05); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset; color: #FBFAFF; font-family: 'JetBrains Mono', monospace; font-size: 13px;")} />
                <span style={cs("font-size: 12px; color: #74748A;")}>The virtual FDV the pool is seeded at, in the quote token's own units.</span>
              </div>
              <div style={cs("display: flex; flex-direction: column; gap: 6px;")}>
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: .12em; color: #74748A;")}>OPTIONAL INSTANT BUY (ETH)</span>
                <input value={v.draftInstant.buyAmountHype} onChange={v.setInstantBuy} placeholder="0" style={cs("border: none; border-radius: 11px; padding: 12px 14px; background: rgba(255,255,255,.05); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset; color: #FBFAFF; font-family: 'JetBrains Mono', monospace; font-size: 13px;")} />
                <span style={cs("font-size: 12px; color: #74748A;")}>Swapped into the quote token and used to buy the new pool immediately at launch. Leave 0 to just seed the pool.</span>
              </div>
              <span style={cs("font-size: 12px; color: #74748A;")}>A vanity address (ending 0x8888) is mined in your browser before you sign — this can take a few seconds.</span>
              <Hoverable tag="button" onClick={v.submitCreate} style={cs("border: none; cursor: pointer; width: 100%; padding: 16px 0; border-radius: 13px; font-size: 15px; font-weight: 700; color: #12061F; background: #D9D9D9;")} hover={cs("background:#fff")}>{v.createCta}</Hoverable>
            </>
          )}

          {v.isCreateCampaign && (
            <>
              <div style={cs("display: flex; flex-direction: column; gap: 6px;")}>
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: .18em; color: #8E8E9C;")}>DUCKRAISE</span>
                <span style={cs("font-size: 26px; font-weight: 700; letter-spacing: -.03em; color: #FBFAFF;")}>Start a funding campaign</span>
                <span style={cs("font-size: 12.5px; color: #74748A;")}>The token deploys immediately, but its full supply stays escrowed in the contract. Contributors claim their share if the goal is hit by the deadline; refunds are available if it isn't.</span>
              </div>
              <div style={cs("display: flex; gap: 16px;")}>
                <ImagePicker v={v} />
                <div style={cs("display: flex; flex-direction: column; gap: 10px; flex: 1; min-width: 0;")}>
                  <input value={v.draftCampaign.name} onChange={v.setCampaignName} placeholder="Campaign name" style={cs("border: none; border-radius: 11px; padding: 13px 15px; background: rgba(255,255,255,.05); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset; color: #FBFAFF; font-size: 14.5px;")} />
                  <input value={v.draftCampaign.ticker} onChange={v.setCampaignTicker} placeholder="TICKER" style={cs("border: none; border-radius: 11px; padding: 13px 15px; background: rgba(255,255,255,.05); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset; color: #FBFAFF; font-family: 'JetBrains Mono', monospace; font-size: 13px; letter-spacing: .08em;")} />
                </div>
              </div>
              <textarea value={v.draftCampaign.desc} onChange={v.setCampaignDesc} placeholder="Tell the family why this exists (max 140) — stored as metaURI" style={cs("border: none; border-radius: 11px; padding: 13px 15px; background: rgba(255,255,255,.05); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset; color: #EDEDF2; font-size: 13.5px; min-height: 88px; resize: none; line-height: 1.5;")} />
              <div style={cs("display: flex; flex-direction: column; gap: 9px;")}>
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: .12em; color: #74748A;")}>DEX QUOTE ASSET (at finalize)</span>
                <div style={cs(`display: grid; grid-template-columns: ${v.quoteCols}; gap: 8px;`)}>
                  {v.campaignQuoteChips.map((q, i) => (
                    <button key={i} onClick={q.go} style={cs(`border: none; cursor: pointer; padding: 11px 10px; border-radius: 11px; font-family: 'JetBrains Mono', monospace; font-size: 12.5px; font-weight: 700; background: ${q.bg}; color: ${q.color};`)}>{q.label}</button>
                  ))}
                </div>
              </div>
              <div style={cs("display: flex; flex-direction: column; gap: 6px;")}>
                <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 10.5px; letter-spacing: .12em; color: #74748A;")}>FUNDING GOAL (ETH)</span>
                <input value={v.draftCampaign.goalNative} onChange={v.setCampaignGoal} placeholder="10" style={cs("border: none; border-radius: 11px; padding: 12px 14px; background: rgba(255,255,255,.05); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset; color: #FBFAFF; font-family: 'JetBrains Mono', monospace; font-size: 13px;")} />
              </div>
              <span style={cs("font-size: 12px; color: #74748A;")}>Contributions are always in native ETH — the quote asset only determines what the raised ETH becomes at finalize. Starts immediately, runs for the configured campaign duration.</span>
              <Hoverable tag="button" onClick={v.submitCreate} style={cs("border: none; cursor: pointer; width: 100%; padding: 16px 0; border-radius: 13px; font-size: 15px; font-weight: 700; color: #12061F; background: #D9D9D9;")} hover={cs("background:#fff")}>{v.createCta}</Hoverable>
            </>
          )}
        </div>

        <div style={cs("display: flex; flex-direction: column; gap: 14px;")}>
          <div style={cs("border-radius: 20px; padding: 18px; background: rgba(255,255,255,.035); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset; display: flex; flex-direction: column; gap: 10px;")}>
            <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: .18em; color: #74748A;")}>THIS SIGNS A REAL TRANSACTION</span>
            <span style={cs("font-size: 12.5px; line-height: 1.5; color: #9E9EAE;")}>Every field above is a real parameter on the deployed contract — nothing here is a demo. Your wallet will prompt you to confirm before anything is sent, and the fee is charged in ETH.</span>
          </div>
          <div style={cs("border-radius: 20px; padding: 18px; background: rgba(255,255,255,.035); box-shadow: 0 0 0 1px rgba(255,255,255,.07) inset; display: flex; flex-direction: column; gap: 11px;")}>
            <span style={cs("font-family: 'JetBrains Mono', monospace; font-size: 9.5px; letter-spacing: .18em; color: #74748A;")}>WHICH ONE?</span>
            <div style={cs("display: flex; flex-direction: column; gap: 10px;")}>
              <div>
                <span style={cs("font-size: 12.5px; font-weight: 600; color: #E4E4EC;")}>Bonding curve</span>
                <div style={cs("font-size: 12px; line-height: 1.45; color: #74748A;")}>Fair-launch price discovery, migrates once it's proven. Best default.</div>
              </div>
              <div>
                <span style={cs("font-size: 12.5px; font-weight: 600; color: #E4E4EC;")}>Instant DEX launch</span>
                <div style={cs("font-size: 12px; line-height: 1.45; color: #74748A;")}>Full liquidity from block one, no curve to climb.</div>
              </div>
              <div>
                <span style={cs("font-size: 12.5px; font-weight: 600; color: #E4E4EC;")}>Campaign</span>
                <div style={cs("font-size: 12px; line-height: 1.45; color: #74748A;")}>Raise commitment before minting anything — refundable if it doesn't hit goal.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
