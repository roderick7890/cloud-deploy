import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import type { WorkbenchLayout } from "@/types/workbench";
import { DeployWorkbench } from "./deploy-workbench";

const layout: WorkbenchLayout = { leftWidth: 30, leftTopHeight: 60, rightTopHeight: 70 };

describe("DeployWorkbench", () => {
  it("renders the four workbench panes", () => {
    renderWithProviders(
      <DeployWorkbench
        layout={layout}
        onLayoutChange={vi.fn()}
        resourcePane={<div>Resources</div>}
        historyPane={<div>History</div>}
        tabsPane={<div>Tabs</div>}
        actionsPane={<div>Actions</div>}
      />
    );

    expect(screen.getByText("Resources")).toBeInTheDocument();
    expect(screen.getByText("History")).toBeInTheDocument();
    expect(screen.getByText("Tabs")).toBeInTheDocument();
    expect(screen.getByText("Actions")).toBeInTheDocument();
  });

  it("constrains the workbench to the viewport width", () => {
    const { container } = renderWithProviders(
      <DeployWorkbench
        layout={layout}
        onLayoutChange={vi.fn()}
        resourcePane={<div>Resources</div>}
        historyPane={<div>History</div>}
        tabsPane={<div>Tabs</div>}
        actionsPane={<div>Actions</div>}
      />
    );

    expect(container.firstElementChild).toHaveClass("w-full", "max-w-full", "min-w-0");
  });
});
