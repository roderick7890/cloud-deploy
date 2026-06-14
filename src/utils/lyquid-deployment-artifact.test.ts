import { decodeAbiParameters } from "viem";
import { describe, expect, it } from "vitest";
import { buildLyquidDeploymentTransaction, parseLyquidDeploymentArtifact } from "./lyquid-deployment-artifact";

describe("lyquid deployment artifact", () => {
  it("parses a build artifact descriptor into browser-deployable fields", () => {
    const artifact = parseLyquidDeploymentArtifact({
      name: "counter",
      deploymentBytecode: "0x60016002",
      imageDigest: `sha256:${"a".repeat(64)}`,
      repoHint: "registry.local/counter:latest",
      abiStr: "uint256 initialValue, string label",
      contractAbi: [{ type: "function", name: "count", inputs: [], outputs: [{ type: "uint256" }] }]
    });

    expect(artifact).toMatchObject({
      name: "counter",
      deploymentBytecode: "0x60016002",
      imageHash: `0x${"a".repeat(64)}`,
      repoHint: "registry.local/counter:latest",
      constructorParameters: [
        { name: "initialValue", type: "uint256" },
        { name: "label", type: "string" }
      ],
      contractAbi: [{ type: "function", name: "count", inputs: [], outputs: [{ type: "uint256" }] }]
    });
  });

  it("builds a contract creation transaction with the fixed Lyquid prefix before user constructor args", () => {
    const artifact = parseLyquidDeploymentArtifact({
      name: "counter",
      deploymentBytecode: "0x60016002",
      imageHash: `0x${"b".repeat(64)}`,
      repoHint: "registry.local/counter:latest",
      abiStr: "uint256 initialValue, bool enabled",
      deps: ["0x0000000000000000000000000000000000000003"]
    });
    const transaction = buildLyquidDeploymentTransaction({
      artifact,
      bartenderAddress: "0x0000000000000000000000000000000000000001",
      constructorValues: {
        initialValue: "42",
        enabled: "true"
      }
    });

    expect(transaction.to).toBeNull();
    expect(transaction.data.startsWith("0x60016002")).toBe(true);

    const encodedArgs = `0x${transaction.data.slice(10)}` as `0x${string}`;
    expect(
      decodeAbiParameters(transaction.parameters, encodedArgs)
    ).toEqual([
      "0x0000000000000000000000000000000000000001",
      "0x0000000000000000000000000000000000000000",
      `0x${"b".repeat(64)}`,
      "registry.local/counter:latest",
      ["0x0000000000000000000000000000000000000003"],
      42n,
      true
    ]);
  });
});
