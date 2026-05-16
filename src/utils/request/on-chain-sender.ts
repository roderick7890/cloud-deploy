import { encodeFunctionData } from "viem";
import type { MethodSenderInput } from "./request-types";

export async function sendOnChainMethod({ method, args, context }: MethodSenderInput) {
  if (!context.rpcEndpoint) {
    throw new Error("RPC endpoint is required.");
  }

  const data = encodeFunctionData({
    abi: [method.abiItem],
    functionName: method.name,
    args
  });

  return {
    data,
    method: method.signature,
    transport: "on-chain",
    raw: {
      encodedData: data,
      rpcEndpoint: context.rpcEndpoint
    }
  };
}
