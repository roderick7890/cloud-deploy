import { describe, expect, it } from "vitest";
import { encodeFunctionData } from "viem";
import type { NormalizedAbiMethod } from "@/types/abi";
import type { UploadedProject } from "@/types/deploy";
import { parseAbiSource } from "@/utils/abi/abi-utils";
import { prepareBuildMethodArgs } from "./build-args-utils";

function folderFile(contents: string, name: string, path: string) {
  const file = new File([contents], name);
  Object.defineProperty(file, "webkitRelativePath", {
    value: path
  });
  return file;
}

function uploadedProject(): UploadedProject {
  return {
    metadata: { name: "demo", fileCount: 2, totalSize: 39 },
    files: [
      folderFile('[package]\nname = "demo"\n', "Cargo.toml", "demo/Cargo.toml"),
      folderFile("pub fn run() {}", "lib.rs", "demo/src/lib.rs")
    ],
    rootName: "demo",
    tree: [],
    tomlFiles: [],
    selectedTomlPath: "demo/Cargo.toml"
  };
}

function methodFromAbi(source: string, signature: string): NormalizedAbiMethod {
  const method = parseAbiSource(source).methods.find((item) => item.signature === signature);
  if (!method) {
    throw new Error(`Missing test method ${signature}`);
  }
  return method;
}

describe("build-args-utils", () => {
  it("prepares project bytes, empty constructor input, and project name for the helper build method", async () => {
    const method = methodFromAbi(
      JSON.stringify([
        {
          type: "function",
          name: "build",
          inputs: [
            { name: "project", type: "bytes" },
            { name: "constructorInput", type: "bytes" },
            { name: "projectName", type: "string" }
          ],
          outputs: []
        }
      ]),
      "build(bytes,bytes,string)"
    );

    const args = await prepareBuildMethodArgs({ method, project: uploadedProject() });

    expect(args).toHaveLength(3);
    expect(args[0]).toMatch(/^0x[0-9a-f]+$/);
    expect(args[1]).toBe("0x");
    expect(args[2]).toBe("demo");
    expect(() =>
      encodeFunctionData({
        abi: [method.abiItem],
        functionName: method.name,
        args
      })
    ).not.toThrow();
  });

  it("prepares a single project bytes argument for one-argument build methods", async () => {
    const method = methodFromAbi(
      JSON.stringify([
        {
          type: "function",
          name: "compileProject",
          inputs: [{ name: "source", type: "bytes" }],
          outputs: []
        }
      ]),
      "compileProject(bytes)"
    );

    const args = await prepareBuildMethodArgs({ method, project: uploadedProject() });

    expect(args).toHaveLength(1);
    expect(args[0]).toMatch(/^0x[0-9a-f]+$/);
  });

  it("throws a clear error for unsupported build method input types", async () => {
    const method = methodFromAbi(
      JSON.stringify([
        {
          type: "function",
          name: "build",
          inputs: [{ name: "limit", type: "uint256" }],
          outputs: []
        }
      ]),
      "build(uint256)"
    );

    await expect(prepareBuildMethodArgs({ method, project: uploadedProject() })).rejects.toThrow(
      "Build method input limit:uint256 is not supported yet."
    );
  });
});
