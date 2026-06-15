import type { RequestSenderContext } from "./request-types";

type FetchRpcTransactionInput = Pick<RequestSenderContext, "rpcTransport"> & {
  transactionHash: `0x${string}`;
};

type WaitForRpcTransactionReceiptInput = Pick<RequestSenderContext, "rpcClient"> & {
  transactionHash: `0x${string}`;
  pollIntervalMs?: number;
  timeoutMs?: number;
};

export async function fetchRpcTransactionResponse({ rpcTransport, transactionHash }: FetchRpcTransactionInput) {
  const result = await rpcTransport.requestRpc({
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
  rpcClient,
  transactionHash,
  pollIntervalMs = 2000,
  timeoutMs = 120000
}: WaitForRpcTransactionReceiptInput) {
  return rpcClient.waitForTransactionReceipt({
    hash: transactionHash,
    pollingIntervalMs: pollIntervalMs,
    timeoutMs
  });
}
