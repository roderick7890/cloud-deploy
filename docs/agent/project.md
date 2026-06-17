# Cloud Deploy Project Guide

This file contains Cloud Deploy-specific rules. Pair it with the project-neutral rules in `AGENTS.md` and `docs/agent/frontend.md`.

If a task follows this file, mention `Followed docs/agent/project.md project rules.` in the final response.

## Product Identity

Cloud Deploy is a Lyquor deployment workbench for uploading Lyquid projects, building deploy payloads, reviewing deployment evidence, and submitting deployments through ABI-selected on-chain or off-chain request paths.

Canonical project name: `cloud-deploy`.

## Repository Boundary

This repository owns the Cloud Deploy frontend only.

In scope:

- Browser-based project upload and TOML target selection.
- Build, review, deploy, and deployment history workflows.
- ABI-driven method selection and argument preparation.
- Wallet-backed on-chain dispatch and RPC-backed off-chain dispatch.
- Local runtime workbench UI and the legacy Upload, Build, Review, Deploy wizard.

Out of scope unless explicitly requested:

- Backend deployment services.
- Public product documentation sites.
- Admin or fleet management consoles.
- Long-lived server-side persistence for uploads, build artifacts, logs, or deploy results.

## Project Registry

- Registry file: `docs/agent/registries.md`.
- Read the registry before creating, reusing, moving, renaming, changing, or deleting shared components, utilities, stores, config modules, reusable constants, defaults, route config, storage keys, upload config, or other static config.
- If a registry entry and source code disagree, follow source and update the registry in the same change unless the user explicitly asked for read-only work.

## Active Frontend Stack

The current app stack is:

- Vite
- React
- TypeScript
- Tailwind CSS
- shadcn/ui wrappers under `src/components/ui`
- lucide-react icons through the existing shadcn setup
- Zustand with `zustand.persist`
- wagmi for wallet connection and account state
- viem for ABI parsing, encoding, chain clients, and RPC interaction

Do not migrate this project to Next.js or React Router unless explicitly approved. References to pages-style routing in the agent docs mean route file naming conventions such as `index.tsx` and `[id].tsx`; they do not mean Next.js must be installed.

## Routing

Runtime route selection is currently minimal and app-owned:

- `src/main.tsx` mounts `App`.
- `src/app.tsx` selects the active page from `window.location.pathname`.
- `src/pages/index.tsx` owns `/`.
- `src/pages/legacy.tsx` owns `/legacy`.
- `src/config/routes-config.ts` owns route paths and labels when links or navigation need them.

For new route files, prefer pages-style file names under `src/pages`:

- `index.tsx` for `/`
- `legacy.tsx` for `/legacy`
- `[id].tsx` for a dynamic route segment if a future router supports it

When adding a route, wire it through the existing Vite app entry and route config unless a routing refactor is explicitly approved.

## Source Layout Direction

Future code should converge on:

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

Current historical directories:

- `src/lib` exists for older shadcn helper setup. Do not expand it with new domain helpers.
- `src/components/workbench` contains workbench-specific panels and panes. Keep workbench-only behavior there unless it becomes reusable across workflows.
- `src/components` still contains legacy wizard step components. Do not move them only for cleanup unless the task includes that migration.

Rules for new code:

- Static app config, defaults, route config, storage keys, upload limits, deploy step definitions, and option lists go in `src/config`.
- Pure helpers, formatters, parsers, request utilities, ABI helpers, hashing, download helpers, and browser utility behavior go in `src/utils`.
- Shared client stores go in `src/store`.
- Reusable types that cross component, store, and utility boundaries go in `src/types`.
- Layout shells, headers, and page chrome go in `src/layout`.
- Do not create `src/constants`.

## UI Direction

Cloud Deploy is a dense operational deploy tool, not a landing page. When there is no design file, default to a Vercel-inspired operational UI: restrained, neutral, border-forward, compact, and highly scannable.

- Keep the first screen as the deploy workbench unless the task explicitly changes the product flow.
- Keep the app optimized for repeated build/deploy work: compact panes, scannable output, stable controls, and clear status.
- Keep the legacy wizard as a 100vh Upload, Build, Review, Deploy flow while it exists.
- Prefer shadcn/ui for generic controls.
- Customize newly generated shadcn wrappers before use so content-sized controls are the default.
- `Button` defaults to content-driven sizing. Use fixed icon sizing only for icon-only buttons.
- `Input`, `Textarea`, and `SelectTrigger` wrappers should size from content and padding by default. Add `w-full` or fixed constraints at the local layout boundary only when that surface needs them.
- Prefer shared components when they encode Cloud Deploy business behavior.
- Avoid nested cards. Use cards only for repeated result blocks, modals, and genuinely framed tools.
- Avoid arbitrary Tailwind values in app markup; use theme variables or named tokens first.
- Prefer flex and adaptive constraints for ordinary layout. Use grid only for real two-dimensional structures or fixed pane systems.
- Avoid hardcoded width, height, min-width, and min-height in app markup unless the element has a fixed-format reason.
- Icon-only buttons need accessible labels and tooltips when the action is not obvious.
- Do not add marketing hero sections, decorative product-site layouts, or broad management-console surfaces unless explicitly requested.

## State And Runtime Data

Cloud Deploy has durable settings and runtime deployment session state.

Persisted settings belong in `src/store/settings-store.ts` and should stay limited to:

- `rpcEndpoint`
- `bartenderAddress`
- `abi`
- `buildMethod`
- `deployMethod`

`settings-store` owns atomic reconciliation of imported ABI state, `buildMethod`, and `deployMethod`.

Workbench persistence belongs in `src/store/workbench-store.ts` and should stay limited to durable UI preferences and bounded history:

- workbench pane layout ratios
- latest deploy history records, capped by config

Runtime deployment state belongs in `src/store/deploy-session-store.ts` or page-local state depending on workflow scope.

Do not persist:

- uploaded `File` or `FileList` objects
- uploaded project contents
- constructor values
- build results
- prepared payloads
- deploy results
- current tabs
- logs
- raw request responses beyond the bounded deploy history shape explicitly owned by the workbench store

All browser storage interactions should be owned by a Zustand persisted store by default. Do not scatter direct `localStorage` or `sessionStorage` reads and writes through components, request utilities, or pages.

## Request And Wallet Behavior

Cloud Deploy supports two request paths:

- On-chain sender for wallet-backed transactions.
- Off-chain sender for RPC/fetch-backed dispatch when the ABI-selected method resolves to an off-chain transport.

Request path selection should flow through the existing request dispatcher and ABI-derived method metadata.

Rules:

- Do not hard-code ABI method names such as `build`, `prepare`, `deploy`, `publish`, or `register` in reusable request utilities.
- Resolve selected methods from parsed ABI state and caller-provided settings.
- Resolve Lyquid IDs to deployed contracts through the request utilities before sending calls that need target contract addresses.
- Use the user-provided RPC endpoint for chain and transaction lookups.
- Use wagmi account state for wallet availability and viem-compatible helpers for encoding and RPC calls.
- Keep generic request utilities free of UI imports, toast calls, navigation, and Zustand store imports.
- Page or component layers decide final error presentation: inline actionable errors, toast, tab output, or blocking state.

## Documentation Ownership

Agent-facing guidance lives in:

- `AGENTS.md`
- `docs/agent/frontend.md`
- `docs/agent/project.md`
- `docs/agent/registries.md`

Do not put agent guidance under public assets or generated output directories.

When project behavior changes in a way that affects future agent work, update this guide and the registry in the same change when applicable.

## Legacy Cleanup Policy

Do not spend task time renaming or removing historical directories unless the user asks for that cleanup.

When touching a legacy area for feature work:

- Keep the change narrowly scoped.
- Prefer adding new reusable code in the current target layout.
- Avoid broad route or file renames unless they are part of the requested migration.
