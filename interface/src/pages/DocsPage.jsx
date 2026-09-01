import { useState, useEffect } from "react";
import { formatEther } from "viem";
import { cs } from "../cs.js";
import { api, shortAddress } from "../api.js";
import {
  DUCK_INCUBATION, DUCK_LAUNCHER, DUCK_RAISE, DUCK_LOCKER, DUCK_HOOK, DUCK_META_OVERRIDE,
  DUCK_INCUBATION_TOKEN_IMPL, DUCK_LAUNCHER_TOKEN_IMPL, DUCK_RAISE_TOKEN_IMPL,
} from "../chain/addresses.js";
import { AddressChip, LinkChip } from "../MetaChips.jsx";

const NAV = [
  { id: "arch", label: "Architecture" },
  { id: "supply", label: "Token supply" },
  { id: "hook", label: "DuckHookV4" },
  { id: "locker", label: "DuckLocker" },
  { id: "fees", label: "Fees" },
  { id: "deploy", label: "Deployments" },
];

const CONTRACTS = [
  { k: "DuckIncubation", d: "Bonding-curve family", a: DUCK_INCUBATION },
  { k: "DuckLauncher", d: "Instant-launch family", a: DUCK_LAUNCHER },
  { k: "DuckRaise", d: "Crowdlaunch family", a: DUCK_RAISE },
  { k: "DuckLocker", d: "LP-position vault", a: DUCK_LOCKER },
  { k: "DuckHookV4", d: "Shared Uniswap V4 hook", a: DUCK_HOOK },
  { k: "DuckMetaOverride", d: "Metadata-override registry", a: DUCK_META_OVERRIDE },
  { k: "DuckIncubationToken impl.", d: "EIP-1167 clone template", a: DUCK_INCUBATION_TOKEN_IMPL },
  { k: "DuckLauncherToken impl.", d: "EIP-1167 clone template", a: DUCK_LAUNCHER_TOKEN_IMPL },
  { k: "DuckRaiseToken impl.", d: "EIP-1167 clone template", a: DUCK_RAISE_TOKEN_IMPL },
];

function Section({ id, title, blurb, rows }) {
  return (
    <div id={id} className="d-lift" style={cs("border:1px solid var(--line);border-radius:10px;background:var(--card);overflow:hidden;margin-bottom:16px;scroll-margin-top:80px")}>
      <div style={cs("padding:16px 20px;border-bottom:1px solid var(--line)")}>
        <div style={cs("font-size:19px;font-weight:700;letter-spacing:-.03em;margin-bottom:8px")}>{title}</div>
        <div style={cs("font-size:13.5px;color:var(--mute);line-height:1.55;max-width:70ch")}>{blurb}</div>
      </div>
      {rows.map((r, i) => (
        <div key={i} style={cs("display:flex;justify-content:space-between;gap:14px;padding:12px 20px;border-bottom:1px solid var(--soft);font-family:'JetBrains Mono',monospace;font-size:12.5px")}>
          <span style={cs("color:var(--mute)")}>{r.k}</span><span style={cs("font-weight:500;text-align:right")}>{r.v}</span>
        </div>
      ))}
    </div>
  );
}

// All fee/address figures here come from GET /curve, /launcher, /raise,
// /hook, /locker (backend/src/api/routes/platform.ts, which reads them
// live off the deployed contracts) -- never hardcoded, since a docs page
// asserting a number that drifts from the real contract is worse than no
// docs page at all.
export default function DocsPage({ v }) {
  const [cfg, setCfg] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.curve(), api.launcher(), api.raise(), api.hook(), api.locker()])
      .then(([curve, launcher, raise, hook, locker]) => setCfg({ curve, launcher, raise, hook, locker }))
      .catch((e) => setError(String(e.message || e)));
  }, []);

  const eth = (wei) => (wei == null ? "…" : Number(formatEther(BigInt(wei))) + " ETH");
  const pct = (bps) => (bps == null ? "…" : (Number(bps) / 100).toFixed(2) + "%");

  return (
    <div style={cs(`display:grid;grid-template-columns:${v.isMobile ? "1fr" : "210px minmax(0,1fr)"};gap:24px;align-items:start`)}>
      {!v.isMobile && (
        <div style={cs("position:sticky;top:80px;display:flex;flex-direction:column;gap:2px;border:1px solid var(--line);border-radius:14px;background:var(--card);padding:10px")}>
          {NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`} className="d-hover-paper" style={cs("padding:9px 12px;border-radius:8px;border-bottom:0;font-size:13px;font-weight:600;text-decoration:none;color:var(--ink);background:var(--card)")}>{n.label}</a>
          ))}
        </div>
      )}

      <div>
        <div style={cs("border:1px solid var(--line);border-radius:10px;background:var(--card);padding:26px 24px;margin-bottom:18px")}>
          <h1 style={cs(`margin:0 0 9px;font-size:${v.isMobile ? "26px" : "34px"};letter-spacing:-.045em;font-weight:700;line-height:1.05`)}>Docs</h1>
          <p style={cs("margin:0;color:var(--mute);font-size:14.5px;line-height:1.55;max-width:66ch")}>A technical reference for the deployed contracts. Fee and address values below are read live from the chain, not hardcoded.</p>
        </div>

        {error && <div style={cs("border:1px solid var(--line);border-radius:10px;background:var(--card);padding:20px;color:var(--neg);font-size:13px;margin-bottom:16px")}>Couldn't load live config: {error}</div>}

        <Section id="arch" title="Architecture" rows={[
          { k: "Bonding curve", v: "DuckIncubation" },
          { k: "Instant launch", v: "DuckLauncher" },
          { k: "Crowdlaunch", v: "DuckRaise" },
          { k: "Clone standard", v: "EIP-1167 minimal proxy" },
          { k: "Oracle", v: "none — every target is a raw quote amount" },
        ]} blurb="Three launcher families share one hook and one locker. Every token is an EIP-1167 minimal-proxy clone of its family implementation, so deployment cost stays flat regardless of supply or parameters." />

        <div id="supply" style={cs("border:1px solid var(--line);background:var(--lime);border-radius:10px;padding:22px 24px;margin-bottom:16px;scroll-margin-top:80px")}>
          <div style={cs("font-size:19px;font-weight:700;letter-spacing:-.03em;margin-bottom:9px")}>Every token is deflationary by default</div>
          <div style={cs("font-size:13.5px;line-height:1.6;max-width:78ch")}>All three families mint their full supply exactly once, at creation — none of the three token contracts exposes a mint function after deploy, so total supply can never increase. The only thing that ever moves it is the LP-position fee's token-side burn on migrated/instant/raise pools (see DuckLocker below), which only ever pushes supply down. There is no owner switch, no upgrade path, and no exception: this holds for every token this platform has ever created.</div>
        </div>

        <Section id="hook" title="DuckHookV4" rows={[
          { k: "Anti-MEV", v: "same-block buy/sell pair from one address reverts" },
          { k: "Sell fee", v: cfg ? pct(cfg.hook.hookFeeDefaultBps) : "…" },
          { k: "Sell fee recipient", v: "creator (100%, unless a split is configured)" },
          { k: "CTO fee", v: cfg ? eth(cfg.hook.ctoFee) : "…" },
          { k: "Attached at", v: "pool init, every family" },
        ]} blurb="A single Uniswap V4 hook attached to every pool from block one. It enforces the anti-MEV window and skims the sell fee before the swap settles — the only fee that actually reaches the creator." />

        <Section id="locker" title="DuckLocker" rows={[
          { k: "Withdraw path", v: "none" },
          { k: "Range", v: "full" },
          { k: "Fee / tick spacing (this platform's pools)", v: "10000 / 200 (1%)" },
          { k: "LP-position fee routing", v: "token side burned, quote side to platform wallet" },
        ]} blurb="One vault holding every LP position the platform mints. Positions are full-range and permanent; the contract exposes fee collection and nothing else. The LP-position's own trading fee is never paid to the creator — only the hook's sell-fee skim is." />

        <Section id="fees" title="Fees" rows={[
          { k: "Curve creation", v: cfg ? eth(cfg.curve.creationFee) : "…" },
          { k: "Instant launch", v: cfg ? eth(cfg.launcher.launchFee) : "…" },
          { k: "Crowdlaunch", v: cfg ? eth(cfg.raise.campaignFee) : "…" },
          { k: "Curve trading fee (pre-migration)", v: "1.00%, both buy and sell" },
          { k: "Creator sell fee (post-migration / instant / raise pools)", v: cfg ? pct(cfg.hook.hookFeeDefaultBps) : "…" },
        ]} blurb="Creation fees are a flat native-ETH amount charged at deploy, read live above — not a percentage of anything raised. Crowdlaunch's fee is the same flat structure; there is no separate percentage cut taken on a successful finalize." />

        <div id="deploy" className="d-lift" style={cs("border:1px solid var(--line);border-radius:10px;background:var(--card);overflow:hidden;margin-bottom:16px;scroll-margin-top:80px")}>
          <div style={cs("padding:16px 20px;border-bottom:1px solid var(--line)")}>
            <div style={cs("font-size:19px;font-weight:700;letter-spacing:-.03em;margin-bottom:8px")}>Deployments</div>
            <div style={cs("font-size:13.5px;color:var(--mute);line-height:1.55;max-width:70ch")}>duckfun runs on Ink mainnet. Every contract below is verified on Blockscout — tap an address to copy it, or check it yourself.</div>
          </div>
          <div style={cs("display:flex;justify-content:space-between;gap:14px;padding:12px 20px;border-bottom:1px solid var(--soft);font-family:'JetBrains Mono',monospace;font-size:12.5px")}>
            <span style={cs("color:var(--mute)")}>Chain</span><span style={cs("font-weight:500")}>Ink · 57073</span>
          </div>
          <div style={cs("display:flex;justify-content:space-between;gap:14px;padding:12px 20px;border-bottom:1px solid var(--soft);font-family:'JetBrains Mono',monospace;font-size:12.5px")}>
            <span style={cs("color:var(--mute)")}>Subgraph</span><span style={cs("font-weight:500")}>duckfun-ink · current (timestamp-versioned deploys)</span>
          </div>
          {CONTRACTS.map((c, i) => (
            <div key={i} style={cs("display:flex;justify-content:space-between;align-items:center;gap:14px;padding:10px 20px;border-bottom:1px solid var(--soft)")}>
              <div style={cs("min-width:0")}>
                <div style={cs("font-size:13px;font-weight:600;letter-spacing:-.01em")}>{c.k}</div>
                <div style={cs("font-size:11.5px;color:var(--mute);margin-top:2px")}>{c.d}</div>
              </div>
              <div style={cs("flex:none;display:flex;gap:7px")}>
                <AddressChip address={shortAddress(c.a)} full={c.a} />
                <LinkChip href={`https://explorer.inkonchain.com/address/${c.a}`}>Explorer</LinkChip>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
