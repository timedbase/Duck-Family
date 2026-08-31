import { useState, useEffect, useCallback } from "react";
import { formatEther } from "viem";
import { Section, ActionForm, shortAddress, parseUint } from "../components.jsx";
import { claimAllFees, claimFeesRange } from "../chain/actions.js";
import { fetchPositions } from "../subgraph.js";

export default function FeesPage({ account }) {
  const [positions, setPositions] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetchPositions().then(setPositions).catch((e) => setError(String(e.message || e)));
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <Section
      title="Fees"
      subtitle="Trigger DuckLocker's LP-fee collection. claimFees on the locker already best-effort sweeps the pool's own hook fee in the same call, so there's no separate hook-claim step here."
    >
      <ActionForm
        title="Claim all fees"
        description="Loops every locked position and claims each one — best-effort per token (one failing position doesn't block the rest)."
        account={account}
        onDone={load}
        onSubmit={(_, acct) => claimAllFees(acct)}
        submitLabel="Claim all"
        fields={[]}
      />
      <ActionForm
        title="Claim a range"
        description="Same as above but only for allTokens[from..to) — useful if the full list is large enough to risk running out of gas in one call."
        account={account}
        onDone={load}
        onSubmit={([from, to], acct) => claimFeesRange(acct, [from, to])}
        submitLabel="Claim range"
        fields={[
          { key: "from", label: "From index", placeholder: "0", parse: parseUint },
          { key: "to", label: "To index (exclusive)", placeholder: "50", parse: parseUint },
        ]}
      />

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Locked positions</div>
        {error && <div className="msg error">{error}</div>}
        {!positions && !error && <div className="mute">Loading…</div>}
        {positions && positions.length === 0 && <div className="mute">None indexed yet.</div>}
        {positions && positions.length > 0 && (
          <table>
            <thead><tr><th>Token</th><th>Burned (all-time)</th><th>To platform (all-time)</th></tr></thead>
            <tbody>
              {positions.map((p) => (
                <tr key={p.id}>
                  <td className="mono">{p.token?.symbol || shortAddress(p.id)}</td>
                  <td className="mono">{formatEther(BigInt(p.totalBurned))}</td>
                  <td className="mono">{formatEther(BigInt(p.totalToPlatform))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Section>
  );
}
