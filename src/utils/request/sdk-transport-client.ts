import { createTransport, requestRpc, type RpcRequestInput, type Transport } from "lyquor-sdk/core";
import { getJsonRpcEndpoint } from "./endpoint-utils";

type CreateSdkTransportInput = {
  rpcEndpoint: string;
  fetchImpl: typeof fetch;
};

type RequestSdkRpcInput = CreateSdkTransportInput & RpcRequestInput;

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

export async function requestSdkRpc({ rpcEndpoint, fetchImpl, method, params }: RequestSdkRpcInput) {
  return requestRpc(createSdkRpcTransport({ rpcEndpoint, fetchImpl }), { method, params });
}
