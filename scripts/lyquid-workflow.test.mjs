import { describe, expect, it } from "vitest";
import { buildDeployCommand, parseDeployArgs } from "./lyquid-workflow.mjs";

describe("lyquid workflow", () => {
  it("requires an endpoint before deploying", () => {
    expect(() => parseDeployArgs([])).toThrow("Missing required --endpoint");
  });

  it("builds a shaker deploy command with an OCI reference when provided", () => {
    const options = parseDeployArgs([
      "--endpoint",
      "ws://127.0.0.1:10087/ws",
      "--reference",
      "http://127.0.0.1:8000/lyquids/cloud-deploy:latest",
      "--debug"
    ]);

    expect(buildDeployCommand(options, "/repo/lyquid/Cargo.toml")).toEqual({
      command: "shaker",
      args: [
        "deploy",
        "-r",
        "http://127.0.0.1:8000/lyquids/cloud-deploy:latest",
        "--endpoint",
        "ws://127.0.0.1:10087/ws",
        "--output",
        "json",
        "--debug",
        "/repo/lyquid/Cargo.toml"
      ]
    });
  });

  it("omits the OCI reference argument when reference is empty", () => {
    const options = parseDeployArgs(["--endpoint", "wss://node.example/ws", "--reference", ""]);

    expect(buildDeployCommand(options, "/repo/lyquid/Cargo.toml")).toEqual({
      command: "shaker",
      args: ["deploy", "--endpoint", "wss://node.example/ws", "--output", "json", "/repo/lyquid/Cargo.toml"]
    });
  });
});
