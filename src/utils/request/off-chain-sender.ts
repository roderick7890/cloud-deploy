import { encodeFunctionData } from "viem";
import type { MethodSenderInput } from "./request-types";

export async function sendOffChainMethod({ method, args, context }: MethodSenderInput) {
  if (!context.rpcEndpoint) {
    throw new Error("RPC endpoint is required.");
  }

  const body = {
    method: method.signature,
    data: encodeFunctionData({
      abi: [method.abiItem],
      functionName: method.name,
      args
    })
  };

  const response = await context.offChainFetch(context.rpcEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const raw = await response.json();

  if (!response.ok) {
    throw new Error(typeof raw?.error === "string" ? raw.error : "Off-chain request failed.");
  }

  return {
    method: method.signature,
    transport: "off-chain",
    raw
  };
}
