# Agent Guide

This file is the lightweight entry point for agents working on Cloud Deploy. Keep project-specific facts in `docs/agent/project.md` and reusable capability locations in `docs/agent/registries.md`.

## Required Receipts

- If a task follows React frontend rules, read `docs/agent/frontend.md` and mention `Followed docs/agent/frontend.md frontend rules.` in the final response.
- If a task reads or updates reusable capability registries, read `docs/agent/registries.md` and mention `Followed docs/agent/registries.md registries.` in the final response.
- If a task depends on Cloud Deploy product behavior, routing, stack choices, request paths, wallet behavior, or persistence rules, read `docs/agent/project.md` and mention `Followed docs/agent/project.md project rules.` in the final response.

## When To Read Extra Docs

Read `docs/agent/project.md` before:

- changing product behavior, deployment flow, routes, layout, stores, wallet logic, request dispatch, or persistence
- changing framework, build, router, Tailwind, shadcn/ui, wagmi, viem, or Zustand assumptions
- deciding where a new project-specific file belongs

Read `docs/agent/frontend.md` before:

- adding or changing frontend code
- scaffolding frontend project structure
- changing routes, layout, stores, request dispatch, wallet logic, Tailwind, shadcn/ui, or component composition

Read `docs/agent/registries.md` before:

- creating or reusing shared components
- creating or reusing utility helpers
- adding constants, defaults, route config, storage keys, upload config, or other static config
- moving, renaming, changing public API, or deleting shared components, utilities, stores, or config modules

Do not open `docs/agent/registries.md` for every task. Use it only when reusable shared components, utilities, stores, or config are involved.

## Core Rules

- Prefer the project's existing framework, router, styling system, component library, state model, wallet integration, and request libraries.
- Do not introduce a new framework, router, UI library, state library, wallet library, chain library, or request library unless the project owner explicitly approves it.
- Use route-file naming conventions compatible with pages-style routing when route files live under `src/pages`. This means names like `index.tsx`, `legacy.tsx`, and `[id].tsx`; it does not require using Next.js.
- Source layout should converge on `src/assets/images`, `src/config`, `src/layout`, `src/pages`, `src/components`, `src/components/shared`, `src/components/ui`, `src/utils`, `src/store`, and `src/types` unless `docs/agent/project.md` says otherwise.
- Do not create `src/constants`; constants belong in `src/config`.
- File names and folders use lowercase kebab-case. Variables, functions, hooks, and object fields use camelCase. React components use PascalCase.
- Target about 200 lines per source file. Explain files over 250 lines. Normally split files over 300 lines.

## Reuse Policy

- Existing shared components, utilities, stores, and config modules should be reused before new ones are created.
- `docs/agent/registries.md` is a locator and ownership map, not API truth.
- Source exports and TypeScript types are the API truth.
- If registry summaries and source disagree, follow source and update the registry in the same change unless the user explicitly asked for read-only work.

## Frontend Policy

- React frontend implementation rules live in `docs/agent/frontend.md`.
- Cloud Deploy-specific frontend facts live in `docs/agent/project.md`.
- Installed reusable capabilities and source locations live in `docs/agent/registries.md`.

## State And Request Policy

- Persist only durable user settings and preferences unless `docs/agent/project.md` explicitly allows an exception.
- Do not persist uploaded files, constructor values, build results, prepared payloads, deploy results, logs, current tabs, or other runtime workflow data unless the project guide explicitly allows it.
- Keep request and wallet behavior aligned with the project guide and existing request utilities.
- Do not hard-code domain method names in reusable request utilities. Prefer config, ABI/source metadata, or caller-provided method names.

## Import Boundaries

- `src/config` must not import React, shadcn/ui, Zustand stores, or runtime browser APIs.
- `src/utils` must not import React components, shadcn/ui, or Zustand stores.
- `src/store` must not import UI components.
- `src/types` must not import runtime implementation modules.
- `src/components/shared` should receive store-backed values and callbacks through props by default.
- Page components compose layout, shared components, stores, and utilities, but should not own reusable domain logic.
