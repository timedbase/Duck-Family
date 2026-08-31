import { Section, ReadPanel, ActionForm, useContractReads, shortAddress, parseAddr } from "../components.jsx";
import { lockerAddLauncher, lockerRemoveLauncher, lockerSetPlatformWallet, lockerSetPlatformToken } from "../chain/actions.js";

export default function LockerPage({ account }) {
  const { values, loading, reload } = useContractReads("locker", [
    { key: "platformWallet", fn: "platformWallet" },
    { key: "platformToken", fn: "platformToken" },
    { key: "tokenCount", fn: "tokenCount" },
  ]);

  return (
    <Section title="DuckLocker" subtitle="Shared LP-position vault config (fee claiming lives on the Fees page).">
      <ReadPanel
        title="Current config"
        loading={loading}
        onRefresh={reload}
        rows={[
          { label: "Platform wallet", value: shortAddress(values.platformWallet) },
          { label: "Platform token", value: shortAddress(values.platformToken) },
          { label: "Positions held", value: values.tokenCount?.toString() ?? "…" },
        ]}
      />

      <ActionForm title="Add launcher" description="Authorizes a family contract to register LP positions here."
        account={account} onDone={reload}
        onSubmit={(args, acct) => lockerAddLauncher(acct, args)} submitLabel="Add"
        fields={[{ key: "launcher", label: "Launcher (family contract) address", placeholder: "0x…", parse: parseAddr }]} />

      <ActionForm title="Remove launcher" account={account} onDone={reload}
        onSubmit={(args, acct) => lockerRemoveLauncher(acct, args)} submitLabel="Remove"
        fields={[{ key: "launcher", label: "Launcher (family contract) address", placeholder: "0x…", parse: parseAddr }]} />

      <ActionForm title="Set platform wallet" account={account} onDone={reload}
        onSubmit={(args, acct) => lockerSetPlatformWallet(acct, args)} submitLabel="Set wallet"
        fields={[{ key: "wallet", label: "Wallet address", placeholder: "0x…", parse: parseAddr }]} />

      <ActionForm title="Set platform token" description="address(0) disables the fee-side buyback mechanism."
        account={account} onDone={reload}
        onSubmit={(args, acct) => lockerSetPlatformToken(acct, args)} submitLabel="Set token"
        fields={[{ key: "token", label: "Token address (or 0x0 to disable)", placeholder: "0x…", parse: parseAddr }]} />
    </Section>
  );
}
