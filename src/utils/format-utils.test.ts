import { describe, expect, it } from "vitest";
import { formatStatus, shortAddress, shortHash } from "./format-utils";

describe("format-utils", () => {
  it("shortens hashes and addresses", () => {
    expect(shortHash("0x1234567890abcdef")).toBe("0x1234...cdef");
    expect(shortAddress("0x1234567890abcdef")).toBe("0x1234...cdef");
  });

  it("formats empty values", () => {
    expect(shortHash(undefined)).toBe("Unavailable");
    expect(formatStatus(undefined)).toBe("Unknown");
  });
});
