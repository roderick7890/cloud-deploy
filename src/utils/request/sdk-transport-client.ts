import { createClient } from "lyquor-sdk";
import { createTransport, type Transport } from "lyquor-sdk/core";
import { getJsonRpcEndpoint } from "./endpoint-utils";
import type { RequestSenderContext } from "./request-types";

type CreateSdkTransportInput = {
  rpcEndpoint: string;
  fetchImpl: typeof fetch;
};

type CreateRequestSenderContextInput = {
  rpcEndpoint: string;
  offChainFetch: typeof fetch;
  lyquidId?: string;
  accountAddress?: RequestSenderContext["accountAddress"];
  walletClient?: RequestSenderContext["walletClient"];
  publicClient?: RequestSenderContext["publicClient"];
};

function getNodeServiceEndpoint(rpcEndpoint: string) {
  const url = new URL(rpcEndpoint);

  if (url.pathname === "/api") {
    url.pathname = "/";
  }

  url.search = "";
  url.hash = "";

  return url.toString().replace(/\/$/, "");
}

export function createSdkTransport({ rpcEndpoint, fetchImpl }: CreateSdkTransportInput): Transport {
  return createTransport({
    http: { endpoint: [getNodeServiceEndpoint(rpcEndpoint)] },
    fetch: fetchImpl
  });
}

export function createSdkRpcTransport({ rpcEndpoint, fetchImpl }: CreateSdkTransportInput): Transport {
  return createTransport({
    http: { endpoint: [getJsonRpcEndpoint(rpcEndpoint)] },
    fetch: fetchImpl
  });
}

export function createRequestSenderContext({
  rpcEndpoint,
  offChainFetch,
  lyquidId,
  accountAddress,
  walletClient,
  publicClient
}: CreateRequestSenderContextInput): RequestSenderContext {
  const serviceTransport = createSdkTransport({ rpcEndpoint, fetchImpl: offChainFetch });
  const rpcTransport = createSdkRpcTransport({ rpcEndpoint, fetchImpl: offChainFetch });

  return {
    rpcEndpoint,
    serviceTransport,
    rpcTransport,
    rpcClient: createClient({ transport: rpcTransport }),
    lyquidId,
    accountAddress,
    walletClient,
    publicClient,
    offChainFetch
  };
}
