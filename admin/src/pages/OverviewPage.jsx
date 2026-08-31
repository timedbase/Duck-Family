import { Section, shortAddress, useContractReads } from "../components.jsx";
import { CONTRACT_KEYS, contractInfo } from "../chain/actions.js";

export default function OverviewPage({ account }) {
  return (
    <Section
      title="Overview"
      subtitle="Every action in this dashboard is a transaction your connected wallet signs itself — same trust model as any trader using the public app. Nothing here can move funds or change config without your own signature."
    >
      <div className="card">
        <div style={{ fontWeight: 700, marginBottom: 8 }}>Connected wallet</div>
        <div className="mono">{account || "Not connected"}</div>
      </div>
      <OwnerChecks account={account} />
    </Section>
  );
}

function OwnerChecks({ account }) {
  const rows = CONTRACT_KEYS.map((key) => ({ key, info: contractInfo(key) }));
  return (
    <div className="card">
      <div style={{ fontWeight: 700, marginBottom: 10 }}>Contract ownership</div>
      <table>
        <thead><tr><th>Contract</th><th>Address</th><th>Owner</th><th>Match</th></tr></thead>
        <tbody>
          {rows.map(({ key, info }) => (
            <OwnerRow key={key} contractKey={key} info={info} account={account} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function OwnerRow({ contractKey, info, account }) {
  const { values, loading } = useContractReads(contractKey, [{ key: "owner", fn: "owner" }]);
  const owner = values.owner;
  const match = !loading && account && owner && account.toLowerCase() === owner.toLowerCase();
  return (
    <tr>
      <td>{info.label}</td>
      <td className="mono">{shortAddress(info.address)}</td>
      <td className="mono">{loading ? "…" : shortAddress(owner)}</td>
      <td>
        {loading ? "…" : (
          <span className={`badge ${match ? "ok" : "warn"}`}>{match ? "match" : "mismatch"}</span>
        )}
      </td>
    </tr>
  );
}
