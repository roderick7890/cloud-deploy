import { encodeFunctionData } from "viem";
import { fetchLyquidContractAddress } from "./lyquid-info-client";
import { requestSdkRpc } from "./sdk-transport-client";
import type { MethodSenderInput } from "./request-types";

export async function sendOffChainMethod({ method, args, context }: MethodSenderInput) {
  if (!context.rpcEndpoint) {
    throw new Error("RPC endpoint is required.");
  }

  if (!context.lyquidId) {
    throw new Error("Lyquid ID is required.");
  }

  const { offChainFetch } = context;
  const contractAddress = await fetchLyquidContractAddress({
    rpcEndpoint: context.rpcEndpoint,
    lyquidId: context.lyquidId,
    offChainFetch
  });
  if (!contractAddress) {
    throw new Error("Lyquid ID is not deployed or not visible to this node.");
  }
  const data = encodeFunctionData({
    abi: [method.abiItem],
    functionName: method.name,
    args
  });
  const call = {
    ...(context.accountAddress ? { from: context.accountAddress } : {}),
    to: contractAddress,
    data
  };
  const result = await requestSdkRpc({
    rpcEndpoint: context.rpcEndpoint,
    fetchImpl: offChainFetch,
    method: "eth_call",
    params: [call, "latest"]
  });

  return { jsonrpc: "2.0", id: 1, result };
}
