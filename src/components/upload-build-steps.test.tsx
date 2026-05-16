import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import type { UploadedProject } from "@/types/deploy";
import { BuildStep } from "./build-step";
import { UploadStep } from "./upload-step";

describe("UploadStep and BuildStep", () => {
  function folderFile(contents: string, name: string, path: string) {
    const file = new File([contents], name);
    Object.defineProperty(file, "webkitRelativePath", {
      value: path
    });
    return file;
  }

  it("shows a folder tree and readonly TOML preview before continuing", async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();
    const onContinue = vi.fn();
    const files = [
      folderFile('[package]\nname = "demo"\n', "Cargo.toml", "demo/Cargo.toml"),
      folderFile("pub fn run() {}", "lib.rs", "demo/src/lib.rs")
    ];
    let project: UploadedProject | null = null;
    const renderUploadStep = (nextProject: UploadedProject | null) => (
      <UploadStep
        project={nextProject}
        onUpload={(updatedProject) => {
          project = updatedProject;
          onUpload(updatedProject);
          rerender(renderUploadStep(project));
        }}
        onContinue={onContinue}
      />
    );
    const { rerender } = renderWithProviders(
      renderUploadStep(project)
    );

    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();

    await user.upload(screen.getByLabelText("Project folder"), files);

    expect(await screen.findAllByText("demo")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Select demo/Cargo.toml" })).toBeInTheDocument();
    expect(screen.getByText("src")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "Select demo/Cargo.toml" }));

    expect(screen.getByText("demo/Cargo.toml")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/name = "demo"/)).toHaveAttribute("readonly");
    expect(screen.getByRole("button", { name: "Continue" })).toBeEnabled();

    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(onContinue).toHaveBeenCalledOnce();
    expect(onUpload).toHaveBeenLastCalledWith(expect.objectContaining({
      selectedTomlPath: "demo/Cargo.toml"
    }));
  });

  it("collapses and expands folder paths", async () => {
    const user = userEvent.setup();
    const files = [
      folderFile('[package]\nname = "demo"\n', "Cargo.toml", "demo/Cargo.toml"),
      folderFile("pub fn run() {}", "lib.rs", "demo/src/lib.rs")
    ];
    let project: UploadedProject | null = null;
    const { rerender } = renderWithProviders(
      <UploadStep
        project={project}
        onUpload={(updatedProject) => {
          project = updatedProject;
          rerender(<UploadStep project={project} onUpload={vi.fn()} onContinue={vi.fn()} />);
        }}
        onContinue={vi.fn()}
      />
    );

    await user.upload(screen.getByLabelText("Project folder"), files);

    expect(await screen.findByRole("button", { name: "Expand demo/src" })).toBeInTheDocument();
    expect(screen.queryByText("lib.rs")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Expand demo/src" }));

    expect(screen.getByText("lib.rs")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Collapse demo/src" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Collapse demo/src" }));

    expect(screen.queryByText("lib.rs")).not.toBeInTheDocument();
  });

  it("filters the tree to TOML build target files", async () => {
    const user = userEvent.setup();
    const files = [
      folderFile('[package]\nname = "demo"\n', "Cargo.toml", "demo/Cargo.toml"),
      folderFile("pub fn run() {}", "lib.rs", "demo/src/lib.rs"),
      folderFile("notes", "README.md", "demo/README.md"),
      folderFile("wasm", "demo.wasm", "demo/target/demo.wasm")
    ];
    let project: UploadedProject | null = null;
    const { rerender } = renderWithProviders(
      <UploadStep
        project={project}
        onUpload={(updatedProject) => {
          project = updatedProject;
          rerender(<UploadStep project={project} onUpload={vi.fn()} onContinue={vi.fn()} />);
        }}
        onContinue={vi.fn()}
      />
    );

    await user.upload(screen.getByLabelText("Project folder"), files);

    expect(await screen.findByText("README.md")).toBeInTheDocument();
    expect(screen.getByText("target")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Source only" }));

    expect(screen.queryByText("README.md")).not.toBeInTheDocument();
    expect(screen.queryByText("target")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select demo/Cargo.toml" })).toBeInTheDocument();
    expect(screen.queryByText("src")).not.toBeInTheDocument();
    expect(screen.queryByText("lib.rs")).not.toBeInTheDocument();
  });

  it("does not render helper Lyquid constructor fields before build", () => {
    renderWithProviders(
      <BuildStep
        onBuild={vi.fn()}
        canBuild
        isBuilding={false}
        error={null}
      />
    );

    expect(screen.queryByLabelText("name")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("version")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Build" })).toBeInTheDocument();
  });

  it("shows build progress while the build request is pending", () => {
    renderWithProviders(
      <BuildStep
        onBuild={vi.fn()}
        canBuild
        isBuilding
        error={null}
      />
    );

    expect(screen.getByRole("button", { name: "Building..." })).toBeDisabled();
  });
});
