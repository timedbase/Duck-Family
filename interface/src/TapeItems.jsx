import { cs } from "./cs.js";

// Ticker-tape row list (rendered twice, back to back, for the seamless marquee).
export default function TapeItems({ list }) {
  return list.map((t, i) => (
    <div key={i} style={cs("display: flex; align-items: center; gap: 7px; flex: none;")}>
      <span style={cs(`width: 13px; height: 13px; border-radius: 4px; flex: none; background: ${t.hue};`)}></span>
      <span style={cs("color: #D9D9D9;")}>{t.who}</span>
      <span style={cs(`color: ${t.dirColor};`)}>{t.dir}</span>
      <span style={cs("color: #B4B4C2;")}>{t.amt} {t.quote}</span>
      <span>of</span>
      <span style={cs("color: #D9D9D9;")}>{t.tick}</span>
    </div>
  ));
}
