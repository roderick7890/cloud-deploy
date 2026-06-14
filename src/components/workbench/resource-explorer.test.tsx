import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { parseLyquidDeploymentArtifact, type UploadedArtifactBundle } from "@/utils/lyquid-deployment-artifact";
import { ResourceExplorer } from "./resource-explorer";

function folderFile(contents: string, name: string, path: string) {
  const file = new File([contents], name);
  Object.defineProperty(file, "webkitRelativePath", { value: path });
  return file;
}

const descriptor = JSON.stringify({
  name: "demo",
  deploymentBytecode: "0x6001",
  imageHash: `0x${"1".repeat(64)}`,
  repoHint: "registry.local/demo:latest"
});

function uploadedProject(): UploadedArtifactBundle {
  return {
    metadata: { name: "demo", fileCount: 3, totalSize: 42 },
    rootName: "demo",
    files: [
      folderFile(descriptor, "deploy.json", "demo/deploy.json"),
      folderFile("pub fn run() {}", "lib.rs", "demo/src/lib.rs"),
      folderFile("notes", "README.md", "demo/README.md")
    ],
    tree: [
      { name: "deploy.json", path: "demo/deploy.json", type: "file" },
      { name: "README.md", path: "demo/README.md", type: "file" },
      {
        name: "src",
        path: "demo/src",
        type: "directory",
        children: [{ name: "lib.rs", path: "demo/src/lib.rs", type: "file" }]
      }
    ],
    artifactFiles: [{ name: "deploy.json", path: "demo/deploy.json", content: descriptor, size: descriptor.length, artifact: parseLyquidDeploymentArtifact(JSON.parse(descriptor)) }],
    selectedArtifactPath: ""
  };
}

describe("ResourceExplorer", () => {
  it("uses the empty drop zone as the only upload control before a project exists", async () => {
    const user = userEvent.setup();
    const onProjectChange = vi.fn();
    const onOpenFile = vi.fn();
    const files = [folderFile(descriptor, "deploy.json", "demo/deploy.json")];

    renderWithProviders(
      <ResourceExplorer project={null} selectedArtifactPath="" onProjectChange={onProjectChange} onSelectTarget={vi.fn()} onOpenFile={onOpenFile} />
    );

    expect(screen.queryByText("Project folder")).not.toBeInTheDocument();
    await user.upload(screen.getByLabelText("Drop a build artifact folder here or choose one."), files);

    await waitFor(() => expect(onProjectChange).toHaveBeenCalledWith(expect.objectContaining({ selectedArtifactPath: "demo/deploy.json" })));
  });

  it("keeps the hidden folder input inside the visible upload target", () => {
    renderWithProviders(
      <ResourceExplorer project={null} selectedArtifactPath="" onProjectChange={vi.fn()} onSelectTarget={vi.fn()} onOpenFile={vi.fn()} />
    );

    const input = screen.getByLabelText("Drop a build artifact folder here or choose one.");
    const uploadTarget = input.closest("label");

    expect(uploadTarget).toBeInTheDocument();
    expect(uploadTarget).toContainElement(input);
    expect(uploadTarget).toHaveClass("relative");
    expect(input).toHaveClass("absolute", "inset-0");
  });

  it("shows a compact change-folder action after a project exists", () => {
    renderWithProviders(
      <ResourceExplorer project={uploadedProject()} selectedArtifactPath="" onProjectChange={vi.fn()} onSelectTarget={vi.fn()} onOpenFile={vi.fn()} />
    );

    expect(screen.getByLabelText("Change folder")).toBeInTheDocument();
  });

  it("uses a radio control to select the artifact target without selected background semantics", async () => {
    const user = userEvent.setup();
    const onSelectTarget = vi.fn();

    renderWithProviders(
      <ResourceExplorer
        project={uploadedProject()}
        selectedArtifactPath=""
        onProjectChange={vi.fn()}
        onSelectTarget={onSelectTarget}
        onOpenFile={vi.fn()}
      />
    );

    const target = screen.getByRole("radio", { name: "Use demo/deploy.json as deployment artifact" });
    expect(target).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Open demo/deploy.json" })).not.toHaveClass("bg-secondary");

    await user.click(target);
    expect(onSelectTarget).toHaveBeenCalledWith("demo/deploy.json");
  });

  it("filters resources with the artifact JSON only control", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ResourceExplorer project={uploadedProject()} selectedArtifactPath="" onProjectChange={vi.fn()} onSelectTarget={vi.fn()} onOpenFile={vi.fn()} />
    );

    expect(screen.getByText("README.md")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Artifact JSON only" })).toHaveTextContent("Artifact JSON only");
    await user.click(screen.getByRole("button", { name: "Artifact JSON only" }));

    expect(screen.queryByText("README.md")).not.toBeInTheDocument();
    expect(screen.queryByText("src")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open demo/deploy.json" })).toBeInTheDocument();
  });

  it("shows parse failures in a dialog", async () => {
    const user = userEvent.setup();
    const files = [folderFile("pub fn run() {}", "lib.rs", "demo/src/lib.rs")];

    renderWithProviders(
      <ResourceExplorer project={null} selectedArtifactPath="" onProjectChange={vi.fn()} onSelectTarget={vi.fn()} onOpenFile={vi.fn()} />
    );

    await user.upload(screen.getByLabelText("Drop a build artifact folder here or choose one."), files);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("No Lyquid deployment artifact descriptor JSON was found.")).toBeInTheDocument();
  });
});
