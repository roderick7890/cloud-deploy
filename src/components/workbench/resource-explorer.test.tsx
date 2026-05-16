import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import type { UploadedProject } from "@/types/deploy";
import { ResourceExplorer } from "./resource-explorer";

function folderFile(contents: string, name: string, path: string) {
  const file = new File([contents], name);
  Object.defineProperty(file, "webkitRelativePath", { value: path });
  return file;
}

function uploadedProject(): UploadedProject {
  return {
    metadata: { name: "demo", fileCount: 3, totalSize: 42 },
    rootName: "demo",
    files: [
      folderFile('[package]\nname = "demo"\n', "Cargo.toml", "demo/Cargo.toml"),
      folderFile("pub fn run() {}", "lib.rs", "demo/src/lib.rs"),
      folderFile("notes", "README.md", "demo/README.md")
    ],
    tree: [
      { name: "Cargo.toml", path: "demo/Cargo.toml", type: "file" },
      { name: "README.md", path: "demo/README.md", type: "file" },
      {
        name: "src",
        path: "demo/src",
        type: "directory",
        children: [{ name: "lib.rs", path: "demo/src/lib.rs", type: "file" }]
      }
    ],
    tomlFiles: [{ name: "Cargo.toml", path: "demo/Cargo.toml", content: '[package]\nname = "demo"\n', size: 24 }],
    selectedTomlPath: ""
  };
}

describe("ResourceExplorer", () => {
  it("uploads a folder and opens files without auto-selecting the TOML target", async () => {
    const user = userEvent.setup();
    const onProjectChange = vi.fn();
    const onOpenFile = vi.fn();
    const files = [folderFile('[package]\nname = "demo"\n', "Cargo.toml", "demo/Cargo.toml")];

    renderWithProviders(
      <ResourceExplorer project={null} selectedTomlPath="" onProjectChange={onProjectChange} onSelectTarget={vi.fn()} onOpenFile={onOpenFile} />
    );

    await user.upload(screen.getByLabelText("Project folder"), files);

    await waitFor(() => expect(onProjectChange).toHaveBeenCalledWith(expect.objectContaining({ selectedTomlPath: "" })));
  });

  it("uses a radio control to select the TOML target without selected background semantics", async () => {
    const user = userEvent.setup();
    const onSelectTarget = vi.fn();

    renderWithProviders(
      <ResourceExplorer
        project={uploadedProject()}
        selectedTomlPath=""
        onProjectChange={vi.fn()}
        onSelectTarget={onSelectTarget}
        onOpenFile={vi.fn()}
      />
    );

    const target = screen.getByRole("radio", { name: "Use demo/Cargo.toml as deploy target" });
    expect(target).not.toBeChecked();
    expect(screen.getByRole("button", { name: "Open demo/Cargo.toml" })).not.toHaveClass("bg-secondary");

    await user.click(target);
    expect(onSelectTarget).toHaveBeenCalledWith("demo/Cargo.toml");
  });

  it("filters resources with the Toml only control", async () => {
    const user = userEvent.setup();

    renderWithProviders(
      <ResourceExplorer project={uploadedProject()} selectedTomlPath="" onProjectChange={vi.fn()} onSelectTarget={vi.fn()} onOpenFile={vi.fn()} />
    );

    expect(screen.getByText("README.md")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Toml only" }));

    expect(screen.queryByText("README.md")).not.toBeInTheDocument();
    expect(screen.queryByText("src")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open demo/Cargo.toml" })).toBeInTheDocument();
  });

  it("shows parse failures in a dialog", async () => {
    const user = userEvent.setup();
    const files = [folderFile("pub fn run() {}", "lib.rs", "demo/src/lib.rs")];

    renderWithProviders(
      <ResourceExplorer project={null} selectedTomlPath="" onProjectChange={vi.fn()} onSelectTarget={vi.fn()} onOpenFile={vi.fn()} />
    );

    await user.upload(screen.getByLabelText("Project folder"), files);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("No TOML build targets were found.")).toBeInTheDocument();
  });
});
