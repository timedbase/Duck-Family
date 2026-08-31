import { useState, useEffect, useCallback } from "react";
import { formatEther, parseEther, parseUnits } from "viem";
import { readContract } from "./chain/actions.js";

export const EXPLORER = "https://explorer.inkonchain.com";

export function shortAddress(a) {
  if (!a) return "—";
  return a.slice(0, 6) + "…" + a.slice(-4);
}
export function fmtEth(wei) {
  if (wei == null) return "…";
  return Number(formatEther(wei)).toString() + " ETH";
}
// ---------- parse helpers for ActionForm fields ----------
export const parseAddr = (v) => v.trim();
export const parseEth = (v) => parseEther(v || "0");
export const parseTokens18 = (v) => parseUnits(v || "0", 18);
export const parseUint = (v) => BigInt(v || "0");
export const parseStr = (v) => v;

// ---------- reads ----------

// calls: [{ key, fn, args? }] -- loads once on mount and whenever the calls
// list itself changes shape; call `reload()` after a write to refresh.
export function useContractReads(contractKey, calls) {
  const [values, setValues] = useState({});
  const [loading, setLoading] = useState(true);
  const sig = JSON.stringify(calls.map((c) => [c.key, c.fn, c.args || []]));
  const load = useCallback(async () => {
    setLoading(true);
    const entries = await Promise.all(
      calls.map(async (c) => {
        try {
          return [c.key, await readContract(contractKey, c.fn, c.args || [])];
        } catch {
          return [c.key, null];
        }
      })
    );
    setValues(Object.fromEntries(entries));
    setLoading(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contractKey, sig]);
  useEffect(() => { load(); }, [load]);
  return { values, loading, reload: load };
}

// ---------- UI primitives ----------

export function Section({ title, subtitle, children }) {
  return (
    <div>
      <h1 style={{ fontSize: 22, margin: "0 0 4px" }}>{title}</h1>
      {subtitle && <p className="mute" style={{ margin: "0 0 20px", maxWidth: "70ch", lineHeight: 1.5 }}>{subtitle}</p>}
      {children}
    </div>
  );
}

export function ReadPanel({ title, rows, loading, onRefresh }) {
  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontWeight: 700 }}>{title}</div>
        {onRefresh && <button onClick={onRefresh} disabled={loading}>{loading ? "Loading…" : "Refresh"}</button>}
      </div>
      <table><tbody>
        {rows.map((r, i) => (
          <tr key={i}><td className="mute">{r.label}</td><td className="mono">{r.value}</td></tr>
        ))}
      </tbody></table>
    </div>
  );
}

// fields: [{ key, label, placeholder?, type?: "bool", parse?: (raw) => arg }]
// onSubmit(args, account) must return a tx hash (or throw).
export function ActionForm({ title, description, fields, submitLabel = "Submit", onSubmit, account, onDone }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.key, f.type === "bool" ? false : ""])));
  const [state, setState] = useState({ pending: false, error: "", hash: "" });

  const set = (key, v) => setValues((s) => ({ ...s, [key]: v }));

  async function submit() {
    if (!account) { setState({ pending: false, error: "Connect a wallet first.", hash: "" }); return; }
    setState({ pending: true, error: "", hash: "" });
    try {
      const args = fields.map((f) => (f.parse ? f.parse(values[f.key]) : values[f.key]));
      const hash = await onSubmit(args, account);
      setState({ pending: false, error: "", hash });
      onDone && onDone();
    } catch (e) {
      const msg = e?.cause?.data?.errorName || e?.shortMessage || e?.message || String(e);
      setState({ pending: false, error: msg, hash: "" });
    }
  }

  return (
    <div className="card">
      <div style={{ fontWeight: 700, marginBottom: description ? 4 : 12 }}>{title}</div>
      {description && <div className="mute" style={{ fontSize: 12.5, marginBottom: 12, lineHeight: 1.5 }}>{description}</div>}
      {fields.length > 0 && (
        <div className="row">
          {fields.map((f) => (
            <div className="field" key={f.key}>
              <label>{f.label}</label>
              {f.type === "bool" ? (
                <select value={values[f.key] ? "true" : "false"} onChange={(e) => set(f.key, e.target.value === "true")}>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              ) : (
                <input value={values[f.key]} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />
              )}
            </div>
          ))}
        </div>
      )}
      <button className="primary" onClick={submit} disabled={state.pending}>{state.pending ? "Confirming…" : submitLabel}</button>
      {state.error && <div className="msg error">{state.error}</div>}
      {state.hash && (
        <div className="msg success">
          Sent: <a href={`${EXPLORER}/tx/${state.hash}`} target="_blank" rel="noreferrer">{shortAddress(state.hash)}</a>
        </div>
      )}
    </div>
  );
}
