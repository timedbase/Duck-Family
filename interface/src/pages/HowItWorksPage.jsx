import { useState } from "react";
import { cs } from "../cs.js";

const LAUNCH_STEPS = [
  { n: "1", k: "Choose a family", v: "Bonding curve for price discovery from block one, instant launch for a real V4 pool immediately, or crowdfund raise to collect ETH toward a goal first.", bg: "var(--lime)" },
  { n: "2", k: "Set the parameters", v: "Name, symbol, quote asset and targets. Targets are raw quote amounts — there is no oracle anywhere in the system.", bg: "var(--card)" },
  { n: "3", k: "Add socials once", v: "X, Telegram and website are written into metadata at creation. The token is a fixed-supply clone with no owner-mint path, so this is effectively permanent.", bg: "var(--card)" },
  { n: "4", k: "Sign one transaction", v: "The factory clones the token, wires the shared anti-MEV hook, and — for instant launches — opens the V4 pool and locks LP in the same call.", bg: "var(--card)" },
];

const TRADE_STEPS = [
  { n: "1", k: "Connect on Ink", v: "Any injected wallet or WalletConnect. duckfun never asks for a signature just to browse — only to trade.", bg: "var(--lime)" },
  { n: "2", k: "Pick a venue", v: "Bonding-curve tokens trade against the curve; migrated and instant-launch tokens trade on a real Uniswap V4 pool. Crowdlaunch tokens are not tradeable until the raise finalizes.", bg: "var(--card)" },
  { n: "3", k: "Size the trade", v: "Enter an amount and check the live quote before you sign — tokens received, plus a slippage tolerance you control.", bg: "var(--card)" },
  { n: "4", k: "Sign and settle", v: "The hook rejects a second buy/sell pair from the same address in the same block, so a sandwich attempt reverts at the pool. Sells on a V4 pool are skimmed a 2% hook fee, paid to the creator.", bg: "var(--card)" },
];

const FAQS = [
  { k: "Can a creator rug the pool?", v: "No. The LP position is minted directly into DuckLocker, which has no withdraw function. Only accrued trading fees are claimable, and only the hook's 2% sell-fee skim actually pays the creator — the LP position's own trading fee is always burned (token side) or sent to the platform wallet (quote side)." },
  { k: "What happens if a crowdlaunch misses its goal?", v: "No pool is seeded and the escrowed supply is never released. Every contributor can claim a full refund of their ETH." },
  { k: "What quote assets are supported?", v: "Native ETH is the default and always tradeable directly. USDC and USDT0 are the two ERC20 alternates with real liquidity on Ink, used for the bounded-fallback swap route when a token is quoted in one of them instead of ETH." },
  { k: "What is a CTO (community takeover)?", v: "If a creator goes quiet, anyone can pay the takeover price to inherit the creator's fee stream. Supply, pool, locked LP and the token's metadata are untouched — a takeover moves the fee claim, not the token." },
];

export default function HowItWorksPage({ v }) {
  const [tab, setTab] = useState("launch");
  const steps = tab === "trade" ? TRADE_STEPS : LAUNCH_STEPS;

  return (
    <div style={cs("max-width:900px;margin:0 auto")}>
      <div style={cs("border:1px solid var(--line);border-radius:10px;background:var(--card);padding:26px 24px;margin-bottom:18px")}>
        <h1 style={cs(`margin:0 0 9px;font-size:${v.isMobile ? "26px" : "38px"};letter-spacing:-.045em;font-weight:700;line-height:1.05`)}>How it works</h1>
        <p style={cs("margin:0;color:var(--mute);font-size:14.5px;line-height:1.55;max-width:66ch")}>Every fee, limit and mechanism described here matches the deployed contracts — nothing is rounded off or simplified into something it isn't.</p>
      </div>

      <div style={cs("display:flex;border:1px solid var(--line);border-radius:8px;overflow:hidden;margin-bottom:16px;width:fit-content")}>
        <button onClick={() => setTab("launch")} style={cs(`padding:10px 18px;border:0;background:${tab === "launch" ? "var(--ink)" : "var(--card)"};color:${tab === "launch" ? "var(--card)" : "var(--ink)"};font-size:13px;font-weight:600;cursor:pointer`)}>Launch a token</button>
        <button onClick={() => setTab("trade")} style={cs(`padding:10px 18px;border:0;border-left:1px solid var(--line);background:${tab === "trade" ? "var(--ink)" : "var(--card)"};color:${tab === "trade" ? "var(--card)" : "var(--ink)"};font-size:13px;font-weight:600;cursor:pointer`)}>Trade a token</button>
      </div>

      <div style={cs("border:1px solid var(--line);border-radius:10px;background:var(--card);overflow:hidden;margin-bottom:16px")}>
        {steps.map((s, i) => (
          <div key={i} style={cs(`display:flex;gap:16px;padding:18px 20px;${i < steps.length - 1 ? "border-bottom:1px solid var(--soft)" : ""};align-items:flex-start`)}>
            <span style={cs(`width:28px;height:28px;flex:none;border-radius:999px;border:1px solid var(--line);background:${s.bg};display:flex;align-items:center;justify-content:center;font-family:'DM Mono',monospace;font-size:12.5px;font-weight:700`)}>{s.n}</span>
            <div>
              <div style={cs("font-size:15px;font-weight:700;letter-spacing:-.02em;margin-bottom:5px")}>{s.k}</div>
              <div style={cs("font-size:13.5px;color:var(--mute);line-height:1.55;max-width:66ch")}>{s.v}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={cs("border:1px solid var(--line);border-radius:10px;background:var(--card);overflow:hidden")}>
        <div style={cs("padding:13px 18px;border-bottom:1px solid var(--line);font-size:15px;font-weight:700;letter-spacing:-.02em")}>FAQ</div>
        {FAQS.map((f, i) => (
          <div key={i} style={cs("padding:16px 18px;border-bottom:1px solid var(--soft)")}>
            <div style={cs("font-size:13.5px;font-weight:600;letter-spacing:-.01em;margin-bottom:6px")}>{f.k}</div>
            <div style={cs("font-size:13px;color:var(--mute);line-height:1.55;max-width:70ch")}>{f.v}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
