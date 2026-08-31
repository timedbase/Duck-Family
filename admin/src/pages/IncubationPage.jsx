import { Section, ReadPanel, ActionForm, useContractReads, fmtEth, shortAddress, parseAddr, parseEth, parseUint, parseTokens18 } from "../components.jsx";
import {
  setCreationFee, setQuoteTokenAllowed, setAllocationBounds, setSupplyBounds,
  incubationSetTokenImpl, incubationSetLocker, incubationSetDexConfig,
  incubationSetPlatformWallet, incubationSetPlatformToken, emergencyMigrate,
  incubationRescueETH, incubationRescueToken,
} from "../chain/actions.js";

export default function IncubationPage({ account }) {
  const { values, loading, reload } = useContractReads("incubation", [
    { key: "creationFee", fn: "creationFee" },
    { key: "platformWallet", fn: "platformWallet" },
    { key: "platformToken", fn: "platformToken" },
    { key: "minCurveBps", fn: "minCurveBps" },
    { key: "minLiquidityBps", fn: "minLiquidityBps" },
    { key: "minSupply", fn: "minSupply" },
    { key: "maxSupply", fn: "maxSupply" },
    { key: "tokenImpl", fn: "tokenImpl" },
    { key: "locker", fn: "locker" },
  ]);

  return (
    <Section title="DuckIncubation" subtitle="Bonding-curve family config.">
      <ReadPanel
        title="Current config"
        loading={loading}
        onRefresh={reload}
        rows={[
          { label: "Creation fee", value: fmtEth(values.creationFee) },
          { label: "Platform wallet", value: shortAddress(values.platformWallet) },
          { label: "Platform token", value: shortAddress(values.platformToken) },
          { label: "Min curve bps", value: values.minCurveBps?.toString() ?? "…" },
          { label: "Min liquidity bps", value: values.minLiquidityBps?.toString() ?? "…" },
          { label: "Min supply", value: values.minSupply?.toString() ?? "…" },
          { label: "Max supply", value: values.maxSupply?.toString() ?? "…" },
          { label: "Token impl", value: shortAddress(values.tokenImpl) },
          { label: "Locker", value: shortAddress(values.locker) },
        ]}
      />

      <ActionForm title="Set creation fee" account={account} onDone={reload}
        onSubmit={(args, acct) => setCreationFee(acct, args)} submitLabel="Set fee"
        fields={[{ key: "fee", label: "Fee (ETH)", placeholder: "0.0005", parse: parseEth }]} />

      <ActionForm title="Allow / disallow a quote token" account={account} onDone={reload}
        onSubmit={(args, acct) => setQuoteTokenAllowed(acct, args)} submitLabel="Set"
        fields={[
          { key: "token", label: "Quote token address", placeholder: "0x…", parse: parseAddr },
          { key: "allowed", label: "Allowed", type: "bool" },
        ]} />

      <ActionForm title="Set allocation bounds" description="minCurveBps + minLiquidityBps must not exceed 10000."
        account={account} onDone={reload}
        onSubmit={(args, acct) => setAllocationBounds(acct, args)} submitLabel="Set bounds"
        fields={[
          { key: "minCurveBps", label: "Min curve bps", placeholder: "8000", parse: parseUint },
          { key: "minLiquidityBps", label: "Min liquidity bps", placeholder: "2000", parse: parseUint },
        ]} />

      <ActionForm title="Set supply bounds" description="In whole tokens (converted to 18-decimal raw amounts)."
        account={account} onDone={reload}
        onSubmit={(args, acct) => setSupplyBounds(acct, args)} submitLabel="Set bounds"
        fields={[
          { key: "min", label: "Min supply (tokens)", placeholder: "1000000", parse: parseTokens18 },
          { key: "max", label: "Max supply (tokens)", placeholder: "1000000000", parse: parseTokens18 },
        ]} />

      <ActionForm title="Set token implementation" account={account} onDone={reload}
        onSubmit={(args, acct) => incubationSetTokenImpl(acct, args)} submitLabel="Set impl"
        fields={[{ key: "impl", label: "Implementation address", placeholder: "0x…", parse: parseAddr }]} />

      <ActionForm title="Set locker" account={account} onDone={reload}
        onSubmit={(args, acct) => incubationSetLocker(acct, args)} submitLabel="Set locker"
        fields={[{ key: "locker", label: "Locker address", placeholder: "0x…", parse: parseAddr }]} />

      <ActionForm title="Set DEX config" account={account} onDone={reload}
        onSubmit={(args, acct) => incubationSetDexConfig(acct, args)} submitLabel="Set config"
        fields={[
          { key: "positionManager", label: "Position manager", placeholder: "0x…", parse: parseAddr },
          { key: "singleton", label: "Singleton (PoolManager)", placeholder: "0x…", parse: parseAddr },
          { key: "permit2", label: "Permit2", placeholder: "0x…", parse: parseAddr },
          { key: "hook", label: "Hook", placeholder: "0x…", parse: parseAddr },
        ]} />

      <ActionForm title="Set platform wallet" account={account} onDone={reload}
        onSubmit={(args, acct) => incubationSetPlatformWallet(acct, args)} submitLabel="Set wallet"
        fields={[{ key: "wallet", label: "Wallet address", placeholder: "0x…", parse: parseAddr }]} />

      <ActionForm title="Set platform token" description="address(0) disables the fee-waiver/buyback mechanism."
        account={account} onDone={reload}
        onSubmit={(args, acct) => incubationSetPlatformToken(acct, args)} submitLabel="Set token"
        fields={[{ key: "token", label: "Token address (or 0x0 to disable)", placeholder: "0x…", parse: parseAddr }]} />

      <ActionForm title="Emergency migrate" description="Force-migrates a stuck curve token directly to a given address. Owner-only escape hatch."
        account={account} onDone={reload}
        onSubmit={(args, acct) => emergencyMigrate(acct, args)} submitLabel="Migrate"
        fields={[{ key: "token", label: "Token address", placeholder: "0x…", parse: parseAddr }]} />

      <ActionForm title="Rescue ETH" description="Sends this contract's entire native ETH balance to the given address."
        account={account} onDone={reload}
        onSubmit={(args, acct) => incubationRescueETH(acct, args)} submitLabel="Rescue"
        fields={[{ key: "to", label: "Send to", placeholder: "0x…", parse: parseAddr }]} />

      <ActionForm title="Rescue ERC20" description="Sends this contract's entire balance of the given token to the given address."
        account={account} onDone={reload}
        onSubmit={(args, acct) => incubationRescueToken(acct, args)} submitLabel="Rescue"
        fields={[
          { key: "token", label: "Token address", placeholder: "0x…", parse: parseAddr },
          { key: "to", label: "Send to", placeholder: "0x…", parse: parseAddr },
        ]} />
    </Section>
  );
}
