import { describe, expect, it, vi } from "vitest";
import { fetchRpcChain } from "./rpc-chain-client";

describe("rpc-chain-client", () => {
  it("fetches chainId from the configured RPC endpoint and builds a wallet chain", async () => {
    const offChainFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ jsonrpc: "2.0", id: "chain-id", result: "0x7a69" })
    } as Response);

    await expect(fetchRpcChain({ rpcEndpoint: "http://127.0.0.1:10087/api", offChainFetch })).resolves.toMatchObject({
      id: 31337,
      rpcUrls: {
        default: {
          http: ["http://127.0.0.1:10087/api"]
        }
      }
    });

    expect(offChainFetch).toHaveBeenCalledWith(
      "http://127.0.0.1:10087/api",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "eth_chainId",
          params: []
        })
      })
    );
  });

  it("normalizes a node root endpoint to /api for wallet deployment", async () => {
    const offChainFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ jsonrpc: "2.0", id: "chain-id", result: "0x7a69" })
    } as Response);

    await expect(fetchRpcChain({ rpcEndpoint: "http://127.0.0.1:10087", offChainFetch })).resolves.toMatchObject({
      rpcUrls: {
        default: {
          http: ["http://127.0.0.1:10087/api"]
        }
      }
    });

    expect(offChainFetch).toHaveBeenCalledWith(
      "http://127.0.0.1:10087/api",
      expect.objectContaining({ method: "POST" })
    );
  });
});
