import { waitForTransactionReceipt } from "lyquor-sdk";
import { createSdkRpcTransport, requestSdkRpc } from "./sdk-transport-client";

type FetchRpcTransactionInput = {
  rpcEndpoint: string;
  transactionHash: `0x${string}`;
  offChainFetch: typeof fetch;
};

type WaitForRpcTransactionReceiptInput = FetchRpcTransactionInput & {
  pollIntervalMs?: number;
  timeoutMs?: number;
};

export async function fetchRpcTransactionResponse({ rpcEndpoint, transactionHash, offChainFetch }: FetchRpcTransactionInput) {
  if (!rpcEndpoint) {
    throw new Error("RPC endpoint is required.");
  }

  const result = await requestSdkRpc({
    rpcEndpoint,
    fetchImpl: offChainFetch,
    method: "eth_getTransactionByHash",
    params: [transactionHash]
  });

  return { jsonrpc: "2.0", id: 1, result };
}

export async function fetchRpcTransaction(input: FetchRpcTransactionInput) {
  const raw = await fetchRpcTransactionResponse(input);

  if (!raw || typeof raw !== "object" || !("result" in raw)) {
    throw new Error("RPC transaction response is missing a result.");
  }

  return (raw as { result: unknown }).result;
}

export async function waitForRpcTransactionReceipt({
  rpcEndpoint,
  transactionHash,
  offChainFetch,
  pollIntervalMs = 2000,
  timeoutMs = 120000
}: WaitForRpcTransactionReceiptInput) {
  if (!rpcEndpoint) {
    throw new Error("RPC endpoint is required.");
  }

  return waitForTransactionReceipt({
    transport: createSdkRpcTransport({ rpcEndpoint, fetchImpl: offChainFetch }),
    hash: transactionHash,
    pollingIntervalMs: pollIntervalMs,
    timeoutMs
  });
}
