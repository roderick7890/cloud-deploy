import { encodeFunctionData } from "viem";
import { getRequestEndpoint } from "./endpoint-utils";
import { fetchLyquidContractAddress } from "./lyquid-info-client";
import type { MethodSenderInput } from "./request-types";

type JsonPostInput = {
  url: string;
  body: unknown;
  offChainFetch: typeof fetch;
};

function getJsonRpcErrorMessage(raw: unknown) {
  if (!raw || typeof raw !== "object" || !("error" in raw)) {
    return null;
  }

  const error = (raw as { error?: unknown }).error;

  if (typeof error === "string") {
    return error;
  }

  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;

    if (typeof message === "string" && message.length > 0) {
      return message;
    }
  }

  return "Off-chain request failed.";
}

function getNetworkErrorReason(error: unknown) {
  if (error instanceof Error && error.message.length > 0) {
    return error.message;
  }

  if (typeof error === "string" && error.length > 0) {
    return error;
  }

  return "Unknown network error";
}

async function postJson({ url, body, offChainFetch }: JsonPostInput) {
  try {
    const response = await offChainFetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify(body)
    });
    const raw = await response.json();

    return { response, raw };
  } catch (error) {
    throw Object.assign(
      new Error(
        `Network request failed for ${url}: ${getNetworkErrorReason(error)}. Check CORS, the target host and port, and whether the RPC node is running.`
      ),
      { cause: error }
    );
  }
}

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
  const body = {
    jsonrpc: "2.0",
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    method: "eth_call",
    params: [call, "latest"]
  };

  const { response, raw } = await postJson({
    url: getRequestEndpoint(context.rpcEndpoint),
    body,
    offChainFetch
  });
  const responseErrorMessage = getJsonRpcErrorMessage(raw);

  if (!response.ok || responseErrorMessage) {
    throw new Error(responseErrorMessage ?? "Off-chain request failed.");
  }

  return raw;
}
