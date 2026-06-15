import { describe, expect, it } from "vitest";
import { getJsonRpcEndpoint } from "./endpoint-utils";

describe("endpoint-utils", () => {
  it("uses /api when the workspace endpoint is the node root", () => {
    expect(getJsonRpcEndpoint("https://node.example")).toBe("https://node.example/api");
    expect(getJsonRpcEndpoint("https://node.example/")).toBe("https://node.example/api");
  });

  it("preserves an explicit /api RPC endpoint", () => {
    expect(getJsonRpcEndpoint("https://node.example/api")).toBe("https://node.example/api");
  });
});
