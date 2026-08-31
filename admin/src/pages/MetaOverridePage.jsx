import { useState, useEffect, useCallback } from "react";
import { Section, ActionForm, shortAddress, parseAddr, parseStr } from "../components.jsx";
import { registerToken, updateMetaURI, unregisterToken } from "../chain/actions.js";
import { fetchOverriddenTokens } from "../subgraph.js";
import { uploadImage, uploadMetadata } from "../api.js";

const EMPTY_BUILDER = { token: "", name: "", symbol: "", description: "", website: "", twitter: "", telegram: "" };

function BuilderForm({ account, onDone }) {
  const [d, setD] = useState(EMPTY_BUILDER);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [state, setState] = useState({ pending: false, error: "", success: "" });

  const set = (patch) => setD((s) => ({ ...s, ...patch }));

  function onPickFile(e) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  }

  async function submit() {
    if (!account) { setState({ pending: false, error: "Connect a wallet first.", success: "" }); return; }
    if (!d.token.trim()) { setState({ pending: false, error: "Token address is required.", success: "" }); return; }
    if (!d.name.trim() || !d.symbol.trim()) { setState({ pending: false, error: "Name and symbol are required (the metadata upload needs both).", success: "" }); return; }
    setState({ pending: true, error: "", success: "" });
    try {
      let imageUri = "";
      if (file) {
        const img = await uploadImage(file);
        imageUri = img.ipfsUri;
      }
      const { ipfsUri } = await uploadMetadata({
        name: d.name.trim(),
        symbol: d.symbol.trim().toUpperCase(),
        description: d.description.trim(),
        image: imageUri,
        socials: { website: d.website.trim(), twitter: d.twitter.trim(), telegram: d.telegram.trim() },
      });
      const hash = await registerToken(account, [d.token.trim(), ipfsUri]);
      setState({ pending: false, error: "", success: `Registered — metaURI ${ipfsUri}, tx ${hash}` });
      setD(EMPTY_BUILDER);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setFile(null);
      setPreviewUrl("");
      onDone && onDone();
    } catch (e) {
      setState({ pending: false, error: e?.cause?.data?.errorName || e?.shortMessage || e?.message || String(e), success: "" });
    }
  }

  return (
    <div className="card">
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Build &amp; register override</div>
      <div className="mute" style={{ fontSize: 12.5, marginBottom: 12, lineHeight: 1.5 }}>
        Uploads the image and metadata to IPFS via the trading backend (the only place the Pinata key lives), then registers the resulting metaURI in one step — same shape token creation itself uses.
      </div>
      <div className="row">
        <div className="field">
          <label>Token address</label>
          <input value={d.token} onChange={(e) => set({ token: e.target.value })} placeholder="0x…" />
        </div>
      </div>
      <div className="row">
        <div className="field">
          <label>Name</label>
          <input value={d.name} onChange={(e) => set({ name: e.target.value })} placeholder="Quack Capital" />
        </div>
        <div className="field">
          <label>Symbol</label>
          <input value={d.symbol} onChange={(e) => set({ symbol: e.target.value.toUpperCase() })} placeholder="QUACK" />
        </div>
      </div>
      <div className="field">
        <label>Description</label>
        <textarea rows={3} value={d.description} onChange={(e) => set({ description: e.target.value.slice(0, 500) })} placeholder="What is this token for?" />
      </div>
      <div className="row">
        <div className="field">
          <label>Website</label>
          <input value={d.website} onChange={(e) => set({ website: e.target.value })} placeholder="https://…" />
        </div>
        <div className="field">
          <label>X / Twitter</label>
          <input value={d.twitter} onChange={(e) => set({ twitter: e.target.value })} placeholder="https://x.com/…" />
        </div>
        <div className="field">
          <label>Telegram</label>
          <input value={d.telegram} onChange={(e) => set({ telegram: e.target.value })} placeholder="https://t.me/…" />
        </div>
      </div>
      <div className="field">
        <label>Image</label>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <label style={{ width: 56, height: 56, border: "1px dashed var(--line)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "var(--mute)", cursor: "pointer", overflow: "hidden", flex: "none" }}>
            <input type="file" accept="image/*" onChange={onPickFile} style={{ display: "none" }} />
            {previewUrl ? <img src={previewUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "PICK"}
          </label>
          <span className="mute" style={{ fontSize: 12 }}>{file ? file.name : "Optional — PNG/JPEG/GIF/WEBP"}</span>
        </div>
      </div>
      <button className="primary" onClick={submit} disabled={state.pending}>{state.pending ? "Uploading + registering…" : "Build & register"}</button>
      {state.error && <div className="msg error">{state.error}</div>}
      {state.success && <div className="msg success">{state.success}</div>}
    </div>
  );
}

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
      <BuilderForm account={account} onDone={load} />

      <ActionForm
        title="Register / update with an existing metaURI"
        description="For when you already have a metaURI (e.g. produced elsewhere) and just want to point the override at it directly, skipping the upload step above."
        account={account}
        onDone={load}
        onSubmit={([token, uri], acct) => registerToken(acct, [token, uri])}
        submitLabel="Register / update"
        fields={[
          { key: "token", label: "Token address", placeholder: "0x…", parse: parseAddr },
          { key: "uri", label: "metaURI", placeholder: "ipfs://…", parse: parseStr },
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
