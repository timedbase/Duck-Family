import { publicClient } from "./client.js";
import { simulateAndSend } from "./tx.js";
import {
  DUCK_INCUBATION_ABI, DUCK_LAUNCHER_ABI, DUCK_RAISE_ABI, DUCK_LOCKER_ABI, DUCK_HOOK_ABI, DUCK_META_OVERRIDE_ABI,
} from "./abis.js";
import {
  DUCK_INCUBATION, DUCK_LAUNCHER, DUCK_RAISE, DUCK_LOCKER, DUCK_HOOK, DUCK_META_OVERRIDE,
} from "./addresses.js";

// Every write below is `simulateAndSend` -- the exact same simulate-then-send
// pattern (and revert-decoding) ../../../interface's chain/actions.js uses
// for trades. `account` is always the connected admin wallet; nothing here
// ever touches a private key directly.

const CONTRACTS = {
  incubation: { address: DUCK_INCUBATION, abi: DUCK_INCUBATION_ABI, label: "DuckIncubation" },
  launcher: { address: DUCK_LAUNCHER, abi: DUCK_LAUNCHER_ABI, label: "DuckLauncher" },
  raise: { address: DUCK_RAISE, abi: DUCK_RAISE_ABI, label: "DuckRaise" },
  locker: { address: DUCK_LOCKER, abi: DUCK_LOCKER_ABI, label: "DuckLocker" },
  hook: { address: DUCK_HOOK, abi: DUCK_HOOK_ABI, label: "DuckHookV4" },
  metaOverride: { address: DUCK_META_OVERRIDE, abi: DUCK_META_OVERRIDE_ABI, label: "DuckMetaOverride" },
};
export const CONTRACT_KEYS = Object.keys(CONTRACTS);

// Generic read used by the Overview panel's owner()-per-contract check, and
// by each config panel to show current values before they're changed.
export async function readContract(contractKey, functionName, args = []) {
  const c = CONTRACTS[contractKey];
  return publicClient.readContract({ address: c.address, abi: c.abi, functionName, args });
}

export function contractInfo(contractKey) {
  return CONTRACTS[contractKey];
}

function write(contractKey, functionName) {
  const c = CONTRACTS[contractKey];
  return (account, args = [], value) =>
    simulateAndSend({ address: c.address, abi: c.abi, functionName, args, value, account });
}

// ---------- DuckMetaOverride ----------

export const registerToken = write("metaOverride", "registerToken");
export const updateMetaURI = write("metaOverride", "updateMetaURI");
export const unregisterToken = write("metaOverride", "unregisterToken");

// ---------- DuckHookV4 (CTO + platform config) ----------

export const approveCTO = write("hook", "approveCTO");
export const rejectCTO = write("hook", "rejectCTO");

// A pool's hook is fixed forever at creation -- Token.hook (indexed by the
// subgraph) is the real source of truth per-token, which can differ from
// the single DUCK_HOOK constant above if a second hook is ever deployed
// (see contracts/deploy/script/DeployNewHook.s.sol). CTO approve/reject
// must always target the application's own real hook, not just the
// currently-known default.
export function approveCTOAt(hookAddress, account, poolId) {
  return simulateAndSend({ address: hookAddress, abi: DUCK_HOOK_ABI, functionName: "approveCTO", args: [poolId], account });
}
export function rejectCTOAt(hookAddress, account, poolId) {
  return simulateAndSend({ address: hookAddress, abi: DUCK_HOOK_ABI, functionName: "rejectCTO", args: [poolId], account });
}
export const hookAddLauncher = write("hook", "addLauncher");
export const hookRemoveLauncher = write("hook", "removeLauncher");
export const setCTOFee = write("hook", "setCTOFee");
export const hookSetPlatformWallet = write("hook", "setPlatformWallet");
export const hookTransferOwnership = write("hook", "transferOwnership");

// ---------- DuckLocker (fees + config) ----------

export const claimAllFees = write("locker", "claimAllFees");
export const claimFeesRange = write("locker", "claimFeesRange");
export const claimFees = write("locker", "claimFees");
export const lockerAddLauncher = write("locker", "addLauncher");
export const lockerRemoveLauncher = write("locker", "removeLauncher");
export const lockerSetPlatformWallet = write("locker", "setPlatformWallet");
export const lockerSetPlatformToken = write("locker", "setPlatformToken");

// ---------- DuckIncubation (config) ----------

export const setCreationFee = write("incubation", "setCreationFee");
export const setQuoteTokenAllowed = write("incubation", "setQuoteTokenAllowed");
export const setAllocationBounds = write("incubation", "setAllocationBounds");
export const setSupplyBounds = write("incubation", "setSupplyBounds");
export const incubationSetTokenImpl = write("incubation", "setTokenImpl");
export const incubationSetLocker = write("incubation", "setLocker");
export const incubationSetDexConfig = write("incubation", "setDexConfig");
export const incubationSetPlatformWallet = write("incubation", "setPlatformWallet");
export const incubationSetPlatformToken = write("incubation", "setPlatformToken");
export const emergencyMigrate = write("incubation", "emergencyMigrate");
export const incubationRescueETH = write("incubation", "rescueETH");
export const incubationRescueToken = write("incubation", "rescueToken");

// ---------- DuckLauncher (config) ----------

export const launcherSetPlatformWallet = write("launcher", "setPlatformWallet");
export const launcherSetPlatformToken = write("launcher", "setPlatformToken");
export const launcherSetTokenImpl = write("launcher", "setTokenImpl");
export const setLaunchFee = write("launcher", "setLaunchFee");
export const addDex = write("launcher", "addDex");
export const disableDex = write("launcher", "disableDex");
export const addQuoteToken = write("launcher", "addQuoteToken");
export const disableQuoteToken = write("launcher", "disableQuoteToken");
export const launcherRescueETH = write("launcher", "rescueETH");
export const launcherRescueERC20 = write("launcher", "rescueERC20");

// ---------- DuckRaise (config) ----------

export const setQuoteAssetAllowed = write("raise", "setQuoteAssetAllowed");
export const raiseSetTokenImpl = write("raise", "setTokenImpl");
export const raiseSetLocker = write("raise", "setLocker");
export const setWeth = write("raise", "setWeth");
export const raiseSetDexConfig = write("raise", "setDexConfig");
export const raiseSetPlatformWallet = write("raise", "setPlatformWallet");
export const raiseSetPlatformToken = write("raise", "setPlatformToken");
export const setCampaignFee = write("raise", "setCampaignFee");
export const setSupplySplit = write("raise", "setSupplySplit");
export const setCampaignDuration = write("raise", "setCampaignDuration");
