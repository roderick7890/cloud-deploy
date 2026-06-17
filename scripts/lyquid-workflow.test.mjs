import { describe, expect, it } from "vitest";
import { buildDeployCommand, resolveShakerCommand, parseDeployArgs } from "./lyquid-workflow.mjs";

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

  it("passes update Lyquid ID when provided", () => {
    const options = parseDeployArgs([
      "--endpoint",
      "wss://node.example/ws",
      "--update",
      "Lyquid-ss7x5edzcxjszfykf3edlyl44etxn256htzqa"
    ]);

    expect(buildDeployCommand(options, "/repo/lyquid/Cargo.toml", "shaker")).toEqual({
      command: "shaker",
      args: [
        "deploy",
        "--endpoint",
        "wss://node.example/ws",
        "--output",
        "json",
        "--update",
        "Lyquid-ss7x5edzcxjszfykf3edlyl44etxn256htzqa",
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

  it("treats a reference flag without a value as empty", () => {
    const options = parseDeployArgs(["--endpoint", "wss://node.example/ws", "--reference"]);

    expect(buildDeployCommand(options, "/repo/lyquid/Cargo.toml").args).toEqual([
      "deploy",
      "--endpoint",
      "wss://node.example/ws",
      "--output",
      "json",
      "/repo/lyquid/Cargo.toml"
    ]);
  });

  it("uses the shakenup shaker path when the binary exists there", () => {
    expect(
      resolveShakerCommand({
        env: {},
        which: () => "",
        exists: (path) => path === "/Users/test/.shakenup/bin/shaker",
        home: "/Users/test"
      })
    ).toBe("/Users/test/.shakenup/bin/shaker");
  });
});
