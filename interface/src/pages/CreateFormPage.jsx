import { useEffect } from "react";
import { cs } from "../cs.js";

function labelFor(options, address) {
  return (options.find((o) => o.address.toLowerCase() === address.toLowerCase()) || {}).label || "?";
}

function Field({ label, hint, children }) {
  return (
    <label style={cs("display:flex;flex-direction:column;gap:7px")}>
      <span style={cs("font-family:'DM Mono',monospace;font-size:9.5px;letter-spacing:.14em;color:var(--mute)")}>{label}</span>
      {children}
      {hint && <span style={cs("font-size:11.5px;color:var(--mute);line-height:1.4")}>{hint}</span>}
    </label>
  );
}
function TextInput(props) {
  return <input {...props} style={cs("padding:12px;border:1px solid var(--line);background:var(--paper);font-size:14px;outline:0")} />;
}
function LockedInput({ value }) {
  return <input value={value} readOnly style={cs("padding:12px;border:1px solid var(--line);background:var(--card);font-size:14px;outline:0;color:var(--mute);font-family:'DM Mono',monospace")} />;
}
function QuoteChips({ options, value, onPick }) {
  return (
    <div style={cs("display:grid;grid-template-columns:repeat(3,1fr);gap:8px")}>
      {options.map((o) => (
        <button key={o.address} onClick={() => onPick(o.address)} style={cs(`border:1px solid var(--line);border-radius:8px;cursor:pointer;padding:11px 10px;font-family:'DM Mono',monospace;font-size:12.5px;font-weight:700;background:${value.toLowerCase() === o.address.toLowerCase() ? "var(--ink)" : "var(--card)"};color:${value.toLowerCase() === o.address.toLowerCase() ? "var(--card)" : "var(--ink)"}`)}>{o.label}</button>
      ))}
    </div>
  );
}

const ON_SUBMIT = {
  incubation: [
    "Clone DuckIncubationToken (EIP-1167) and register the curve.",
    "Attach DuckHookV4 so anti-MEV and the sell fee apply once it migrates.",
    "Optional creator buy settles through DuckIncubationBuying.",
    "At target, DuckIncubationMigration opens the V4 pool and locks LP.",
  ],
  launcher: [
    "Clone DuckLauncherToken and mint the full supply.",
    "The launcher initializes the pool directly and mints a full-range position.",
    "The position transfers into DuckLocker — permanently locked.",
    "Optional instant buy routes via LaunchRouting's bounded fallback.",
  ],
  raise: [
    "Clone DuckRaiseToken immediately — verifiable on Blockscout before a single contribution.",
    "Full supply is minted to the raise contract. No transfers, no pool, no price.",
    "Native ETH contributions accrue until the deadline.",
    "Goal cleared → ETH swaps to the quote asset, seeds a two-sided V4 pool, LP locks, claims open.",
    "Goal missed → refunds unlock, one claim per contributor.",
  ],
};

export default function CreateFormPage({ v }) {
  const family = v.family || "incubation";
  useEffect(() => { if (family === "raise") v.loadRaiseDefaults(); }, [family]); // eslint-disable-line react-hooks/exhaustive-deps

  const draft = family === "incubation" ? v.draftCurve : family === "launcher" ? v.draftInstant : v.draftCampaign;
  const setDraft = family === "incubation" ? v.setCurve : family === "launcher" ? v.setInstant : v.setCampaign;
  const nameLabel = family === "raise" ? "RAISE / TOKEN NAME" : "TOKEN NAME";

  const FORM = {
    incubation: { title: "Bonding curve", accent: "var(--lime)", accentFg: "var(--ink)", cta: "Create curve token",
      sub: "No price oracle: you pick the start and migration targets directly, as raw quote-asset amounts. Buyers receive tokens on every trade from block one." },
    launcher: { title: "Instant launch", accent: "var(--card)", accentFg: "var(--ink)", cta: "Launch on V4",
      sub: "One transaction creates the V4 pool, mints a full-range LP position, and locks it permanently in DuckLocker." },
    raise: { title: "Crowdfund raise", accent: "var(--orange)", accentFg: "#fff", cta: "Open raise",
      sub: "Like a bonding curve, but nothing trades while the raise runs. The token deploys immediately; backers claim pro-rata only after a successful finalize." },
  }[family];

  const costs = {
    incubation: [{ k: "TRADING FEE", v: "1.00% (curve trading fee, charged on both buys and sells)" }],
    launcher: [{ k: "POOL FEE / TICK SPACING", v: "10000 / 200 (1%)" }],
    raise: [
      { k: "CREATION FEE", v: v.raiseDefaults ? `${Number(v.raiseDefaults.campaignFee) / 1e18} ETH, paid on launch (waived if quoted in the platform token)` : "loading…" },
      { k: "REFUND IF MISSED", v: "100%" },
    ],
  }[family];

  return (
    <div style={cs("max-width:1060px;margin:0 auto")}>
      <button onClick={v.backToChooser} style={cs("border:0;background:transparent;font-family:'DM Mono',monospace;font-size:11.5px;letter-spacing:.1em;color:var(--mute);cursor:pointer;padding:0 0 14px")}>← ALL LAUNCH TYPES</button>

      <div style={cs(`display:grid;grid-template-columns:${v.isMobile ? "minmax(0,1fr)" : "minmax(0,1fr) 336px"};gap:16px;align-items:start`)}>
        <div style={cs("border:1px solid var(--line);border-radius:10px;background:var(--card);overflow:hidden")}>
          <div style={cs(`padding:${v.isMobile ? "18px" : "22px 24px"};border-bottom:1px solid var(--line);background:${FORM.accent};color:${FORM.accentFg}`)}>
            <div style={cs(`font-size:${v.isMobile ? "21px" : "26px"};font-weight:700;letter-spacing:-.04em;line-height:1.05`)}>{FORM.title}</div>
            <div style={cs("font-size:13.5px;line-height:1.55;margin-top:10px;max-width:66ch;opacity:.85")}>{FORM.sub}</div>
          </div>

          <div style={cs(`padding:${v.isMobile ? "18px" : "24px"};display:flex;flex-direction:column;gap:18px`)}>
            <div style={cs("display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:18px")}>
              <Field label={nameLabel} hint="Shown across the app"><TextInput value={draft.name} onChange={(e) => setDraft({ name: e.target.value })} placeholder="Quack Capital" /></Field>
              <Field label="SYMBOL" hint="3–9 characters"><TextInput value={draft.ticker} onChange={(e) => setDraft({ ticker: e.target.value.toUpperCase() })} placeholder="QUACK" /></Field>
            </div>

            <div style={cs("display:flex;align-items:center;gap:16px;flex-wrap:wrap")}>
              <label style={cs("width:56px;height:56px;border:1px dashed var(--line);display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:9px;color:var(--mute);text-align:center;line-height:1.2;flex:none;cursor:pointer;overflow:hidden")}>
                <input type="file" accept="image/*" onChange={v.onImagePick} style={cs("display:none")} />
                {v.draftImage.previewUrl ? <img src={v.draftImage.previewUrl} alt="" style={cs("width:100%;height:100%;object-fit:cover")} /> : <>TOKEN<br />LOGO</>}
              </label>
              <div style={cs("font-size:12.5px;color:var(--mute);line-height:1.5;flex:1;min-width:200px")}>
                PNG or SVG. Stored off-chain via IPFS; the token URI points at it. Also permanent.
                {v.draftImage.previewUrl && !v.draftImage.uploading && <button onClick={v.clearImage} style={cs("display:block;border:0;background:transparent;color:var(--mute);text-decoration:underline;cursor:pointer;padding:4px 0;font-size:11.5px")}>Remove</button>}
                {v.draftImage.uploading && <span style={cs("display:block;margin-top:4px")}>Uploading…</span>}
                {v.draftImage.error && <span style={cs("display:block;margin-top:4px;color:var(--neg)")}>{v.draftImage.error}</span>}
              </div>
            </div>

            <div>
              <div style={cs("font-size:17px;font-weight:700;letter-spacing:-.03em")}>Socials</div>
              <div style={cs("font-size:12.5px;color:var(--mute);margin:7px 0 14px;line-height:1.55;max-width:70ch")}>Written into the token metadata at creation. The token renounces ownership on deploy, so these are permanent — check them carefully before you submit.</div>
              <div style={cs("display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:18px")}>
                <TextInput value={v.socials.website} onChange={(e) => v.setSocial("website", e.target.value)} placeholder="Website URL" />
                <TextInput value={v.socials.twitter} onChange={(e) => v.setSocial("twitter", e.target.value)} placeholder="X / Twitter URL" />
                <TextInput value={v.socials.telegram} onChange={(e) => v.setSocial("telegram", e.target.value)} placeholder="Telegram URL" />
              </div>
            </div>

            {family === "incubation" && (
              <>
                <Field label="QUOTE ASSET" hint="Only USDC/USDT0 have a real ETH route for buyWithNative — pick ETH if unsure">
                  <QuoteChips options={v.quoteOptions} value={v.draftCurve.quoteToken} onPick={(a) => v.setCurve({ quoteToken: a, earlyBuyAmount: "0" })} />
                </Field>
                <div style={cs(`display:grid;grid-template-columns:${v.isMobile ? "1fr" : "1fr 1fr"};gap:18px`)}>
                  <Field label={`START TARGET (${labelFor(v.quoteOptions, v.draftCurve.quoteToken)})`} hint="Raw quote amount where the curve opens">
                    <TextInput value={v.draftCurve.startVirtualQuote} onChange={(e) => v.setCurve({ startVirtualQuote: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="8000" />
                  </Field>
                  <Field label={`MIGRATION TARGET (${labelFor(v.quoteOptions, v.draftCurve.quoteToken)})`} hint="Curve migrates into a V4 pool here">
                    <TextInput value={v.draftCurve.migrationTargetQuote} onChange={(e) => v.setCurve({ migrationTargetQuote: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="60000" />
                  </Field>
                </div>
                {v.quoteHasEthRoute(labelFor(v.quoteOptions, v.draftCurve.quoteToken)) && (
                  <Field label={`OPTIONAL INSTANT BUY (${labelFor(v.quoteOptions, v.draftCurve.quoteToken)})`} hint="Bought off the curve in the same transaction as creation">
                    <TextInput value={v.draftCurve.earlyBuyAmount} onChange={(e) => v.setCurve({ earlyBuyAmount: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="0" />
                  </Field>
                )}
                <Field label="SUPPLY / SPLIT (THIS APP'S DEFAULT)" hint="Fixed at deploy, no mint function ever — deflationary by default"><LockedInput value="1,000,000,000 — 80% curve / 20% liquidity" /></Field>
              </>
            )}

            {family === "launcher" && (
              <>
                <Field label="TOTAL SUPPLY" hint="Fixed at deploy, no mint function ever — deflationary by default"><LockedInput value="1,000,000,000 — fixed, no further mint path" /></Field>
                <Field label="QUOTE ASSET" hint="Paired side of the V4 pool">
                  <QuoteChips options={v.quoteOptions} value={v.draftInstant.quoteToken} onPick={(a) => v.setInstant({ quoteToken: a, buyAmountHype: "0" })} />
                </Field>
                <Field label={`LAUNCH MARKET CAP (${labelFor(v.quoteOptions, v.draftInstant.quoteToken)})`} hint="Virtual FDV the pool is seeded at">
                  <TextInput value={v.draftInstant.launchMarketCap} onChange={(e) => v.setInstant({ launchMarketCap: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="10" />
                </Field>
                {v.quoteHasEthRoute(labelFor(v.quoteOptions, v.draftInstant.quoteToken)) && (
                  <Field label="OPTIONAL INSTANT BUY (ETH)" hint="Swapped into the quote asset and used to buy the new pool immediately">
                    <TextInput value={v.draftInstant.buyAmountHype} onChange={(e) => v.setInstant({ buyAmountHype: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="0" />
                  </Field>
                )}
                <Field label="FEE / TICK SPACING"><LockedInput value="10000 / 200 (this platform's 1% pool convention)" /></Field>
              </>
            )}

            {family === "raise" && (
              <>
                <Field label="TOTAL SUPPLY" hint="Fixed at deploy, no mint function ever — deflationary by default"><LockedInput value="1,000,000,000" /></Field>
                <Field label="GOAL (ETH)" hint="Native ETH only — no quote asset during the raise">
                  <TextInput value={v.draftCampaign.goalNative} onChange={(e) => v.setCampaign({ goalNative: e.target.value.replace(/[^0-9.]/g, "") })} placeholder="50" />
                </Field>
                <Field label="QUOTE AT FINALIZE" hint="Raised ETH swaps into this to seed the pool">
                  <QuoteChips options={v.raiseQuoteOptions} value={v.draftCampaign.dexQuoteAsset} onPick={(a) => v.setCampaign({ dexQuoteAsset: a })} />
                </Field>
                <div style={cs(`display:grid;grid-template-columns:${v.isMobile ? "1fr" : "1fr 1fr"};gap:18px`)}>
                  <Field label="DEADLINE (PLATFORM SETTING)"><LockedInput value={v.raiseDefaults ? Math.round(Number(v.raiseDefaults.duration) / 3600) + " hours from launch" : "loading…"} /></Field>
                  <Field label="SUPPLY TO BACKERS (PLATFORM SETTING)"><LockedInput value={v.raiseDefaults ? (Number(v.raiseDefaults.contributorBps) / 100) + "% — remainder seeds the pool" : "loading…"} /></Field>
                </div>
              </>
            )}

            <label style={cs("display:flex;flex-direction:column;gap:7px")}>
              <span style={cs("font-family:'DM Mono',monospace;font-size:9.5px;letter-spacing:.14em;color:var(--mute)")}>DESCRIPTION</span>
              <textarea rows="3" placeholder="What is this token for?" value={draft.desc}
                onChange={(e) => setDraft({ desc: e.target.value.slice(0, 140) })}
                style={cs("padding:12px;border:1px solid var(--line);background:var(--paper);font-size:14px;outline:0;resize:vertical")} />
            </label>
          </div>

          <div style={cs("border-top:1px solid var(--line);padding:20px 24px;display:flex;gap:12px;flex-wrap:wrap")}>
            <button onClick={v.submitCreate} style={cs("padding:15px 26px;border:1px solid var(--line);border-radius:9px;background:var(--ink);color:var(--card);font-size:15px;font-weight:700;cursor:pointer")}>{v.createCta}</button>
            <button onClick={v.simulateCreate} disabled={v.simulating} style={cs("padding:15px 24px;border:1px solid var(--line);border-radius:9px;background:var(--card);font-size:15px;font-weight:600;cursor:pointer")}>{v.simulating ? "Simulating…" : "Simulate first"}</button>
          </div>
        </div>

        <div style={cs(`display:flex;flex-direction:column;gap:16px;${v.isMobile ? "" : "position:sticky;top:80px"}`)}>
          <div style={cs("border:1px solid var(--line);border-radius:10px;background:var(--card);overflow:hidden")}>
            <div style={cs("padding:11px 15px;border-bottom:1px solid var(--line);background:var(--paper);font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;color:var(--mute)")}>ON SUBMIT</div>
            {ON_SUBMIT[family].map((t, i) => (
              <div key={i} style={cs("display:flex;gap:12px;padding:13px 15px;border-bottom:1px solid var(--soft)")}>
                <span style={cs("width:20px;height:20px;border-radius:999px;border:1px solid var(--line);font-family:'DM Mono',monospace;font-size:10.5px;display:flex;align-items:center;justify-content:center;flex:none")}>{i + 1}</span>
                <span style={cs("font-size:12.5px;line-height:1.45")}>{t}</span>
              </div>
            ))}
          </div>
          <div style={cs("border:1px solid var(--line);border-radius:10px;background:var(--card);overflow:hidden")}>
            <div style={cs("padding:11px 15px;border-bottom:1px solid var(--line);background:var(--paper);font-family:'DM Mono',monospace;font-size:10px;letter-spacing:.14em;color:var(--mute)")}>COSTS</div>
            {costs.map((c, i) => (
              <div key={i} style={cs("display:flex;justify-content:space-between;gap:12px;padding:11px 15px;border-bottom:1px solid var(--soft);font-family:'DM Mono',monospace;font-size:12.5px")}>
                <span style={cs("color:var(--mute)")}>{c.k}</span><span style={cs("font-weight:500;text-align:right")}>{c.v}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
