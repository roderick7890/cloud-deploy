import { describe, expect, it } from "vitest";
import { getHostedNodeEndpoint } from "./hosted-node-utils";

describe("hosted-node-utils", () => {
  it("derives the devnet node endpoint from a hosted Lyquid hostname", () => {
    expect(
      getHostedNodeEndpoint(
        "ss7x5edzcxjszfykf3edlyl44etxn256htzqa.2folhfgf4kuyfdenaq3l4dnamv7yxrnqq3zbp64thfa5esqgxhv6wzqa.devnet-alpha.lyquor.dev"
      )
    ).toBe("https://2folhfgf4kuyfdenaq3l4dnamv7yxrnqq3zbp64thfa5esqgxhv6wzqa.devnet-alpha.lyquor.dev/api");
  });

  it("returns an empty endpoint for non-whitelisted hostnames", () => {
    expect(getHostedNodeEndpoint("ss7x5.example.com")).toBe("");
  });
});
