import { useState, useEffect } from "react";
import { useAccount, useDisconnect } from "wagmi";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { shortAddress } from "./components.jsx";
import OverviewPage from "./pages/OverviewPage.jsx";
import MetaOverridePage from "./pages/MetaOverridePage.jsx";
import CtoPage from "./pages/CtoPage.jsx";
import FeesPage from "./pages/FeesPage.jsx";
import IncubationPage from "./pages/IncubationPage.jsx";
import LauncherPage from "./pages/LauncherPage.jsx";
import RaisePage from "./pages/RaisePage.jsx";
import LockerPage from "./pages/LockerPage.jsx";
import HookPage from "./pages/HookPage.jsx";

const NAV = [
  { key: "overview", label: "Overview", Page: OverviewPage },
  { key: "meta", label: "Meta Override", Page: MetaOverridePage },
  { key: "cto", label: "CTO Applications", Page: CtoPage },
  { key: "fees", label: "Fees", Page: FeesPage },
  { key: "incubation", label: "DuckIncubation", Page: IncubationPage },
  { key: "launcher", label: "DuckLauncher", Page: LauncherPage },
  { key: "raise", label: "DuckRaise", Page: RaisePage },
  { key: "locker", label: "DuckLocker", Page: LockerPage },
  { key: "hook", label: "DuckHookV4", Page: HookPage },
];

function useMobile() {
  const [mobile, setMobile] = useState(typeof window !== "undefined" ? window.innerWidth < 860 : false);
  useEffect(() => {
    const onResize = () => setMobile(window.innerWidth < 860);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return mobile;
}

export default function App() {
  const [section, setSection] = useState("overview");
  const [navOpen, setNavOpen] = useState(false);
  const mobile = useMobile();
  const { address: account } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();

  const active = NAV.find((n) => n.key === section) || NAV[0];
  const Page = active.Page;

  const navList = (
    <>
      <div style={{ padding: "0 18px 18px", fontWeight: 700, fontSize: 15 }}>duckfun<span className="mute">.admin</span></div>
      <nav style={{ flex: 1, overflowY: "auto" }}>
        {NAV.map((n) => (
          <button
            key={n.key}
            onClick={() => { setSection(n.key); setNavOpen(false); }}
            style={{
              display: "block", width: "100%", textAlign: "left", border: 0, borderRadius: 0,
              background: section === n.key ? "var(--panel-2)" : "transparent",
              borderLeft: `3px solid ${section === n.key ? "var(--amber)" : "transparent"}`,
              padding: "12px 18px", fontWeight: section === n.key ? 700 : 500,
            }}
          >
            {n.label}
          </button>
        ))}
      </nav>
      <div style={{ padding: "0 18px" }}>
        <button style={{ width: "100%" }} onClick={() => (account ? disconnect() : openConnectModal && openConnectModal())}>
          {account ? shortAddress(account) : "Connect wallet"}
        </button>
      </div>
    </>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {mobile && (
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--line)" }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>duckfun<span className="mute">.admin</span></span>
          <button onClick={() => setNavOpen(true)} aria-label="Menu" style={{ width: 38, height: 38, padding: 0 }}>☰</button>
        </header>
      )}
      <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
        {!mobile && (
          <aside style={{ width: 220, flex: "none", borderRight: "1px solid var(--line)", padding: "18px 0", display: "flex", flexDirection: "column" }}>
            {navList}
          </aside>
        )}
        {mobile && navOpen && (
          <div onClick={() => setNavOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(17,17,16,.5)", display: "flex" }}>
            <div onClick={(e) => e.stopPropagation()} style={{ width: "78vw", maxWidth: 280, background: "var(--bg)", borderRight: "1px solid var(--line)", padding: "18px 0", display: "flex", flexDirection: "column" }}>
              {navList}
            </div>
          </div>
        )}
        <main style={{ flex: 1, minWidth: 0, padding: mobile ? "18px 14px" : "28px 32px", maxWidth: 900 }}>
          <Page account={account} />
        </main>
      </div>
    </div>
  );
}
