import { describe, expect, it } from "vitest";
import { parseAbiSource } from "@/utils/abi/abi-utils";
import { sendOffChainMethod } from "./off-chain-sender";
import type { RequestSenderContext } from "./request-types";

const lyquidInfoProxyUrl =
  "/__cloud-deploy-proxy?target=http%3A%2F%2F127.0.0.1%3A10087%2Flyquor.lyquid.v1.LyquidService%2FGetLyquidInfo";
const rpcProxyUrl = "/__cloud-deploy-proxy?target=http%3A%2F%2F127.0.0.1%3A10087%2Fapi";

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
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                lyquidInfo: {
                  lyquidId: { value: "Lyquid-Btgwc4RMJfNvcqtLxHkhXHq3ivsUH2TX5" },
                  contract: { value: "0x5FbDB2315678afecb367f032d93F642f64180aa3" }
                }
              })
          } as Response);
        }

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ jsonrpc: "2.0", id: "1", result: "0x" })
        } as Response);
      }
    };

    await sendOffChainMethod({
      method: parsedAbi.methods[0],
      args: ["0x1234", "0x", "constructor-demo-lyquid"],
      context
    });

    const lyquidInfoBody = JSON.parse(String(calls[0][1]?.body));
    const ethCallBody = JSON.parse(String(calls[1][1]?.body));

    expect(calls[0][0]).toBe(lyquidInfoProxyUrl);
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
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                lyquidInfo: {
                  contract: { value: "0x5FbDB2315678afecb367f032d93F642f64180aa3" }
                }
              })
          } as Response);
        }

        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              jsonrpc: "2.0",
              id: null,
              error: {
                code: -32700,
                message: "Parse error"
              }
            })
        } as Response);
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
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                lyquidInfo: {
                  contract: { value: "0x5FbDB2315678afecb367f032d93F642f64180aa3" }
                }
              })
          } as Response);
        }

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ jsonrpc: "2.0", id: "1", result: "0x" })
        } as Response);
      }
    };

    await sendOffChainMethod({
      method,
      args: ["0x1234", "0x", "constructor-demo-lyquid"],
      context
    });

    const [url, init] = calls[1];
    const body = JSON.parse(String(init?.body));

    expect(url).toBe(rpcProxyUrl);
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
    expect(typeof body.id).toBe("string");
  });

  it("routes any local RPC port through the same dev proxy endpoint", async () => {
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
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                lyquidInfo: {
                  contract: { value: "0x5FbDB2315678afecb367f032d93F642f64180aa3" }
                }
              })
          } as Response);
        }

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ jsonrpc: "2.0", id: "1", result: "0x" })
        } as Response);
      }
    };

    await sendOffChainMethod({
      method: parsedAbi.methods[0],
      args: ["0x1234", "0x", "constructor-demo-lyquid"],
      context
    });

    expect(calls.map(([url]) => String(url))).toEqual([
      "/__cloud-deploy-proxy?target=http%3A%2F%2F127.0.0.1%3A11087%2Flyquor.lyquid.v1.LyquidService%2FGetLyquidInfo",
      "/__cloud-deploy-proxy?target=http%3A%2F%2F127.0.0.1%3A11087%2Fapi"
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
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                lyquidInfo: {
                  contract: { value: "0x5FbDB2315678afecb367f032d93F642f64180aa3" }
                }
              })
          } as Response);
        }

        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ ok: true })
        } as Response);
      } as typeof fetch
    };

    await expect(
      sendOffChainMethod({
        method,
        args: ["0x1234", "0x", "constructor-demo-lyquid"],
        context
      })
    ).resolves.toEqual({
      ok: true
    });
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
      "Network request failed for /__cloud-deploy-proxy?target=http%3A%2F%2F127.0.0.1%3A10087%2Flyquor.lyquid.v1.LyquidService%2FGetLyquidInfo: Failed to fetch. Check CORS, the target host and port, and whether the RPC node is running."
    );
  });
});
