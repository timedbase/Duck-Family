// Resolves a token's metaURI (an ipfs:// pointer to the small JSON blob
// written by backend/src/api/routes/upload.ts's /upload/metadata) into a
// displayable image URL. Nothing here is fake — if the token has no
// metaURI, or it doesn't point at real JSON with an `image` field (e.g. the
// plain-text fallback App.jsx uses when the metadata pin fails at creation
// time), this just resolves to null and the UI falls back to the colored
// placeholder instead of showing a broken image.
const PINATA_GATEWAY = "https://gateway.pinata.cloud/ipfs/";

export function ipfsToHttp(uri) {
  if (!uri) return null;
  if (uri.startsWith("ipfs://")) return PINATA_GATEWAY + uri.slice("ipfs://".length);
  if (uri.startsWith("http://") || uri.startsWith("https://")) return uri;
  return null;
}

const cache = new Map();

export function resolveTokenImage(metaUri) {
  if (!metaUri) return Promise.resolve(null);
  if (cache.has(metaUri)) return cache.get(metaUri);

  const promise = (async () => {
    try {
      const url = ipfsToHttp(metaUri);
      if (!url) return null;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      return ipfsToHttp(data?.image) || null;
    } catch {
      return null;
    }
  })();

  cache.set(metaUri, promise);
  return promise;
}
