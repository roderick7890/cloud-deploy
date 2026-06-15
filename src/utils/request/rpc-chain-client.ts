import type { Chain } from "viem";
import { getJsonRpcEndpoint } from "./endpoint-utils";
import { requestSdkRpc } from "./sdk-transport-client";

type FetchRpcChainInput = {
  rpcEndpoint: string;
  offChainFetch: typeof fetch;
};

function parseChainId(result: unknown) {
  if (typeof result !== "string" || !/^0x[0-9a-f]+$/i.test(result)) {
    throw new Error("RPC chain ID response is invalid.");
  }

  return Number.parseInt(result, 16);
}

function createRpcChain(rpcEndpoint: string, chainId: number): Chain {
  return {
    id: chainId,
    name: `Lyquid RPC ${chainId}`,
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18
    },
    rpcUrls: {
      default: { http: [rpcEndpoint] }
    }
  };
}

export async function fetchRpcChain({ rpcEndpoint, offChainFetch }: FetchRpcChainInput) {
  if (!rpcEndpoint) {
    throw new Error("RPC endpoint is required.");
  }

  const jsonRpcEndpoint = getJsonRpcEndpoint(rpcEndpoint);
  const result = await requestSdkRpc({
    rpcEndpoint,
    fetchImpl: offChainFetch,
    method: "eth_chainId",
    params: []
  });

  return createRpcChain(jsonRpcEndpoint, parseChainId(result));
}
