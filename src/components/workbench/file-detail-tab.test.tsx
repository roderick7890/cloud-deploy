import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { parseLyquidDeploymentArtifact, type ArtifactDescriptorFile } from "@/utils/lyquid-deployment-artifact";
import { FileDetailTab } from "./file-detail-tab";

const files = [
  new File(['{"name":"demo"}'], "deploy.json"),
  new File(["pub fn main() {}"], "lib.rs")
];

Object.defineProperty(files[0], "webkitRelativePath", { value: "demo/deploy.json" });
Object.defineProperty(files[1], "webkitRelativePath", { value: "demo/src/lib.rs" });

const artifactContent = JSON.stringify({
  name: "demo",
  deploymentBytecode: "0x6001",
  imageHash: `0x${"1".repeat(64)}`,
  repoHint: "registry.local/demo:latest",
  contractAbi: [{ type: "function", name: "count", inputs: [], outputs: [{ type: "uint256" }] }]
});
const artifactFiles: ArtifactDescriptorFile[] = [
  {
    name: "deploy.json",
    path: "demo/deploy.json",
    content: artifactContent,
    size: artifactContent.length,
    artifact: parseLyquidDeploymentArtifact(JSON.parse(artifactContent))
  }
];

describe("FileDetailTab", () => {
  it("renders readonly artifact descriptor previews", () => {
    renderWithProviders(
      <FileDetailTab
        path="demo/deploy.json"
        files={files}
        artifactFiles={artifactFiles}
        onDeploy={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    expect(screen.getByText("demo/deploy.json")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/deploymentBytecode/)).toHaveAttribute("readonly");
  });

  it("renders readonly contract ABI from the artifact when present", () => {
    renderWithProviders(
      <FileDetailTab
        path="demo/deploy.json"
        files={files}
        artifactFiles={artifactFiles}
        onDeploy={vi.fn()}
      />
    );

    const abiPreview = screen.getByLabelText("Contract ABI");
    expect((abiPreview as HTMLTextAreaElement).value).toContain('"name": "count"');
    expect(abiPreview).toHaveAttribute("readonly");
  });

  it("calls back when leaving the preview", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProviders(
      <FileDetailTab
        path="demo/deploy.json"
        files={files}
        artifactFiles={artifactFiles}
        onBack={onBack}
        onDeploy={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(onBack).toHaveBeenCalledOnce();
  });

  it("renders metadata for non-artifact files instead of previewing content", () => {
    renderWithProviders(<FileDetailTab path="demo/src/lib.rs" files={files} artifactFiles={[]} onDeploy={vi.fn()} />);

    expect(screen.getByText("demo/src/lib.rs")).toBeInTheDocument();
    expect(screen.getByText("Only artifact descriptor JSON files are previewed.")).toBeInTheDocument();
  });
});
