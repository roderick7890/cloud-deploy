import { describe, expect, it, vi } from "vitest";
import { fetchLyquidDeploymentArtifactFromOci, getOciBaseUrl, getOciRepoHint } from "./oci-deployment-artifact";

const manifest = {
  config: {
    digest: "sha256:cd73525d65601267e253375c3e2cbe4831139405e4a216df8198c227f3f45dd9"
  },
  layers: [
    {
      annotations: { assetType: "lyquid" },
      digest: "sha256:f1dede0102112717328254db8a4e4192254f925bf793f98d6860257aaa8661c5"
    },
    {
      annotations: { assetType: "evm-deployment-bytecode" },
      digest: "sha256:2982e83141065fe28ff2a96ab82203f88bb3f9e8894c98754c1da120cfe5e6fe"
    }
  ]
};

function jsonResponse(value: unknown, headers?: Record<string, string>) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: {
      "content-type": "application/json",
      ...headers
    }
  });
}

describe("oci deployment artifact", () => {
  it("derives the node OCI base URL from HTTP and websocket RPC endpoints", () => {
    expect(getOciBaseUrl("https://node.example/api")).toBe("https://node.example");
    expect(getOciBaseUrl("wss://node.example/ws")).toBe("https://node.example");
    expect(getOciBaseUrl("ws://127.0.0.1:10087/ws")).toBe("http://127.0.0.1:10087");
  });

  it("builds tag and digest repo hints from the node registry host", () => {
    expect(getOciRepoHint("https://node.example/api", "lyquids/local", "latest")).toBe("node.example/lyquids/local:latest");
    expect(getOciRepoHint("https://node.example/api", "lyquids/local", `sha256:${"a".repeat(64)}`)).toBe("node.example/lyquids/local");
  });

  it("fetches manifest, metadata, and deployment bytecode from node /v2", async () => {
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);

      if (url.endsWith("/v2/lyquids/local/manifests/latest")) {
        return jsonResponse(manifest, {
          "docker-content-digest": `sha256:${"a".repeat(64)}`,
          "content-type": "application/vnd.oci.image.manifest.v1+json"
        });
      }

      if (url.endsWith(`/v2/lyquids/local/blobs/${manifest.config.digest}`)) {
        return jsonResponse({ name: "erc20", abi_str: "()", os_version: "0.0" });
      }

      if (url.endsWith(`/v2/lyquids/local/blobs/${manifest.layers[1].digest}`)) {
        return new Response(new Uint8Array([0x60, 0x80, 0x60, 0x40]), { status: 200 });
      }

      throw new Error(`Unexpected fetch ${url}`);
    });

    const artifact = await fetchLyquidDeploymentArtifactFromOci({
      rpcEndpoint: "https://node.example/api",
      repository: "lyquids/local",
      reference: "latest",
      fetchImpl
    });

    expect(artifact).toMatchObject({
      name: "erc20",
      imageHash: `0x${"a".repeat(64)}`,
      repoHint: "node.example/lyquids/local:latest",
      abiStr: "",
      deploymentBytecode: "0x60806040",
      osVersion: "0.0",
      deps: []
    });
    expect(artifact.raw).toMatchObject({
      manifest,
      metadata: { name: "erc20", abi_str: "()", os_version: "0.0" },
      bytecodeDigest: manifest.layers[1].digest
    });
  });
});
