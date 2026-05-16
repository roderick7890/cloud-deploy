# Frontend Development Rules

Use this file when adding or changing Cloud Deploy frontend code.

If a task follows this file, mention `Followed docs/agent/frontend.md frontend rules.` in the final response.

## Stack

Use this frontend stack:

- Tailwind CSS for styling.
- shadcn/ui for UI primitives and composed controls.
- Zustand for client state.
- `zustand.persist` for persisted local settings.
- wagmi for wallet connection and account state.
- viem for ABI parsing, encoding, transaction calls, and RPC interaction.

Do not introduce another UI framework, CSS system, wallet library, or global state library unless the project owner explicitly approves it.

## Project Shape

Use Next.js Pages Router conventions under `src/pages`.

- Use `src/pages` for route files.
- Do not use Next.js App Router unless the project owner explicitly approves it.
- Do not introduce another router unless the project owner explicitly approves it.
- Keep this as a frontend web tool. Do not turn it into a landing page or a broad management console.

## File Size

Keep files easy to read and edit.

- Target about 200 lines per source file.
- When a file grows beyond 200 lines, check whether it should be split.
- A file may exceed 200 lines when the extra length is mostly static config, generated-looking data, or a cohesive table.
- A file beyond 250 lines needs a clear reason in the implementation summary.
- A file beyond 300 lines should normally be split before continuing.

Split by responsibility, not by arbitrary line count. Prefer extracting:

- shared UI composition into `src/components/shared`
- page-local components into the page folder or a nearby business component
- state logic into `src/store`
- pure helpers into `src/utils`
- layout shell into `src/layout`

## Naming

Use lowercase kebab-case for files and folders.

Examples:

- `cloud-deploy-page.tsx`
- `settings-dialog.tsx`
- `abi-method-select.tsx`
- `deploy-progress.tsx`

Use camelCase for variables, functions, hooks, and object fields.

Examples:

- `rpcEndpoint`
- `buildMethod`
- `deployMethod`
- `constructorParams`
- `useSettingsStore`

Use PascalCase for React component names.

Examples:

- `SettingsDialog`
- `AbiMethodSelect`
- `DeployProgress`

## Directory Layout

Use this source layout:

```text
src/
  assets/
    images/
  config/
  layout/
  pages/
  components/
    shared/
  utils/
  store/
```

Directory responsibilities:

- `src/assets/images`: image assets and other static visual assets.
- `src/config`: static app config, constants, defaults, route definitions, storage keys, deploy step definitions, upload limits, and option lists.
- `src/layout`: global layout shells, app frame, header, and page chrome.
- `src/pages`: route pages.
- `src/components`: feature and business components.
- `src/components/shared`: reusable shared components extracted from repeated business needs.
- `src/utils`: pure helpers, formatters, parsers, ABI helpers, and request utilities.
- `src/store`: Zustand stores and persisted state definitions.

Do not create a separate `src/constants` directory. Constants belong in `src/config`.

Route rules follow Next-style `src/pages` conventions:

- `src/pages/index.tsx` maps to `/`.
- `src/pages/deploy.tsx` maps to `/deploy`.
- `src/pages/deploy/index.tsx` maps to `/deploy`.
- `src/pages/deploy/[id].tsx` maps to `/deploy/:id`.

Use `/deploy/:id` only when describing the URL pattern. Use `[id].tsx` for the actual file name.

## shadcn/ui First

Do not write raw form/control elements in application code when a shadcn/ui component or existing shared component can represent the same control.

Raw layout and semantic elements are allowed:

```tsx
<div />
<main />
<section />
<header />
<nav />
<footer />
<form />
```

Avoid raw interactive and form control elements such as:

```tsx
<button />
<input />
<textarea />
<select />
<label />
<dialog />
```

Preferred equivalents:

- `Button` for actions.
- `Input` for single-line text.
- `Textarea` for multiline text.
- `Select` for dropdowns.
- `Label` for field labels.
- `Dialog` for settings, confirmations, and modal workflows.
- `Tabs` only when the product flow truly needs tabs.
- `AlertDialog` for destructive or high-confirmation decisions.
- `Progress` or a composed progress component for build/deploy progress.
- `Toast` or `Sonner` for transient result and error messages, depending on the installed shadcn setup.

Raw HTML controls are allowed only inside shadcn/ui wrapper implementation files or when shadcn has no suitable primitive. If raw HTML is needed, explain why in the implementation summary.

## Tailwind Tokens

Do not use arbitrary Tailwind values directly in component markup.

Forbidden examples:

```tsx
className="text-[11px]"
className="text-[#fff]"
className="bg-[#121212]"
className="w-[37px]"
className="shadow-[0_0_20px_rgba(0,0,0,0.2)]"
```

Create or use named design tokens first, then reference the token.

Preferred examples:

```tsx
className="text-caption"
className="text-primary-foreground"
className="bg-background"
className="w-icon"
className="shadow-panel"
```

If a new value is needed:

- Prefer shadcn CSS variables in the global stylesheet first.
- Add a semantic CSS variable under the app theme when the value belongs to the design system.
- Add a Tailwind theme token only when the value is reused broadly.
- Name it by purpose, not by its raw value.
- Reuse existing shadcn theme variables when they fit.

Acceptable token names describe roles:

- `text-caption`
- `text-muted-foreground`
- `bg-background`
- `bg-card`
- `border-border`
- `shadow-panel`
- `h-toolbar`
- `w-sidebar`

Avoid token names that only restate values:

- `text-11`
- `color-white`
- `spacing-37`

## Component Choice

Choose components in this order:

1. Existing shared component from `src/components/shared`.
2. shadcn/ui primitive or composed shadcn component.
3. Feature-specific business component under `src/components` or the page area.
4. Raw HTML only when no library/shared component fits.

Shared components take priority when they encode Cloud Deploy business behavior. shadcn/ui takes priority for generic UI primitives.

For reusable shared components, utilities, and config modules, use `docs/agent/registries.md`.

## shadcn Component Map

Use this map when choosing shadcn/ui primitives.

| Component | Business Use | Important Props / Inputs |
| --- | --- | --- |
| `Button` | Primary actions such as Build, Deploy, Back, Copy, Save Settings, Connect Wallet | `variant`, `size`, `disabled`, `onClick`, `type` |
| `Input` | RPC endpoint, Lyquid ID, short constructor values | `value`, `onChange`, `placeholder`, `disabled`, `aria-invalid` |
| `Textarea` | ABI JSON paste, raw payload display, logs preview when editable | `value`, `onChange`, `placeholder`, `readOnly`, `rows` |
| `Label` | Field label tied to form controls | `htmlFor` |
| `Select` | Build Method and Deploy Method dropdowns | `value`, `onValueChange`, `disabled` |
| `Dialog` | Settings dialog and non-destructive modal forms | `open`, `onOpenChange` |
| `AlertDialog` | Update confirmation before deploying with an existing Lyquid ID | `open`, `onOpenChange` |
| `Card` | Repeated result blocks only, not page sections nested inside cards | `className` |
| `Progress` | Build or deploy progress indicators | `value` |
| `Badge` | Compact status, transport, or method tags | `variant` |
| `Separator` | Dividing settings or review sections | `orientation` |
| `Tooltip` | Icon-only buttons and compact technical hints | `delayDuration`, trigger content |
| `Toast` / `Sonner` | Non-blocking success/error messages | message, description, action |

Do not wrap shadcn components just to rename them. Wrap only when Cloud Deploy needs a reusable business behavior.

## Registry Lookup

Reusable capability registries live in `docs/agent/registries.md`. They are locator and ownership maps, not complete API documentation. Source files and exported TypeScript types are the implementation truth.

Do not open `docs/agent/registries.md` for every task. Open it when the task involves creating, reusing, moving, renaming, changing, or deleting:

- shared components
- utilities
- config modules
- reusable constants or defaults

Before creating reusable code, use the relevant registry:

- UI behavior: check Shared Component Registry.
- Reusable logic: check Utility Registry.
- Constants/defaults/static options: check Config Registry.

If a matching registry entry points to existing source, read its `Path` before using it. Do not rely only on registry summaries.

Creating, moving, renaming, changing public API, or deleting shared components, utilities, or config modules requires updating `docs/agent/registries.md` in the same change.

## Source Entrypoints

Registries help agents find source, but source exports own the usable API.

- Active shared components should be exported from `src/components/shared/index.ts`.
- Shared component files own their actual props types.
- Utility modules own their actual exported functions and types.
- ABI utilities may grow into multiple files under `src/utils/abi`, but the registered ABI utility path remains the first place to look unless the registry is updated.
- Config modules own their actual exported constants and option objects.
- Deprecation should be visible at the source export or source module when practical, not only in `docs/agent/registries.md`.

If a registry summary and source disagree, follow source and update the registry summary in the same change.

## Import Boundaries

Keep dependencies flowing from app surfaces toward shared logic, not the other way around.

- `src/config` must not import React, shadcn/ui, Zustand stores, or runtime browser APIs.
- `src/config` may import types only when needed.
- `src/utils` must not import React components, shadcn/ui, or Zustand stores.
- `src/utils` may import `src/config` when pure logic needs shared constants.
- Browser-only utilities must make that clear in their file name or registry notes.
- `src/store` may import `src/config`, `src/utils`, and types.
- `src/store` must not import UI components.
- `src/components/shared` may import shadcn/ui, utilities, config, and types.
- `src/components/shared` should receive store-backed values and callbacks through props by default.
- `src/components/shared` may import store hooks only when the registry entry explicitly documents that the component owns app-level binding. Do not add store imports to shared components casually.
- Page components compose layout, shared components, stores, and utilities, but should not own reusable domain logic.

## State Rules

Use Zustand stores for shared app state.

Persist only settings:

- `rpcEndpoint`
- `lyquidId`
- `abi`
- `buildMethod`
- `deployMethod`

Use `src/store/settings-store.ts` for persisted settings.

`settings-store` owns atomic updates and reconciliation for persisted settings. In particular, `abi`, `buildMethod`, and `deployMethod` are related values. When ABI changes, the store should expose derived validity or update state consistently so Settings, Build, and Deploy do not each invent separate method-existence checks.

Do not persist runtime deployment data by default:

- uploaded project files
- constructor parameter values
- build result
- prepared payload
- deploy result
- logs

Use `src/store/deploy-session-store.ts` for runtime deployment session state.

Runtime data may be held in memory while the page is open. If the page refreshes, the user can repeat the flow.

## Request Rules

Implement two dispatch paths:

- on-chain sender
- off-chain sender

The selected ABI method determines the request shape and transport. Do not hard-code method names such as `build`, `prepare`, `deploy`, `publish`, or `register`.

If the ABI changes and the selected Build Method or Deploy Method no longer exists, show the configured existence error and do not add additional compatibility checks.

If the user selects the wrong method, still send it according to the ABI and selected workflow. Surface the returned error.

## UI Rules

- Keep the app as a `100vh` tool surface.
- Use a progress-step workflow: Upload, Build, Review, Deploy.
- Keep Settings in a dialog, not in the main step content.
- Put `Connect Wallet` and `Settings` in the top-right app header.
- Support back navigation between steps.
- Avoid long landing-page or marketing sections.
- Avoid nested cards.
- Keep text inside controls short enough to fit at mobile and desktop sizes.

## Before Finishing Checklist

Before finishing a frontend change, check:

- No arbitrary Tailwind values in app markup, such as `text-[11px]` or `text-[#fff]`.
- No raw interactive/form controls in app code when shadcn/ui or shared components fit.
- Raw ABI parsing is handled by the registered ABI utility instead of page or component code.
- Persisted Zustand state contains only approved settings.
- Runtime deployment data is not stored in `zustand.persist`.
- Shared Component Registry is updated if shared components were added, moved, renamed, changed, or deleted.
- Utility Registry is updated if utilities were added, moved, renamed, changed, or deleted.
- Config Registry is updated if config modules were added, moved, renamed, changed, or deleted.
- Files over 250 lines are explained in the implementation summary.
- Files over 300 lines are split or explicitly justified.
