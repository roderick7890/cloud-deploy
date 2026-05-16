import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import type { WorkbenchTab } from "@/types/workbench";
import { WorkbenchTabs } from "./workbench-tabs";

const tabs: WorkbenchTab[] = [
  {
    id: "file-demo",
    kind: "file-detail",
    title: "Cargo.toml",
    createdAt: 1,
    targetFile: "demo/Cargo.toml"
  },
  {
    id: "build-demo",
    kind: "build-run",
    title: "build_Cargo.toml_1778916000000",
    createdAt: 2,
    targetFile: "demo/Cargo.toml",
    status: "loading"
  }
];

describe("WorkbenchTabs", () => {
  it("renders a focused tab, supports switching, and closes tabs", async () => {
    const user = userEvent.setup();
    const onActiveTabChange = vi.fn();
    const onCloseTab = vi.fn();

    renderWithProviders(
      <WorkbenchTabs
        tabs={tabs}
        activeTabId="file-demo"
        onActiveTabChange={onActiveTabChange}
        onCloseTab={onCloseTab}
        renderTabContent={(tab) => <p>{tab.id} content</p>}
      />
    );

    expect(screen.getByRole("tab", { name: "Cargo.toml" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("file-demo content")).toBeInTheDocument();

    await user.click(screen.getByRole("tab", { name: "build_Cargo.toml_1778916000000" }));
    expect(onActiveTabChange).toHaveBeenCalledWith("build-demo");

    await user.click(screen.getByRole("button", { name: "Close Cargo.toml" }));
    expect(onCloseTab).toHaveBeenCalledWith("file-demo");
  });

  it("renders an empty state when no tabs are open", () => {
    renderWithProviders(
      <WorkbenchTabs tabs={[]} activeTabId={null} onActiveTabChange={vi.fn()} onCloseTab={vi.fn()} renderTabContent={() => null} />
    );

    expect(screen.getByText("No tabs open")).toBeInTheDocument();
  });

  it("stretches active tab content to the scroll viewport height", () => {
    const { container } = renderWithProviders(
      <WorkbenchTabs
        tabs={tabs}
        activeTabId="file-demo"
        onActiveTabChange={vi.fn()}
        onCloseTab={vi.fn()}
        renderTabContent={(tab) => <p>{tab.id} content</p>}
      />
    );

    expect(container.querySelector('[data-workbench-tab-content="true"]')).toHaveClass("min-h-full");
  });
});
