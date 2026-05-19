import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { FileDetailTab } from "./file-detail-tab";

const files = [
  new File(['[package]\nname = "demo"\n'], "Cargo.toml"),
  new File(["pub fn main() {}"], "lib.rs")
];

Object.defineProperty(files[0], "webkitRelativePath", { value: "demo/Cargo.toml" });
Object.defineProperty(files[1], "webkitRelativePath", { value: "demo/src/lib.rs" });

describe("FileDetailTab", () => {
  it("renders readonly TOML previews", () => {
    renderWithProviders(
      <FileDetailTab
        path="demo/Cargo.toml"
        files={files}
        tomlFiles={[{ name: "Cargo.toml", path: "demo/Cargo.toml", content: '[package]\nname = "demo"\n', size: 24 }]}
        onDeploy={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    expect(screen.getByText("demo/Cargo.toml")).toBeInTheDocument();
    expect(screen.getByDisplayValue(/name = "demo"/)).toHaveAttribute("readonly");
  });

  it("calls back when leaving the preview", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProviders(
      <FileDetailTab
        path="demo/Cargo.toml"
        files={files}
        tomlFiles={[{ name: "Cargo.toml", path: "demo/Cargo.toml", content: '[package]\nname = "demo"\n', size: 24 }]}
        onBack={onBack}
        onDeploy={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(onBack).toHaveBeenCalledOnce();
  });

  it("renders metadata for non-TOML files instead of previewing content", () => {
    renderWithProviders(<FileDetailTab path="demo/src/lib.rs" files={files} tomlFiles={[]} onDeploy={vi.fn()} />);

    expect(screen.getByText("demo/src/lib.rs")).toBeInTheDocument();
    expect(screen.getByText("Only TOML files are previewed.")).toBeInTheDocument();
  });
});
