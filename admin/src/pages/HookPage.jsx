import { Section, ReadPanel, ActionForm, useContractReads, fmtEth, shortAddress, parseAddr, parseEth } from "../components.jsx";
import { hookAddLauncher, hookRemoveLauncher, setCTOFee, hookSetPlatformWallet, hookTransferOwnership } from "../chain/actions.js";

export default function HookPage({ account }) {
  const { values, loading, reload } = useContractReads("hook", [
    { key: "platformWallet", fn: "platformWallet" },
    { key: "ctoFee", fn: "ctoFee" },
  ]);

  return (
    <Section title="DuckHookV4" subtitle="Shared anti-MEV / sell-fee hook config. CTO approvals live on their own page.">
      <ReadPanel
        title="Current config"
        loading={loading}
        onRefresh={reload}
        rows={[
          { label: "Platform wallet", value: shortAddress(values.platformWallet) },
          { label: "CTO fee", value: fmtEth(values.ctoFee) },
        ]}
      />

      <ActionForm title="Add launcher" description="Authorizes a family contract to register pools against this hook."
        account={account} onDone={reload}
        onSubmit={(args, acct) => hookAddLauncher(acct, args)} submitLabel="Add"
        fields={[{ key: "launcher", label: "Launcher (family contract) address", placeholder: "0x…", parse: parseAddr }]} />

      <ActionForm title="Remove launcher" account={account} onDone={reload}
        onSubmit={(args, acct) => hookRemoveLauncher(acct, args)} submitLabel="Remove"
        fields={[{ key: "launcher", label: "Launcher (family contract) address", placeholder: "0x…", parse: parseAddr }]} />

      <ActionForm title="Set CTO fee" account={account} onDone={reload}
        onSubmit={(args, acct) => setCTOFee(acct, args)} submitLabel="Set fee"
        fields={[{ key: "fee", label: "Fee (ETH)", placeholder: "0.01", parse: parseEth }]} />

      <ActionForm title="Set platform wallet" account={account} onDone={reload}
        onSubmit={(args, acct) => hookSetPlatformWallet(acct, args)} submitLabel="Set wallet"
        fields={[{ key: "wallet", label: "Wallet address", placeholder: "0x…", parse: parseAddr }]} />

      <ActionForm title="Transfer ownership" description="Single-step (not two-step like DuckMetaOverride) — the new owner takes effect immediately, no accept step. Double-check the address."
        account={account} onDone={reload}
        onSubmit={(args, acct) => hookTransferOwnership(acct, args)} submitLabel="Transfer"
        fields={[{ key: "newOwner", label: "New owner address", placeholder: "0x…", parse: parseAddr }]} />
    </Section>
  );
}
