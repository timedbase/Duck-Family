import { Section, ReadPanel, ActionForm, useContractReads, fmtEth, shortAddress, parseAddr, parseEth, parseUint } from "../components.jsx";
import {
  setQuoteAssetAllowed, raiseSetTokenImpl, raiseSetLocker, setWeth, raiseSetDexConfig,
  raiseSetPlatformWallet, raiseSetPlatformToken, setCampaignFee, setSupplySplit, setCampaignDuration,
} from "../chain/actions.js";

const HOURS = 3600n;

export default function RaisePage({ account }) {
  const { values, loading, reload } = useContractReads("raise", [
    { key: "campaignFee", fn: "campaignFee" },
    { key: "campaignDuration", fn: "campaignDuration" },
    { key: "contributorBps", fn: "contributorBps" },
    { key: "lpBps", fn: "lpBps" },
    { key: "platformWallet", fn: "platformWallet" },
    { key: "platformToken", fn: "platformToken" },
    { key: "tokenImpl", fn: "tokenImpl" },
    { key: "locker", fn: "locker" },
    { key: "weth", fn: "weth" },
  ]);

  return (
    <Section title="DuckRaise" subtitle="Crowdfund family config.">
      <ReadPanel
        title="Current config"
        loading={loading}
        onRefresh={reload}
        rows={[
          { label: "Campaign fee", value: fmtEth(values.campaignFee) },
          { label: "Campaign duration", value: values.campaignDuration != null ? `${values.campaignDuration.toString()}s (${(values.campaignDuration / HOURS).toString()}h)` : "…" },
          { label: "Contributor bps", value: values.contributorBps?.toString() ?? "…" },
          { label: "LP bps", value: values.lpBps?.toString() ?? "…" },
          { label: "Platform wallet", value: shortAddress(values.platformWallet) },
          { label: "Platform token", value: shortAddress(values.platformToken) },
          { label: "Token impl", value: shortAddress(values.tokenImpl) },
          { label: "Locker", value: shortAddress(values.locker) },
          { label: "WETH", value: shortAddress(values.weth) },
        ]}
      />

      <ActionForm title="Allow / disallow a quote asset" account={account} onDone={reload}
        onSubmit={(args, acct) => setQuoteAssetAllowed(acct, args)} submitLabel="Set"
        fields={[
          { key: "token", label: "Quote asset address", placeholder: "0x…", parse: parseAddr },
          { key: "allowed", label: "Allowed", type: "bool" },
        ]} />

      <ActionForm title="Set campaign fee" account={account} onDone={reload}
        onSubmit={(args, acct) => setCampaignFee(acct, args)} submitLabel="Set fee"
        fields={[{ key: "fee", label: "Fee (ETH)", placeholder: "0.0005", parse: parseEth }]} />

      <ActionForm title="Set supply split" description="contributorBps + lpBps must equal 10000."
        account={account} onDone={reload}
        onSubmit={(args, acct) => setSupplySplit(acct, args)} submitLabel="Set split"
        fields={[
          { key: "contributorBps", label: "Contributor bps", placeholder: "5000", parse: parseUint },
          { key: "lpBps", label: "LP bps", placeholder: "5000", parse: parseUint },
        ]} />

      <ActionForm title="Set campaign duration" account={account} onDone={reload}
        onSubmit={(args, acct) => setCampaignDuration(acct, args)} submitLabel="Set duration"
        fields={[{ key: "seconds", label: "Duration (seconds)", placeholder: "259200", parse: parseUint }]} />

      <ActionForm title="Set token implementation" account={account} onDone={reload}
        onSubmit={(args, acct) => raiseSetTokenImpl(acct, args)} submitLabel="Set impl"
        fields={[{ key: "impl", label: "Implementation address", placeholder: "0x…", parse: parseAddr }]} />

      <ActionForm title="Set locker" account={account} onDone={reload}
        onSubmit={(args, acct) => raiseSetLocker(acct, args)} submitLabel="Set locker"
        fields={[{ key: "locker", label: "Locker address", placeholder: "0x…", parse: parseAddr }]} />

      <ActionForm title="Set WETH" account={account} onDone={reload}
        onSubmit={(args, acct) => setWeth(acct, args)} submitLabel="Set WETH"
        fields={[{ key: "weth", label: "WETH address", placeholder: "0x…", parse: parseAddr }]} />

      <ActionForm title="Set DEX config" account={account} onDone={reload}
        onSubmit={(args, acct) => raiseSetDexConfig(acct, args)} submitLabel="Set config"
        fields={[
          { key: "positionManager", label: "Position manager", placeholder: "0x…", parse: parseAddr },
          { key: "singleton", label: "Singleton (PoolManager)", placeholder: "0x…", parse: parseAddr },
          { key: "permit2", label: "Permit2", placeholder: "0x…", parse: parseAddr },
          { key: "hook", label: "Hook", placeholder: "0x…", parse: parseAddr },
        ]} />

      <ActionForm title="Set platform wallet" account={account} onDone={reload}
        onSubmit={(args, acct) => raiseSetPlatformWallet(acct, args)} submitLabel="Set wallet"
        fields={[{ key: "wallet", label: "Wallet address", placeholder: "0x…", parse: parseAddr }]} />

      <ActionForm title="Set platform token" description="address(0) disables the fee-waiver/buyback mechanism."
        account={account} onDone={reload}
        onSubmit={(args, acct) => raiseSetPlatformToken(acct, args)} submitLabel="Set token"
        fields={[{ key: "token", label: "Token address (or 0x0 to disable)", placeholder: "0x…", parse: parseAddr }]} />
    </Section>
  );
}
