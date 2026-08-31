import { useState, useEffect, useCallback } from "react";
import { formatEther } from "viem";
import { Section, shortAddress, EXPLORER } from "../components.jsx";
import { approveCTOAt, rejectCTOAt } from "../chain/actions.js";
import { fetchPendingCtoApplications } from "../subgraph.js";

export default function CtoPage({ account }) {
  const [apps, setApps] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetchPendingCtoApplications().then(setApps).catch((e) => setError(String(e.message || e)));
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <Section
      title="CTO applications"
      subtitle="Pending community-takeover applications across every pool (DuckHookV4.approveCTO/rejectCTO). Each row calls the token's own hook contract, not a hardcoded default — a pool's hook is fixed forever at creation and a future second hook must still be respected here."
    >
      <div className="card">
        {error && <div className="msg error">{error}</div>}
        {!apps && !error && <div className="mute">Loading…</div>}
        {apps && apps.length === 0 && <div className="mute">No pending applications right now.</div>}
        {apps && apps.length > 0 && (
          <table>
            <thead><tr><th>Token</th><th>Applicant</th><th>New creator</th><th>Paid</th><th></th></tr></thead>
            <tbody>
              {apps.map((a) => (
                <CtoRow key={a.id} app={a} account={account} onDone={load} />
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Section>
  );
}

function CtoRow({ app, account, onDone }) {
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");
  const hook = app.pool?.token?.hook;

  async function act(fn) {
    if (!account) { setError("Connect a wallet first."); return; }
    if (!hook) { setError("No hook address indexed for this pool."); return; }
    setPending(fn === approveCTOAt ? "approve" : "reject");
    setError("");
    try {
      await fn(hook, account, app.pool.id);
      onDone();
    } catch (e) {
      setError(e?.cause?.data?.errorName || e?.shortMessage || e?.message || String(e));
    } finally {
      setPending("");
    }
  }

  return (
    <tr>
      <td className="mono">{app.pool?.token?.symbol || shortAddress(app.pool?.token?.id)}</td>
      <td className="mono"><a href={`${EXPLORER}/address/${app.applicant}`} target="_blank" rel="noreferrer">{shortAddress(app.applicant)}</a></td>
      <td className="mono">{shortAddress(app.newCreator)}</td>
      <td className="mono">{formatEther(BigInt(app.paid))} ETH</td>
      <td>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => act(approveCTOAt)} disabled={!!pending}>{pending === "approve" ? "…" : "Approve"}</button>
          <button onClick={() => act(rejectCTOAt)} disabled={!!pending}>{pending === "reject" ? "…" : "Reject"}</button>
        </div>
        {error && <div className="msg error">{error}</div>}
      </td>
    </tr>
  );
}
