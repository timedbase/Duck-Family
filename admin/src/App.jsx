import { useState } from "react";
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

export default function App() {
  const [section, setSection] = useState("overview");
  const { address: account } = useAccount();
  const { disconnect } = useDisconnect();
  const { openConnectModal } = useConnectModal();

  const active = NAV.find((n) => n.key === section) || NAV[0];
  const Page = active.Page;

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside style={{ width: 220, flex: "none", borderRight: "1px solid var(--line)", padding: "18px 0", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "0 18px 18px", fontWeight: 700, fontSize: 15 }}>duckfun<span className="mute">.admin</span></div>
        <nav style={{ flex: 1 }}>
          {NAV.map((n) => (
            <button
              key={n.key}
              onClick={() => setSection(n.key)}
              style={{
                display: "block", width: "100%", textAlign: "left", border: 0, borderRadius: 0,
                background: section === n.key ? "var(--panel-2)" : "transparent",
                borderLeft: `3px solid ${section === n.key ? "var(--amber)" : "transparent"}`,
                padding: "10px 18px", fontWeight: section === n.key ? 700 : 500,
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
      </aside>
      <main style={{ flex: 1, padding: "28px 32px", maxWidth: 900 }}>
        <Page account={account} />
      </main>
    </div>
  );
}
