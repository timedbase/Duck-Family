import { cs } from "./cs.js";

// Shared token-art renderer: shows the real uploaded image once resolved
// (see ipfs.js), falling back to the deterministic colored placeholder
// (same one used before any image existed) if there's no image, it hasn't
// loaded yet, or it fails to load.
export default function CoinArt({ art, ink, imageUrl, label, size, radius, fontSize = 8.5, boxStyle }) {
  const dims = size != null ? `width: ${size}px; height: ${size}px; flex: none; border-radius: ${radius}px;` : boxStyle;
  return (
    <div style={cs(`${dims} background: ${art}; display: flex; align-items: center; justify-content: center; overflow: hidden;`)}>
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          style={cs("width: 100%; height: 100%; object-fit: cover; display: block;")}
          onError={(e) => { e.target.style.display = "none"; }}
        />
      ) : label ? (
        <span style={cs(`font-family: 'JetBrains Mono', monospace; font-size: ${fontSize}px; letter-spacing: .1em; color: ${ink}; text-align: center; line-height: 1.5;`)}>{label}</span>
      ) : null}
    </div>
  );
}
