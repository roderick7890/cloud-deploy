import { describe, expect, it, vi } from "vitest";
import { fetchLyquidContractAddress, fetchLyquidIdByAddress, fetchNetworkBartenderInfo } from "./lyquid-info-client";

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
    ...init
  });
}

describe("fetchLyquidContractAddress", () => {
  it("returns the deployed contract address from GetLyquidInfo", async () => {
    const offChainFetch = vi.fn().mockResolvedValue(
      jsonResponse({
        lyquidInfo: {
          contract: {
            value: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788"
          }
        }
      })
    );

    await expect(
      fetchLyquidContractAddress({
        rpcEndpoint: "http://127.0.0.1:10087/api",
        lyquidId: "Lyquid-Btgwc4RMJfNvcqtLxHkhXHq3ivsUH2TX5",
        offChainFetch
      })
    ).resolves.toBe("0x610178dA211FEF7D417bC0e6FeD39F05609AD788");

    expect(offChainFetch).toHaveBeenCalledWith(
      "http://127.0.0.1:10087/lyquor.lyquid.v1.LyquidService/GetLyquidInfo",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          lyquidId: {
            value: "Lyquid-Btgwc4RMJfNvcqtLxHkhXHq3ivsUH2TX5"
          }
        })
      })
    );
  });

  it("returns null when the Lyquid has no deployed contract", async () => {
    const offChainFetch = vi.fn().mockResolvedValue(jsonResponse({ lyquidInfo: {} }));

    await expect(
      fetchLyquidContractAddress({
        rpcEndpoint: "http://127.0.0.1:10087/api",
        lyquidId: "Lyquid-empty",
        offChainFetch
      })
    ).resolves.toBeNull();
  });

  it("includes the request URL and reason when the status check cannot reach the node", async () => {
    const offChainFetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(
      fetchLyquidContractAddress({
        rpcEndpoint: "http://127.0.0.1:10087/api",
        lyquidId: "Lyquid-Btgwc4RMJfNvcqtLxHkhXHq3ivsUH2TX5",
        offChainFetch
      })
    ).rejects.toThrow("Network request failed for GetLyquidInfo: Failed to fetch.");
  });
});

describe("fetchNetworkBartenderInfo", () => {
  it("returns the network bartender contract from empty GetLyquidInfo", async () => {
    const offChainFetch = vi.fn().mockResolvedValue(
      jsonResponse({
        lyquidInfo: {
          lyquidId: {
            value: "Lyquid-bartender"
          },
          contract: {
            value: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
          }
        }
      })
    );

    await expect(
      fetchNetworkBartenderInfo({
        rpcEndpoint: "http://127.0.0.1:10087/api",
        offChainFetch
      })
    ).resolves.toEqual({
      lyquidId: "Lyquid-bartender",
      contractAddress: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
    });

    expect(offChainFetch).toHaveBeenCalledWith(
      "http://127.0.0.1:10087/lyquor.lyquid.v1.LyquidService/GetLyquidInfo",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({})
      })
    );
  });
});

describe("fetchLyquidIdByAddress", () => {
  it("returns the Lyquid ID from GetLyquidByAddress", async () => {
    const offChainFetch = vi.fn().mockResolvedValue(
      jsonResponse({
        lyquidId: {
          value: "Lyquid-new"
        }
      })
    );

    await expect(
      fetchLyquidIdByAddress({
        rpcEndpoint: "http://127.0.0.1:10087/api",
        contractAddress: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
        offChainFetch
      })
    ).resolves.toBe("Lyquid-new");

    expect(offChainFetch).toHaveBeenCalledWith(
      "http://127.0.0.1:10087/lyquor.lyquid.v1.LyquidService/GetLyquidByAddress",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          address: {
            value: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788"
          }
        })
      })
    );
  });
});
