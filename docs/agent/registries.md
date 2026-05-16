# Agent Registries

These registries are locator and ownership maps for reusable Cloud Deploy capabilities. They are not complete API documentation. Source files and exported TypeScript types are the implementation truth.

Use this file only when the task involves creating, reusing, moving, renaming, changing, or deleting shared components, utilities, or config modules.

## Registry Status

- `candidate`: recommended locator hint. Do not assume the source file exists, and do not implement it unless the current task needs that reusable capability.
- `active`: source should exist and may be used after reading the registered path. Source exports and TypeScript types override registry summaries.
- `deprecated`: do not use for new work unless maintaining existing usage.

If a registry summary and source disagree, follow source and update the registry summary in the same change.

## Shared Component Registry

Shared components live in `src/components/shared`. Add a component here only when the same business behavior appears in multiple places or when it removes meaningful complexity from pages.

This registry is the first lookup table for reusable Cloud Deploy UI behavior. It is an index, not full component documentation.

When adding a shared component, update this registry with its path, status, responsibility, public props summary, and shadcn overlap. Also check whether a shadcn component already covers the same job. If there is overlap, document the difference so future agents can choose correctly.

The `Key Props` column is a selection aid. The component's exported props type is the API contract.

| Component | Path | Status | Responsibility | Key Props | Prefer Over shadcn When | shadcn Overlap |
| --- | --- | --- | --- | --- | --- | --- |
| `AppHeader` | `src/components/shared/app-header.tsx` | active | Global top bar with product name, wallet connect action, and settings trigger | `walletLabel`, `onConnectWallet`, `onOpenSettings` | Rendering the app-level header | Uses `Button` |
| `ProgressSteps` | `src/components/shared/progress-steps.tsx` | active | Four-step deploy progress with current step, completed states, and back navigation support | `steps`, `currentStep`, `completedSteps`, `onStepBack` | Showing the Cloud Deploy workflow | Uses `Button`, `Progress`, `Badge` |
| `SettingsDialog` | `src/components/shared/settings-dialog.tsx` | active | Persisted settings editor for RPC endpoint, Lyquid ID, ABI, Build Method, and Deploy Method | `open`, `onOpenChange`, `settings`, `methodOptions`, `methodErrors`, `onSave` | Editing Cloud Deploy settings together | Uses `Dialog`, `Input`, `Textarea`, `Select`, `Button`, `Label` |
| `AbiMethodSelect` | `src/components/shared/abi-method-select.tsx` | active | ABI-backed method dropdown with missing-method error display | `methods`, `value`, `onValueChange`, `missingMessage` | Selecting Build Method or Deploy Method from parsed ABI options | Uses `Select`, `Label` |
| `ConstructorParamsForm` | `src/components/shared/constructor-params-form.tsx` | active | Renders constructor inputs from ABI-derived fields and returns collected values | `constructorFields`, `values`, `onValuesChange` | Step 2 needs constructor parameters | Uses `Input`, `Label` |
| `PayloadReviewPanel` | `src/components/shared/payload-review-panel.tsx` | active | Displays hashes, prepared/deploy payload, raw JSON, copy, and download actions | `hashes`, `payload`, `onCopy`, `onDownload` | Step 3 reviews build/deploy output | Uses `Button`, `ScrollArea` |
| `ResultSummary` | `src/components/shared/result-summary.tsx` | active | Displays deploy result fields and raw response | `result` | Step 4 displays deployment result | Uses `Badge`, `ScrollArea` |

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
| `abi-utils` | `src/utils/abi/abi-utils.ts` | active | Parse and normalize imported ABI | `parseAbiSource`, `getMethodOptions`, `getConstructorFields`, `methodExists`, `findMethod`, `resolveMethodTransport` | Settings, Build, Deploy | Raw ABI parsing belongs under `src/utils/abi`; UI consumes normalized ABI data |
| `hash-utils` | `src/utils/hash-utils.ts` | active | Compute deterministic deployment evidence hashes | `hashSource`, `hashConstructorInput`, `hashPayload` | Review, Deploy | Do not duplicate hashing in components |
| `file-utils` | `src/utils/file-utils.ts` | active | Read uploaded project metadata and archives | `getProjectMetadata`, `readProjectArchive` | Upload | Do not persist `File` or `FileList` |
| `download-utils` | `src/utils/download-utils.ts` | active | Download JSON payloads and results from the browser | `downloadJson` | Review, Deploy | Browser-only utility |
| `format-utils` | `src/utils/format-utils.ts` | active | Format hashes, addresses, and statuses for display | `shortHash`, `shortAddress`, `formatStatus` | UI components | Display-only; no business logic |

## Config Registry

Config modules live in `src/config`. Use this directory for constants, defaults, static options, route paths, storage keys, and deploy flow definitions.

Do not place reusable constants inside pages or components. Do not create `src/constants`.

The `Exports` column is a selection aid. The config module's actual exports are the API contract.

| Config | Path | Status | Responsibility | Exports | Used By | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `app-config` | `src/config/app-config.ts` | active | App-level product constants | `appName` | Layout, metadata | No runtime state |
| `routes-config` | `src/config/routes-config.ts` | active | Route paths and route labels | `routes` | Navigation, links | Keep Vite page entry composition consistent |
| `deploy-steps-config` | `src/config/deploy-steps-config.ts` | active | Upload, Build, Review, Deploy step definitions | `deploySteps` | `ProgressSteps`, pages | Do not duplicate step labels in components |
| `storage-config` | `src/config/storage-config.ts` | active | Local storage keys and persisted setting version | `settingsStorageKey`, `settingsVersion` | `settings-store` | Used by persisted store only |
| `upload-config` | `src/config/upload-config.ts` | active | Upload limits and accepted source formats | `acceptedProjectFormats`, `maxUploadSize` | Upload step, `file-utils` | Keep UI and file handling aligned |
| `default-settings-config` | `src/config/default-settings-config.ts` | active | Default settings shown in Settings | `defaultSettings` | `settings-store`, `SettingsDialog` | Includes empty ABI defaults for the MVP |
