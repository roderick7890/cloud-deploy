import { describe, expect, it } from "vitest";
import { hashConstructorInput, hashPayload, hashSource } from "./hash-utils";

describe("hash-utils", () => {
  it("hashes source bytes deterministically", async () => {
    await expect(hashSource(new TextEncoder().encode("source"))).resolves.toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("hashes constructor values by stable JSON", async () => {
    const first = await hashConstructorInput({ owner: "0x1", limit: "5" });
    const second = await hashConstructorInput({ limit: "5", owner: "0x1" });
    expect(first).toBe(second);
  });

  it("hashes payloads by stable JSON", async () => {
    await expect(hashPayload({ artifactHash: "0xabc" })).resolves.toMatch(/^0x[0-9a-f]{64}$/);
  });
});
