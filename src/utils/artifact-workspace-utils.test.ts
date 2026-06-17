import { describe, expect, it } from "vitest";
import {
  buildDefaultArtifactWorkspaces,
  buildShakerPushCommand,
  buildWorkspaceEndpointsFromNodeHost,
  buildWorkspaceEndpointsFromRpcEndpoint,
  formatArtifactReference,
  parseArtifactReference
} from "./artifact-workspace-utils";

describe("artifact-workspace-utils", () => {
  it("builds the hosted devnet workspace from the current hostname", () => {
    const workspaces = buildDefaultArtifactWorkspaces(
      "ss7x5edzcxjszfykf3edlyl44etxn256htzqa.2folhfgf4kuyfdenaq3l4dnamv7yxrnqq3zbp64thfa5esqgxhv6wzqa.devnet-alpha.lyquor.dev"
    );

    expect(workspaces[0]).toMatchObject({
      nodeHost: "2folhfgf4kuyfdenaq3l4dnamv7yxrnqq3zbp64thfa5esqgxhv6wzqa.devnet-alpha.lyquor.dev",
      rpcEndpoint: "https://2folhfgf4kuyfdenaq3l4dnamv7yxrnqq3zbp64thfa5esqgxhv6wzqa.devnet-alpha.lyquor.dev/api",
      wsEndpoint: "wss://2folhfgf4kuyfdenaq3l4dnamv7yxrnqq3zbp64thfa5esqgxhv6wzqa.devnet-alpha.lyquor.dev/ws"
    });
    expect(workspaces[0].artifacts).toEqual([
      { id: "cloud-deploy-latest", repository: "lyquids/cloud-deploy", reference: "latest" },
      { id: "local-latest", repository: "lyquids/local", reference: "latest" }
    ]);
  });

  it("formats artifact references and push commands from real repository values", () => {
    const workspace = buildDefaultArtifactWorkspaces("demo.2folhfgf4kuyfdenaq3l4dnamv7yxrnqq3zbp64thfa5esqgxhv6wzqa.devnet-alpha.lyquor.dev")[0];
    const artifact = workspace.artifacts[0];

    expect(formatArtifactReference(artifact)).toBe("lyquids/cloud-deploy:latest");
    expect(buildShakerPushCommand(workspace, artifact)).toBe(
      [
        "shaker push \\",
        "  --endpoint https://2folhfgf4kuyfdenaq3l4dnamv7yxrnqq3zbp64thfa5esqgxhv6wzqa.devnet-alpha.lyquor.dev/api \\",
        "  --registry https://2folhfgf4kuyfdenaq3l4dnamv7yxrnqq3zbp64thfa5esqgxhv6wzqa.devnet-alpha.lyquor.dev/lyquids/cloud-deploy:latest \\",
        "  Cargo.toml"
      ].join("\n")
    );
  });

  it("formats digest references for display without using tag syntax", () => {
    expect(formatArtifactReference({ repository: "lyquids/cloud-deploy", reference: "sha256:abc" })).toBe(
      "lyquids/cloud-deploy@sha256:abc"
    );
  });

  it("keeps node host, rpc endpoint, and websocket endpoint linked", () => {
    expect(buildWorkspaceEndpointsFromNodeHost("localhost:10087")).toEqual({
      nodeHost: "localhost:10087",
      rpcEndpoint: "http://localhost:10087/api",
      wsEndpoint: "ws://localhost:10087/ws"
    });
    expect(buildWorkspaceEndpointsFromRpcEndpoint("https://example.devnet-alpha.lyquor.dev/api")).toEqual({
      nodeHost: "example.devnet-alpha.lyquor.dev",
      rpcEndpoint: "https://example.devnet-alpha.lyquor.dev/api",
      wsEndpoint: "wss://example.devnet-alpha.lyquor.dev/ws"
    });
  });

  it("parses editable artifact references back to repository and reference fields", () => {
    const fallback = { repository: "lyquids/cloud-deploy", reference: "latest" };

    expect(parseArtifactReference("lyquids/cloud-deploy:next", fallback)).toEqual({
      repository: "lyquids/cloud-deploy",
      reference: "next"
    });
    expect(parseArtifactReference("lyquids/cloud-deploy@sha256:abc", fallback)).toEqual({
      repository: "lyquids/cloud-deploy",
      reference: "sha256:abc"
    });
  });
});
