import { useState } from "react";
import { cs } from "../cs.js";

const LAUNCH_STEPS = [
  { n: "1", k: "Choose a family", v: "Bonding curve for price discovery from block one, instant launch for a real V4 pool immediately, or crowdfund raise to collect ETH toward a goal first.", bg: "var(--lime)" },
  { n: "2", k: "Set the parameters", v: "Name, symbol, quote asset and targets. Targets are raw quote amounts — there is no oracle anywhere in the system.", bg: "var(--paper)" },
  { n: "3", k: "Add socials once", v: "X, Telegram and website are written into metadata at creation. The token is a fixed-supply clone with no owner-mint path, so this is effectively permanent.", bg: "var(--paper)" },
  { n: "4", k: "Sign one transaction", v: "The factory clones the token, wires the shared anti-MEV hook, and — for instant launches — opens the V4 pool and locks LP in the same call. Total supply is minted once and fixed forever: every duckfun token is deflationary by default, since nothing can ever mint more of it.", bg: "var(--paper)" },
];

const TRADE_STEPS = [
  { n: "1", k: "Connect on Ink", v: "Any injected wallet or WalletConnect. duckfun never asks for a signature just to browse — only to trade.", bg: "var(--lime)" },
  { n: "2", k: "Pick a venue", v: "Bonding-curve tokens trade against the curve; migrated and instant-launch tokens trade on a real Uniswap V4 pool. Crowdlaunch tokens are not tradeable until the raise finalizes.", bg: "var(--paper)" },
  { n: "3", k: "Size the trade", v: "Enter an amount and check the live quote before you sign — tokens received, plus a slippage tolerance you control.", bg: "var(--paper)" },
  { n: "4", k: "Sign and settle", v: "The hook rejects a second buy/sell pair from the same address in the same block, so a sandwich attempt reverts at the pool. Sells on a V4 pool carry a 2% creator fee, paid straight to the token's creator.", bg: "var(--paper)" },
];

const FAQS = [
  { k: "Can a creator rug the pool?", v: "No. The LP position is minted directly into DuckLocker, which has no withdraw function. Only accrued trading fees are claimable, and only the 2% creator sell-fee actually pays the creator — the LP position's own trading fee is always burned (token side) or sent to the platform wallet (quote side)." },
  { k: "Can the total supply ever go up?", v: "No. Every duckfun token is a fixed-supply clone with no mint function reachable after deployment — the full supply is minted once, at creation, and that is the only mint event that will ever happen. That makes every token deflationary by default: supply can only ever stay flat or shrink (via the LP-fee token-side burn), never inflate." },
  { k: "What happens if a crowdlaunch misses its goal?", v: "No pool is seeded and the escrowed supply is never released. Every contributor can claim a full refund of their ETH." },
  { k: "What quote assets are supported?", v: "Native ETH is the default and always tradeable directly. USDC and USDT0 are the two ERC20 alternates with real liquidity on Ink, used for the bounded-fallback swap route when a token is quoted in one of them instead of ETH." },
  { k: "What is a CTO (community takeover)?", v: "If a creator goes quiet, anyone can pay the takeover price to inherit the creator's fee stream. Supply, pool, locked LP and the token's metadata are untouched — a takeover moves the fee claim, not the token." },
];

const HOW_NOTE = {
  launch: { k: "Fixed supply, locked liquidity — deflationary by default", v: "Every family mints its full supply exactly once at creation, with no mint function left reachable afterward — supply can never increase. The LP position that backs it is full-range and minted straight into DuckLocker, which has no withdrawal path at all. Creators keep the sell-fee stream that comes out of trading; they can never touch the liquidity itself or print more supply." },
  trade: { k: "What you are actually trading against", v: "Before migration you trade the curve, and your counterparty is the contract itself — price moves purely off the constant-product math, no oracle involved. After migration it is an ordinary Uniswap V4 pool whose LP sits in DuckLocker and can never be pulled, so the liquidity you see on-screen cannot quietly disappear underneath a trade." },
};

export default function HowItWorksPage({ v }) {
  const [tab, setTab] = useState("launch");
  const steps = tab === "trade" ? TRADE_STEPS : LAUNCH_STEPS;
  const note = HOW_NOTE[tab];

  return (
    <div style={cs("max-width:1000px;margin:0 auto")}>
      <div style={cs("margin-bottom:18px")}>
        <h1 style={cs(`margin:0;font-size:${v.isMobile ? "26px" : "38px"};letter-spacing:-.04em;font-weight:700;line-height:1`)}>How it works</h1>
        <p style={cs("margin:12px 0 0;color:var(--mute);font-size:14.5px;line-height:1.6;max-width:64ch")}>Two things happen on duckfun: people launch tokens, and people trade them. Every fee, limit and mechanism described here matches the deployed contracts.</p>
      </div>

      <div style={cs("display:flex;border:1px solid var(--line);border-radius:8px;overflow:hidden;margin-bottom:16px;width:fit-content")}>
        <button onClick={() => setTab("launch")} style={cs(`padding:10px 18px;border:0;background:${tab === "launch" ? "var(--ink)" : "var(--card)"};color:${tab === "launch" ? "var(--card)" : "var(--ink)"};font-size:13px;font-weight:600;cursor:pointer`)}>Launch a token</button>
        <button onClick={() => setTab("trade")} style={cs(`padding:10px 18px;border:0;border-left:1px solid var(--line);background:${tab === "trade" ? "var(--ink)" : "var(--card)"};color:${tab === "trade" ? "var(--card)" : "var(--ink)"};font-size:13px;font-weight:600;cursor:pointer`)}>Trade a token</button>
      </div>

      <div style={cs("display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin-bottom:18px")}>
        {steps.map((s, i) => (
          <div key={i} className="d-lift" style={cs("border:1px solid var(--line);background:var(--card);border-radius:14px;padding:20px;display:flex;flex-direction:column")}>
            <span style={cs(`width:32px;height:32px;border-radius:999px;background:${s.bg};display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:13px;flex:none`)}>{s.n}</span>
            <div style={cs("font-size:16px;font-weight:700;letter-spacing:-.025em;margin-top:14px")}>{s.k}</div>
            <div style={cs("font-size:13.5px;color:var(--mute);line-height:1.6;margin-top:8px")}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={cs("border:1px solid var(--line);background:var(--lime);border-radius:14px;padding:20px;margin-bottom:18px")}>
        <div style={cs("font-size:16px;font-weight:700;letter-spacing:-.025em")}>{note.k}</div>
        <div style={cs("font-size:13.5px;line-height:1.6;margin-top:8px;max-width:78ch")}>{note.v}</div>
      </div>

      <div>
        <h2 style={cs("margin:0 0 12px;font-size:19px;font-weight:700;letter-spacing:-.03em")}>Common questions</h2>
        <div style={cs("display:flex;flex-direction:column;gap:10px")}>
          {FAQS.map((f, i) => (
            <div key={i} className="d-lift" style={cs("border:1px solid var(--line);background:var(--card);border-radius:14px;padding:16px 18px")}>
              <div style={cs("font-size:14px;font-weight:600;letter-spacing:-.01em")}>{f.k}</div>
              <div style={cs("font-size:13px;color:var(--mute);line-height:1.6;margin-top:7px")}>{f.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
