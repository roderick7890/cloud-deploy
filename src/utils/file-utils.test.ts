import { describe, expect, it } from "vitest";
import { analyzeProjectFiles, getProjectMetadata, readProjectArchive } from "./file-utils";

describe("file-utils", () => {
  function folderFile(contents: string, name: string, path: string) {
    const file = new File([contents], name);
    Object.defineProperty(file, "webkitRelativePath", {
      value: path
    });
    return file;
  }

  it("reads metadata from uploaded files", () => {
    const files = [
      new File(["abc"], "cloud.zip", { type: "application/zip" }),
      new File(["de"], "readme.md", { type: "text/markdown" })
    ];

    expect(getProjectMetadata(files)).toEqual({
      name: "cloud.zip",
      fileCount: 2,
      totalSize: 5
    });
  });

  it("reads a single archive as bytes", async () => {
    const file = new File(["abc"], "cloud.zip", { type: "application/zip" });
    await expect(readProjectArchive(file)).resolves.toBeInstanceOf(Uint8Array);
  });

  it("builds a folder tree and reads only TOML previews", async () => {
    const analysis = await analyzeProjectFiles([
      folderFile('[package]\nname = "demo"\n', "Cargo.toml", "demo/Cargo.toml"),
      folderFile("pub fn run() {}", "lib.rs", "demo/src/lib.rs")
    ]);

    expect(analysis.rootName).toBe("demo");
    expect(analysis.metadata).toEqual({
      name: "demo",
      fileCount: 2,
      totalSize: 39
    });
    expect(analysis.tomlFiles).toEqual([
      {
        path: "demo/Cargo.toml",
        name: "Cargo.toml",
        content: '[package]\nname = "demo"\n',
        size: 24
      }
    ]);
    expect(analysis.tree).toEqual([
      expect.objectContaining({
        name: "demo",
        type: "directory",
        children: expect.arrayContaining([
          expect.objectContaining({ name: "Cargo.toml", path: "demo/Cargo.toml", type: "file" }),
          expect.objectContaining({ name: "src", path: "demo/src", type: "directory" })
        ])
      })
    ]);
  });

  it("rejects empty project uploads", async () => {
    await expect(analyzeProjectFiles([])).rejects.toThrow("No files were found in the upload.");
  });

  it("rejects uploads without TOML build targets", async () => {
    const file = new File(["hello"], "README.md");
    await expect(analyzeProjectFiles([file])).rejects.toThrow("No TOML build targets were found.");
  });
});
