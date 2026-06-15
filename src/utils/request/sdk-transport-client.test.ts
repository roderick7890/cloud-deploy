import { describe, expect, it, vi } from "vitest";
import { getJsonRpcEndpoint } from "./endpoint-utils";
import { createSdkTransport, requestSdkRpc } from "./sdk-transport-client";

describe("sdk transport client", () => {
  it("keeps service requests on the node endpoint without the dev proxy", async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const transport = createSdkTransport({
      rpcEndpoint: "https://2folhfgf4kuyfdenaq3l4dnamv7yxrnqq3zbp64thfa5esqgxhv6wzqa.devnet-alpha.lyquor.dev/api",
      fetchImpl: ((input, init) => {
        calls.push([input, init]);
        return Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 }));
      }) as typeof fetch
    });

    await transport.requestService({
      service: "lyquor.lyquid.v1.LyquidService",
      method: "GetLyquidInfo",
      body: {}
    });

    expect(calls[0][0]).toBe(
      "https://2folhfgf4kuyfdenaq3l4dnamv7yxrnqq3zbp64thfa5esqgxhv6wzqa.devnet-alpha.lyquor.dev/lyquor.lyquid.v1.LyquidService/GetLyquidInfo"
    );
    expect(String(calls[0][0])).not.toContain("__cloud-deploy-proxy");
  });

  it("keeps JSON-RPC requests on /api without the dev proxy", async () => {
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const result = await requestSdkRpc({
      rpcEndpoint: "https://2folhfgf4kuyfdenaq3l4dnamv7yxrnqq3zbp64thfa5esqgxhv6wzqa.devnet-alpha.lyquor.dev/",
      fetchImpl: ((input, init) => {
        calls.push([input, init]);
        return Promise.resolve(new Response(JSON.stringify({ jsonrpc: "2.0", id: 1, result: "0x7a69" }), { status: 200 }));
      }) as typeof fetch,
      method: "eth_chainId",
      params: []
    });

    expect(result).toBe("0x7a69");
    expect(calls[0][0]).toBe(getJsonRpcEndpoint("https://2folhfgf4kuyfdenaq3l4dnamv7yxrnqq3zbp64thfa5esqgxhv6wzqa.devnet-alpha.lyquor.dev/"));
    expect(String(calls[0][0])).not.toContain("__cloud-deploy-proxy");
  });
});
