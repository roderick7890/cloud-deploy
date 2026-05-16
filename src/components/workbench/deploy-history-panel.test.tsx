import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import type { DeployHistoryRecord } from "@/types/workbench";
import { DeployHistoryPanel } from "./deploy-history-panel";

const record: DeployHistoryRecord = {
  id: "history-1",
  txHash: "0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318",
  timestamp: 1778916000000,
  targetFile: "demo/Cargo.toml",
  status: "submitted",
  env: {
    rpcEndpoint: "http://localhost:8545",
    deployMethodAbiItem: { type: "function", name: "deploy", inputs: [] }
  }
};

describe("DeployHistoryPanel", () => {
  it("shows latest deploy history and opens a selected record", async () => {
    const user = userEvent.setup();
    const onOpenRecord = vi.fn();

    renderWithProviders(<DeployHistoryPanel records={[record]} onOpenRecord={onOpenRecord} onDeleteRecord={vi.fn()} />);

    expect(screen.getByText("Latest 10 deploys")).toBeInTheDocument();
    expect(screen.getByText("demo/Cargo.toml")).toBeInTheDocument();
    expect(screen.getByText(/0x8d82/)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Open deploy history/ }));
    expect(onOpenRecord).toHaveBeenCalledWith(record);
  });

  it("deletes a selected record without opening it", async () => {
    const user = userEvent.setup();
    const onOpenRecord = vi.fn();
    const onDeleteRecord = vi.fn();

    renderWithProviders(<DeployHistoryPanel records={[record]} onOpenRecord={onOpenRecord} onDeleteRecord={onDeleteRecord} />);

    await user.click(screen.getByRole("button", { name: /Delete deploy history/ }));

    expect(onDeleteRecord).toHaveBeenCalledWith(record.id);
    expect(onOpenRecord).not.toHaveBeenCalled();
  });

  it("renders an empty state", () => {
    renderWithProviders(<DeployHistoryPanel records={[]} onOpenRecord={vi.fn()} onDeleteRecord={vi.fn()} />);

    expect(screen.getByText("No deploy history yet.")).toBeInTheDocument();
  });
});
