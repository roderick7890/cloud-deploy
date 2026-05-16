import { describe, expect, it } from "vitest";
import { lyquidIdToAddress } from "./lyquid-id-utils";

describe("lyquid-id-utils", () => {
  it("converts a checksummed LyquidID to its EVM address", () => {
    expect(lyquidIdToAddress("Lyquid-Btgwc4RMJfNvcqtLxHkhXHq3ivsUH2TX5")).toBe(
      "0x7777d036e5e3438f8247fe563208f9e3c7ebf0cf"
    );
  });

  it("rejects LyquidIDs with invalid checksum bytes", () => {
    expect(() => lyquidIdToAddress("Lyquid-Btgwc4RMJfNvcqtLxHkhXHq3ivsUH2TX6")).toThrow("Invalid Lyquid ID checksum.");
  });
});
