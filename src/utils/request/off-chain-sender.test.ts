import { describe, expect, it } from "vitest";
import { parseAbiSource } from "@/utils/abi/abi-utils";
import { sendOffChainMethod } from "./off-chain-sender";
import type { RequestSenderContext } from "./request-types";

const lyquidInfoUrl = "http://127.0.0.1:10087/lyquor.lyquid.v1.LyquidService/GetLyquidInfo";
const rpcUrl = "http://127.0.0.1:10087/api";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

describe("off-chain-sender", () => {
  it("resolves a Lyquid ID to its latest contract address before eth_call", async () => {
    const parsedAbi = parseAbiSource(
      JSON.stringify([
        {
          type: "function",
          name: "build",
          inputs: [
            { name: "project", type: "bytes" },
            { name: "constructorInput", type: "bytes" },
            { name: "projectName", type: "string" }
          ],
          outputs: [],
          "x-lyquid-transport": "off-chain"
        }
      ])
    );
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const context: RequestSenderContext = {
      rpcEndpoint: "http://127.0.0.1:10087/api",
      lyquidId: "Lyquid-Btgwc4RMJfNvcqtLxHkhXHq3ivsUH2TX5",
      offChainFetch: (input, init) => {
        calls.push([input, init]);
        const url = String(input);

        if (url.includes("GetLyquidInfo")) {
          return Promise.resolve(
            jsonResponse({
              lyquidInfo: {
                lyquidId: { value: "Lyquid-Btgwc4RMJfNvcqtLxHkhXHq3ivsUH2TX5" },
                contract: { value: "0x5FbDB2315678afecb367f032d93F642f64180aa3" }
              }
            })
          );
        }

        return Promise.resolve(jsonResponse({ jsonrpc: "2.0", id: 1, result: "0x" }));
      }
    };

    await sendOffChainMethod({
      method: parsedAbi.methods[0],
      args: ["0x1234", "0x", "constructor-demo-lyquid"],
      context
    });

    const lyquidInfoBody = JSON.parse(String(calls[0][1]?.body));
    const ethCallBody = JSON.parse(String(calls[1][1]?.body));

    expect(calls[0][0]).toBe(lyquidInfoUrl);
    expect(lyquidInfoBody).toEqual({
      lyquidId: { value: "Lyquid-Btgwc4RMJfNvcqtLxHkhXHq3ivsUH2TX5" }
    });
    expect(ethCallBody.params[0].to).toBe("0x5FbDB2315678afecb367f032d93F642f64180aa3");
  });

  it("rejects JSON-RPC error responses even when HTTP status is ok", async () => {
    const parsedAbi = parseAbiSource(
      JSON.stringify([
        {
          type: "function",
          name: "build",
          inputs: [
            { name: "project", type: "bytes" },
            { name: "constructorInput", type: "bytes" },
            { name: "projectName", type: "string" }
          ],
          outputs: [],
          "x-lyquid-transport": "off-chain"
        }
      ])
    );
    const method = parsedAbi.methods[0];
    const context: RequestSenderContext = {
      rpcEndpoint: "http://127.0.0.1:10087/api",
      lyquidId: "Lyquid-Btgwc4RMJfNvcqtLxHkhXHq3ivsUH2TX5",
      offChainFetch: (input) => {
        if (String(input).includes("GetLyquidInfo")) {
          return Promise.resolve(jsonResponse({ lyquidInfo: { contract: { value: "0x5FbDB2315678afecb367f032d93F642f64180aa3" } } }));
        }

        return Promise.resolve(jsonResponse({ jsonrpc: "2.0", id: 1, error: { code: -32700, message: "Parse error" } }));
      }
    };

    await expect(
      sendOffChainMethod({
        method,
        args: ["0x1234", "0x", "constructor-demo-lyquid"],
        context
      })
    ).rejects.toThrow("Parse error");
  });

  it("sends off-chain methods as eth_call JSON-RPC requests to the configured Lyquid", async () => {
    const parsedAbi = parseAbiSource(
      JSON.stringify([
        {
          type: "function",
          name: "build",
          inputs: [
            { name: "project", type: "bytes" },
            { name: "constructorInput", type: "bytes" },
            { name: "projectName", type: "string" }
          ],
          outputs: [],
          "x-lyquid-transport": "off-chain"
        }
      ])
    );
    const method = parsedAbi.methods[0];
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const context: RequestSenderContext = {
      rpcEndpoint: "http://127.0.0.1:10087/api",
      lyquidId: "Lyquid-Btgwc4RMJfNvcqtLxHkhXHq3ivsUH2TX5",
      accountAddress: "0x1111111111111111111111111111111111111111",
      offChainFetch: (input, init) => {
        calls.push([input, init]);
        if (String(input).includes("GetLyquidInfo")) {
          return Promise.resolve(jsonResponse({ lyquidInfo: { contract: { value: "0x5FbDB2315678afecb367f032d93F642f64180aa3" } } }));
        }

        return Promise.resolve(jsonResponse({ jsonrpc: "2.0", id: 1, result: "0x" }));
      }
    };

    await sendOffChainMethod({
      method,
      args: ["0x1234", "0x", "constructor-demo-lyquid"],
      context
    });

    const [url, init] = calls[1];
    const body = JSON.parse(String(init?.body));

    expect(url).toBe(rpcUrl);
    expect(body).toMatchObject({
      jsonrpc: "2.0",
      method: "eth_call",
      params: [
        {
          from: "0x1111111111111111111111111111111111111111",
          to: "0x5FbDB2315678afecb367f032d93F642f64180aa3"
        },
        "latest"
      ]
    });
    expect(body.params[0].data).toMatch(/^0x73e1b835/);
    expect(body.id).toBe(1);
  });

  it("routes any local RPC port through SDK direct endpoints", async () => {
    const parsedAbi = parseAbiSource(
      JSON.stringify([
        {
          type: "function",
          name: "build",
          inputs: [
            { name: "project", type: "bytes" },
            { name: "constructorInput", type: "bytes" },
            { name: "projectName", type: "string" }
          ],
          outputs: [],
          "x-lyquid-transport": "off-chain"
        }
      ])
    );
    const calls: Array<[RequestInfo | URL, RequestInit | undefined]> = [];
    const context: RequestSenderContext = {
      rpcEndpoint: "http://127.0.0.1:11087/api",
      lyquidId: "Lyquid-Btgwc4RMJfNvcqtLxHkhXHq3ivsUH2TX5",
      offChainFetch: (input, init) => {
        calls.push([input, init]);
        if (String(input).includes("GetLyquidInfo")) {
          return Promise.resolve(jsonResponse({ lyquidInfo: { contract: { value: "0x5FbDB2315678afecb367f032d93F642f64180aa3" } } }));
        }

        return Promise.resolve(jsonResponse({ jsonrpc: "2.0", id: 1, result: "0x" }));
      }
    };

    await sendOffChainMethod({
      method: parsedAbi.methods[0],
      args: ["0x1234", "0x", "constructor-demo-lyquid"],
      context
    });

    expect(calls.map(([url]) => String(url))).toEqual([
      "http://127.0.0.1:11087/lyquor.lyquid.v1.LyquidService/GetLyquidInfo",
      "http://127.0.0.1:11087/api"
    ]);
  });

  it("calls the configured fetcher without binding it to the request context", async () => {
    const parsedAbi = parseAbiSource(
      JSON.stringify([
        {
          type: "function",
          name: "build",
          inputs: [
            { name: "project", type: "bytes" },
            { name: "constructorInput", type: "bytes" },
            { name: "projectName", type: "string" }
          ],
          outputs: [],
          "x-lyquid-transport": "off-chain"
        }
      ])
    );
    const method = parsedAbi.methods[0];
    const context: RequestSenderContext = {
      rpcEndpoint: "http://127.0.0.1:10087/api",
      lyquidId: "Lyquid-Btgwc4RMJfNvcqtLxHkhXHq3ivsUH2TX5",
      offChainFetch: function (this: unknown, input) {
        if (this === context) {
          throw new Error("fetch was called with request context as this");
        }

        if (String(input).includes("GetLyquidInfo")) {
          return Promise.resolve(jsonResponse({ lyquidInfo: { contract: { value: "0x5FbDB2315678afecb367f032d93F642f64180aa3" } } }));
        }

        return Promise.resolve(jsonResponse({ jsonrpc: "2.0", id: 1, result: "0x" }));
      } as typeof fetch
    };

    await expect(
      sendOffChainMethod({
        method,
        args: ["0x1234", "0x", "constructor-demo-lyquid"],
        context
      })
    ).resolves.toEqual({ jsonrpc: "2.0", id: 1, result: "0x" });
  });

  it("includes the failed request URL and network reason when fetch rejects", async () => {
    const parsedAbi = parseAbiSource(
      JSON.stringify([
        {
          type: "function",
          name: "build",
          inputs: [
            { name: "project", type: "bytes" },
            { name: "constructorInput", type: "bytes" },
            { name: "projectName", type: "string" }
          ],
          outputs: [],
          "x-lyquid-transport": "off-chain"
        }
      ])
    );
    const context: RequestSenderContext = {
      rpcEndpoint: "http://127.0.0.1:10087/api",
      lyquidId: "Lyquid-Btgwc4RMJfNvcqtLxHkhXHq3ivsUH2TX5",
      offChainFetch: () => Promise.reject(new TypeError("Failed to fetch"))
    };

    await expect(
      sendOffChainMethod({
        method: parsedAbi.methods[0],
        args: ["0x1234", "0x", "constructor-demo-lyquid"],
        context
      })
    ).rejects.toThrow(
      "Network request failed for GetLyquidInfo: Failed to fetch. Check CORS, the target host and port, and whether the RPC node is running."
    );
  });
});
