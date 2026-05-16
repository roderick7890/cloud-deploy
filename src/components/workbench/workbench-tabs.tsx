import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { WorkbenchTab } from "@/types/workbench";

type WorkbenchTabsProps = {
  tabs: WorkbenchTab[];
  activeTabId: string | null;
  onActiveTabChange: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  renderTabContent: (tab: WorkbenchTab) => ReactNode;
};

export function WorkbenchTabs({ tabs, activeTabId, onActiveTabChange, onCloseTab, renderTabContent }: WorkbenchTabsProps) {
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0] ?? null;

  if (!activeTab) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        <p>No tabs open</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div role="tablist" aria-label="Workbench tabs" className="flex min-h-10 items-center gap-1 overflow-x-auto border-b bg-card px-2 py-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab.id;

          return (
            <div key={tab.id} className="flex min-w-0 items-center rounded-md border bg-background">
              <Button
                type="button"
                role="tab"
                aria-selected={isActive}
                variant={isActive ? "secondary" : "ghost"}
                className="h-8 max-w-64 justify-start truncate rounded-r-none px-3"
                onClick={() => onActiveTabChange(tab.id)}
              >
                <span className="truncate">{tab.title}</span>
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-l-none"
                aria-label={`Close ${tab.title}`}
                onClick={() => onCloseTab(tab.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          );
        })}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="p-4">{renderTabContent(activeTab)}</div>
      </ScrollArea>
    </div>
  );
}
