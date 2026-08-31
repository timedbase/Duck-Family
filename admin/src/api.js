// The only thing this app borrows from the trading backend: its IPFS
// upload endpoints, which need the server-side Pinata JWT this app never
// has (and never should). Everything else here talks straight to the
// chain and the public subgraph -- see chain/actions.js and subgraph.js.
export const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function uploadImage(file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}/upload/image`, { method: "POST", body: form });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `image upload failed (${res.status})`);
  return res.json(); // { cid, ipfsUri, gatewayUrl }
}

export async function uploadMetadata({ name, symbol, description, image, socials }) {
  const res = await fetch(`${API_BASE}/upload/metadata`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, symbol, description, image, socials }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || `metadata upload failed (${res.status})`);
  return res.json(); // { ipfsUri }
}
