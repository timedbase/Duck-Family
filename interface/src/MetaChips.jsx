import { useState } from "react";
import { cs } from "./cs.js";

const chipStyle = "display:inline-flex;align-items:center;gap:6px;padding:6px 11px;border:1px solid var(--line);border-radius:7px;background:var(--paper);font-family:'JetBrains Mono',monospace;font-size:11.5px;line-height:1;white-space:nowrap;border-bottom:1px solid var(--line)";

export function AddressChip({ address, full }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(full || address);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {}
  };
  return (
    <button onClick={copy} className="d-hover-paper" title={full || address} style={cs(`${chipStyle};cursor:pointer;color:var(--ink)`)}>
      <span>{copied ? "Copied" : address}</span>
      {!copied && <span style={cs("color:var(--mute);font-size:11px")}>⧉</span>}
    </button>
  );
}

export function LinkChip({ href, children }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className="d-hover-paper" style={cs(`${chipStyle};color:var(--ink)`)}>{children}</a>
  );
}
