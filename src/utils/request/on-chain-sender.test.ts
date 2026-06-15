import { describe, expect, it, vi } from "vitest";
import { parseAbiSource } from "@/utils/abi/abi-utils";
import { sendOnChainMethod } from "./on-chain-sender";
import { createRequestSenderContext } from "./sdk-transport-client";
import type { RequestSenderContext } from "./request-types";

function jsonResponse(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
}

describe("on-chain-sender", () => {
  it("resolves the deployer Lyquid contract and submits a wallet transaction", async () => {
    const parsedAbi = parseAbiSource(
      JSON.stringify([
        {
          type: "function",
          name: "deploy",
          stateMutability: "nonpayable",
          inputs: [
            { name: "code", type: "bytes" },
            { name: "constructorInput", type: "bytes" },
            { name: "sourceHash", type: "bytes32" },
            { name: "artifactHash", type: "bytes32" },
            { name: "targetAbi", type: "string" },
            { name: "repoHint", type: "string" }
          ],
          outputs: [{ name: "lyquidId", type: "string" }]
        }
      ])
    );
    const sendTransaction = vi.fn().mockResolvedValue("0xabc123");
    const switchChain = vi.fn().mockResolvedValue(undefined);
    const waitForTransactionReceipt = vi.fn().mockResolvedValue({ status: "success", transactionHash: "0xabc123" });
    const context: RequestSenderContext = createRequestSenderContext({
      rpcEndpoint: "http://127.0.0.1:10087/api",
      lyquidId: "Lyquid-Btgwc4RMJfNvcqtLxHkhXHq3ivsUH2TX5",
      accountAddress: "0x1111111111111111111111111111111111111111",
      walletClient: { sendTransaction, switchChain },
      publicClient: { waitForTransactionReceipt },
      offChainFetch: (input, init) => {
        if (String(input) === "http://127.0.0.1:10087/api") {
          const body = JSON.parse(String(init?.body));

          return Promise.resolve(
            jsonResponse(
              body.method === "eth_chainId"
                ? { jsonrpc: "2.0", id: 1, result: "0x7a69" }
                : {
                    jsonrpc: "2.0",
                    id: 1,
                    result: {
                      hash: "0xabc123",
                      from: "0x1111111111111111111111111111111111111111",
                      to: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
                      input: "0xfeed"
                    }
                  }
            )
          );
        }

        if (String(input).includes("GetLyquidInfo")) {
          return Promise.resolve(jsonResponse({ lyquidInfo: { contract: { value: "0x5FbDB2315678afecb367f032d93F642f64180aa3" } } }));
        }

        throw new Error(`Unexpected request ${String(input)}`);
      }
    });
    const sourceHash = "0x".padEnd(66, "1");
    const artifactHash = "0x".padEnd(66, "2");

    await expect(
      sendOnChainMethod({
        method: parsedAbi.methods[0],
        args: ["0xabcdef", "0x", sourceHash, artifactHash, "[]", "examples/demo/Cargo.toml"],
        context
      })
    ).resolves.toMatchObject({
      transactionHash: "0xabc123",
      status: "success",
      contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      chainId: 31337,
      transaction: {
        input: "0xfeed"
      },
      submittedTransaction: expect.objectContaining({
        calldata: expect.stringMatching(/^0x/)
      })
    });

    expect(sendTransaction).toHaveBeenCalledWith(
      expect.objectContaining({
        account: "0x1111111111111111111111111111111111111111",
        to: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        data: expect.stringMatching(/^0x/),
        chain: expect.objectContaining({ id: 31337 })
      })
    );
    expect(switchChain).toHaveBeenCalledWith({ id: 31337 });
    expect(waitForTransactionReceipt).toHaveBeenCalledWith({ hash: "0xabc123" });
  });

  it("adds the RPC chain before switching when the wallet does not know it yet", async () => {
    const parsedAbi = parseAbiSource(
      JSON.stringify([
        {
          type: "function",
          name: "deploy",
          stateMutability: "nonpayable",
          inputs: [{ name: "code", type: "bytes" }],
          outputs: [{ name: "lyquidId", type: "string" }]
        }
      ])
    );
    const sendTransaction = vi.fn().mockResolvedValue("0xabc123");
    const switchChain = vi.fn().mockRejectedValueOnce(new Error("Unknown chain")).mockResolvedValueOnce(undefined);
    const addChain = vi.fn().mockResolvedValue(undefined);
    const context: RequestSenderContext = createRequestSenderContext({
      rpcEndpoint: "http://127.0.0.1:10087/api",
      lyquidId: "Lyquid-Btgwc4RMJfNvcqtLxHkhXHq3ivsUH2TX5",
      accountAddress: "0x1111111111111111111111111111111111111111",
      walletClient: { sendTransaction, switchChain, addChain },
      offChainFetch: (input) => {
        if (String(input) === "http://127.0.0.1:10087/api") {
          return Promise.resolve(jsonResponse({ jsonrpc: "2.0", id: 1, result: "0x7a69" }));
        }

        if (String(input).includes("GetLyquidInfo")) {
          return Promise.resolve(jsonResponse({ lyquidInfo: { contract: { value: "0x5FbDB2315678afecb367f032d93F642f64180aa3" } } }));
        }

        throw new Error(`Unexpected request ${String(input)}`);
      }
    });

    await sendOnChainMethod({
      method: parsedAbi.methods[0],
      args: ["0xabcdef"],
      context
    });

    expect(addChain).toHaveBeenCalledWith({ chain: expect.objectContaining({ id: 31337 }) });
    expect(switchChain).toHaveBeenCalledTimes(2);
    expect(sendTransaction).toHaveBeenCalledWith(expect.objectContaining({ chain: expect.objectContaining({ id: 31337 }) }));
  });
});
