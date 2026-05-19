# Cloud Deploy Capability Registries

This file is a locator and ownership map for reusable capabilities in Cloud Deploy.
It is not the API source of truth. Source exports and TypeScript types own the usable API.

If this registry and source disagree, follow source and update this file in the same
change unless the user explicitly asked for read-only work.

If a task follows this file, mention `Followed docs/agent/registries.md registries.` in the final response.

## How To Use This File

- Check this file before creating or reusing reusable UI, utilities, stores, or static config.
- Read the listed source file before importing a capability. Do not rely only on the summary.
- Keep shadcn/ui wrappers under `src/components/ui`.
- Keep shared business components under `src/components/shared` when they are broadly reusable.
- Keep workbench-only components under `src/components/workbench` unless they become reusable across workflows.
- Do not register page-local components here.

## Registry Status

- `candidate`: recommended locator hint. Do not assume the source file exists, and do not implement it unless the current task needs that reusable capability.
- `active`: source should exist and may be used after reading the registered path. Source exports and TypeScript types override registry summaries.
- `deprecated`: do not use for new work unless maintaining existing usage.

## shadcn/ui Registry

The project has shadcn/ui wrapper components installed under `src/components/ui`. These are generic UI primitives and composed controls.

Do not register every shadcn primitive here. The wrapper path is mechanically discoverable from `src/components/ui`, and the source file is the API truth. Add an entry here only when a shadcn wrapper is customized, deprecated, renamed, has project-specific behavior, or needs special usage notes.

Import pattern:

```tsx
import { Button } from "@/components/ui/button";
```

Use shadcn/ui wrappers for generic controls. Shared components should also be composed from shadcn/ui primitives when they fit. Create a shared component only when it owns reusable Cloud Deploy business behavior, not just styling.

Special shadcn entries:

| Capability | Path | Owner / Notes |
| --- | --- | --- |
| Adaptive button | `src/components/ui/button.tsx` | Customized from upstream shadcn. Default size is `content`; `content`, `default`, `sm`, and `lg` use padding-driven sizing with no fixed width, height, min-width, or min-height. `icon` keeps a fixed square target. |
| Adaptive input | `src/components/ui/input.tsx` | Customized from upstream shadcn. Wrapper does not force full width or fixed height; local layout owns `w-full` or other constraints when needed. |
| Adaptive textarea | `src/components/ui/textarea.tsx` | Customized from upstream shadcn. Wrapper does not force full width or fixed min-height; use rows or local layout constraints when a surface needs a larger editor. |
| Adaptive select trigger | `src/components/ui/select.tsx` | Customized from upstream shadcn. `SelectTrigger` does not force full width or fixed height; local layout owns field width. Select popover viewport may still use Radix trigger CSS variables for alignment. |
| Flex dialog content | `src/components/ui/dialog.tsx` | Customized from upstream shadcn. Dialog content uses `flex flex-col` instead of grid to match the project flex-first layout rule. |
| Flex alert dialog content | `src/components/ui/alert-dialog.tsx` | Customized from upstream shadcn. Alert dialog content uses `flex flex-col` instead of grid to match the project flex-first layout rule. |

### shadcn Notes

- Raw interactive/form elements are acceptable inside shadcn wrapper files.
- Application code should use these wrappers when they fit.
- `button.tsx` is the generic action primitive. Do not create a shared button just to rename or restyle it.
- If future upstream shadcn wrappers are added, keep generic wrapper implementation in `src/components/ui`, remove fixed box sizing from ordinary controls before use, and register unusual project-specific behavior here.

## Shared Component Registry

Shared components usually live in `src/components/shared`. Add a component here only when the same business behavior appears in multiple places or when it removes meaningful complexity from pages. Workbench-only reusable panes may remain in `src/components/workbench` and still be registered here because they are reusable within the workbench surface.

This registry is the first lookup table for reusable Cloud Deploy UI behavior. It is an index, not full component documentation.

When adding a shared component, update this registry with its path, status, responsibility, public props summary, and shadcn overlap. Also check whether a shadcn component already covers the same job. If there is overlap, document the difference so future agents can choose correctly.

The `Key Props` column is a selection aid. The component's exported props type is the API contract.

| Component | Path | Status | Responsibility | Key Props | Prefer Over shadcn When | shadcn Overlap |
| --- | --- | --- | --- | --- | --- | --- |
| `AppHeader` | `src/components/shared/app-header.tsx` | active | Global top bar with product name, wallet connect/profile menu, and settings trigger | `walletLabel`, `walletAddress`, `onConnectWallet`, `onCopyWalletAddress`, `onDisconnectWallet`, `onOpenSettings` | Rendering the app-level header | Uses `Button` |
| `ProgressSteps` | `src/components/shared/progress-steps.tsx` | active | Four-step deploy progress with current step, completed states, and back navigation support | `steps`, `currentStep`, `completedSteps`, `onStepBack` | Showing the Cloud Deploy workflow | Uses `Button`, `Progress`, `Badge` |
| `SettingsDialog` | `src/components/shared/settings-dialog.tsx` | active | Persisted settings editor for RPC endpoint, Lyquid ID, ABI, Build Method, and Deploy Method | `open`, `onOpenChange`, `settings`, `methodOptions`, `methodErrors`, `onSave` | Editing Cloud Deploy settings together | Uses `Dialog`, `Input`, `Textarea`, `Select`, `Button`, `Label` |
| `AbiMethodSelect` | `src/components/shared/abi-method-select.tsx` | active | ABI-backed method dropdown with missing-method error display | `methods`, `value`, `onValueChange`, `missingMessage` | Selecting Build Method or Deploy Method from parsed ABI options | Uses `Select`, `Label` |
| `ConstructorParamsForm` | `src/components/shared/constructor-params-form.tsx` | active | Renders constructor inputs from ABI-derived fields and returns collected values | `constructorFields`, `values`, `onValuesChange` | A target Lyquid constructor schema must be collected | Uses `Input`, `Label` |
| `PayloadReviewPanel` | `src/components/shared/payload-review-panel.tsx` | active | Displays hashes, prepared/deploy payload, raw JSON, copy, and download actions | `hashes`, `payload`, `onCopy`, `onDownload` | Step 3 reviews build/deploy output | Uses `Button`; raw overflow containers for JSON |
| `ResultSummary` | `src/components/shared/result-summary.tsx` | active | Displays deploy result fields, raw response, transaction lookup state, collapsible calldata, and copyable target contract ABI | `result` | Step 4 displays deployment result | Uses `Badge`, `Button`; raw overflow containers for JSON/calldata |
| `ProjectTree` | `src/components/project-tree.tsx` | active | Displays uploaded project paths with directory expand/collapse, optional TOML-only filtering, and optional explicit TOML target radio selection | `nodes`, `selectedTomlPath`, `sourceOnly`, `onSelectPath`, `onSelectTarget`, `showTargetSelector` | Rendering uploaded resources in legacy upload and workbench explorer | Uses `Button`; raw radio only when target selector is enabled because no shadcn radio primitive is currently installed |
| `ResourceExplorer` | `src/components/workbench/resource-explorer.tsx` | active | Workbench folder upload, parse error dialog, TOML-only filter, resource tree, and deploy target selection | `project`, `selectedTomlPath`, `onProjectChange`, `onSelectTarget`, `onOpenFile` | Workbench resource pane | Uses `Input`, `Label`, `Button`, `Dialog`, `ProjectTree`; raw overflow container for tree |
| `WorkbenchTabs` | `src/components/workbench/workbench-tabs.tsx` | active | Closable compiler-style tab strip and active tab content viewport | `tabs`, `activeTabId`, `onActiveTabChange`, `onCloseTab`, `renderTabContent` | Workbench output pane | Uses `Button`; raw overflow container for tab content |
| `FileDetailTab` | `src/components/workbench/file-detail-tab.tsx` | active | Renders readonly TOML file previews and non-TOML metadata in workbench tabs | `path`, `files`, `tomlFiles` | Workbench file detail tabs | Uses `Badge`, `Textarea` |
| `RunOutputTab` | `src/components/workbench/run-output-tab.tsx` | active | Raw-first build/deploy/history output renderer with copyable raw JSON, target contract ABI, env dialog, tx lookup pending/check state, and transaction details | `tab` | Workbench run/history tabs | Uses `Badge`, `Button`, `Dialog`; raw overflow containers for JSON |
| `ActionDeck` | `src/components/workbench/action-deck.tsx` | active | Bottom workbench build/deploy action cards shown only after a TOML target is selected | `selectedTomlPath`, `isBuilding`, `isDeploying`, `onBuild`, `onDeploy` | Workbench action pane | Uses `Button` |
| `DeployHistoryPanel` | `src/components/workbench/deploy-history-panel.tsx` | active | Latest 10 deploy history list that opens records by tx hash and saved env, with per-record deletion | `records`, `onOpenRecord`, `onDeleteRecord` | Workbench history pane | Uses `Button` |
| `DeployWorkbench` | `src/components/workbench/deploy-workbench.tsx` | active | Composes the four resizable compiler workbench panes | `layout`, `onLayoutChange`, pane render props | Rendering the workbench page shell | Uses `ResizeHandle` |
| `ResizeHandle` | `src/components/workbench/resizable-panels.tsx` | active | Pointer-driven splitter handle for workbench panes | `ariaLabel`, `orientation`, `onDrag` | Resizing workbench panes | Raw `div` with separator role |

Example conflict rule:

- Use shadcn `Button` for normal buttons.
- Do not create `SharedButton`.
- If a future `SharedButton` is proposed, it must document behavior that shadcn `Button` cannot own, such as wallet-aware loading, permission gating, or deploy-step telemetry. Until then, use shadcn `Button`.

## Utility Registry

Utilities live in `src/utils`. They own reusable logic, parsing, encoding, hashing, formatting, and browser utility behavior. Utilities should be focused and should not become hidden stores or UI components.

This registry is the first lookup table for reusable logic. If a capability exists here, use it before creating new helper logic.

The `Public API` column is a selection aid. The utility module's exported functions and types are the API contract.

| Utility | Path | Status | Responsibility | Public API | Used By | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `abi-utils` | `src/utils/abi/abi-utils.ts` | active | Parse, normalize, and derive UI-ready state from imported ABI | `parseAbiSource`, `deriveAbiState`, `getMethodOptions`, `getConstructorFields`, `methodExists`, `findMethod`, `resolveMethodTransport` | Settings, Build, Deploy | Raw ABI parsing belongs under `src/utils/abi`; UI consumes normalized ABI data |
| `build-args-utils` | `src/utils/build-args-utils.ts` | active | Prepare ABI-shaped build method arguments from the uploaded project folder payload | `createBuildProjectPayload`, `prepareBuildMethodArgs`, `prepareBuildMethodCall` | Build | Keeps selected ABI method inputs aligned with values sent to viem |
| `deploy-args-utils` | `src/utils/deploy-args-utils.ts` | active | Decode the selected build result, extract target contract ABI, and prepare ABI-shaped deploy method arguments | `prepareDeployMethodCall`, `getDeployAbiFromBuildPayload` | Deploy, legacy review | Supports the lyquid-deployer `deploy(bytes,bytes,bytes32,bytes32,string,string)` flow without hard-coding method names |
| `hash-utils` | `src/utils/hash-utils.ts` | active | Compute deterministic deployment evidence hashes | `hashSource`, `hashConstructorInput`, `hashPayload` | Review, Deploy | Do not duplicate hashing in components |
| `file-utils` | `src/utils/file-utils.ts` | active | Read uploaded project metadata, validate folder uploads, build a folder path tree, and extract readonly TOML previews | `getProjectMetadata`, `readProjectArchive`, `analyzeProjectFiles` | Upload | Rejects empty uploads and uploads without TOML targets; do not persist `File` or `FileList` |
| `lyquid-id-utils` | `src/utils/lyquid-id-utils.ts` | active | Decode user-facing Lyquid IDs into their raw 20-byte payload address shape | `lyquidIdToAddress` | Tests, future validation | This is not the deployed EVM contract address for `eth_call.to`; request senders must resolve `GetLyquidInfo.contract` first |
| `endpoint-utils` | `src/utils/request/endpoint-utils.ts` | active | Rewrites browser RPC requests through the Vite dev proxy only in dev builds | `getRequestEndpoint` | Request senders, Lyquid info client | Keep production RPC URLs direct; do not hard-code local RPC ports |
| `browser-wallet-client` | `src/utils/request/browser-wallet-client.ts` | active | Wraps an injected browser wallet provider as the minimal wallet transaction client used by deploy | `createBrowserWalletTransactionClient` | Deploy page, on-chain sender | Use this when wagmi reports an account but `useWalletClient` is unavailable for a custom RPC chain |
| `lyquid-info-client` | `src/utils/request/lyquid-info-client.ts` | active | Resolves a Lyquid ID to its deployed contract address through `GetLyquidInfo` | `fetchLyquidContractAddress` | Off-chain sender, on-chain sender | Returns `null` when the Lyquid has no visible contract; throws detailed network/RPC errors |
| `request-dispatcher` | `src/utils/request/request-dispatcher.ts` | active | Chooses the sender for the currently selected ABI method using derived ABI transport metadata and caller-provided request context | `dispatchSelectedMethod` | Workbench page, legacy wizard | Do not duplicate sender selection in components or hard-code method names |
| `on-chain-sender` | `src/utils/request/on-chain-sender.ts` | active | Sends ABI-encoded wallet-backed transactions for methods resolved to on-chain transport | `sendOnChainMethod` | Request dispatcher | Requires wallet/account context; keep UI and store imports out |
| `off-chain-sender` | `src/utils/request/off-chain-sender.ts` | active | Sends ABI-selected off-chain requests through fetch/RPC context | `sendOffChainMethod` | Request dispatcher | Keep endpoint derivation and request shape centralized here |
| `request-types` | `src/utils/request/request-types.ts` | active | Shared request sender context, result, and sender type definitions | exported request types | Request dispatcher and senders | Type-only ownership for request utilities |
| `rpc-chain-client` | `src/utils/request/rpc-chain-client.ts` | active | Fetches `eth_chainId` from the configured RPC and builds a viem chain for wallet transactions | `fetchRpcChain` | On-chain sender | Deploy must follow the user-provided RPC rather than the default wagmi chain |
| `rpc-transaction-client` | `src/utils/request/rpc-transaction-client.ts` | active | Fetches transaction details or raw transaction lookup responses from the configured RPC by transaction hash | `fetchRpcTransaction`, `fetchRpcTransactionResponse` | On-chain sender, legacy review | Used to populate Deploy tab transaction details and expose raw lookup JSON for debugging |
| `download-utils` | `src/utils/download-utils.ts` | active | Download JSON payloads and results from the browser | `downloadJson` | Review, Deploy | Browser-only utility |
| `format-utils` | `src/utils/format-utils.ts` | active | Format hashes, addresses, and statuses for display | `shortHash`, `shortAddress`, `formatStatus` | UI components | Display-only; no business logic |
| `workbench-layout-utils` | `src/utils/workbench-layout-utils.ts` | active | Pure helpers for workbench pane layout ratios | `clampRatio` | Workbench layout components | Keep non-component exports outside React component files for fast refresh |

## Store Registry

Persistent and runtime stores live in `src/store`. Store modules own browser state boundaries and should not import UI components.

| Store | Path | Status | Responsibility | Public API | Used By | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `settings-store` | `src/store/settings-store.ts` | active | Persists RPC endpoint, Lyquid ID, ABI, Build Method, Deploy Method, and derived ABI state | `useSettingsStore` | Settings, Build, Deploy | Only settings are persisted here |
| `deploy-session-store` | `src/store/deploy-session-store.ts` | active | Holds legacy wizard runtime upload/build/review/deploy state | `useDeploySessionStore` | Legacy wizard components | Do not persist uploaded files or run outputs |
| `workbench-store` | `src/store/workbench-store.ts` | active | Persists compiler workbench layout ratios and bounded deploy history records | `useWorkbenchStore` with layout setters and deploy history add/delete/clear actions | Workbench page | Does not persist uploaded files, current tabs, build payloads, tx details, or run raw output |

## Config Registry

Config modules live in `src/config`. Use this directory for constants, defaults, static options, route paths, storage keys, and deploy flow definitions.

Do not place reusable constants inside pages or components. Do not create `src/constants`.

The `Exports` column is a selection aid. The config module's actual exports are the API contract.

| Config | Path | Status | Responsibility | Exports | Used By | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `app-config` | `src/config/app-config.ts` | active | App-level product constants | `appName` | Layout, metadata | No runtime state |
| `routes-config` | `src/config/routes-config.ts` | active | Route paths and route labels | `routes` | Navigation, links | Includes `/` workbench and `/legacy` wizard paths; keep Vite page entry composition consistent |
| `deploy-steps-config` | `src/config/deploy-steps-config.ts` | active | Upload, Build, Review, Deploy step definitions | `deploySteps` | `ProgressSteps`, pages | Do not duplicate step labels in components |
| `storage-config` | `src/config/storage-config.ts` | active | Local storage keys and persisted store versions | `settingsStorageKey`, `settingsVersion`, `workbenchStorageKey`, `workbenchStorageVersion` | `settings-store`, `workbench-store` | Used by persisted stores only |
| `upload-config` | `src/config/upload-config.ts` | active | Upload limits and accepted source inputs | `acceptedProjectFormats`, `maxUploadSize` | Upload step, `file-utils` | Folder-first upload; keep UI and file handling aligned |
| `default-settings-config` | `src/config/default-settings-config.ts` | active | Default settings shown in Settings | `defaultSettings` | `settings-store`, `SettingsDialog` | Includes empty ABI defaults for the MVP |
| `workbench-config` | `src/config/workbench-config.ts` | active | Static workbench defaults and limits | `defaultWorkbenchLayout`, `deployHistoryLimit` | Workbench store, upload controls | No runtime state |

## Type Registry

Reusable cross-boundary types live in `src/types`. Type modules should not import runtime implementation modules.

| Type Module | Path | Status | Responsibility | Exports | Used By | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `abi-types` | `src/types/abi.ts` | active | Shared parsed ABI, method option, constructor field, and method transport types | ABI-related exported types | ABI utils, settings, UI selectors | Keep ABI source-of-truth types here when they cross utility/UI boundaries |
| `deploy-types` | `src/types/deploy.ts` | active | Shared upload, deploy step, build result, review payload, and deploy result types | deploy workflow exported types | Legacy wizard, upload/build/review/deploy components, stores | Runtime values are not persistence permission by themselves |
| `workbench-types` | `src/types/workbench.ts` | active | Workbench tab, environment, layout, and deploy history record types | workbench exported types | Workbench components and store | Keep persisted history shape aligned with `workbench-store` and `workbench-config` |
