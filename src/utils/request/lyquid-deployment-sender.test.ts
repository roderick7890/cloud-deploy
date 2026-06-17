import { describe, expect, it, vi } from "vitest";
import { parseLyquidDeploymentArtifact } from "@/utils/lyquid-deployment-artifact";
import { sendLyquidDeployment } from "./lyquid-deployment-sender";
import { createRequestSenderContext } from "./sdk-transport-client";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

describe("lyquid-deployment-sender", () => {
  it("sends a wallet-signed contract creation transaction and resolves the Lyquid ID", async () => {
    const artifact = parseLyquidDeploymentArtifact({
      name: "counter",
      deploymentBytecode: "0x60016002",
      imageHash: `0x${"c".repeat(64)}`,
      repoHint: "registry.local/counter:latest",
      abiStr: "uint256 initialValue"
    });
    const sendTransaction = vi.fn().mockResolvedValue("0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318");
    const switchChain = vi.fn().mockResolvedValue(undefined);
    const offChainFetch = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) : {};

      if (url === "http://127.0.0.1:10087/api") {
        if (body.method === "eth_chainId") {
          return Promise.resolve(jsonResponse({ jsonrpc: "2.0", id: "chain-id", result: "0x7a69" }));
        }

        if (body.method === "eth_getTransactionReceipt") {
          return Promise.resolve(
            jsonResponse({
              jsonrpc: "2.0",
              id: "receipt",
              result: {
                transactionHash: "0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318",
                status: "0x1",
                contractAddress: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788"
              }
            })
          );
        }
      }

      if (url.includes("GetLyquidByAddress")) {
        return Promise.resolve(jsonResponse({ lyquidId: { value: "Lyquid-counter" } }));
      }

      throw new Error(`Unexpected request ${url}`);
    });
    const context = createRequestSenderContext({
      rpcEndpoint: "http://127.0.0.1:10087/api",
      accountAddress: "0x1111111111111111111111111111111111111111",
      walletClient: { sendTransaction, switchChain },
      offChainFetch
    });

    await expect(
      sendLyquidDeployment({
        artifact,
        bartenderAddress: "0x0000000000000000000000000000000000000001",
        constructorValues: { initialValue: "7" },
        context,
        receiptPollIntervalMs: 1,
        receiptTimeoutMs: 50
      })
    ).resolves.toMatchObject({
      transactionHash: "0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318",
      contractAddress: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
      lyquidId: "Lyquid-counter",
      chainId: 31337,
      submittedTransaction: expect.objectContaining({
        to: null,
        bartender: "0x0000000000000000000000000000000000000001"
      })
    });

    expect(sendTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        account: "0x1111111111111111111111111111111111111111",
        to: null,
        data: expect.stringMatching(/^0x60016002/),
        chain: expect.objectContaining({ id: 31337 })
      })
    );
    expect(switchChain).toHaveBeenCalledWith({ id: 31337 });
  });

  it("resolves the previous contract and marks the deployment as an update", async () => {
    const artifact = parseLyquidDeploymentArtifact({
      name: "counter",
      deploymentBytecode: "0x60016002",
      imageHash: `0x${"d".repeat(64)}`,
      repoHint: "registry.local/counter:latest",
      abiStr: ""
    });
    const previousContract = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    const sendTransaction = vi.fn().mockResolvedValue("0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318");
    const offChainFetch = vi.fn().mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const body = init?.body ? JSON.parse(String(init.body)) : {};

      if (url === "http://127.0.0.1:10087/api") {
        if (body.method === "eth_chainId") {
          return Promise.resolve(jsonResponse({ jsonrpc: "2.0", id: "chain-id", result: "0x7a69" }));
        }

        if (body.method === "eth_getTransactionReceipt") {
          return Promise.resolve(
            jsonResponse({
              jsonrpc: "2.0",
              id: "receipt",
              result: {
                transactionHash: "0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318",
                status: "0x1",
                contractAddress: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788"
              }
            })
          );
        }
      }

      if (url.includes("GetLyquidInfo")) {
        return Promise.resolve(jsonResponse({ lyquidInfo: { contract: { value: previousContract } } }));
      }

      if (url.includes("GetLyquidByAddress")) {
        return Promise.resolve(jsonResponse({ lyquidId: { value: "Lyquid-counter" } }));
      }

      throw new Error(`Unexpected request ${url}`);
    });
    const context = createRequestSenderContext({
      rpcEndpoint: "http://127.0.0.1:10087/api",
      accountAddress: "0x1111111111111111111111111111111111111111",
      walletClient: { sendTransaction },
      offChainFetch
    });

    await expect(
      sendLyquidDeployment({
        artifact,
        bartenderAddress: "0x0000000000000000000000000000000000000001",
        updateLyquidId: "Lyquid-counter",
        context,
        receiptPollIntervalMs: 1,
        receiptTimeoutMs: 50
      })
    ).resolves.toMatchObject({
      mode: "update",
      updateLyquidId: "Lyquid-counter",
      supersededContract: previousContract,
      submittedTransaction: expect.objectContaining({
        superseded: previousContract
      })
    });
  });

  it("rejects non-Lyquid update targets before sending network requests", async () => {
    const artifact = parseLyquidDeploymentArtifact({
      name: "counter",
      deploymentBytecode: "0x60016002",
      imageHash: `0x${"e".repeat(64)}`,
      repoHint: "registry.local/counter:latest",
      abiStr: ""
    });
    const sendTransaction = vi.fn();
    const offChainFetch = vi.fn();
    const context = createRequestSenderContext({
      rpcEndpoint: "http://127.0.0.1:10087/api",
      accountAddress: "0x1111111111111111111111111111111111111111",
      walletClient: { sendTransaction },
      offChainFetch
    });

    await expect(
      sendLyquidDeployment({
        artifact,
        bartenderAddress: "0x0000000000000000000000000000000000000001",
        updateLyquidId: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        context
      })
    ).rejects.toThrow("Update target must be a Lyquid ID starting with Lyquid-.");

    expect(offChainFetch).not.toHaveBeenCalled();
    expect(sendTransaction).not.toHaveBeenCalled();
  });
});
