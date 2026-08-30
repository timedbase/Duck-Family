import { useState } from "react";

// Generic hover-style wrapper (the design canvas's style-hover="...").
export default function Hoverable({ tag: Tag = "div", style, hover, children, onMouseEnter, onMouseLeave, ...rest }) {
  const [h, setH] = useState(false);
  return (
    <Tag
      {...rest}
      style={h ? { ...style, ...hover } : style}
      onMouseEnter={e => { setH(true); onMouseEnter && onMouseEnter(e); }}
      onMouseLeave={e => { setH(false); onMouseLeave && onMouseLeave(e); }}
    >
      {children}
    </Tag>
  );
}
