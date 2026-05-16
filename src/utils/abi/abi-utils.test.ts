import { describe, expect, it } from "vitest";
import { lyquidTestAbi } from "@/test/test-abi";
import {
  deriveAbiState,
  getConstructorFields,
  getMethodOptions,
  methodExists,
  parseAbiSource,
  resolveMethodTransport
} from "./abi-utils";

describe("abi-utils", () => {
  it("parses callable methods from ABI JSON", () => {
    const parsed = parseAbiSource(lyquidTestAbi);
    expect(parsed.methods.map((method) => method.name)).toEqual([
      "compileProject",
      "publishProject",
      "prepareProject"
    ]);
  });

  it("builds stable method option values from signatures", () => {
    const options = getMethodOptions(parseAbiSource(lyquidTestAbi));
    expect(options[0]).toMatchObject({
      value: "compileProject(bytes)",
      label: "compileProject(bytes)",
      transport: "on-chain"
    });
  });

  it("reads constructor fields", () => {
    expect(getConstructorFields(parseAbiSource(lyquidTestAbi))).toEqual([
      { name: "owner", type: "address", internalType: "address" },
      { name: "limit", type: "uint256", internalType: "uint256" }
    ]);
  });

  it("detects selected method existence by signature", () => {
    const parsed = parseAbiSource(lyquidTestAbi);
    expect(methodExists(parsed, "publishProject(bytes)")).toBe(true);
    expect(methodExists(parsed, "missingMethod(bytes)")).toBe(false);
  });

  it("uses ABI metadata to select off-chain transport", () => {
    const parsed = parseAbiSource(lyquidTestAbi);
    const method = parsed.methods.find((item) => item.name === "prepareProject");
    expect(method).toBeDefined();
    expect(resolveMethodTransport(method!)).toBe("off-chain");
  });

  it("returns a direct parse error for invalid ABI JSON", () => {
    expect(() => parseAbiSource("{")).toThrow("Invalid ABI JSON");
  });

  it("derives method options and method errors from ABI settings", () => {
    const derived = deriveAbiState({
      abi: lyquidTestAbi,
      buildMethod: "compileProject(bytes)",
      deployMethod: "missing(bytes)"
    });

    expect(derived.methodOptions.map((option) => option.value)).toContain("compileProject(bytes)");
    expect(derived.methodErrors).toEqual({ deployMethod: "Deploy method does not exist." });
  });
});
