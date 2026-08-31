import { useState, useEffect, useCallback } from "react";
import { Section, ActionForm, shortAddress, parseAddr, parseStr } from "../components.jsx";
import { registerToken, updateMetaURI, unregisterToken } from "../chain/actions.js";
import { fetchOverriddenTokens } from "../subgraph.js";

export default function MetaOverridePage({ account }) {
  const [tokens, setTokens] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    fetchOverriddenTokens().then(setTokens).catch((e) => setError(String(e.message || e)));
  }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <Section
      title="Meta Override"
      subtitle="Fix a token's metadata (image/description/socials/display name) without touching its immutable on-chain metaURI. Registering a token here makes the interface treat this metaURI as authoritative instead."
    >
      <ActionForm
        title="Register / update override"
        description="Same call for a first-time registration or a later edit — registerToken always sets isRegistered=true and overwrites the stored metaURI. Produce the metaURI the same way token creation does (backend's POST /upload/metadata), then paste the resulting ipfs:// URI here."
        account={account}
        onDone={load}
        onSubmit={([token, uri], acct) => registerToken(acct, [token, uri])}
        submitLabel="Register / update"
        fields={[
          { key: "token", label: "Token address", placeholder: "0x…", parse: parseAddr },
          { key: "uri", label: "New metaURI", placeholder: "ipfs://…", parse: parseStr },
        ]}
      />
      <ActionForm
        title="Update existing override"
        description="Same as above but reverts with NotRegistered if the token hasn't been registered yet — use this when you specifically mean to edit, not create."
        account={account}
        onDone={load}
        onSubmit={([token, uri], acct) => updateMetaURI(acct, [token, uri])}
        submitLabel="Update"
        fields={[
          { key: "token", label: "Token address", placeholder: "0x…", parse: parseAddr },
          { key: "uri", label: "New metaURI", placeholder: "ipfs://…", parse: parseStr },
        ]}
      />
      <ActionForm
        title="Unregister"
        description="Reverts the token back to its original on-chain metaURI and clears the stored override string."
        account={account}
        onDone={load}
        onSubmit={([token], acct) => unregisterToken(acct, [token])}
        submitLabel="Unregister"
        fields={[{ key: "token", label: "Token address", placeholder: "0x…", parse: parseAddr }]}
      />

      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 10 }}>Currently overridden tokens</div>
        {error && <div className="msg error">{error}</div>}
        {!tokens && !error && <div className="mute">Loading…</div>}
        {tokens && tokens.length === 0 && <div className="mute">None right now.</div>}
        {tokens && tokens.length > 0 && (
          <table>
            <thead><tr><th>Token</th><th>Family</th><th>Original metaUri</th><th>Override metaUri</th></tr></thead>
            <tbody>
              {tokens.map((t) => (
                <tr key={t.id}>
                  <td className="mono">{t.symbol || shortAddress(t.id)}</td>
                  <td>{t.family}</td>
                  <td className="mono" style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.metaUri}</td>
                  <td className="mono" style={{ maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.metaOverrideUri}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Section>
  );
}
