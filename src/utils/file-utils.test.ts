import { describe, expect, it } from "vitest";
import { getProjectMetadata, readProjectArchive } from "./file-utils";

describe("file-utils", () => {
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
});
