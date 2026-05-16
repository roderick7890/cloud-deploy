# Agent Guide

This file is the lightweight entry point for agents working on Cloud Deploy. Keep it short. Load detailed guidance only when the task needs it.

## Required Receipts

- If a task follows frontend rules, read `docs/agent/frontend.md` and mention `Followed docs/agent/frontend.md frontend rules.` in the final response.
- If a task reads or updates reusable capability registries, read `docs/agent/registries.md` and mention `Followed docs/agent/registries.md registries.` in the final response.

## When To Read Extra Docs

Read `docs/agent/frontend.md` before:

- adding or changing frontend code
- scaffolding project structure
- changing routes, layout, stores, request dispatch, wallet logic, Tailwind, shadcn/ui, or component composition

Read `docs/agent/registries.md` before:

- creating or reusing shared components
- creating or reusing utility helpers
- adding constants, defaults, route config, storage keys, upload config, or other static config
- moving, renaming, changing public API, or deleting shared components, utilities, or config modules

Do not open `docs/agent/registries.md` for every task. Use it only when reusable shared/components/utils/config are involved.

## Core Project Rules

- Frontend stack: Tailwind CSS, shadcn/ui, Zustand + `zustand.persist`, wagmi, and viem.
- Routing: use Next.js Pages Router conventions under `src/pages`; do not use App Router unless explicitly approved.
- Source layout: `src/assets/images`, `src/config`, `src/layout`, `src/pages`, `src/components`, `src/components/shared`, `src/utils`, `src/store`.
- Do not create `src/constants`; constants belong in `src/config`.
- File names and folders use lowercase kebab-case. Variables/functions/hooks use camelCase. React components use PascalCase.
- Target about 200 lines per source file. Explain files over 250 lines. Normally split files over 300 lines.

## Reuse Policy

- Existing shared components, utilities, and config modules should be reused before new ones are created.
- `docs/agent/registries.md` is a locator and ownership map, not API truth.
- Source exports and TypeScript types are the API truth.
- If registry summaries and source disagree, follow source and update the registry in the same change.

## UI Policy

- Prefer shared components when they encode Cloud Deploy business behavior.
- Prefer shadcn/ui primitives for generic controls.
- Do not write raw interactive/form controls such as `<button />`, `<input />`, `<textarea />`, `<select />`, `<label />`, or `<dialog />` when shadcn/ui or shared components fit.
- Raw layout/semantic elements such as `<div />`, `<main />`, `<section />`, `<header />`, `<nav />`, `<footer />`, and `<form />` are allowed.
- Do not use arbitrary Tailwind values in app markup, such as `text-[11px]`, `text-[#fff]`, or `bg-[#121212]`; create semantic tokens first.
- Keep the app as a `100vh` deploy tool with progress steps: Upload, Build, Review, Deploy.

## State And Request Policy

- Persist only settings: `rpcEndpoint`, `lyquidId`, `abi`, `buildMethod`, `deployMethod`.
- Use `src/store/settings-store.ts` for persisted settings.
- Use `src/store/deploy-session-store.ts` for runtime deployment session state.
- Do not persist uploaded files, constructor values, build results, prepared payloads, deploy results, or logs.
- `settings-store` owns atomic reconciliation of `abi`, `buildMethod`, and `deployMethod`.
- Implement two request paths: on-chain sender and off-chain sender.
- Do not hard-code ABI method names such as `build`, `prepare`, `deploy`, `publish`, or `register`.

## Import Boundaries

- `src/config` must not import React, shadcn/ui, Zustand stores, or runtime browser APIs.
- `src/utils` must not import React components, shadcn/ui, or Zustand stores.
- `src/store` must not import UI components.
- `src/components/shared` should receive store-backed values and callbacks through props by default.
- Page components compose layout, shared components, stores, and utilities, but should not own reusable domain logic.
