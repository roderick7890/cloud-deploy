# React Frontend Development Rules

Use this file when adding or changing React frontend code. Pair it with `docs/agent/project.md` for Cloud Deploy-specific framework, routing, registry, wallet, request, and product constraints.

If a task follows this file, mention `Followed docs/agent/frontend.md frontend rules.` in the final response.

## Stack

Use the project's existing frontend stack by default.

- Keep the current framework and build tool unless the project owner explicitly approves a migration.
- Use Tailwind CSS when the project already uses Tailwind.
- Use shadcn/ui for generic UI primitives and composed controls when it is installed.
- Use the existing router or app-owned route selection implementation. Pages-style route file naming under `src/pages` is a convention, not a requirement to use Next.js.
- Use the existing state, wallet, chain, and request libraries. Add specialized state, wallet, chain, or request libraries only when the project requires them and the project owner approves or the project guide calls for them.

Do not introduce another UI framework, CSS system, router, wallet library, chain library, request library, or global state library unless the project owner explicitly approves it.

## Project Shape

Project-specific guides own product identity and active framework details.

- Current route files should live under `src/pages` when the project uses a pages-style source layout.
- Pages-style naming means route files such as `index.tsx`, `legacy.tsx`, and `[id].tsx`.
- `[id].tsx` means a dynamic route segment in the file naming convention. It does not imply Next.js is installed.
- Do not introduce another router unless the project owner explicitly approves it.
- Do not force workflow assumptions from another project. Cloud Deploy-specific workflow rules live in `docs/agent/project.md`.

## Default Visual Direction

When there is no design file or the product request is abstract, use a Vercel-inspired operational UI direction by default.

This means:

- restrained neutral surfaces, clear borders, strong typography hierarchy, and minimal decoration
- direct product/tool screens instead of marketing pages
- compact, scannable layouts optimized for repeated work
- clear hover, focus, disabled, loading, success, and error states
- shadcn/ui wrappers for controls, but not a generic shadcn demo-page look

Do not copy Vercel branding, marketing composition, or product-specific visual assets. Treat this as a default product-quality bar for sparse requirements.

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
- reusable cross-boundary types into `src/types`
- layout shell into `src/layout`

## Naming

Use lowercase kebab-case for files and folders.

Examples:

- `workbench-settings-dialog.tsx`
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
- `ProgressSteps`
- `DeployWorkbench`

## Directory Layout

Prefer this source layout unless `docs/agent/project.md` documents a different current structure:

```text
src/
  assets/
    images/
  config/
  layout/
  pages/
  components/
    shared/
    ui/
  utils/
  store/
  types/
```

Directory responsibilities:

- `src/assets/images`: image assets and other static visual assets.
- `src/config`: static app config, constants, defaults, route definitions, storage keys, upload limits, deploy step definitions, and option lists.
- `src/layout`: global layout shells, app frame, header, and page chrome.
- `src/pages`: route pages.
- `src/components`: feature and business components.
- `src/components/shared`: reusable shared components extracted from repeated business needs.
- `src/components/ui`: shadcn/ui wrappers and generic UI primitives.
- `src/utils`: pure helpers, formatters, parsers, ABI helpers, request utilities, and domain helpers.
- `src/store`: client stores and persisted state definitions when the project needs shared client state.
- `src/types`: reusable TypeScript types that cross component, store, and utility boundaries.

Do not create a separate `src/constants` directory. Constants belong in `src/config`.

Route rules follow pages-style naming conventions:

- `src/pages/index.tsx` maps to `/`.
- `src/pages/legacy.tsx` maps to `/legacy`.
- `src/pages/deploy/index.tsx` maps to `/deploy` if a future deploy route is added.
- `src/pages/deploy/[id].tsx` maps to `/deploy/:id` if a future dynamic deploy route is added.

Use `/deploy/:id` only when describing the URL pattern. Use `[id].tsx` for the actual file name.

## Project UI Wrappers First

Do not write raw form/control elements in application code when a project-installed UI wrapper or existing shared component can represent the same control. In projects that have shadcn/ui installed, prefer shadcn/ui wrappers for generic controls.

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
<input type="checkbox" />
<input type="radio" />
<input type="file" />
<textarea />
<select />
<label />
<dialog />
```

For shadcn/ui projects, preferred equivalents:

- `Button` for actions.
- `Input` for single-line text.
- `Textarea` for multiline text.
- `Select` for dropdowns.
- `Checkbox` for checkbox choices when installed.
- `RadioGroup` for mutually exclusive choices when installed.
- `Label` for field labels.
- `Dialog` for settings, confirmations, and modal workflows.
- `AspectRatio` for fixed-ratio media and visual containers when installed.
- `Tabs` only when the product flow truly needs tabs.
- `AlertDialog` for destructive or high-confirmation decisions.
- `Progress` or a composed progress component for progress indicators.
- `Toast` or `Sonner` for transient result and error messages when installed.

Do not bypass project-installed UI wrappers by changing raw input `type` values in app code. Raw HTML controls are allowed only inside UI wrapper implementation files or when the project has no suitable primitive. If raw HTML is needed, explain why in the implementation summary.

## shadcn Wrapper Baseline

After installing or regenerating shadcn/ui wrappers, adapt them to this project before using them in app code.

- `Button` default size should be `content`, not a fixed-height size.
- `Button` should include a `content` size whose dimensions come from padding and content. It must not set `width`, `height`, `min-width`, or `min-height`.
- `Button` may keep a fixed `icon` size because icon-only buttons need a stable target.
- `Input`, `Textarea`, and `SelectTrigger` wrappers should not force fixed `width`, `height`, `min-width`, or `min-height` by default.
- Form controls should use padding, font size, and line-height for visual size. Parent layout owns full-width behavior through `className` only when the specific layout needs it.
- Dialog and AlertDialog content wrappers should use flex column layout by default, not grid.
- Keep fixed dimensions only for fixed-format primitives such as icon-only buttons, progress bars, separators, handles, and indicators.

If a newly added shadcn component ships with fixed box classes, remove or override those fixed classes in the wrapper before using it. Document any intentional exception in `docs/agent/registries.md`.

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

## Adaptive Layout

Prefer flex-based adaptive layout by default.

- Use `flex`, `flex-col`, `flex-wrap`, `flex-1`, content-driven padding, semantic spacing, and responsive constraints before fixed box sizes.
- Avoid hardcoded `width`, `height`, `min-width`, and `min-height` in app markup unless the element has a fixed-format reason.
- Use `max-width`, `max-height`, aspect ratio, overflow handling, and container constraints when bounding a surface is necessary.
- Let text wrap or the container adapt when labels are unpredictable. Do not rely on fixed button or field dimensions to hide layout problems.
- Use grid only when the content has a real two-dimensional relationship, such as matrix-like panels, table-adjacent alignment, boards, calendars, or fixed pane systems.
- Do not use grid as the default way to place ordinary forms, toolbars, page sections, or card lists.

## Component Choice

Choose components in this order:

1. Existing shared component from `src/components/shared`.
2. shadcn/ui primitive or composed shadcn component from `src/components/ui`.
3. Feature-specific business component under `src/components` or the page area.
4. Raw HTML only when no library/shared component fits.

Shared components take priority when they encode project business behavior. Shared components should still be composed from shadcn/ui primitives when those primitives fit. shadcn/ui takes priority for generic UI primitives.

For reusable shared components, utilities, stores, and config modules, use `docs/agent/registries.md`.

## Loading States

Use a shared spinner or progress component for submitting/loading actions when one exists instead of visible high-pressure waiting copy such as `Please wait...`.

- Button submitting states should keep the control disabled and show stable progress or spinner affordances.
- Keep accessible loading labels available to screen readers when needed.
- Reuse the project's shared loading component when one exists.
- For build/deploy workflows, prefer durable status inside the relevant tab or progress surface over transient copy that disappears before the user can inspect it.

## Request Error Presentation

Default API, RPC, wallet, and request failures should be presented through the workflow surface that owns the action.

Use inline errors for states the user can act on in the current form or surface:

- invalid RPC endpoint
- invalid ABI JSON
- missing or mismatched selected ABI method
- missing wallet/account for wallet-required deploy
- upload validation failures
- missing TOML target selection

Use workbench tabs, result panels, or toast notifications for generic request failures, depending on the installed UI and workflow context:

- network failures
- RPC errors
- unknown backend errors
- transaction lookup errors
- off-chain sender errors
- unexpected wallet provider errors

Do not render raw transport errors as permanent page chrome unless the feature spec explicitly defines a blocking state. Preserve inspectable raw details in build/deploy output panels when that helps debugging.

## shadcn Component Map

Use this map when choosing common shadcn/ui primitives in projects that have shadcn/ui installed. This is not a full inventory. Use `src/components/ui` source files for generic installed shadcn paths and exports. Use the project registry only for customized, renamed, deprecated, project-specific shadcn wrappers or reusable business capabilities.

| Component | Common Use | Important Props / Inputs |
| --- | --- | --- |
| `Button` | Primary and secondary actions such as Build, Deploy, Back, Copy, Save Settings, Connect Wallet | `variant`, `size`, `disabled`, `onClick`, `type`; default `size` is `content` |
| `Input` | RPC endpoint, Lyquid ID, short constructor values | `value`, `onChange`, `placeholder`, `disabled`, `aria-invalid`; wrapper should not force full width or fixed height |
| `Textarea` | ABI JSON paste, readonly TOML previews, raw payload display when editable | `value`, `onChange`, `placeholder`, `readOnly`, `rows`; wrapper should not force full width or fixed min-height |
| `Label` | Field label tied to form controls | `htmlFor` |
| `Select` | Build Method and Deploy Method dropdowns | `value`, `onValueChange`, `disabled`; `SelectTrigger` wrapper should not force full width or fixed height |
| `Dialog` | Settings dialog and non-destructive modal forms | `open`, `onOpenChange` |
| `AlertDialog` | Destructive or high-confirmation decisions | `open`, `onOpenChange` |
| `Card` | Repeated result blocks only, not page sections nested inside cards | `className` |
| `Progress` | Build or deploy progress indicators | `value` |
| `Badge` | Compact status, transport, method, or file tags | `variant` |
| `Separator` | Dividing settings or review sections | `orientation` |
| `Tooltip` | Icon-only buttons and compact technical hints | `delayDuration`, trigger content |
| `Toast` / `Sonner` | Non-blocking success/error messages when installed | message, description, action |

Do not wrap shadcn components just to rename them. Wrap only when the project needs reusable business behavior.

## Registry Lookup

Reusable capability registries live in `docs/agent/registries.md`. Registries are locator and ownership maps, not complete API documentation. Source files and exported TypeScript types are the implementation truth.

Do not open the registry file for every task. Open it when the task involves creating, reusing, moving, renaming, changing, or deleting:

- shared components
- utilities
- stores
- config modules
- reusable constants or defaults

Before creating reusable code, use the relevant registry:

- UI behavior: check Shared Component Registry.
- Reusable logic: check Utility Registry.
- Shared client state: check Store Registry.
- Constants/defaults/static options: check Config Registry.

If a matching registry entry points to existing source, read its `Path` before using it. Do not rely only on registry summaries.
