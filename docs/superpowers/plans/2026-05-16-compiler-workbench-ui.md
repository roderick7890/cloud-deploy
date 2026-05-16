# Compiler Workbench UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the four-step deploy wizard with a compiler-style workbench: resizable resource/history/output/action panes, TOML target selection, run output tabs, deploy history, and the existing real build/deploy flow.

**Architecture:** Add a workbench layer around the existing parsing/build/deploy utilities instead of rewriting request logic. Keep uploaded resources and run tabs in current-session state, persist only settings, layout split ratios, and the latest 10 deploy history records. Implement the UI through small focused components under `src/components/workbench` and page orchestration in `src/pages/index.tsx`.

**Tech Stack:** React, TypeScript, Tailwind CSS tokens, shadcn/ui primitives, Zustand + `zustand.persist`, wagmi, viem, Vitest + Testing Library.

---

## File Structure

### New Files

- `src/types/workbench.ts`
  - Owns workbench-specific tab, environment, deploy history, layout, and run status types.
- `src/config/workbench-config.ts`
  - Owns static workbench defaults: split ratios and history limit.
- `src/store/workbench-store.ts`
  - Zustand persisted store for split ratios and latest 10 deploy history records only.
- `src/store/workbench-store.test.ts`
  - Tests persisted store reducers and 10-record history cap.
- `src/components/workbench/resizable-panels.tsx`
  - Minimal horizontal/vertical splitter component using pointer events and persisted ratios through props.
- `src/components/workbench/resizable-panels.test.tsx`
  - Tests drag callbacks update ratios.
- `src/components/workbench/resource-explorer.tsx`
  - Upload controls, drag/drop shell, `Toml only` toggle, project tree, and TOML target radio semantics.
- `src/components/workbench/resource-explorer.test.tsx`
  - Tests target selection, TOML-only filtering, non-background selection semantics, and parse error dialog path.
- `src/components/workbench/workbench-tabs.tsx`
  - Closable tab strip and active tab content switch.
- `src/components/workbench/workbench-tabs.test.tsx`
  - Tests opening, focusing, closing, and empty state rendering.
- `src/components/workbench/file-detail-tab.tsx`
  - TOML readonly preview and non-TOML metadata message.
- `src/components/workbench/run-output-tab.tsx`
  - Shared raw-first build/deploy/history tab renderer with copy actions, loading/error states, env popover, ABI item display, txHash pending/check state.
- `src/components/workbench/action-deck.tsx`
  - Build and Deploy action cards shown only after TOML target selection.
- `src/components/workbench/deploy-history-panel.tsx`
  - Latest 10 deploy history list and click-to-open behavior.
- `src/components/workbench/deploy-workbench.tsx`
  - Composes the four resizable panes and receives command callbacks from the page.
- `src/components/workbench/deploy-workbench.test.tsx`
  - Covers layout integration at component level.

### Modified Files

- `src/config/storage-config.ts`
  - Add `workbenchStorageKey` and `workbenchStorageVersion`.
- `src/utils/file-utils.ts`
  - Add input validation for folder uploads.
- `src/utils/file-utils.test.ts`
  - Add empty upload and no usable TOML target tests.
- `src/components/project-tree.tsx`
  - Change from selected background semantics to explicit single-select TOML target control while preserving directory expand/collapse behavior.
- `src/components/shared/result-summary.tsx`
  - Leave in place for legacy tests unless no production imports remain in final cleanup. The workbench uses `run-output-tab.tsx` for deploy output.
- `src/layout/app-shell.tsx`
  - Remove progress-step dependency or add a `variant="workbench"` path that renders header plus full-height content only.
- `src/layout/app-shell.test.tsx`
  - Update tests for header-only workbench shell.
- `src/pages/index.tsx`
  - Replace wizard orchestration with workbench orchestration: upload, file detail tabs, build tab creation, deploy tab creation, deploy history opening, tx polling.
- `src/pages/index.test.tsx`
  - Replace wizard tests with workbench tests for upload, target selection, build, deploy auto-build, and history lookup behavior.
- `src/store/deploy-session-store.ts`
  - Do not use from the new workbench page. Leave the store unchanged until final cleanup confirms whether legacy step components remain.
- `docs/agent/registries.md`
  - Register new shared/workbench components, `workbench-store`, `workbench-config`, and file utility changes.

### Existing Files To Reuse

- `src/utils/build-args-utils.ts`
- `src/utils/deploy-args-utils.ts`
- `src/utils/request/request-dispatcher.ts`
- `src/utils/request/rpc-transaction-client.ts`
- `src/utils/request/rpc-chain-client.ts`
- `src/utils/request/browser-wallet-client.ts`
- `src/utils/request/lyquid-info-client.ts`
- `src/components/shared/app-header.tsx`
- `src/components/shared/settings-dialog.tsx`
- `src/components/ui/*`

---

## Task 1: Workbench Types, Config, And Persistent Store

**Files:**
- Create: `src/types/workbench.ts`
- Create: `src/config/workbench-config.ts`
- Create: `src/store/workbench-store.ts`
- Create: `src/store/workbench-store.test.ts`
- Modify: `src/config/storage-config.ts`
- Modify: `docs/agent/registries.md`

- [ ] **Step 1: Write failing store tests**

Add `src/store/workbench-store.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { defaultWorkbenchLayout, deployHistoryLimit } from "@/config/workbench-config";
import { useWorkbenchStore } from "./workbench-store";

function historyRecord(index: number) {
  return {
    id: `history-${index}`,
    txHash: `0x${String(index).padStart(64, "0")}` as `0x${string}`,
    timestamp: 1778916000000 + index,
    targetFile: `demo-${index}/Cargo.toml`,
    status: "submitted" as const,
    env: {
      rpcEndpoint: "http://localhost:8545",
      lyquidId: "Lyquid-demo",
      walletAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
      chainId: 31337,
      contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      buildMethod: "build(bytes)",
      deployMethod: "deploy(bytes)",
      buildMethodAbiItem: { type: "function", name: "build", inputs: [] },
      deployMethodAbiItem: { type: "function", name: "deploy", inputs: [] }
    }
  };
}

describe("workbench-store", () => {
  beforeEach(() => {
    useWorkbenchStore.setState(useWorkbenchStore.getInitialState(), true);
  });

  it("updates split ratios", () => {
    useWorkbenchStore.getState().setLayout({ leftWidth: 32, leftTopHeight: 61, rightTopHeight: 72 });
    expect(useWorkbenchStore.getState().layout).toEqual({ leftWidth: 32, leftTopHeight: 61, rightTopHeight: 72 });
  });

  it("keeps the latest deploy history records first and caps at the configured limit", () => {
    Array.from({ length: deployHistoryLimit + 2 }, (_, index) => historyRecord(index)).forEach((record) => {
      useWorkbenchStore.getState().addDeployHistory(record);
    });

    const history = useWorkbenchStore.getState().deployHistory;
    expect(history).toHaveLength(deployHistoryLimit);
    expect(history[0].id).toBe(`history-${deployHistoryLimit + 1}`);
    expect(history.at(-1)?.id).toBe("history-2");
  });

  it("defaults to the configured layout", () => {
    expect(useWorkbenchStore.getState().layout).toEqual(defaultWorkbenchLayout);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- src/store/workbench-store.test.ts
```

Expected: fail because `workbench-store`, `workbench-config`, and types do not exist.

- [ ] **Step 3: Add storage config keys**

Modify `src/config/storage-config.ts`:

```ts
export const settingsStorageKey = "cloud-deploy-settings";
export const settingsVersion = 1;

export const workbenchStorageKey = "cloud-deploy-workbench";
export const workbenchStorageVersion = 1;
```

- [ ] **Step 4: Add workbench config**

Create `src/config/workbench-config.ts`:

```ts
import type { WorkbenchLayout } from "@/types/workbench";

export const deployHistoryLimit = 10;

export const defaultWorkbenchLayout: WorkbenchLayout = {
  leftWidth: 28,
  leftTopHeight: 70,
  rightTopHeight: 70
};
```

- [ ] **Step 5: Add workbench types**

Create `src/types/workbench.ts`:

```ts
import type { AbiFunction } from "viem";

export type WorkbenchLayout = {
  leftWidth: number;
  leftTopHeight: number;
  rightTopHeight: number;
};

export type DeployHistoryStatus = "submitted" | "success" | "failed";

export type WorkbenchEnv = {
  rpcEndpoint: string;
  lyquidId?: string;
  walletAddress?: string;
  chainId?: number;
  contractAddress?: string;
  buildMethod?: string;
  deployMethod?: string;
  buildMethodAbiItem?: AbiFunction | Record<string, unknown>;
  deployMethodAbiItem?: AbiFunction | Record<string, unknown>;
};

export type DeployHistoryRecord = {
  id: string;
  txHash: `0x${string}`;
  timestamp: number;
  targetFile: string;
  status: DeployHistoryStatus;
  env: WorkbenchEnv;
};

export type WorkbenchTabKind = "file-detail" | "build-run" | "deploy-run" | "deploy-history";
export type WorkbenchRunStatus = "idle" | "loading" | "success" | "error";

export type WorkbenchTab = {
  id: string;
  kind: WorkbenchTabKind;
  title: string;
  createdAt: number;
  status?: WorkbenchRunStatus;
  targetFile?: string;
  env?: WorkbenchEnv;
  raw?: unknown;
  transactionRaw?: unknown;
  error?: string;
};
```

- [ ] **Step 6: Add persisted workbench store**

Create `src/store/workbench-store.ts`:

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultWorkbenchLayout, deployHistoryLimit } from "@/config/workbench-config";
import { workbenchStorageKey, workbenchStorageVersion } from "@/config/storage-config";
import type { DeployHistoryRecord, WorkbenchLayout } from "@/types/workbench";

type WorkbenchState = {
  layout: WorkbenchLayout;
  deployHistory: DeployHistoryRecord[];
  setLayout: (layout: Partial<WorkbenchLayout>) => void;
  addDeployHistory: (record: DeployHistoryRecord) => void;
  clearDeployHistory: () => void;
};

export const useWorkbenchStore = create<WorkbenchState>()(
  persist(
    (set) => ({
      layout: defaultWorkbenchLayout,
      deployHistory: [],
      setLayout: (layout) =>
        set((state) => ({
          layout: {
            ...state.layout,
            ...layout
          }
        })),
      addDeployHistory: (record) =>
        set((state) => ({
          deployHistory: [record, ...state.deployHistory.filter((item) => item.id !== record.id)].slice(0, deployHistoryLimit)
        })),
      clearDeployHistory: () => set({ deployHistory: [] })
    }),
    {
      name: workbenchStorageKey,
      version: workbenchStorageVersion,
      partialize: (state) => ({
        layout: state.layout,
        deployHistory: state.deployHistory
      })
    }
  )
);
```

- [ ] **Step 7: Update registry**

Modify `docs/agent/registries.md`.

Add this row to Config Registry:

```md
| `workbench-config` | `src/config/workbench-config.ts` | active | Static workbench defaults and limits | `defaultWorkbenchLayout`, `deployHistoryLimit` | Workbench store, upload controls | No runtime state |
```

Add this new Store Registry section after Utility Registry:

```md
## Store Registry

| Store | Path | Status | Responsibility | Public API | Used By | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `workbench-store` | `src/store/workbench-store.ts` | active | Persists compiler workbench layout ratios and latest 10 deploy history records | `useWorkbenchStore` | Workbench page | Does not persist uploaded files, current tabs, build payloads, tx details, or run raw output |
```

- [ ] **Step 8: Run tests**

Run:

```bash
npm test -- src/store/workbench-store.test.ts
npm run typecheck
```

Expected: both pass.

- [ ] **Step 9: Commit**

```bash
git add src/types/workbench.ts src/config/workbench-config.ts src/config/storage-config.ts src/store/workbench-store.ts src/store/workbench-store.test.ts docs/agent/registries.md
git commit -m "feat: add workbench persistent state"
```

---

## Task 2: Folder Upload Validation

**Files:**
- Modify: `src/utils/file-utils.ts`
- Modify: `src/utils/file-utils.test.ts`
- Modify: `docs/agent/registries.md`

- [ ] **Step 1: Add file-utils failure tests**

Append to `src/utils/file-utils.test.ts`:

```ts
it("rejects empty project uploads", async () => {
  await expect(analyzeProjectFiles([])).rejects.toThrow("No files were found in the upload.");
});

it("rejects uploads without TOML build targets", async () => {
  const file = new File(["hello"], "README.md");
  await expect(analyzeProjectFiles([file])).rejects.toThrow("No TOML build targets were found.");
});
```

- [ ] **Step 2: Run tests to verify failures**

Run:

```bash
npm test -- src/utils/file-utils.test.ts
```

Expected: fail because `analyzeProjectFiles` currently accepts empty/no-TOML uploads.

- [ ] **Step 3: Add upload validation**

Modify `src/utils/file-utils.ts`:

Add near `analyzeProjectFiles`:

```ts
function validateProjectFiles(files: File[]) {
  if (files.length === 0) {
    throw new Error("No files were found in the upload.");
  }
}
```

Then update `analyzeProjectFiles`:

```ts
export async function analyzeProjectFiles(files: File[]): Promise<UploadedProject> {
  validateProjectFiles(files);
  const tree: ProjectTreeNode[] = [];
  const rootName = getRootName(files);
  files.forEach((file) => addPathToTree(tree, getProjectPath(file)));
  const tomlFiles = await readTomlFiles(files);

  if (tomlFiles.length === 0) {
    throw new Error("No TOML build targets were found.");
  }

  return {
    metadata: {
      ...getProjectMetadata(files),
      name: rootName
    },
    files,
    rootName,
    tree: sortTree(tree),
    tomlFiles,
    selectedTomlPath: ""
  };
}
```

- [ ] **Step 4: Add registry note**

Update `docs/agent/registries.md` utility registry:

Update `file-utils` notes to mention validation rejects empty uploads and no TOML targets.

- [ ] **Step 5: Run tests**

```bash
npm test -- src/utils/file-utils.test.ts
npm run typecheck
```

Expected: pass.

- [ ] **Step 6: Commit**

```bash
git add src/utils/file-utils.ts src/utils/file-utils.test.ts docs/agent/registries.md
git commit -m "feat: validate workbench uploads"
```

---

## Task 3: Resizable Four-Pane Workbench Layout

**Files:**
- Create: `src/components/workbench/resizable-panels.tsx`
- Create: `src/components/workbench/resizable-panels.test.tsx`
- Create: `src/components/workbench/deploy-workbench.tsx`
- Create: `src/components/workbench/deploy-workbench.test.tsx`
- Modify: `src/layout/app-shell.tsx`
- Modify: `src/layout/app-shell.test.tsx`
- Modify: `docs/agent/registries.md`

- [ ] **Step 1: Write layout tests**

Create `src/components/workbench/deploy-workbench.test.tsx`:

```tsx
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
});
```

Create `src/components/workbench/resizable-panels.test.tsx`:

```tsx
import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { ResizeHandle } from "./resizable-panels";

describe("ResizeHandle", () => {
  it("calls drag callbacks for pointer movement", () => {
    const onDrag = vi.fn();
    renderWithProviders(<ResizeHandle ariaLabel="Resize panes" onDrag={onDrag} />);

    const handle = screen.getByRole("separator", { name: "Resize panes" });
    fireEvent.pointerDown(handle, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: 130, clientY: 120 });
    fireEvent.pointerUp(window);

    expect(onDrag).toHaveBeenCalledWith({ deltaX: 30, deltaY: 20 });
  });
});
```

- [ ] **Step 2: Run tests to verify failures**

```bash
npm test -- src/components/workbench/deploy-workbench.test.tsx src/components/workbench/resizable-panels.test.tsx
```

Expected: fail because components do not exist.

- [ ] **Step 3: Implement resize handle**

Create `src/components/workbench/resizable-panels.tsx`:

```tsx
import { useRef } from "react";

type DragDelta = {
  deltaX: number;
  deltaY: number;
};

type ResizeHandleProps = {
  ariaLabel: string;
  orientation?: "horizontal" | "vertical";
  onDrag: (delta: DragDelta) => void;
};

export function clampRatio(value: number) {
  return Math.min(85, Math.max(15, value));
}

export function ResizeHandle({ ariaLabel, orientation = "vertical", onDrag }: ResizeHandleProps) {
  const startPoint = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    startPoint.current = { x: event.clientX, y: event.clientY };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      if (!startPoint.current) {
        return;
      }

      onDrag({
        deltaX: moveEvent.clientX - startPoint.current.x,
        deltaY: moveEvent.clientY - startPoint.current.y
      });
    };

    const handlePointerUp = () => {
      startPoint.current = null;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <div
      role="separator"
      aria-label={ariaLabel}
      aria-orientation={orientation}
      className={orientation === "vertical" ? "w-1 cursor-col-resize bg-border hover:bg-primary" : "h-1 cursor-row-resize bg-border hover:bg-primary"}
      onPointerDown={handlePointerDown}
    />
  );
}
```

- [ ] **Step 4: Implement DeployWorkbench**

Create `src/components/workbench/deploy-workbench.tsx`:

```tsx
import type { ReactNode } from "react";
import type { WorkbenchLayout } from "@/types/workbench";
import { clampRatio, ResizeHandle } from "./resizable-panels";

type DeployWorkbenchProps = {
  layout: WorkbenchLayout;
  onLayoutChange: (layout: Partial<WorkbenchLayout>) => void;
  resourcePane: ReactNode;
  historyPane: ReactNode;
  tabsPane: ReactNode;
  actionsPane: ReactNode;
};

export function DeployWorkbench({ layout, onLayoutChange, resourcePane, historyPane, tabsPane, actionsPane }: DeployWorkbenchProps) {
  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <section className="flex min-h-0 flex-col border-r bg-card" style={{ width: `${layout.leftWidth}%` }}>
        <div className="min-h-0 overflow-hidden" style={{ height: `${layout.leftTopHeight}%` }}>
          {resourcePane}
        </div>
        <ResizeHandle
          ariaLabel="Resize left panes"
          orientation="horizontal"
          onDrag={({ deltaY }) => onLayoutChange({ leftTopHeight: clampRatio(layout.leftTopHeight + deltaY / 6) })}
        />
        <div className="min-h-0 flex-1 overflow-hidden">{historyPane}</div>
      </section>
      <ResizeHandle
        ariaLabel="Resize left and right panes"
        onDrag={({ deltaX }) => onLayoutChange({ leftWidth: clampRatio(layout.leftWidth + deltaX / 12) })}
      />
      <section className="flex min-h-0 flex-1 flex-col bg-background">
        <div className="min-h-0 overflow-hidden" style={{ height: `${layout.rightTopHeight}%` }}>
          {tabsPane}
        </div>
        <ResizeHandle
          ariaLabel="Resize right panes"
          orientation="horizontal"
          onDrag={({ deltaY }) => onLayoutChange({ rightTopHeight: clampRatio(layout.rightTopHeight + deltaY / 6) })}
        />
        <div className="min-h-0 flex-1 overflow-hidden border-t bg-card">{actionsPane}</div>
      </section>
    </div>
  );
}
```

- [ ] **Step 5: Modify AppShell for workbench mode**

Update `src/layout/app-shell.tsx` props:

```ts
type AppShellProps = {
  children: ReactNode;
  currentStep?: DeployStepId;
  completedSteps?: DeployStepId[];
  walletLabel: string;
  walletAddress?: string;
  onConnectWallet: () => void;
  onCopyWalletAddress: () => void;
  onDisconnectWallet: () => void;
  onOpenSettings: () => void;
  onStepBack?: (step: DeployStepId) => void;
  showProgress?: boolean;
};
```

Render progress only when requested:

```tsx
{showProgress && currentStep && completedSteps && onStepBack ? (
  <section className="border-b bg-card px-6 py-5">
    <ProgressSteps steps={deploySteps} currentStep={currentStep} completedSteps={completedSteps} onStepBack={onStepBack} />
  </section>
) : null}
<section className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</section>
```

- [ ] **Step 6: Update AppShell tests**

In `src/layout/app-shell.test.tsx`, add:

```tsx
it("can render without progress navigation for workbench mode", () => {
  renderWithProviders(
    <AppShell
      walletLabel="Connect Wallet"
      onConnectWallet={vi.fn()}
      onCopyWalletAddress={vi.fn()}
      onDisconnectWallet={vi.fn()}
      onOpenSettings={vi.fn()}
    >
      <div>Workbench body</div>
    </AppShell>
  );

  expect(screen.getByText("Workbench body")).toBeInTheDocument();
  expect(screen.queryByText("Upload")).not.toBeInTheDocument();
});
```

- [ ] **Step 7: Update registry**

Add shared/workbench component entries for `DeployWorkbench` and `ResizeHandle` in `docs/agent/registries.md`.

- [ ] **Step 8: Run tests**

```bash
npm test -- src/components/workbench/deploy-workbench.test.tsx src/components/workbench/resizable-panels.test.tsx src/layout/app-shell.test.tsx
npm run typecheck
```

Expected: pass.

- [ ] **Step 9: Commit**

```bash
git add src/components/workbench/resizable-panels.tsx src/components/workbench/resizable-panels.test.tsx src/components/workbench/deploy-workbench.tsx src/components/workbench/deploy-workbench.test.tsx src/layout/app-shell.tsx src/layout/app-shell.test.tsx docs/agent/registries.md
git commit -m "feat: add resizable workbench layout"
```

---

## Task 4: Resource Explorer And File Detail Tabs

**Files:**
- Create: `src/components/workbench/resource-explorer.tsx`
- Create: `src/components/workbench/resource-explorer.test.tsx`
- Create: `src/components/workbench/file-detail-tab.tsx`
- Create: `src/components/workbench/workbench-tabs.tsx`
- Create: `src/components/workbench/workbench-tabs.test.tsx`
- Modify: `src/components/project-tree.tsx`
- Modify: `src/components/shared/shared-components.test.tsx` or create targeted tests if project-tree tests already live elsewhere
- Modify: `docs/agent/registries.md`

- [ ] **Step 1: Write workbench tabs tests**

Create `src/components/workbench/workbench-tabs.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import type { WorkbenchTab } from "@/types/workbench";
import { WorkbenchTabs } from "./workbench-tabs";

const tabs: WorkbenchTab[] = [
  { id: "file", kind: "file-detail", title: "File Detail", createdAt: 1 },
  { id: "build", kind: "build-run", title: "build_Cargo.toml_1", createdAt: 2 }
];

describe("WorkbenchTabs", () => {
  it("renders active tab content and closes tabs", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    renderWithProviders(
      <WorkbenchTabs tabs={tabs} activeTabId="build" onSelectTab={vi.fn()} onCloseTab={onClose} renderTabContent={(tab) => <div>{tab.title} content</div>} />
    );

    expect(screen.getByText("build_Cargo.toml_1 content")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Close build_Cargo.toml_1" }));
    expect(onClose).toHaveBeenCalledWith("build");
  });

  it("renders an empty state without tabs", () => {
    renderWithProviders(<WorkbenchTabs tabs={[]} activeTabId={null} onSelectTab={vi.fn()} onCloseTab={vi.fn()} renderTabContent={() => null} />);
    expect(screen.getByText("No open tabs.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Write file detail tests**

Create `src/components/workbench/resource-explorer.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import type { UploadedProject } from "@/types/deploy";
import { ResourceExplorer } from "./resource-explorer";

const project: UploadedProject = {
  metadata: { name: "demo", fileCount: 2, totalSize: 20 },
  rootName: "demo",
  files: [new File(["[package]"], "Cargo.toml"), new File(["pub fn run() {}"], "lib.rs")],
  selectedTomlPath: "",
  tomlFiles: [{ name: "Cargo.toml", path: "demo/Cargo.toml", content: "[package]", size: 9 }],
  tree: [
    {
      name: "demo",
      path: "demo",
      type: "directory",
      children: [
        { name: "Cargo.toml", path: "demo/Cargo.toml", type: "file" },
        { name: "lib.rs", path: "demo/src/lib.rs", type: "file" }
      ]
    }
  ]
};

describe("ResourceExplorer", () => {
  it("uses a single-select control for TOML build targets", async () => {
    const user = userEvent.setup();
    const onSelectTarget = vi.fn();
    renderWithProviders(<ResourceExplorer project={project} selectedTomlPath="" onSelectFile={vi.fn()} onSelectTarget={onSelectTarget} onUploadFiles={vi.fn()} />);

    await user.click(screen.getByRole("radio", { name: "Use demo/Cargo.toml as deploy target" }));
    expect(onSelectTarget).toHaveBeenCalledWith("demo/Cargo.toml");
  });

  it("filters to TOML files with Toml only", async () => {
    const user = userEvent.setup();
    renderWithProviders(<ResourceExplorer project={project} selectedTomlPath="" onSelectFile={vi.fn()} onSelectTarget={vi.fn()} onUploadFiles={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Toml only" }));
    expect(screen.getByText("Cargo.toml")).toBeInTheDocument();
    expect(screen.queryByText("lib.rs")).not.toBeInTheDocument();
  });
});
```

Create `src/components/workbench/file-detail-tab.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "@/test/render";
import { FileDetailTab } from "./file-detail-tab";

describe("FileDetailTab", () => {
  it("previews TOML content", () => {
    renderWithProviders(<FileDetailTab filePath="demo/Cargo.toml" fileSize={9} tomlContent="[package]" />);
    expect(screen.getByDisplayValue("[package]")).toBeInTheDocument();
  });

  it("shows metadata for non-TOML files", () => {
    renderWithProviders(<FileDetailTab filePath="demo/src/lib.rs" fileSize={15} />);
    expect(screen.getByText("demo/src/lib.rs")).toBeInTheDocument();
    expect(screen.getByText("Preview is available for TOML files only.")).toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run tests to verify failures**

```bash
npm test -- src/components/workbench/workbench-tabs.test.tsx src/components/workbench/resource-explorer.test.tsx src/components/workbench/file-detail-tab.test.tsx
```

Expected: fail because components do not exist.

- [ ] **Step 4: Implement WorkbenchTabs**

Create `src/components/workbench/workbench-tabs.tsx`:

```tsx
import type { ReactNode } from "react";
import { X } from "lucide-react";
import type { WorkbenchTab } from "@/types/workbench";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

type WorkbenchTabsProps = {
  tabs: WorkbenchTab[];
  activeTabId: string | null;
  onSelectTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  renderTabContent: (tab: WorkbenchTab) => ReactNode;
};

export function WorkbenchTabs({ tabs, activeTabId, onSelectTab, onCloseTab, renderTabContent }: WorkbenchTabsProps) {
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0];

  if (!activeTab) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No open tabs.</div>;
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex gap-1 border-b bg-card p-2">
        {tabs.map((tab) => (
          <div key={tab.id} className="flex items-center rounded-md border bg-background">
            <Button type="button" variant={tab.id === activeTab.id ? "secondary" : "ghost"} size="sm" onClick={() => onSelectTab(tab.id)}>
              {tab.title}
            </Button>
            <Button type="button" variant="ghost" size="icon" aria-label={`Close ${tab.title}`} onClick={() => onCloseTab(tab.id)}>
              <X />
            </Button>
          </div>
        ))}
      </div>
      <ScrollArea className="min-h-0 flex-1 p-4">{renderTabContent(activeTab)}</ScrollArea>
    </div>
  );
}
```

- [ ] **Step 5: Implement FileDetailTab**

Create `src/components/workbench/file-detail-tab.tsx`:

```tsx
import { Textarea } from "@/components/ui/textarea";

type FileDetailTabProps = {
  filePath: string;
  fileSize: number;
  tomlContent?: string;
};

export function FileDetailTab({ filePath, fileSize, tomlContent }: FileDetailTabProps) {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">{filePath}</h2>
        <p className="text-sm text-muted-foreground">{fileSize} bytes</p>
      </div>
      {tomlContent !== undefined ? (
        <Textarea value={tomlContent} readOnly className="min-h-80 font-mono" />
      ) : (
        <p className="rounded-md border bg-card p-3 text-sm text-muted-foreground">Preview is available for TOML files only.</p>
      )}
    </div>
  );
}
```

- [ ] **Step 6: Implement ResourceExplorer**

Create `src/components/workbench/resource-explorer.tsx`:

```tsx
import { useState, type DragEvent, type InputHTMLAttributes } from "react";
import type { UploadedProject } from "@/types/deploy";
import { ProjectTree } from "@/components/project-tree";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";

type ResourceExplorerProps = {
  project: UploadedProject | null;
  selectedTomlPath: string;
  onSelectFile: (path: string) => void;
  onSelectTarget: (path: string) => void;
  onUploadFiles: (files: File[]) => Promise<void> | void;
};

const directoryInputProps = {
  webkitdirectory: "",
  directory: ""
} as InputHTMLAttributes<HTMLInputElement>;

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Failed to parse upload.";
}

export function ResourceExplorer({ project, selectedTomlPath, onSelectFile, onSelectTarget, onUploadFiles }: ResourceExplorerProps) {
  const [tomlOnly, setTomlOnly] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const uploadFiles = async (files: File[]) => {
    if (files.length === 0) {
      return;
    }

    try {
      await onUploadFiles(files);
      setUploadError(null);
    } catch (error) {
      setUploadError(errorMessage(error));
    }
  };

  const handleDrop = async (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    await uploadFiles(Array.from(event.dataTransfer.files));
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 p-3" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
      <div className="space-y-2">
        <Label htmlFor="project-folder">Project folder</Label>
        <Input id="project-folder" type="file" multiple {...directoryInputProps} onChange={(event) => void uploadFiles(Array.from(event.target.files ?? []))} />
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{project?.rootName ?? "No project loaded"}</p>
          {project ? <p className="text-caption text-muted-foreground">{project.metadata.fileCount} file(s)</p> : null}
        </div>
        <Button type="button" variant={tomlOnly ? "secondary" : "outline"} size="sm" onClick={() => setTomlOnly((value) => !value)}>
          Toml only
        </Button>
      </div>

      <ScrollArea className="min-h-0 flex-1 rounded-md border bg-background p-2">
        {project ? (
          <ProjectTree
            nodes={project.tree}
            selectedTomlPath={selectedTomlPath}
            sourceOnly={tomlOnly}
            onSelectPath={onSelectFile}
            onSelectTarget={onSelectTarget}
          />
        ) : (
          <p className="p-3 text-sm text-muted-foreground">Drop a project folder here or choose one above.</p>
        )}
      </ScrollArea>

      <AlertDialog open={Boolean(uploadError)} onOpenChange={(open) => !open && setUploadError(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Upload failed</AlertDialogTitle>
            <AlertDialogDescription>{uploadError}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>OK</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

Export the props if tests or page code need them:

```ts
export type { ResourceExplorerProps };
```

- [ ] **Step 7: Update ProjectTree for radio target selection**

Modify `src/components/project-tree.tsx` props:

```ts
type ProjectTreeProps = {
  nodes: ProjectTreeNode[];
  selectedTomlPath: string;
  sourceOnly: boolean;
  onSelectPath: (path: string) => void;
  onSelectTarget?: (path: string) => void;
};
```

No shadcn radio primitive exists in `src/components/ui`, so use a raw `input type="radio"` for the single-select deploy target. Keep the file button for opening details and the radio for target selection.

Use accessible label:

```tsx
<input
  type="radio"
  checked={selectedTomlPath === node.path}
  aria-label={`Use ${node.path} as deploy target`}
  onChange={() => onSelectTarget?.(node.path)}
/>
```

Do not use row background to indicate selected target.

- [ ] **Step 8: Run tests**

```bash
npm test -- src/components/workbench/workbench-tabs.test.tsx src/components/workbench/resource-explorer.test.tsx src/components/workbench/file-detail-tab.test.tsx src/components/shared/shared-components.test.tsx
npm run typecheck
```

Expected: pass.

- [ ] **Step 9: Update registry and commit**

Update `docs/agent/registries.md` with `ResourceExplorer`, `WorkbenchTabs`, `FileDetailTab`.

Commit:

```bash
git add src/components/workbench/resource-explorer.tsx src/components/workbench/resource-explorer.test.tsx src/components/workbench/workbench-tabs.tsx src/components/workbench/workbench-tabs.test.tsx src/components/workbench/file-detail-tab.tsx src/components/workbench/file-detail-tab.test.tsx src/components/project-tree.tsx docs/agent/registries.md
git commit -m "feat: add resource explorer and workbench tabs"
```

---

## Task 5: Raw-First Run Output, Action Deck, And Deploy History UI

**Files:**
- Create: `src/components/workbench/run-output-tab.tsx`
- Create: `src/components/workbench/run-output-tab.test.tsx`
- Create: `src/components/workbench/action-deck.tsx`
- Create: `src/components/workbench/action-deck.test.tsx`
- Create: `src/components/workbench/deploy-history-panel.tsx`
- Create: `src/components/workbench/deploy-history-panel.test.tsx`
- Modify: `docs/agent/registries.md`

- [ ] **Step 1: Write RunOutputTab tests**

Create `src/components/workbench/run-output-tab.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import type { WorkbenchTab } from "@/types/workbench";
import { RunOutputTab } from "./run-output-tab";

describe("RunOutputTab", () => {
  it("renders raw output and copies ABI item", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn();
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const tab: WorkbenchTab = {
      id: "build-1",
      kind: "build-run",
      title: "build_Cargo.toml_1",
      createdAt: 1,
      status: "success",
      raw: { jsonrpc: "2.0", result: "0xabc" },
      env: { buildMethodAbiItem: { type: "function", name: "build", inputs: [] } }
    };

    renderWithProviders(<RunOutputTab tab={tab} onRetryTransaction={vi.fn()} />);
    expect(screen.getByText(/"result": "0xabc"/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Copy ABI" }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('"name": "build"'));
  });

  it("shows transaction lookup pending and found states", () => {
    const tab: WorkbenchTab = {
      id: "deploy-1",
      kind: "deploy-run",
      title: "deploy_Cargo.toml_1",
      createdAt: 1,
      status: "loading",
      raw: { transactionHash: "0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318" }
    };

    const { rerender } = renderWithProviders(<RunOutputTab tab={tab} onRetryTransaction={vi.fn()} />);
    expect(screen.getByLabelText("Transaction lookup pending")).toBeInTheDocument();

    rerender(<RunOutputTab tab={{ ...tab, status: "success", transactionRaw: { hash: "0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318" } }} onRetryTransaction={vi.fn()} />);
    expect(screen.getByLabelText("Transaction found")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Write ActionDeck and History tests**

Create `src/components/workbench/action-deck.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { ActionDeck } from "./action-deck";

describe("ActionDeck", () => {
  it("shows a target hint without selected TOML", () => {
    renderWithProviders(<ActionDeck selectedTomlPath="" isBuilding={false} isDeploying={false} onBuild={vi.fn()} onDeploy={vi.fn()} />);
    expect(screen.getByText("Select a TOML target to build or deploy.")).toBeInTheDocument();
  });

  it("renders build and deploy cards after target selection", async () => {
    const user = userEvent.setup();
    const onDeploy = vi.fn();
    renderWithProviders(<ActionDeck selectedTomlPath="demo/Cargo.toml" isBuilding={false} isDeploying={false} onBuild={vi.fn()} onDeploy={onDeploy} />);
    await user.click(screen.getByRole("button", { name: "Deploy demo/Cargo.toml" }));
    expect(onDeploy).toHaveBeenCalledTimes(1);
  });
});
```

Create `src/components/workbench/deploy-history-panel.test.tsx`:

```tsx
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
  env: { rpcEndpoint: "http://localhost:8545" }
};

describe("DeployHistoryPanel", () => {
  it("opens deploy history records", async () => {
    const user = userEvent.setup();
    const onOpen = vi.fn();
    renderWithProviders(<DeployHistoryPanel records={[record]} onOpenRecord={onOpen} />);
    await user.click(screen.getByRole("button", { name: "Open deploy history demo/Cargo.toml" }));
    expect(onOpen).toHaveBeenCalledWith(record);
  });
});
```

- [ ] **Step 3: Run tests to verify failures**

```bash
npm test -- src/components/workbench/run-output-tab.test.tsx src/components/workbench/action-deck.test.tsx src/components/workbench/deploy-history-panel.test.tsx
```

Expected: fail because components do not exist.

- [ ] **Step 4: Implement RunOutputTab**

Create `src/components/workbench/run-output-tab.tsx`:

```tsx
import { CheckCircle2, Copy, Loader2 } from "lucide-react";
import type { WorkbenchTab } from "@/types/workbench";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

type RunOutputTabProps = {
  tab: WorkbenchTab;
  onRetryTransaction: (tab: WorkbenchTab) => void;
};

function getTxHash(raw: unknown) {
  return raw && typeof raw === "object" && "transactionHash" in raw ? String((raw as { transactionHash?: unknown }).transactionHash) : undefined;
}

function copyJson(value: unknown) {
  return navigator.clipboard.writeText(JSON.stringify(value, null, 2));
}

function JsonBlock({ value, label }: { value: unknown; label: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{label}</h3>
        <Button type="button" variant="outline" size="sm" onClick={() => void copyJson(value)}>
          <Copy />
          Copy {label}
        </Button>
      </div>
      <ScrollArea className="h-64 rounded-md border bg-card">
        <div className="w-full overflow-x-auto p-4">
          <pre className="w-max min-w-full whitespace-pre text-sm">{JSON.stringify(value, null, 2)}</pre>
        </div>
      </ScrollArea>
    </div>
  );
}

function EnvDialog({ tab }: { tab: WorkbenchTab }) {
  if (!tab.env) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Env
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Run environment</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-80 rounded-md border bg-card">
          <pre className="w-max min-w-full whitespace-pre p-4 text-sm">{JSON.stringify(tab.env, null, 2)}</pre>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export function RunOutputTab({ tab, onRetryTransaction }: RunOutputTabProps) {
  const txHash = getTxHash(tab.raw);
  const abiItem = tab.env?.deployMethodAbiItem ?? tab.env?.buildMethodAbiItem;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{tab.status ?? "idle"}</Badge>
          {tab.targetFile ? <Badge variant="outline">{tab.targetFile}</Badge> : null}
          {tab.status === "loading" ? <Loader2 aria-label="Run loading" className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
        </div>
        <EnvDialog tab={tab} />
      </div>

      {tab.error ? <p className="rounded-md border border-destructive bg-card p-3 text-sm text-destructive">{tab.error}</p> : null}

      {txHash ? (
        <div className="rounded-md border bg-card p-3">
          <p className="text-caption text-muted-foreground">Transaction Hash</p>
          <div className="flex items-start gap-2">
            {tab.transactionRaw ? <CheckCircle2 aria-label="Transaction found" className="mt-0.5 h-4 w-4 text-primary" /> : <Loader2 aria-label="Transaction lookup pending" className="mt-0.5 h-4 w-4 animate-spin text-muted-foreground" />}
            <p className="break-all font-mono text-sm">{txHash}</p>
          </div>
          {!tab.transactionRaw && tab.kind === "deploy-history" ? (
            <Button type="button" variant="outline" size="sm" className="mt-3" onClick={() => onRetryTransaction(tab)}>
              Retry
            </Button>
          ) : null}
        </div>
      ) : null}

      {tab.raw ? <JsonBlock value={tab.raw} label="Raw" /> : null}
      {tab.transactionRaw ? <JsonBlock value={tab.transactionRaw} label="Transaction" /> : null}
      {abiItem ? <JsonBlock value={abiItem} label="ABI" /> : null}
    </div>
  );
}
```

- [ ] **Step 5: Implement ActionDeck**

Create `src/components/workbench/action-deck.tsx`:

```tsx
import { Hammer, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

type ActionDeckProps = {
  selectedTomlPath: string;
  isBuilding: boolean;
  isDeploying: boolean;
  onBuild: () => void;
  onDeploy: () => void;
};

export function ActionDeck({ selectedTomlPath, isBuilding, isDeploying, onBuild, onDeploy }: ActionDeckProps) {
  if (!selectedTomlPath) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Select a TOML target to build or deploy.</div>;
  }

  return (
    <div className="grid h-full gap-4 p-4 md:grid-cols-2">
      <Button type="button" variant="outline" className="h-full flex-col items-start justify-start p-4 text-left" disabled={isBuilding} onClick={onBuild} aria-label={`Build ${selectedTomlPath}`}>
        <Hammer />
        <span className="text-base font-semibold">{isBuilding ? "Building..." : "Build"}</span>
        <span className="text-sm text-muted-foreground">{selectedTomlPath}</span>
      </Button>
      <Button type="button" className="h-full flex-col items-start justify-start p-4 text-left" disabled={isDeploying} onClick={onDeploy} aria-label={`Deploy ${selectedTomlPath}`}>
        <Rocket />
        <span className="text-base font-semibold">{isDeploying ? "Deploying..." : "Deploy"}</span>
        <span className="text-sm text-primary-foreground">Builds first when needed.</span>
      </Button>
    </div>
  );
}
```

- [ ] **Step 6: Implement DeployHistoryPanel**

Create `src/components/workbench/deploy-history-panel.tsx`:

```tsx
import type { DeployHistoryRecord } from "@/types/workbench";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { shortHash } from "@/utils/format-utils";

type DeployHistoryPanelProps = {
  records: DeployHistoryRecord[];
  onOpenRecord: (record: DeployHistoryRecord) => void;
};

export function DeployHistoryPanel({ records, onOpenRecord }: DeployHistoryPanelProps) {
  if (records.length === 0) {
    return <div className="p-4 text-sm text-muted-foreground">No deploy history yet.</div>;
  }

  return (
    <ScrollArea className="h-full">
      <div className="space-y-2 p-3">
        {records.map((record) => (
          <Button
            key={record.id}
            type="button"
            variant="ghost"
            className="h-auto w-full flex-col items-start gap-1 text-left"
            aria-label={`Open deploy history ${record.targetFile}`}
            onClick={() => onOpenRecord(record)}
          >
            <span className="font-medium">{record.targetFile}</span>
            <span className="font-mono text-caption text-muted-foreground">{shortHash(record.txHash)}</span>
          </Button>
        ))}
      </div>
    </ScrollArea>
  );
}
```

- [ ] **Step 7: Update registry**

Add `RunOutputTab`, `ActionDeck`, and `DeployHistoryPanel` to `docs/agent/registries.md`.

- [ ] **Step 8: Run tests**

```bash
npm test -- src/components/workbench/run-output-tab.test.tsx src/components/workbench/action-deck.test.tsx src/components/workbench/deploy-history-panel.test.tsx
npm run typecheck
```

Expected: pass.

- [ ] **Step 9: Commit**

```bash
git add src/components/workbench/run-output-tab.tsx src/components/workbench/run-output-tab.test.tsx src/components/workbench/action-deck.tsx src/components/workbench/action-deck.test.tsx src/components/workbench/deploy-history-panel.tsx src/components/workbench/deploy-history-panel.test.tsx docs/agent/registries.md
git commit -m "feat: add workbench run outputs"
```

---

## Task 6: Page Orchestration For Upload, Tabs, Build, Deploy, And History

**Files:**
- Modify: `src/pages/index.tsx`
- Modify: `src/pages/index.test.tsx`

- [ ] **Step 1: Replace page tests with workbench behavior**

Update `src/pages/index.test.tsx` to cover:

```tsx
it("renders the workbench without wizard progress", () => {
  renderWithProviders(<HomePage />);
  expect(screen.getByText("Cloud Deploy")).toBeInTheDocument();
  expect(screen.queryByText("Upload")).not.toBeInTheDocument();
  expect(screen.getByText("Select a TOML target to build or deploy.")).toBeInTheDocument();
});
```

Add upload/target test:

```tsx
it("shows build and deploy actions after selecting a TOML target", async () => {
  const user = userEvent.setup();
  renderWithProviders(<HomePage />);
  await user.upload(screen.getByLabelText("Project folder"), [
    folderFile('[package]\nname = "demo"\n', "Cargo.toml", "demo/Cargo.toml"),
    folderFile("pub fn run() {}", "lib.rs", "demo/src/lib.rs")
  ]);
  await user.click(await screen.findByRole("radio", { name: "Use demo/Cargo.toml as deploy target" }));
  expect(screen.getByRole("button", { name: "Build demo/Cargo.toml" })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Deploy demo/Cargo.toml" })).toBeInTheDocument();
});
```

Add deploy auto-build test with mocks for `dispatchSelectedMethod`:

```tsx
const dispatchSelectedMethodMock = vi.hoisted(() => vi.fn());

vi.mock("@/utils/request/request-dispatcher", () => ({
  dispatchSelectedMethod: dispatchSelectedMethodMock
}));

it("auto-builds before deploy when no build payload exists", async () => {
  const user = userEvent.setup();
  dispatchSelectedMethodMock
    .mockResolvedValueOnce({
      jsonrpc: "2.0",
      result: JSON.stringify({
        code: "0x1234",
        salt: "0x0000000000000000000000000000000000000000000000000000000000000000",
        initArgs: "0xabcd",
        sourceHash: "0x1111111111111111111111111111111111111111111111111111111111111111",
        artifactHash: "0x2222222222222222222222222222222222222222222222222222222222222222",
        metadata: "demo"
      })
    })
    .mockResolvedValueOnce({
      transactionHash: "0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318",
      status: "submitted",
      transactionLookupPending: true
    });

  renderWithProviders(<HomePage />);
  await user.upload(screen.getByLabelText("Project folder"), [
    folderFile('[package]\nname = "demo"\n', "Cargo.toml", "demo/Cargo.toml")
  ]);
  await user.click(await screen.findByRole("radio", { name: "Use demo/Cargo.toml as deploy target" }));
  await user.click(screen.getByRole("button", { name: "Deploy demo/Cargo.toml" }));

  await screen.findByText((text) => text.startsWith("deploy_Cargo.toml_"));
  expect(dispatchSelectedMethodMock).toHaveBeenCalledTimes(2);
});
```

- [ ] **Step 2: Run page tests to verify failures**

```bash
npm test -- src/pages/index.test.tsx
```

Expected: fail because page still renders wizard.

- [ ] **Step 3: Implement current-session state in HomePage**

In `src/pages/index.tsx`, replace wizard step state usage with local state:

```ts
const [uploadedProject, setUploadedProject] = useState<UploadedProject | null>(null);
const [selectedTomlPath, setSelectedTomlPath] = useState("");
const [tabs, setTabs] = useState<WorkbenchTab[]>([]);
const [activeTabId, setActiveTabId] = useState<string | null>(null);
const [buildPayloadByTarget, setBuildPayloadByTarget] = useState<Record<string, ReviewPayload>>({});
const [isBuilding, setIsBuilding] = useState(false);
const [isDeploying, setIsDeploying] = useState(false);
```

Use `useWorkbenchStore()` for `layout`, `setLayout`, `deployHistory`, `addDeployHistory`.

- [ ] **Step 4: Add tab helpers in HomePage**

Implement:

```ts
const fileDetailTabId = "file-detail";

function fileNameFromPath(path: string) {
  return path.split("/").filter(Boolean).at(-1) ?? path;
}

function runTitle(action: "build" | "deploy", targetPath: string, timestamp: number) {
  return `${action}_${fileNameFromPath(targetPath)}_${timestamp}`;
}

function appendTab(tab: WorkbenchTab) {
  setTabs((currentTabs) => [...currentTabs, tab]);
  setActiveTabId(tab.id);
}

function updateTab(tabId: string, patch: Partial<WorkbenchTab>) {
  setTabs((currentTabs) => currentTabs.map((tab) => (tab.id === tabId ? { ...tab, ...patch } : tab)));
}

function closeTab(tabId: string) {
  setTabs((currentTabs) => {
    const nextTabs = currentTabs.filter((tab) => tab.id !== tabId);
    setActiveTabId((currentActiveTabId) => (currentActiveTabId === tabId ? nextTabs.at(-1)?.id ?? null : currentActiveTabId));
    return nextTabs;
  });
}

function openOrUpdateFileTab(path: string) {
  const timestamp = Date.now();
  setTabs((currentTabs) => {
    const existing = currentTabs.find((tab) => tab.id === fileDetailTabId);
    const nextTab: WorkbenchTab = {
      ...(existing ?? { id: fileDetailTabId, kind: "file-detail", createdAt: timestamp, title: "File Detail" }),
      targetFile: path
    };
    return existing ? currentTabs.map((tab) => (tab.id === fileDetailTabId ? nextTab : tab)) : [...currentTabs, nextTab];
  });
  setActiveTabId(fileDetailTabId);
}
```

Add these helpers for rendering file detail content:

```ts
function filePathFor(file: File) {
  return ((file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name).replace(/^\/+/, "");
}

function findProjectFile(path: string) {
  return uploadedProject?.files.find((file) => filePathFor(file) === path);
}

function renderFileDetail(tab: WorkbenchTab) {
  const path = tab.targetFile ?? "";
  const toml = uploadedProject?.tomlFiles.find((file) => file.path === path);
  const file = findProjectFile(path);

  return <FileDetailTab filePath={path} fileSize={toml?.size ?? file?.size ?? 0} tomlContent={toml?.content} />;
}
```

- [ ] **Step 5: Implement upload handler**

In HomePage:

```ts
const handleUploadFiles = async (files: File[]) => {
  const project = await analyzeProjectFiles(files);
  setUploadedProject(project);
  setSelectedTomlPath("");
  setTabs([]);
  setActiveTabId(null);
  setBuildPayloadByTarget({});
};
```

ResourceExplorer catches and dialogs errors.

- [ ] **Step 6: Implement build runner**

Implement these helpers in `src/pages/index.tsx`:

```ts
function errorText(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function createEnv(buildMethod?: NormalizedAbiMethod, deployMethod?: NormalizedAbiMethod): WorkbenchEnv {
  return {
    rpcEndpoint: settings.rpcEndpoint,
    lyquidId: settings.lyquidId,
    walletAddress: account.address,
    buildMethod: settings.buildMethod,
    deployMethod: settings.deployMethod,
    buildMethodAbiItem: buildMethod?.abiItem,
    deployMethodAbiItem: deployMethod?.abiItem
  };
}

async function runBuildForTarget(targetPath: string, tabId: string) {
  if (!settings.parsedAbi || !uploadedProject) {
    const message = "Upload and valid ABI settings are required.";
    updateTab(tabId, { status: "error", error: message });
    throw new Error(message);
  }

  const buildMethod = findMethod(settings.parsedAbi, settings.buildMethod);

  if (!buildMethod) {
    const message = "Selected build method does not exist.";
    updateTab(tabId, { status: "error", error: message });
    throw new Error(message);
  }

  try {
    const projectForTarget = { ...uploadedProject, selectedTomlPath: targetPath };
    const { args, sourceHash } = await prepareBuildMethodCall({ method: buildMethod, project: projectForTarget });
    const raw = await dispatchSelectedMethod({
      parsedAbi: settings.parsedAbi,
      selectedMethod: settings.buildMethod,
      args,
      context: {
        rpcEndpoint: settings.rpcEndpoint,
        lyquidId: settings.lyquidId,
        accountAddress: account.address,
        offChainFetch: (input, init) => fetch(input, init)
      }
    });
    const artifactHash = await hashPayload(raw);
    const reviewPayload: ReviewPayload = {
      hashes: { sourceHash, artifactHash },
      payload: raw
    };

    setBuildPayloadByTarget((current) => ({ ...current, [targetPath]: reviewPayload }));
    updateTab(tabId, { status: "success", raw, env: createEnv(buildMethod) });
    return reviewPayload;
  } catch (error) {
    const message = errorText(error, "Build failed.");
    updateTab(tabId, { status: "error", error: message, env: createEnv(buildMethod) });
    throw error;
  }
}
```

- [ ] **Step 7: Implement Build click**

Add this handler:

```ts
async function handleBuild() {
  if (!selectedTomlPath) {
    return;
  }

  const timestamp = Date.now();
  const tabId = `build:${selectedTomlPath}:${timestamp}`;
  appendTab({
    id: tabId,
    kind: "build-run",
    title: runTitle("build", selectedTomlPath, timestamp),
    createdAt: timestamp,
    status: "loading",
    targetFile: selectedTomlPath
  });

  try {
    setIsBuilding(true);
    await runBuildForTarget(selectedTomlPath, tabId);
  } finally {
    setIsBuilding(false);
  }
}
```

- [ ] **Step 8: Implement Deploy click**

Add this deploy handler shape:

```ts
async function handleDeploy() {
  if (!selectedTomlPath) {
    return;
  }

  const timestamp = Date.now();
  const tabId = `deploy:${selectedTomlPath}:${timestamp}`;
  appendTab({
    id: tabId,
    kind: "deploy-run",
    title: runTitle("deploy", selectedTomlPath, timestamp),
    createdAt: timestamp,
    status: "loading",
    targetFile: selectedTomlPath
  });

  try {
    setIsDeploying(true);

    if (!account.address) {
      throw new Error("Connect wallet before deploying.");
    }

    if (!settings.parsedAbi || !uploadedProject) {
      throw new Error("Upload and valid ABI settings are required.");
    }

    const buildMethod = findMethod(settings.parsedAbi, settings.buildMethod);
    const deployMethod = findMethod(settings.parsedAbi, settings.deployMethod);

    if (!buildMethod || !deployMethod) {
      throw new Error("Selected deploy method does not exist.");
    }

    let reviewPayload = buildPayloadByTarget[selectedTomlPath];

    if (!reviewPayload) {
      reviewPayload = await runBuildForTarget(selectedTomlPath, tabId);
      updateTab(tabId, { status: "loading" });
    }

    const { args } = prepareDeployMethodCall({
      buildMethod,
      deployMethod,
      project: { ...uploadedProject, selectedTomlPath },
      reviewPayload
    });
    const raw = await dispatchSelectedMethod({
      parsedAbi: settings.parsedAbi,
      selectedMethod: settings.deployMethod,
      args,
      context: {
        rpcEndpoint: settings.rpcEndpoint,
        lyquidId: settings.lyquidId,
        accountAddress: account.address,
        walletClient: createBrowserWalletTransactionClient((window as BrowserWindowWithWallet).ethereum),
        offChainFetch: (input, init) => fetch(input, init)
      }
    });
    const transactionHash = typeof raw === "object" && raw && "transactionHash" in raw ? String(raw.transactionHash) : undefined;
    const env = createEnv(buildMethod, deployMethod);

    updateTab(tabId, { status: "success", raw, env });

    if (transactionHash?.startsWith("0x")) {
      addDeployHistory({
        id: `${transactionHash}:${timestamp}`,
        txHash: transactionHash as `0x${string}`,
        timestamp,
        targetFile: selectedTomlPath,
        status: "submitted",
        env
      });
    }
  } catch (error) {
    updateTab(tabId, { status: "error", error: errorText(error, "Deploy failed.") });
  } finally {
    setIsDeploying(false);
  }
}
```

- [ ] **Step 9: Implement history open and retry**

Add these helpers:

```ts
async function lookupHistoryTransaction(tabId: string, record: DeployHistoryRecord) {
  updateTab(tabId, { status: "loading", error: undefined });

  try {
    const transactionRaw = await fetchRpcTransaction({
      rpcEndpoint: record.env.rpcEndpoint,
      transactionHash: record.txHash,
      offChainFetch: (input, init) => fetch(input, init)
    });
    updateTab(tabId, { status: "success", transactionRaw });
  } catch (error) {
    updateTab(tabId, { status: "error", error: errorText(error, "Failed to fetch RPC transaction.") });
  }
}

function openHistoryRecord(record: DeployHistoryRecord) {
  const tabId = `history:${record.id}`;
  setTabs((currentTabs) => {
    const existing = currentTabs.find((tab) => tab.id === tabId);
    if (existing) {
      return currentTabs;
    }

    return [
      ...currentTabs,
      {
        id: tabId,
        kind: "deploy-history",
        title: `history_${fileNameFromPath(record.targetFile)}_${record.timestamp}`,
        createdAt: Date.now(),
        status: "loading",
        targetFile: record.targetFile,
        raw: { transactionHash: record.txHash },
        env: record.env
      }
    ];
  });
  setActiveTabId(tabId);
  void lookupHistoryTransaction(tabId, record);
}

function retryTransaction(tab: WorkbenchTab) {
  const record = deployHistory.find((item) => `history:${item.id}` === tab.id);
  if (record) {
    void lookupHistoryTransaction(tab.id, record);
  }
}
```

- [ ] **Step 10: Wire DeployWorkbench**

Replace the page return body with this workbench composition while preserving the existing `SettingsDialog` below `AppShell`:

```tsx
<AppShell
  showProgress={false}
  walletLabel={walletLabel}
  walletAddress={account.address}
  onConnectWallet={connectWallet}
  onCopyWalletAddress={copyWalletAddress}
  onDisconnectWallet={disconnect}
  onOpenSettings={() => setSettingsOpen(true)}
>
  <DeployWorkbench
    layout={layout}
    onLayoutChange={setLayout}
    resourcePane={
      <ResourceExplorer
        project={uploadedProject}
        selectedTomlPath={selectedTomlPath}
        onSelectFile={openOrUpdateFileTab}
        onSelectTarget={setSelectedTomlPath}
        onUploadFiles={handleUploadFiles}
      />
    }
    historyPane={<DeployHistoryPanel records={deployHistory} onOpenRecord={openHistoryRecord} />}
    tabsPane={
      <WorkbenchTabs
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={setActiveTabId}
        onCloseTab={closeTab}
        renderTabContent={renderTabContent}
      />
    }
    actionsPane={
      <ActionDeck
        selectedTomlPath={selectedTomlPath}
        isBuilding={isBuilding}
        isDeploying={isDeploying}
        onBuild={handleBuild}
        onDeploy={handleDeploy}
      />
    }
  />
</AppShell>
```

- [ ] **Step 11: Run targeted tests**

```bash
npm test -- src/pages/index.test.tsx src/components/workbench/deploy-workbench.test.tsx src/components/workbench/resource-explorer.test.tsx src/components/workbench/run-output-tab.test.tsx
npm run typecheck
```

Expected: pass.

- [ ] **Step 12: Commit**

```bash
git add src/pages/index.tsx src/pages/index.test.tsx
git commit -m "feat: wire compiler workbench page"
```

---

## Task 7: Final Cleanup, Registry Alignment, And Verification

**Files:**
- Modify: `docs/agent/registries.md`

- [ ] **Step 1: Find obsolete references**

Run:

```bash
rg -n "BuildStep|ReviewStep|DeployStep|ProgressSteps|deploySteps|currentStep|goToStep|ReviewPayload" src docs/agent
```

Expected: only tests or intentionally retained legacy files reference wizard components.

- [ ] **Step 2: Keep legacy wizard files for now**

Do not delete wizard files in this plan. Keep these files until a separate cleanup plan removes their tests and registry entries:

- `src/components/build-step.tsx`
- `src/components/review-step.tsx`
- `src/components/deploy-step.tsx`
- `src/components/shared/progress-steps.tsx`
- `src/config/deploy-steps-config.ts`

This keeps the workbench migration focused and avoids bundling unrelated deletion churn into the UI rewrite.

- [ ] **Step 3: Update registries**

Ensure `docs/agent/registries.md` accurately lists:

- `DeployWorkbench`
- `ResourceExplorer`
- `WorkbenchTabs`
- `RunOutputTab`
- `ActionDeck`
- `DeployHistoryPanel`
- `FileDetailTab`
- `workbench-store`
- `workbench-config`
- Updated `file-utils`

Mark wizard-only shared components as deprecated if they remain in source and are no longer used by `src/pages/index.tsx`.

- [ ] **Step 4: Full test suite**

Run:

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 5: Typecheck**

Run:

```bash
npm run typecheck
```

Expected: pass.

- [ ] **Step 6: Lint**

Run:

```bash
npm run lint
```

Expected: 0 errors. Existing warnings in `src/components/ui/badge.tsx` and `src/components/ui/button.tsx` may remain unless this task intentionally addresses shadcn exports.

- [ ] **Step 7: Build**

Run:

```bash
npm run build
```

Expected: pass.

- [ ] **Step 8: Browser smoke test**

Start dev server:

```bash
npm run dev -- --host 127.0.0.1
```

Open `http://127.0.0.1:5173/` in the in-app browser and verify:

- Header renders.
- Wizard progress is absent.
- Four workbench regions render.
- Selecting/uploading a folder with `Cargo.toml` shows TOML radio.
- Selecting TOML reveals Build and Deploy cards.
- There are no console errors on initial load.

- [ ] **Step 9: Final commit**

```bash
git add .
git commit -m "chore: finalize compiler workbench UI"
```

If there are no changes after verification cleanup, skip this commit.

---

## Self-Review Notes

- Spec coverage:
  - Four resizable panes: Task 3.
  - Folder upload validation and parse dialog path: Tasks 2 and 4.
  - TOML-only tree and radio target selection: Task 4.
  - Closable tabs and file detail behavior: Task 4.
  - Raw-first build/deploy/history output: Task 5.
  - Build/deploy cards and auto-build deploy: Tasks 5 and 6.
  - Deploy history latest 10 and historical RPC lookup: Tasks 1, 5, and 6.
  - Persistence boundaries: Tasks 1 and 6.
  - Full verification: Task 7.
- No IndexedDB is introduced.
- Uploaded files and current tabs remain current-session state.
- Deploy history stores only txHash, timestamp, targetFile, status, and env; it does not store tx details, receipt, calldata, transaction raw, or deploy raw.
