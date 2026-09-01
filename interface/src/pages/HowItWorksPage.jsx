import { useState } from "react";
import { cs } from "../cs.js";

const LAUNCH_STEPS = [
  { n: "1", k: "Choose a family", v: "Bonding curve for price discovery from block one, instant launch for a real V4 pool right away, or crowdfund raise to collect ETH toward a goal first.", bg: "var(--lime)", fg: "var(--on)" },
  { n: "2", k: "Set the parameters", v: "Name, symbol, quote asset and targets. There's no oracle involved, so targets are just raw quote amounts you pick yourself.", bg: "var(--paper)" },
  { n: "3", k: "Add socials once", v: "X, Telegram and website get written into the metadata at creation. The token can't be re-minted or edited later, so this is effectively permanent.", bg: "var(--paper)" },
  { n: "4", k: "Sign one transaction", v: "The factory clones the token and wires up the shared anti-MEV hook. Instant launches also open the V4 pool and lock the LP in that same transaction. Supply is minted once and fixed forever, so every duckfun token is deflationary by default.", bg: "var(--paper)" },
];

const TRADE_STEPS = [
  { n: "1", k: "Connect on Ink", v: "Any injected wallet or WalletConnect works. duckfun only asks for a signature when you're actually trading, never just to browse.", bg: "var(--lime)", fg: "var(--on)" },
  { n: "2", k: "Pick a venue", v: "Bonding-curve tokens trade against the curve. Migrated and instant-launch tokens trade on a real Uniswap V4 pool. Crowdlaunch tokens aren't tradeable until the raise finalizes.", bg: "var(--paper)" },
  { n: "3", k: "Size the trade", v: "Enter an amount and check the live quote before you sign. You'll see the tokens you'd receive, and you set your own slippage tolerance.", bg: "var(--paper)" },
  { n: "4", k: "Sign and settle", v: "The hook blocks a buy and sell from the same address in the same block, so a sandwich attempt just reverts at the pool. Buys carry a 0.5% fee that gets burned; sells carry that same 0.5% to the platform plus a 2% fee that goes straight to the creator.", bg: "var(--paper)" },
];

const FAQS = [
  { k: "Can a creator rug the pool?", v: "Not really. The LP position sits in DuckLocker, which has no withdraw function at all. Creators only ever earn the 2% sell fee; the LP's own trading fee gets burned or sent to the platform, never to them." },
  { k: "Can the total supply ever go up?", v: "No. Every duckfun token mints its full supply once at creation, and there's no mint function left reachable after that. Supply can only stay flat or shrink over time (from the LP-fee burn). It never inflates." },
  { k: "What happens if a crowdlaunch misses its goal?", v: "No pool gets seeded, and the escrowed supply never releases. Everyone who contributed can claim a full refund of their ETH." },
  { k: "What quote assets are supported?", v: "Native ETH is the default and always tradeable directly. USDC and USDT0 are the two other options with real liquidity on Ink, used for the fallback route when a token is quoted in one of them instead of ETH." },
  { k: "What is a CTO (community takeover)?", v: "If a creator goes quiet, anyone can pay the takeover price to inherit their fee stream, then post the transaction on X tagging @duckfunfamily so the team can review it. That's all it moves, though: supply, pool and the locked LP stay exactly as they are." },
];

const HOW_NOTE = {
  launch: { k: "Fixed supply, locked liquidity", v: "Every family mints its full supply once, at creation, and there's no mint function left reachable afterward, so supply can never go up. The LP position backing it is full-range and sits in DuckLocker permanently, with no withdrawal path at all. Creators keep the fee stream that comes from trading, but they can never touch the liquidity itself or print more supply." },
  trade: { k: "What you're actually trading against", v: "Before migration, you're trading against the curve itself: price moves purely off the math, no oracle involved. After migration it's an ordinary Uniswap V4 pool, and the LP sitting in DuckLocker can never be pulled, so the liquidity you see on screen isn't going anywhere." },
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
          <div key={i} className="d-lift" style={cs("border:1px solid var(--line);background:var(--card);border-radius:10px;box-shadow:var(--sh);padding:20px;display:flex;flex-direction:column")}>
            <span style={cs(`width:32px;height:32px;border-radius:999px;background:${s.bg};color:${s.fg || "var(--ink)"};display:flex;align-items:center;justify-content:center;font-family:'JetBrains Mono',monospace;font-size:13px;flex:none`)}>{s.n}</span>
            <div style={cs("font-size:16px;font-weight:700;letter-spacing:-.025em;margin-top:14px")}>{s.k}</div>
            <div style={cs("font-size:13.5px;color:var(--mute);line-height:1.6;margin-top:8px")}>{s.v}</div>
          </div>
        ))}
      </div>

      <div style={cs("border:1px solid var(--line);background:var(--lime);color:var(--on);border-radius:10px;box-shadow:var(--sh);padding:20px;margin-bottom:18px")}>
        <div style={cs("font-size:16px;font-weight:700;letter-spacing:-.025em")}>{note.k}</div>
        <div style={cs("font-size:13.5px;line-height:1.6;margin-top:8px;max-width:78ch")}>{note.v}</div>
      </div>

      <div>
        <h2 style={cs("margin:0 0 12px;font-size:19px;font-weight:700;letter-spacing:-.03em")}>Common questions</h2>
        <div style={cs("display:flex;flex-direction:column;gap:10px")}>
          {FAQS.map((f, i) => (
            <div key={i} className="d-lift" style={cs("border:1px solid var(--line);background:var(--card);border-radius:10px;box-shadow:var(--sh);padding:16px 18px")}>
              <div style={cs("font-size:14px;font-weight:600;letter-spacing:-.01em")}>{f.k}</div>
              <div style={cs("font-size:13px;color:var(--mute);line-height:1.6;margin-top:7px")}>{f.v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
