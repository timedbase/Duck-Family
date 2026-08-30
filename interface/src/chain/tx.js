import { publicClient, getWalletClient } from "./client.js";

// Shared by actions.js and dex.js: simulateContract first (a plain eth_call
// against real chain state — reverts surface here, before the wallet ever
// prompts for a signature), then writeContract with the exact simulated
// request. Gas is estimated with a buffer rather than trusting the wallet's
// own eth_estimateGas outright — unused gas is always refunded, so a
// generous buffer costs nothing when the tx succeeds with less. Ink is a
// standard OP-Stack chain with no HyperEVM-style small/big block split, so
// unlike the previous deployment this needs no special-casing at all.
export async function simulateAndSend({ address, abi, functionName, args, value, account }) {
  const { hash } = await simulateAndSendWithResult({ address, abi, functionName, args, value, account });
  return hash;
}

// Same as simulateAndSend, but also hands back simulateContract's decoded
// return value -- e.g. the created token's real address, or (for
// DuckRaise.launch) its real campaignId -- straight from the same eth_call
// that already proves the tx succeeds. No guessing/prediction needed.
export async function simulateAndSendWithResult({ address, abi, functionName, args, value, account }) {
  const { request, result } = await publicClient.simulateContract({ address, abi, functionName, args, value, account });

  let estimated;
  try {
    estimated = await publicClient.estimateContractGas({ address, abi, functionName, args, value, account });
  } catch {
    // Estimation failing on its own isn't fatal — simulateContract already proved the call succeeds.
  }

  const gas = estimated !== undefined ? (estimated * 130n) / 100n : undefined;
  const wallet = await getWalletClient();
  const hash = await wallet.writeContract(gas ? { ...request, gas } : request);
  return { hash, result };
}

export async function waitForTx(hash) {
  return publicClient.waitForTransactionReceipt({ hash });
}
