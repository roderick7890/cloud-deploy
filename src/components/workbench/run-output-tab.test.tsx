import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import type { WorkbenchTab } from "@/types/workbench";
import { RunOutputTab } from "./run-output-tab";

const baseTab: WorkbenchTab = {
  id: "build-1",
  kind: "build-run",
  title: "build_Cargo.toml_1778916000000",
  createdAt: 1778916000000,
  targetFile: "demo/Cargo.toml",
  status: "success",
  env: {
    rpcEndpoint: "http://localhost:8545",
    lyquidId: "Lyquid-demo",
    chainId: 31337,
    buildMethodAbiItem: { type: "function", name: "build", inputs: [] }
  },
  raw: { result: "0x1234" }
};

describe("RunOutputTab", () => {
  it("keeps method ABI in the env dialog instead of the main output", async () => {
    const user = userEvent.setup();
    renderWithProviders(<RunOutputTab tab={baseTab} />);

    expect(screen.queryByText("ABI Item")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy ABI" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Env" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/localhost:8545/)).toBeInTheDocument();
    expect(screen.getByText(/"name": "build"/)).toBeInTheDocument();
  });

  it("shows a spinning tx hash while lookup is pending and check state after details arrive", () => {
    const txHash = "0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318";
    const deployTab: WorkbenchTab = {
      ...baseTab,
      id: "deploy-1",
      kind: "deploy-run",
      status: "loading",
      raw: { transactionHash: txHash }
    };
    const { rerender } = renderWithProviders(<RunOutputTab tab={deployTab} />);

    expect(screen.getByLabelText("Transaction lookup pending")).toBeInTheDocument();

    rerender(
      <RunOutputTab
        tab={{
          ...deployTab,
          status: "success",
          transactionRaw: { hash: txHash, from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" }
        }}
      />
    );

    expect(screen.getByLabelText("Transaction found")).toBeInTheDocument();
  });

  it("renders deploy ABI from raw output as a separate copyable card", async () => {
    const user = userEvent.setup();
    const writeText = vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue(undefined);
    const deployAbi = [{ type: "function", name: "increment", inputs: [] }];

    renderWithProviders(
      <RunOutputTab
        tab={{
          ...baseTab,
          id: "deploy-abi",
          kind: "deploy-run",
          raw: { transactionHash: "0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318", deployAbi }
        }}
      />
    );

    expect(screen.getByText("Contract ABI")).toBeInTheDocument();
    expect(screen.getAllByText(/"name": "increment"/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/"name": "deploy"/)).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Copy Contract ABI" }));
    expect(writeText).toHaveBeenCalledWith(JSON.stringify(deployAbi, null, 2));
  });

  it("lets the scroll area own long JSON overflow", () => {
    const { container } = renderWithProviders(
      <RunOutputTab
        tab={{
          ...baseTab,
          raw: { result: "0x".padEnd(180, "a") }
        }}
      />
    );

    expect(container.querySelector('[data-json-scroll-content="true"]')).not.toHaveClass("overflow-x-auto");
    expect(container.querySelector("pre")).toHaveClass("w-max", "min-w-full", "whitespace-pre");
  });

  it("stretches the visible output card area to the available tab height", () => {
    const { container } = renderWithProviders(<RunOutputTab tab={{ ...baseTab, status: "error", error: "Deploy failed." }} />);

    expect(container.querySelector('[data-run-output-root="true"]')).toHaveClass("min-h-full", "flex", "flex-col");
    expect(container.querySelector('[data-run-output-main="true"]')).toHaveClass("flex-1");
    expect(container.querySelector('[data-run-output-section="true"]')).toHaveClass("min-h-full");
  });
});
