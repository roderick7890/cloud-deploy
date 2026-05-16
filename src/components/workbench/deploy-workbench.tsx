import type { ReactNode } from "react";
import type { WorkbenchLayout } from "@/types/workbench";
import { clampRatio } from "@/utils/workbench-layout-utils";
import { ResizeHandle } from "./resizable-panels";

const enableActionsPane = false;
const enableResourcePane = false;

type DeployWorkbenchProps = {
  layout: WorkbenchLayout;
  onLayoutChange: (layout: Partial<WorkbenchLayout>) => void;
  resourcePane: ReactNode;
  historyPane: ReactNode;
  tabsPane: ReactNode;
  actionsPane: ReactNode;
};

export function DeployWorkbench({
  layout,
  onLayoutChange,
  resourcePane,
  historyPane,
  tabsPane,
  actionsPane,
}: DeployWorkbenchProps) {
  void historyPane;

  return (
    <div className="flex min-h-0 min-w-0 max-w-full flex-1 overflow-hidden w-full">
      <section
        className="flex min-h-0 min-w-0 flex-col border-r bg-card"
        style={{ width: `${layout.leftWidth}%` }}
      >
        <div
          className="min-h-0 overflow-hidden"
          style={{ height: `${layout.leftTopHeight}%` }}
        >
          {resourcePane}
        </div>
        {enableResourcePane ? (
          <>
            <ResizeHandle
              ariaLabel="Resize left panes"
              orientation="horizontal"
              onDrag={({ deltaY }) =>
                onLayoutChange({
                  leftTopHeight: clampRatio(layout.leftTopHeight + deltaY / 6),
                })
              }
            />
            <div className="min-h-0 flex-1 overflow-hidden">{historyPane}</div>
          </>
        ) : null}
      </section>
      <ResizeHandle
        ariaLabel="Resize left and right panes"
        onDrag={({ deltaX }) =>
          onLayoutChange({
            leftWidth: clampRatio(layout.leftWidth + deltaX / 12),
          })
        }
      />
      <section className="flex min-h-0 min-w-0 flex-1 flex-col bg-background">
        <div
          className="min-h-0 overflow-hidden"
          style={{ height: `${layout.rightTopHeight}%` }}
        >
          {tabsPane}
        </div>
        {enableActionsPane ? (
          <>
            <ResizeHandle
              ariaLabel="Resize right panes"
              orientation="horizontal"
              onDrag={({ deltaY }) =>
                onLayoutChange({
                  rightTopHeight: clampRatio(
                    layout.rightTopHeight + deltaY / 6,
                  ),
                })
              }
            />
            <div className="min-h-0 flex-1 overflow-hidden border-t bg-card">
              {actionsPane}
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}
