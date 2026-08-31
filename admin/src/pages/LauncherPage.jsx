import { Section, ReadPanel, ActionForm, useContractReads, fmtEth, shortAddress, parseAddr, parseEth, parseUint } from "../components.jsx";
import {
  launcherSetPlatformWallet, launcherSetPlatformToken, launcherSetTokenImpl, setLaunchFee,
  addDex, disableDex, addQuoteToken, disableQuoteToken, launcherRescueETH, launcherRescueERC20,
} from "../chain/actions.js";

export default function LauncherPage({ account }) {
  const { values, loading, reload } = useContractReads("launcher", [
    { key: "launchFee", fn: "launchFee" },
    { key: "platformWallet", fn: "platformWallet" },
    { key: "platformToken", fn: "platformToken" },
    { key: "tokenImpl", fn: "tokenImpl" },
  ]);

  return (
    <Section title="DuckLauncher" subtitle="Instant-launch family config.">
      <ReadPanel
        title="Current config"
        loading={loading}
        onRefresh={reload}
        rows={[
          { label: "Launch fee", value: fmtEth(values.launchFee) },
          { label: "Platform wallet", value: shortAddress(values.platformWallet) },
          { label: "Platform token", value: shortAddress(values.platformToken) },
          { label: "Token impl", value: shortAddress(values.tokenImpl) },
        ]}
      />

      <ActionForm title="Set launch fee" account={account} onDone={reload}
        onSubmit={(args, acct) => setLaunchFee(acct, args)} submitLabel="Set fee"
        fields={[{ key: "fee", label: "Fee (ETH)", placeholder: "0.0005", parse: parseEth }]} />

      <ActionForm title="Set platform wallet" account={account} onDone={reload}
        onSubmit={(args, acct) => launcherSetPlatformWallet(acct, args)} submitLabel="Set wallet"
        fields={[{ key: "wallet", label: "Wallet address", placeholder: "0x…", parse: parseAddr }]} />

      <ActionForm title="Set platform token" description="address(0) disables the fee-waiver/buyback mechanism."
        account={account} onDone={reload}
        onSubmit={(args, acct) => launcherSetPlatformToken(acct, args)} submitLabel="Set token"
        fields={[{ key: "token", label: "Token address (or 0x0 to disable)", placeholder: "0x…", parse: parseAddr }]} />

      <ActionForm title="Set token implementation" account={account} onDone={reload}
        onSubmit={(args, acct) => launcherSetTokenImpl(acct, args)} submitLabel="Set impl"
        fields={[{ key: "impl", label: "Implementation address", placeholder: "0x…", parse: parseAddr }]} />

      <ActionForm title="Add DEX" account={account} onDone={reload}
        onSubmit={(args, acct) => addDex(acct, args)} submitLabel="Add"
        fields={[
          { key: "positionManager", label: "Position manager", placeholder: "0x…", parse: parseAddr },
          { key: "singleton", label: "Singleton (PoolManager)", placeholder: "0x…", parse: parseAddr },
          { key: "permit2", label: "Permit2", placeholder: "0x…", parse: parseAddr },
          { key: "hook", label: "Hook", placeholder: "0x…", parse: parseAddr },
        ]} />

      <ActionForm title="Disable DEX" account={account} onDone={reload}
        onSubmit={(args, acct) => disableDex(acct, args)} submitLabel="Disable"
        fields={[{ key: "positionManager", label: "Position manager", placeholder: "0x…", parse: parseAddr }]} />

      <ActionForm title="Add quote token" account={account} onDone={reload}
        onSubmit={(args, acct) => addQuoteToken(acct, args)} submitLabel="Add"
        fields={[{ key: "token", label: "Quote token address", placeholder: "0x…", parse: parseAddr }]} />

      <ActionForm title="Disable quote token" account={account} onDone={reload}
        onSubmit={(args, acct) => disableQuoteToken(acct, args)} submitLabel="Disable"
        fields={[{ key: "token", label: "Quote token address", placeholder: "0x…", parse: parseAddr }]} />

      <ActionForm title="Rescue ETH" description="Sends the given amount of this contract's native ETH balance to the given address."
        account={account} onDone={reload}
        onSubmit={(args, acct) => launcherRescueETH(acct, args)} submitLabel="Rescue"
        fields={[
          { key: "to", label: "Send to", placeholder: "0x…", parse: parseAddr },
          { key: "amount", label: "Amount (ETH)", placeholder: "0.01", parse: parseEth },
        ]} />

      <ActionForm title="Rescue ERC20" description="Sends the given raw amount of a token to the given address."
        account={account} onDone={reload}
        onSubmit={(args, acct) => launcherRescueERC20(acct, args)} submitLabel="Rescue"
        fields={[
          { key: "token", label: "Token address", placeholder: "0x…", parse: parseAddr },
          { key: "to", label: "Send to", placeholder: "0x…", parse: parseAddr },
          { key: "amount", label: "Amount (raw units)", placeholder: "1000000000000000000", parse: parseUint },
        ]} />
    </Section>
  );
}
