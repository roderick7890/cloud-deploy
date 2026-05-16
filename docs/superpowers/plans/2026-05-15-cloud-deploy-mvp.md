# Cloud Deploy MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Cloud Deploy MVP as a single-page, `100vh`, ABI-driven Lyquid deployment console with Upload, Build, Review, and Deploy steps.

**Architecture:** Start with a Vite React SPA project, then add focused config, pure ABI/file/hash/request utilities, two Zustand stores, reusable shared components, and a thin page composition layer. Persist only settings through `zustand.persist`; keep deployment attempt data in `deploy-session-store` and clear downstream runtime state with atomic actions whenever earlier inputs change.

**Tech Stack:** Vite, React, TypeScript, Tailwind CSS, shadcn/ui, Zustand, `zustand.persist`, wagmi, viem, Vitest, React Testing Library.

---

## Required Reading

- `AGENTS.md`
- `docs/agent/frontend.md`
- `docs/agent/registries.md`
- `docs/superpowers/specs/2026-05-15-cloud-deploy-mvp-design.md`

User override for this plan: use Vite instead of Next.js. Keep the remaining AGENTS.md frontend, UI, state, request, naming, registry, and import-boundary rules. Keep `src/pages/index.tsx` as the page composition module even though Vite mounts it through `src/main.tsx` and `src/app.tsx`.

Mention both required receipts in the final implementation response:

- `Followed docs/agent/frontend.md frontend rules.`
- `Followed docs/agent/registries.md registries.`

## File Structure Map

Create the app from an empty repository, preserving existing docs.

- `package.json`: scripts and runtime/dev dependencies.
- `index.html`: Vite HTML entry.
- `vite.config.ts`: Vite React config and path alias.
- `tsconfig.json`: TypeScript paths and strict checking.
- `tsconfig.node.json`: TypeScript config for Vite/Vitest config files.
- `tailwind.config.ts`: semantic Tailwind tokens only; no arbitrary values in app markup.
- `postcss.config.mjs`: Tailwind/PostCSS wiring.
- `vitest.config.ts`: unit/component test config.
- `vitest.setup.ts`: DOM matcher setup.
- `src/styles/globals.css`: shadcn CSS variables and app layout base.
- `src/main.tsx`: Vite app mount and global CSS import.
- `src/app.tsx`: global providers and page entry.
- `src/pages/index.tsx`: one-page Cloud Deploy route composition.
- `src/config/app-config.ts`: app name.
- `src/config/routes-config.ts`: route paths.
- `src/config/deploy-steps-config.ts`: Upload, Build, Review, Deploy step metadata.
- `src/config/storage-config.ts`: persisted storage key and version.
- `src/config/upload-config.ts`: accepted formats and max upload size.
- `src/config/default-settings-config.ts`: default persisted settings.
- `src/types/abi.ts`: normalized ABI method, constructor field, and transport types.
- `src/types/deploy.ts`: project metadata, hashes, payloads, results, and step types.
- `src/utils/abi/abi-utils.ts`: ABI parse, method option, constructor field, transport, and existence helpers.
- `src/utils/hash-utils.ts`: deterministic browser hashing helpers.
- `src/utils/file-utils.ts`: uploaded file/archive metadata helpers.
- `src/utils/download-utils.ts`: browser JSON download helper.
- `src/utils/format-utils.ts`: display formatters.
- `src/utils/request/on-chain-sender.ts`: on-chain encode/send/decode adapter.
- `src/utils/request/off-chain-sender.ts`: off-chain request adapter.
- `src/utils/request/request-dispatcher.ts`: selected-method dispatch boundary.
- `src/store/settings-store.ts`: persisted settings and ABI/method reconciliation.
- `src/store/deploy-session-store.ts`: runtime deployment session and atomic clearing actions.
- `src/layout/app-shell.tsx`: `100vh` shell with header and progress area.
- `src/components/ui/*`: shadcn/ui primitives installed by the shadcn CLI.
- `src/components/shared/app-header.tsx`: product name, wallet action, settings trigger.
- `src/components/shared/progress-steps.tsx`: four-step progress and back navigation.
- `src/components/shared/settings-dialog.tsx`: persisted settings editor.
- `src/components/shared/abi-method-select.tsx`: ABI-backed method select with missing-method error.
- `src/components/shared/constructor-params-form.tsx`: constructor inputs.
- `src/components/shared/payload-review-panel.tsx`: hashes, payload JSON, copy/download actions.
- `src/components/shared/result-summary.tsx`: deploy result display.
- `src/components/upload-step.tsx`: upload step content.
- `src/components/build-step.tsx`: build step content.
- `src/components/review-step.tsx`: review step content.
- `src/components/deploy-step.tsx`: deploy/update step content.
- `src/components/providers/web3-provider.tsx`: wagmi provider setup.
- `src/test/test-abi.ts`: shared test ABI fixtures.
- `src/test/render.tsx`: provider-aware test render helper.

## Adversarial Review Decisions Folded Into This Plan

The opposite architecture would make every step derive from one immutable deployment attempt object and avoid separate stores. That rejects the design's split between persisted settings and runtime session state. The useful criticism is that stale ABI-derived state and downstream runtime results can drift if settings and session mutations are independent.

This plan keeps the approved two-store architecture because it matches the MVP storage policy, but it constrains ownership:

- `settings-store` owns persisted setting reconciliation only.
- `deploy-session-store` owns runtime state and exposes atomic actions that clear downstream data when uploaded source, constructor values, build result, review payload, or deploy result becomes stale.
- ABI method lists and constructor fields are derived from `abi` with utilities, not stored redundantly.
- Request dispatch resolves the selected method immediately before execution, so stale selected method values fail locally with the spec's existence errors.

---

### Task 1: Scaffold Vite, Tailwind, shadcn/ui, and Tests

**Files:**
- Create: `package.json`
- Create: `index.html`
- Create: `vite.config.ts`
- Create: `tsconfig.json`
- Create: `tsconfig.node.json`
- Create: `tailwind.config.ts`
- Create: `postcss.config.mjs`
- Create: `vitest.config.ts`
- Create: `vitest.setup.ts`
- Create: `components.json`
- Create: `src/styles/globals.css`
- Create: `src/main.tsx`
- Create: `src/app.tsx`
- Create: `src/pages/index.tsx`
- Create: `src/lib/utils.ts`
- Create after shadcn install: `src/components/ui/button.tsx`
- Create after shadcn install: `src/components/ui/input.tsx`
- Create after shadcn install: `src/components/ui/textarea.tsx`
- Create after shadcn install: `src/components/ui/label.tsx`
- Create after shadcn install: `src/components/ui/select.tsx`
- Create after shadcn install: `src/components/ui/dialog.tsx`
- Create after shadcn install: `src/components/ui/alert-dialog.tsx`
- Create after shadcn install: `src/components/ui/progress.tsx`
- Create after shadcn install: `src/components/ui/badge.tsx`
- Create after shadcn install: `src/components/ui/separator.tsx`
- Create after shadcn install: `src/components/ui/scroll-area.tsx`
- Create after shadcn install: `src/components/ui/tooltip.tsx`

- [ ] **Step 1: Create the project directories**

Run:

```bash
mkdir -p src/pages src/styles src/lib src/components/ui src/components/shared src/components src/config src/layout src/store src/types src/utils/abi src/utils/request src/test
```

Expected: command exits with status `0`.

- [ ] **Step 2: Create `package.json`**

Write:

```json
{
  "name": "cloud-deploy",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "start": "vite preview",
    "lint": "eslint .",
    "typecheck": "tsc -b",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "@radix-ui/react-alert-dialog": "latest",
    "@radix-ui/react-dialog": "latest",
    "@radix-ui/react-label": "latest",
    "@radix-ui/react-progress": "latest",
    "@radix-ui/react-scroll-area": "latest",
    "@radix-ui/react-select": "latest",
    "@radix-ui/react-separator": "latest",
    "@radix-ui/react-slot": "latest",
    "@radix-ui/react-tooltip": "latest",
    "@tanstack/react-query": "latest",
    "class-variance-authority": "latest",
    "clsx": "latest",
    "lucide-react": "latest",
    "react": "latest",
    "react-dom": "latest",
    "tailwind-merge": "latest",
    "viem": "latest",
    "wagmi": "latest",
    "zustand": "latest"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "latest",
    "@testing-library/react": "latest",
    "@testing-library/user-event": "latest",
    "@types/node": "latest",
    "@types/react": "latest",
    "@types/react-dom": "latest",
    "@vitejs/plugin-react": "latest",
    "autoprefixer": "latest",
    "eslint-plugin-react-hooks": "latest",
    "eslint-plugin-react-refresh": "latest",
    "eslint": "latest",
    "jsdom": "latest",
    "postcss": "latest",
    "tailwindcss": "latest",
    "typescript": "latest",
    "vite": "latest",
    "vitest": "latest"
  }
}
```

- [ ] **Step 3: Install dependencies**

Run:

```bash
npm install
```

Expected: `package-lock.json` is created and npm exits with status `0`.

- [ ] **Step 4: Create the core config files**

Write `vite.config.ts`:

```ts
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});
```

Write `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "lib": ["dom", "dom.iterable", "es2020"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "useDefineForClassFields": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

Write `tsconfig.node.json`:

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true
  },
  "include": ["vite.config.ts", "vitest.config.ts", "tailwind.config.ts"]
}
```

Write `postcss.config.mjs`:

```js
const config = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {}
  }
};

export default config;
```

Write `vitest.config.ts`:

```ts
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./vitest.setup.ts"
  },
  resolve: {
    alias: {
      "@": new URL("./src", import.meta.url).pathname
    }
  }
});
```

Write `vitest.setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

- [ ] **Step 5: Create Tailwind and global CSS with semantic tokens**

Write `tailwind.config.ts`:

```ts
import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}", "./index.html"],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))"
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))"
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))"
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))"
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))"
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))"
        }
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)"
      },
      boxShadow: {
        panel: "0 12px 30px hsl(var(--foreground) / 0.08)"
      },
      fontSize: {
        caption: ["0.75rem", { lineHeight: "1rem" }]
      },
      height: {
        toolbar: "4rem"
      }
    }
  },
  plugins: []
};

export default config;
```

Write `src/styles/globals.css`:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 210 20% 98%;
    --foreground: 222 47% 11%;
    --card: 0 0% 100%;
    --card-foreground: 222 47% 11%;
    --primary: 221 83% 53%;
    --primary-foreground: 210 40% 98%;
    --secondary: 173 58% 39%;
    --secondary-foreground: 210 40% 98%;
    --muted: 214 32% 91%;
    --muted-foreground: 215 16% 47%;
    --accent: 38 92% 50%;
    --accent-foreground: 222 47% 11%;
    --destructive: 0 72% 51%;
    --destructive-foreground: 210 40% 98%;
    --border: 214 32% 86%;
    --input: 214 32% 86%;
    --ring: 221 83% 53%;
    --radius: 0.5rem;
  }

  * {
    @apply border-border;
  }

  body {
    @apply bg-background text-foreground antialiased;
  }
}
```

- [ ] **Step 6: Add the shadcn utility helper**

Write `src/lib/utils.ts`:

```ts
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

- [ ] **Step 7: Create `components.json` for the shadcn CLI**

The shadcn CLI uses this file to place generated UI components under `src/components/ui` and to use `@/lib/utils`.

Write `components.json`:

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "src/styles/globals.css",
    "baseColor": "neutral",
    "cssVariables": true,
    "prefix": ""
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  },
  "iconLibrary": "lucide"
}
```

- [ ] **Step 8: Install shadcn/ui primitives**

Run:

```bash
npx shadcn@latest add button input textarea label select dialog alert-dialog progress badge separator scroll-area tooltip
```

Expected: component files are created under `src/components/ui`.

- [ ] **Step 9: Create a temporary app entry**

Write `index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Cloud Deploy</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Write `src/main.tsx`:

```tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app";
import "@/styles/globals.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

Write `src/app.tsx`:

```tsx
import HomePage from "@/pages/index";

export function App() {
  return <HomePage />;
}
```

Write `src/pages/index.tsx`:

```tsx
export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background text-foreground">
      <h1 className="text-2xl font-semibold">Cloud Deploy</h1>
    </main>
  );
}
```

- [ ] **Step 10: Run baseline checks**

Run:

```bash
npm run typecheck
npm run test
npm run build
```

Expected: all commands exit with status `0`; `npm run test` may report no tests found only if Vitest exits successfully. If Vitest exits non-zero for no tests, add `passWithNoTests: true` to `vitest.config.ts`.

- [ ] **Step 11: Commit**

```bash
git add package.json package-lock.json index.html vite.config.ts tsconfig.json tsconfig.node.json tailwind.config.ts postcss.config.mjs vitest.config.ts vitest.setup.ts components.json src
git commit -m "chore: scaffold cloud deploy frontend"
```

---

### Task 2: Add Config, Types, and Registries

**Files:**
- Create: `src/config/app-config.ts`
- Create: `src/config/routes-config.ts`
- Create: `src/config/deploy-steps-config.ts`
- Create: `src/config/storage-config.ts`
- Create: `src/config/upload-config.ts`
- Create: `src/config/default-settings-config.ts`
- Create: `src/types/abi.ts`
- Create: `src/types/deploy.ts`
- Modify: `docs/agent/registries.md`
- Test: `src/config/deploy-steps-config.test.ts`

- [ ] **Step 1: Write failing config tests**

Write `src/config/deploy-steps-config.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { deploySteps } from "./deploy-steps-config";

describe("deploySteps", () => {
  it("keeps the MVP workflow in order", () => {
    expect(deploySteps.map((step) => step.id)).toEqual(["upload", "build", "review", "deploy"]);
  });

  it("uses stable labels for the progress UI", () => {
    expect(deploySteps.map((step) => step.label)).toEqual(["Upload", "Build", "Review", "Deploy"]);
  });
});
```

- [ ] **Step 2: Run the failing test**

Run:

```bash
npm run test -- src/config/deploy-steps-config.test.ts
```

Expected: FAIL because `deploy-steps-config` does not exist.

- [ ] **Step 3: Create shared types**

Write `src/types/abi.ts`:

```ts
import type { Abi, AbiFunction } from "viem";

export type RequestTransport = "on-chain" | "off-chain";

export type NormalizedAbiMethod = {
  name: string;
  signature: string;
  transport: RequestTransport;
  abiItem: AbiFunction;
};

export type AbiMethodOption = {
  value: string;
  label: string;
  transport: RequestTransport;
};

export type ConstructorField = {
  name: string;
  type: string;
  internalType?: string;
};

export type ParsedAbi = {
  source: string;
  abi: Abi;
  methods: NormalizedAbiMethod[];
  constructorFields: ConstructorField[];
};
```

Write `src/types/deploy.ts`:

```ts
export type DeployStepId = "upload" | "build" | "review" | "deploy";

export type DeployStep = {
  id: DeployStepId;
  label: string;
  description: string;
};

export type ProjectMetadata = {
  name: string;
  fileCount: number;
  totalSize: number;
};

export type DeploymentHashes = {
  sourceHash?: string;
  artifactHash?: string;
  constructorInputHash?: string;
  signedPayloadHash?: string;
};

export type BuildResult = {
  hashes: DeploymentHashes;
  logs: string[];
  payload?: unknown;
  raw: unknown;
};

export type ReviewPayload = {
  hashes: DeploymentHashes;
  payload: unknown;
};

export type DeployResult = {
  transactionHash?: string;
  lyquidId?: string;
  status?: string;
  signedPayloadHash?: string;
  raw: unknown;
};
```

- [ ] **Step 4: Create config modules**

Write `src/config/app-config.ts`:

```ts
export const appName = "Cloud Deploy";
```

Write `src/config/routes-config.ts`:

```ts
export const routes = {
  home: "/"
} as const;
```

Write `src/config/deploy-steps-config.ts`:

```ts
import type { DeployStep } from "@/types/deploy";

export const deploySteps: DeployStep[] = [
  { id: "upload", label: "Upload", description: "Select a Lyquid project source." },
  { id: "build", label: "Build", description: "Run the ABI-selected build method." },
  { id: "review", label: "Review", description: "Inspect deployment evidence and payload." },
  { id: "deploy", label: "Deploy", description: "Submit create or update deployment." }
];
```

Write `src/config/storage-config.ts`:

```ts
export const settingsStorageKey = "cloud-deploy-settings";
export const settingsVersion = 1;
```

Write `src/config/upload-config.ts`:

```ts
export const acceptedProjectFormats = [".zip"] as const;
export const maxUploadSize = 100 * 1024 * 1024;
```

Write `src/config/default-settings-config.ts`:

```ts
export type DefaultSettings = {
  rpcEndpoint: string;
  lyquidId: string;
  abi: string;
  buildMethod: string;
  deployMethod: string;
};

export const defaultSettings: DefaultSettings = {
  rpcEndpoint: "",
  lyquidId: "",
  abi: "[]",
  buildMethod: "",
  deployMethod: ""
};
```

- [ ] **Step 5: Update the config registry statuses**

Modify the Config Registry rows in `docs/agent/registries.md` so these entries are `active`:

```markdown
| `app-config` | `src/config/app-config.ts` | active | App-level product constants | `appName` | Layout, metadata | No runtime state |
| `routes-config` | `src/config/routes-config.ts` | active | Route paths and route labels | `routes` | Navigation, links | Keep `src/pages` route paths consistent |
| `deploy-steps-config` | `src/config/deploy-steps-config.ts` | active | Upload, Build, Review, Deploy step definitions | `deploySteps` | `ProgressSteps`, pages | Do not duplicate step labels in components |
| `storage-config` | `src/config/storage-config.ts` | active | Local storage keys and persisted setting version | `settingsStorageKey`, `settingsVersion` | `settings-store` | Used by persisted store only |
| `upload-config` | `src/config/upload-config.ts` | active | Upload limits and accepted source formats | `acceptedProjectFormats`, `maxUploadSize` | Upload step, `file-utils` | Keep UI and file handling aligned |
| `default-settings-config` | `src/config/default-settings-config.ts` | active | Default settings shown in Settings | `defaultSettings` | `settings-store`, `SettingsDialog` | Includes empty ABI defaults for the MVP |
```

- [ ] **Step 6: Run tests and typecheck**

Run:

```bash
npm run test -- src/config/deploy-steps-config.test.ts
npm run typecheck
```

Expected: both commands pass.

- [ ] **Step 7: Commit**

```bash
git add docs/agent/registries.md src/config src/types
git commit -m "feat: add cloud deploy config and types"
```

---

### Task 3: Implement ABI Utilities

**Files:**
- Create: `src/test/test-abi.ts`
- Create: `src/utils/abi/abi-utils.ts`
- Create: `src/utils/abi/abi-utils.test.ts`
- Modify: `docs/agent/registries.md`

- [ ] **Step 1: Add ABI fixtures**

Write `src/test/test-abi.ts`:

```ts
export const lyquidTestAbi = JSON.stringify([
  {
    "type": "constructor",
    "inputs": [
      { "name": "owner", "type": "address", "internalType": "address" },
      { "name": "limit", "type": "uint256", "internalType": "uint256" }
    ]
  },
  {
    "type": "function",
    "name": "compileProject",
    "stateMutability": "nonpayable",
    "inputs": [{ "name": "source", "type": "bytes", "internalType": "bytes" }],
    "outputs": [{ "name": "artifactHash", "type": "bytes32", "internalType": "bytes32" }]
  },
  {
    "type": "function",
    "name": "publishProject",
    "stateMutability": "payable",
    "inputs": [{ "name": "payload", "type": "bytes", "internalType": "bytes" }],
    "outputs": [{ "name": "lyquidId", "type": "string", "internalType": "string" }]
  },
  {
    "type": "function",
    "name": "prepareProject",
    "stateMutability": "view",
    "inputs": [{ "name": "sourceHash", "type": "bytes32", "internalType": "bytes32" }],
    "outputs": [{ "name": "payload", "type": "bytes", "internalType": "bytes" }],
    "x-lyquid-transport": "off-chain"
  }
]);
```

- [ ] **Step 2: Write failing ABI utility tests**

Write `src/utils/abi/abi-utils.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { lyquidTestAbi } from "@/test/test-abi";
import {
  getConstructorFields,
  getMethodOptions,
  methodExists,
  parseAbiSource,
  resolveMethodTransport
} from "./abi-utils";

describe("abi-utils", () => {
  it("parses callable methods from ABI JSON", () => {
    const parsed = parseAbiSource(lyquidTestAbi);
    expect(parsed.methods.map((method) => method.name)).toEqual([
      "compileProject",
      "publishProject",
      "prepareProject"
    ]);
  });

  it("builds stable method option values from signatures", () => {
    const options = getMethodOptions(parseAbiSource(lyquidTestAbi));
    expect(options[0]).toMatchObject({
      value: "compileProject(bytes)",
      label: "compileProject(bytes)",
      transport: "on-chain"
    });
  });

  it("reads constructor fields", () => {
    expect(getConstructorFields(parseAbiSource(lyquidTestAbi))).toEqual([
      { name: "owner", type: "address", internalType: "address" },
      { name: "limit", type: "uint256", internalType: "uint256" }
    ]);
  });

  it("detects selected method existence by signature", () => {
    const parsed = parseAbiSource(lyquidTestAbi);
    expect(methodExists(parsed, "publishProject(bytes)")).toBe(true);
    expect(methodExists(parsed, "missingMethod(bytes)")).toBe(false);
  });

  it("uses ABI metadata to select off-chain transport", () => {
    const parsed = parseAbiSource(lyquidTestAbi);
    const method = parsed.methods.find((item) => item.name === "prepareProject");
    expect(method).toBeDefined();
    expect(resolveMethodTransport(method!)).toBe("off-chain");
  });

  it("returns a direct parse error for invalid ABI JSON", () => {
    expect(() => parseAbiSource("{")).toThrow("Invalid ABI JSON");
  });
});
```

- [ ] **Step 3: Run the failing tests**

Run:

```bash
npm run test -- src/utils/abi/abi-utils.test.ts
```

Expected: FAIL because `abi-utils.ts` does not exist.

- [ ] **Step 4: Implement ABI utilities**

Write `src/utils/abi/abi-utils.ts`:

```ts
import type { Abi, AbiConstructor, AbiFunction } from "viem";
import type { AbiMethodOption, ConstructorField, NormalizedAbiMethod, ParsedAbi, RequestTransport } from "@/types/abi";

type AbiItemWithTransport = AbiFunction & {
  "x-lyquid-transport"?: RequestTransport;
  xLyquidTransport?: RequestTransport;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isAbiFunction(item: unknown): item is AbiFunction {
  return isRecord(item) && item.type === "function" && typeof item.name === "string";
}

function isAbiConstructor(item: unknown): item is AbiConstructor {
  return isRecord(item) && item.type === "constructor";
}

function inputSignature(item: AbiFunction) {
  const inputs = item.inputs ?? [];
  return inputs.map((input) => input.type).join(",");
}

function methodSignature(item: AbiFunction) {
  return `${item.name}(${inputSignature(item)})`;
}

function normalizeTransport(value: unknown): RequestTransport | undefined {
  if (value === "on-chain" || value === "off-chain") {
    return value;
  }

  return undefined;
}

export function resolveMethodTransport(method: NormalizedAbiMethod | AbiFunction): RequestTransport {
  const item = method as AbiItemWithTransport;
  return normalizeTransport(item["x-lyquid-transport"]) ?? normalizeTransport(item.xLyquidTransport) ?? "on-chain";
}

export function parseAbiSource(source: string): ParsedAbi {
  let parsed: unknown;

  try {
    parsed = JSON.parse(source);
  } catch {
    throw new Error("Invalid ABI JSON");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Invalid ABI JSON");
  }

  const abi = parsed as Abi;
  const methods = abi.filter(isAbiFunction).map<NormalizedAbiMethod>((item) => ({
    name: item.name,
    signature: methodSignature(item),
    transport: resolveMethodTransport(item),
    abiItem: item
  }));

  const constructor = abi.find(isAbiConstructor);
  const constructorFields: ConstructorField[] = (constructor?.inputs ?? []).map((input, index) => ({
    name: input.name || `arg${index}`,
    type: input.type,
    internalType: input.internalType
  }));

  return {
    source,
    abi,
    methods,
    constructorFields
  };
}

export function getMethodOptions(parsed: ParsedAbi): AbiMethodOption[] {
  return parsed.methods.map((method) => ({
    value: method.signature,
    label: method.signature,
    transport: method.transport
  }));
}

export function getConstructorFields(parsed: ParsedAbi): ConstructorField[] {
  return parsed.constructorFields;
}

export function methodExists(parsed: ParsedAbi, selectedMethod: string) {
  return parsed.methods.some((method) => method.signature === selectedMethod);
}

export function findMethod(parsed: ParsedAbi, selectedMethod: string) {
  return parsed.methods.find((method) => method.signature === selectedMethod);
}
```

- [ ] **Step 5: Update the utility registry**

Modify the `abi-utils` row in `docs/agent/registries.md`:

```markdown
| `abi-utils` | `src/utils/abi/abi-utils.ts` | active | Parse and normalize imported ABI | `parseAbiSource`, `getMethodOptions`, `getConstructorFields`, `methodExists`, `findMethod`, `resolveMethodTransport` | Settings, Build, Deploy | Raw ABI parsing belongs under `src/utils/abi`; UI consumes normalized ABI data |
```

- [ ] **Step 6: Verify ABI utilities**

Run:

```bash
npm run test -- src/utils/abi/abi-utils.test.ts
npm run typecheck
```

Expected: both commands pass.

- [ ] **Step 7: Commit**

```bash
git add docs/agent/registries.md src/test/test-abi.ts src/utils/abi
git commit -m "feat: add ABI parsing utilities"
```

---

### Task 4: Implement File, Hash, Format, and Download Utilities

**Files:**
- Create: `src/utils/hash-utils.ts`
- Create: `src/utils/hash-utils.test.ts`
- Create: `src/utils/file-utils.ts`
- Create: `src/utils/file-utils.test.ts`
- Create: `src/utils/format-utils.ts`
- Create: `src/utils/format-utils.test.ts`
- Create: `src/utils/download-utils.ts`
- Modify: `docs/agent/registries.md`

- [ ] **Step 1: Write failing utility tests**

Write `src/utils/hash-utils.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { hashConstructorInput, hashPayload, hashSource } from "./hash-utils";

describe("hash-utils", () => {
  it("hashes source bytes deterministically", async () => {
    await expect(hashSource(new TextEncoder().encode("source"))).resolves.toMatch(/^0x[0-9a-f]{64}$/);
  });

  it("hashes constructor values by stable JSON", async () => {
    const first = await hashConstructorInput({ owner: "0x1", limit: "5" });
    const second = await hashConstructorInput({ limit: "5", owner: "0x1" });
    expect(first).toBe(second);
  });

  it("hashes payloads by stable JSON", async () => {
    await expect(hashPayload({ artifactHash: "0xabc" })).resolves.toMatch(/^0x[0-9a-f]{64}$/);
  });
});
```

Write `src/utils/file-utils.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getProjectMetadata, readProjectArchive } from "./file-utils";

describe("file-utils", () => {
  it("reads metadata from uploaded files", () => {
    const files = [
      new File(["abc"], "cloud.zip", { type: "application/zip" }),
      new File(["de"], "readme.md", { type: "text/markdown" })
    ];

    expect(getProjectMetadata(files)).toEqual({
      name: "cloud.zip",
      fileCount: 2,
      totalSize: 5
    });
  });

  it("reads a single archive as bytes", async () => {
    const file = new File(["abc"], "cloud.zip", { type: "application/zip" });
    await expect(readProjectArchive(file)).resolves.toBeInstanceOf(Uint8Array);
  });
});
```

Write `src/utils/format-utils.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { formatStatus, shortAddress, shortHash } from "./format-utils";

describe("format-utils", () => {
  it("shortens hashes and addresses", () => {
    expect(shortHash("0x1234567890abcdef")).toBe("0x1234...cdef");
    expect(shortAddress("0x1234567890abcdef")).toBe("0x1234...cdef");
  });

  it("formats empty values", () => {
    expect(shortHash(undefined)).toBe("Unavailable");
    expect(formatStatus(undefined)).toBe("Unknown");
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm run test -- src/utils/hash-utils.test.ts src/utils/file-utils.test.ts src/utils/format-utils.test.ts
```

Expected: FAIL because utility modules do not exist.

- [ ] **Step 3: Implement hash utilities**

Write `src/utils/hash-utils.ts`:

```ts
function toHex(bytes: ArrayBuffer) {
  return `0x${Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")}`;
}

function sortForJson(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortForJson);
  }

  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, sortForJson(item)])
    );
  }

  return value;
}

async function sha256Bytes(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return toHex(digest);
}

async function hashStableJson(value: unknown) {
  return sha256Bytes(new TextEncoder().encode(JSON.stringify(sortForJson(value))));
}

export async function hashSource(source: Uint8Array) {
  return sha256Bytes(source);
}

export async function hashConstructorInput(values: Record<string, string>) {
  return hashStableJson(values);
}

export async function hashPayload(payload: unknown) {
  return hashStableJson(payload);
}
```

- [ ] **Step 4: Implement file utilities**

Write `src/utils/file-utils.ts`:

```ts
import type { ProjectMetadata } from "@/types/deploy";

export function getProjectMetadata(files: File[]): ProjectMetadata {
  const firstFile = files[0];

  return {
    name: firstFile?.name ?? "Untitled project",
    fileCount: files.length,
    totalSize: files.reduce((sum, file) => sum + file.size, 0)
  };
}

export async function readProjectArchive(file: File) {
  return new Uint8Array(await file.arrayBuffer());
}
```

- [ ] **Step 5: Implement format and download utilities**

Write `src/utils/format-utils.ts`:

```ts
export function shortHash(value: string | undefined) {
  if (!value) {
    return "Unavailable";
  }

  if (value.length <= 12) {
    return value;
  }

  return `${value.slice(0, 6)}...${value.slice(-4)}`;
}

export function shortAddress(value: string | undefined) {
  return shortHash(value);
}

export function formatStatus(value: string | undefined) {
  if (!value) {
    return "Unknown";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}
```

Write `src/utils/download-utils.ts`:

```ts
export function downloadJson(filename: string, value: unknown) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
```

- [ ] **Step 6: Update utility registry statuses**

Modify these Utility Registry rows in `docs/agent/registries.md`:

```markdown
| `hash-utils` | `src/utils/hash-utils.ts` | active | Compute deterministic deployment evidence hashes | `hashSource`, `hashConstructorInput`, `hashPayload` | Review, Deploy | Do not duplicate hashing in components |
| `file-utils` | `src/utils/file-utils.ts` | active | Read uploaded project metadata and archives | `getProjectMetadata`, `readProjectArchive` | Upload | Do not persist `File` or `FileList` |
| `download-utils` | `src/utils/download-utils.ts` | active | Download JSON payloads and results from the browser | `downloadJson` | Review, Deploy | Browser-only utility |
| `format-utils` | `src/utils/format-utils.ts` | active | Format hashes, addresses, and statuses for display | `shortHash`, `shortAddress`, `formatStatus` | UI components | Display-only; no business logic |
```

- [ ] **Step 7: Verify utilities**

Run:

```bash
npm run test -- src/utils/hash-utils.test.ts src/utils/file-utils.test.ts src/utils/format-utils.test.ts
npm run typecheck
```

Expected: both commands pass.

- [ ] **Step 8: Commit**

```bash
git add docs/agent/registries.md src/utils
git commit -m "feat: add deploy helper utilities"
```

---

### Task 5: Implement Settings Store

**Files:**
- Create: `src/store/settings-store.ts`
- Create: `src/store/settings-store.test.ts`

- [ ] **Step 1: Write failing settings-store tests**

Write `src/store/settings-store.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { lyquidTestAbi } from "@/test/test-abi";
import { useSettingsStore } from "./settings-store";

describe("settings-store", () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.setState(useSettingsStore.getInitialState(), true);
  });

  it("persists only settings", () => {
    useSettingsStore.getState().saveSettings({
      rpcEndpoint: "http://localhost:8545",
      lyquidId: "lyquid-1",
      abi: lyquidTestAbi,
      buildMethod: "compileProject(bytes)",
      deployMethod: "publishProject(bytes)"
    });

    const raw = localStorage.getItem("cloud-deploy-settings");
    expect(raw).toContain("rpcEndpoint");
    expect(raw).not.toContain("buildResult");
    expect(raw).not.toContain("uploadedProject");
  });

  it("reports missing selected methods after ABI changes", () => {
    useSettingsStore.getState().saveSettings({
      rpcEndpoint: "",
      lyquidId: "",
      abi: lyquidTestAbi,
      buildMethod: "compileProject(bytes)",
      deployMethod: "publishProject(bytes)"
    });

    useSettingsStore.getState().saveSettings({
      rpcEndpoint: "",
      lyquidId: "",
      abi: "[]",
      buildMethod: "compileProject(bytes)",
      deployMethod: "publishProject(bytes)"
    });

    expect(useSettingsStore.getState().methodErrors).toEqual({
      buildMethod: "Build method does not exist.",
      deployMethod: "Deploy method does not exist."
    });
  });

  it("derives method options from current ABI", () => {
    useSettingsStore.getState().saveSettings({
      rpcEndpoint: "",
      lyquidId: "",
      abi: lyquidTestAbi,
      buildMethod: "",
      deployMethod: ""
    });

    expect(useSettingsStore.getState().methodOptions.map((option) => option.value)).toContain("compileProject(bytes)");
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm run test -- src/store/settings-store.test.ts
```

Expected: FAIL because `settings-store.ts` does not exist.

- [ ] **Step 3: Implement settings store**

Write `src/store/settings-store.ts`:

```ts
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultSettings, type DefaultSettings } from "@/config/default-settings-config";
import { settingsStorageKey, settingsVersion } from "@/config/storage-config";
import type { AbiMethodOption, ConstructorField, ParsedAbi } from "@/types/abi";
import { getConstructorFields, getMethodOptions, methodExists, parseAbiSource } from "@/utils/abi/abi-utils";

type MethodErrors = {
  buildMethod?: string;
  deployMethod?: string;
  abi?: string;
};

type SettingsState = DefaultSettings & {
  parsedAbi: ParsedAbi | null;
  methodOptions: AbiMethodOption[];
  constructorFields: ConstructorField[];
  methodErrors: MethodErrors;
  saveSettings: (settings: DefaultSettings) => void;
};

function deriveSettings(settings: DefaultSettings) {
  try {
    const parsedAbi = parseAbiSource(settings.abi);
    const methodOptions = getMethodOptions(parsedAbi);
    const constructorFields = getConstructorFields(parsedAbi);
    const methodErrors: MethodErrors = {};

    if (settings.buildMethod && !methodExists(parsedAbi, settings.buildMethod)) {
      methodErrors.buildMethod = "Build method does not exist.";
    }

    if (settings.deployMethod && !methodExists(parsedAbi, settings.deployMethod)) {
      methodErrors.deployMethod = "Deploy method does not exist.";
    }

    return {
      ...settings,
      parsedAbi,
      methodOptions,
      constructorFields,
      methodErrors
    };
  } catch (error) {
    return {
      ...settings,
      parsedAbi: null,
      methodOptions: [],
      constructorFields: [],
      methodErrors: {
        abi: error instanceof Error ? error.message : "Invalid ABI JSON"
      }
    };
  }
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...deriveSettings(defaultSettings),
      saveSettings: (settings) => set(deriveSettings(settings))
    }),
    {
      name: settingsStorageKey,
      version: settingsVersion,
      partialize: (state) => ({
        rpcEndpoint: state.rpcEndpoint,
        lyquidId: state.lyquidId,
        abi: state.abi,
        buildMethod: state.buildMethod,
        deployMethod: state.deployMethod
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.saveSettings({
            rpcEndpoint: state.rpcEndpoint,
            lyquidId: state.lyquidId,
            abi: state.abi,
            buildMethod: state.buildMethod,
            deployMethod: state.deployMethod
          });
        }
      }
    }
  )
);
```

- [ ] **Step 4: Verify settings store**

Run:

```bash
npm run test -- src/store/settings-store.test.ts
npm run typecheck
```

Expected: both commands pass.

- [ ] **Step 5: Commit**

```bash
git add src/store/settings-store.ts src/store/settings-store.test.ts
git commit -m "feat: add persisted settings store"
```

---

### Task 6: Implement Deploy Session Store

**Files:**
- Create: `src/store/deploy-session-store.ts`
- Create: `src/store/deploy-session-store.test.ts`

- [ ] **Step 1: Write failing deploy-session-store tests**

Write `src/store/deploy-session-store.test.ts`:

```ts
import { beforeEach, describe, expect, it } from "vitest";
import { useDeploySessionStore } from "./deploy-session-store";

describe("deploy-session-store", () => {
  beforeEach(() => {
    useDeploySessionStore.setState(useDeploySessionStore.getInitialState(), true);
  });

  it("moves forward and backward through deploy steps", () => {
    useDeploySessionStore.getState().goToNextStep();
    expect(useDeploySessionStore.getState().currentStep).toBe("build");
    useDeploySessionStore.getState().goToPreviousStep();
    expect(useDeploySessionStore.getState().currentStep).toBe("upload");
  });

  it("clears downstream runtime state when project changes", () => {
    useDeploySessionStore.getState().setBuildResult({ hashes: {}, logs: [], raw: { ok: true } });
    useDeploySessionStore.getState().setReviewPayload({ hashes: {}, payload: { ready: true } });
    useDeploySessionStore.getState().setDeployResult({ status: "success", raw: { ok: true } });

    useDeploySessionStore.getState().setUploadedProject({
      metadata: { name: "cloud.zip", fileCount: 1, totalSize: 3 },
      files: [new File(["abc"], "cloud.zip")]
    });

    expect(useDeploySessionStore.getState().buildResult).toBeNull();
    expect(useDeploySessionStore.getState().reviewPayload).toBeNull();
    expect(useDeploySessionStore.getState().deployResult).toBeNull();
  });

  it("does not persist runtime state", () => {
    useDeploySessionStore.getState().setCurrentError("Encoding failed");
    expect(localStorage.getItem("cloud-deploy-session")).toBeNull();
  });
});
```

- [ ] **Step 2: Run failing tests**

Run:

```bash
npm run test -- src/store/deploy-session-store.test.ts
```

Expected: FAIL because `deploy-session-store.ts` does not exist.

- [ ] **Step 3: Implement deploy session store**

Write `src/store/deploy-session-store.ts`:

```ts
import { create } from "zustand";
import type { BuildResult, DeployResult, DeployStepId, ProjectMetadata, ReviewPayload } from "@/types/deploy";

type UploadedProject = {
  metadata: ProjectMetadata;
  files: File[];
};

type DeploySessionState = {
  currentStep: DeployStepId;
  uploadedProject: UploadedProject | null;
  constructorValues: Record<string, string>;
  buildResult: BuildResult | null;
  reviewPayload: ReviewPayload | null;
  deployResult: DeployResult | null;
  currentError: string | null;
  setUploadedProject: (project: UploadedProject) => void;
  setConstructorValues: (values: Record<string, string>) => void;
  setBuildResult: (result: BuildResult) => void;
  setReviewPayload: (payload: ReviewPayload) => void;
  setDeployResult: (result: DeployResult) => void;
  setCurrentError: (error: string | null) => void;
  goToStep: (step: DeployStepId) => void;
  goToNextStep: () => void;
  goToPreviousStep: () => void;
  resetSession: () => void;
};

const stepOrder: DeployStepId[] = ["upload", "build", "review", "deploy"];

const initialState = {
  currentStep: "upload" as DeployStepId,
  uploadedProject: null,
  constructorValues: {},
  buildResult: null,
  reviewPayload: null,
  deployResult: null,
  currentError: null
};

function nextStep(currentStep: DeployStepId) {
  return stepOrder[Math.min(stepOrder.indexOf(currentStep) + 1, stepOrder.length - 1)];
}

function previousStep(currentStep: DeployStepId) {
  return stepOrder[Math.max(stepOrder.indexOf(currentStep) - 1, 0)];
}

export const useDeploySessionStore = create<DeploySessionState>()((set) => ({
  ...initialState,
  setUploadedProject: (project) =>
    set({
      uploadedProject: project,
      buildResult: null,
      reviewPayload: null,
      deployResult: null,
      currentError: null
    }),
  setConstructorValues: (values) =>
    set({
      constructorValues: values,
      buildResult: null,
      reviewPayload: null,
      deployResult: null,
      currentError: null
    }),
  setBuildResult: (result) =>
    set({
      buildResult: result,
      reviewPayload: {
        hashes: result.hashes,
        payload: result.payload ?? result.raw
      },
      deployResult: null,
      currentError: null,
      currentStep: "review"
    }),
  setReviewPayload: (payload) =>
    set({
      reviewPayload: payload,
      deployResult: null,
      currentError: null
    }),
  setDeployResult: (result) =>
    set({
      deployResult: result,
      currentError: null
    }),
  setCurrentError: (error) => set({ currentError: error }),
  goToStep: (step) => set({ currentStep: step }),
  goToNextStep: () => set((state) => ({ currentStep: nextStep(state.currentStep) })),
  goToPreviousStep: () => set((state) => ({ currentStep: previousStep(state.currentStep) })),
  resetSession: () => set(initialState)
}));
```

- [ ] **Step 4: Verify deploy session store**

Run:

```bash
npm run test -- src/store/deploy-session-store.test.ts
npm run typecheck
```

Expected: both commands pass.

- [ ] **Step 5: Commit**

```bash
git add src/store/deploy-session-store.ts src/store/deploy-session-store.test.ts
git commit -m "feat: add runtime deploy session store"
```

---

### Task 7: Implement Request Dispatchers

**Files:**
- Create: `src/utils/request/request-types.ts`
- Create: `src/utils/request/on-chain-sender.ts`
- Create: `src/utils/request/off-chain-sender.ts`
- Create: `src/utils/request/request-dispatcher.ts`
- Create: `src/utils/request/request-dispatcher.test.ts`

- [ ] **Step 1: Write failing dispatcher tests**

Write `src/utils/request/request-dispatcher.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";
import { lyquidTestAbi } from "@/test/test-abi";
import { parseAbiSource } from "@/utils/abi/abi-utils";
import { dispatchSelectedMethod } from "./request-dispatcher";
import type { RequestSenderContext } from "./request-types";

describe("request-dispatcher", () => {
  it("dispatches on-chain methods through the on-chain sender", async () => {
    const parsedAbi = parseAbiSource(lyquidTestAbi);
    const context: RequestSenderContext = {
      rpcEndpoint: "http://localhost:8545",
      accountAddress: "0x0000000000000000000000000000000000000001",
      walletClient: {},
      publicClient: {},
      offChainFetch: vi.fn()
    };
    const onChainSender = vi.fn().mockResolvedValue({ raw: { chain: true } });
    const offChainSender = vi.fn();

    await dispatchSelectedMethod({
      parsedAbi,
      selectedMethod: "compileProject(bytes)",
      args: ["0x1234"],
      context,
      onChainSender,
      offChainSender
    });

    expect(onChainSender).toHaveBeenCalledTimes(1);
    expect(offChainSender).not.toHaveBeenCalled();
  });

  it("dispatches off-chain methods through the off-chain sender", async () => {
    const parsedAbi = parseAbiSource(lyquidTestAbi);
    const context: RequestSenderContext = {
      rpcEndpoint: "http://localhost:8545",
      accountAddress: undefined,
      walletClient: undefined,
      publicClient: undefined,
      offChainFetch: vi.fn()
    };
    const onChainSender = vi.fn();
    const offChainSender = vi.fn().mockResolvedValue({ raw: { offChain: true } });

    await dispatchSelectedMethod({
      parsedAbi,
      selectedMethod: "prepareProject(bytes32)",
      args: ["0x0000000000000000000000000000000000000000000000000000000000000000"],
      context,
      onChainSender,
      offChainSender
    });

    expect(offChainSender).toHaveBeenCalledTimes(1);
    expect(onChainSender).not.toHaveBeenCalled();
  });

  it("fails locally when selected method does not exist", async () => {
    await expect(
      dispatchSelectedMethod({
        parsedAbi: parseAbiSource(lyquidTestAbi),
        selectedMethod: "missing(bytes)",
        args: [],
        context: { rpcEndpoint: "", offChainFetch: vi.fn() },
        onChainSender: vi.fn(),
        offChainSender: vi.fn()
      })
    ).rejects.toThrow("Selected method does not exist.");
  });
});
```

- [ ] **Step 2: Run failing dispatcher tests**

Run:

```bash
npm run test -- src/utils/request/request-dispatcher.test.ts
```

Expected: FAIL because request modules do not exist.

- [ ] **Step 3: Add request types**

Write `src/utils/request/request-types.ts`:

```ts
import type { NormalizedAbiMethod, ParsedAbi } from "@/types/abi";

export type RequestSenderContext = {
  rpcEndpoint: string;
  accountAddress?: `0x${string}`;
  walletClient?: unknown;
  publicClient?: unknown;
  offChainFetch: typeof fetch;
};

export type SelectedMethodRequest = {
  parsedAbi: ParsedAbi;
  selectedMethod: string;
  args: unknown[];
  context: RequestSenderContext;
};

export type MethodSenderInput = {
  method: NormalizedAbiMethod;
  args: unknown[];
  context: RequestSenderContext;
};

export type MethodSender = (input: MethodSenderInput) => Promise<unknown>;
```

- [ ] **Step 4: Implement on-chain sender**

Write `src/utils/request/on-chain-sender.ts`:

```ts
import { encodeFunctionData } from "viem";
import type { MethodSenderInput } from "./request-types";

export async function sendOnChainMethod({ method, args, context }: MethodSenderInput) {
  if (!context.rpcEndpoint) {
    throw new Error("RPC endpoint is required.");
  }

  const data = encodeFunctionData({
    abi: [method.abiItem],
    functionName: method.name,
    args
  });

  return {
    data,
    method: method.signature,
    transport: "on-chain",
    raw: {
      encodedData: data,
      rpcEndpoint: context.rpcEndpoint
    }
  };
}
```

- [ ] **Step 5: Implement off-chain sender**

Write `src/utils/request/off-chain-sender.ts`:

```ts
import { encodeFunctionData } from "viem";
import type { MethodSenderInput } from "./request-types";

export async function sendOffChainMethod({ method, args, context }: MethodSenderInput) {
  if (!context.rpcEndpoint) {
    throw new Error("RPC endpoint is required.");
  }

  const body = {
    method: method.signature,
    data: encodeFunctionData({
      abi: [method.abiItem],
      functionName: method.name,
      args
    })
  };

  const response = await context.offChainFetch(context.rpcEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const raw = await response.json();

  if (!response.ok) {
    throw new Error(typeof raw?.error === "string" ? raw.error : "Off-chain request failed.");
  }

  return {
    method: method.signature,
    transport: "off-chain",
    raw
  };
}
```

- [ ] **Step 6: Implement request dispatcher**

Write `src/utils/request/request-dispatcher.ts`:

```ts
import { findMethod } from "@/utils/abi/abi-utils";
import { sendOffChainMethod } from "./off-chain-sender";
import { sendOnChainMethod } from "./on-chain-sender";
import type { MethodSender, SelectedMethodRequest } from "./request-types";

type DispatchSelectedMethodInput = SelectedMethodRequest & {
  onChainSender?: MethodSender;
  offChainSender?: MethodSender;
};

export async function dispatchSelectedMethod({
  parsedAbi,
  selectedMethod,
  args,
  context,
  onChainSender = sendOnChainMethod,
  offChainSender = sendOffChainMethod
}: DispatchSelectedMethodInput) {
  const method = findMethod(parsedAbi, selectedMethod);

  if (!method) {
    throw new Error("Selected method does not exist.");
  }

  const sender = method.transport === "off-chain" ? offChainSender : onChainSender;
  return sender({ method, args, context });
}
```

- [ ] **Step 7: Verify request dispatchers**

Run:

```bash
npm run test -- src/utils/request/request-dispatcher.test.ts
npm run typecheck
```

Expected: both commands pass.

- [ ] **Step 8: Commit**

```bash
git add src/utils/request
git commit -m "feat: add ABI-driven request dispatch"
```

---

### Task 8: Implement Shared UI Components

**Files:**
- Create: `src/components/shared/abi-method-select.tsx`
- Create: `src/components/shared/app-header.tsx`
- Create: `src/components/shared/progress-steps.tsx`
- Create: `src/components/shared/constructor-params-form.tsx`
- Create: `src/components/shared/payload-review-panel.tsx`
- Create: `src/components/shared/result-summary.tsx`
- Create: `src/components/shared/settings-dialog.tsx`
- Create: `src/components/shared/shared-components.test.tsx`
- Modify: `docs/agent/registries.md`

- [ ] **Step 1: Create test render helper**

Write `src/test/render.tsx`:

```tsx
import { render } from "@testing-library/react";
import type { ReactElement } from "react";

export function renderWithProviders(ui: ReactElement) {
  return render(ui);
}
```

- [ ] **Step 2: Write failing shared component tests**

Write `src/components/shared/shared-components.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { lyquidTestAbi } from "@/test/test-abi";
import { renderWithProviders } from "@/test/render";
import { parseAbiSource, getMethodOptions } from "@/utils/abi/abi-utils";
import { AbiMethodSelect } from "./abi-method-select";
import { ConstructorParamsForm } from "./constructor-params-form";
import { PayloadReviewPanel } from "./payload-review-panel";
import { ProgressSteps } from "./progress-steps";

describe("shared components", () => {
  it("shows ABI method select errors", () => {
    const parsed = parseAbiSource(lyquidTestAbi);
    renderWithProviders(
      <AbiMethodSelect
        id="build-method"
        label="Build Method"
        methods={getMethodOptions(parsed)}
        value="missing(bytes)"
        onValueChange={vi.fn()}
        missingMessage="Build method does not exist."
      />
    );

    expect(screen.getByText("Build method does not exist.")).toBeInTheDocument();
  });

  it("renders constructor inputs and reports values", async () => {
    const user = userEvent.setup();
    const onValuesChange = vi.fn();
    renderWithProviders(
      <ConstructorParamsForm
        constructorFields={[{ name: "owner", type: "address" }]}
        values={{ owner: "" }}
        onValuesChange={onValuesChange}
      />
    );

    await user.type(screen.getByLabelText("owner"), "0x123");
    expect(onValuesChange).toHaveBeenLastCalledWith({ owner: "0x123" });
  });

  it("renders deploy progress labels", () => {
    renderWithProviders(
      <ProgressSteps
        steps={[
          { id: "upload", label: "Upload", description: "Upload" },
          { id: "build", label: "Build", description: "Build" },
          { id: "review", label: "Review", description: "Review" },
          { id: "deploy", label: "Deploy", description: "Deploy" }
        ]}
        currentStep="review"
        completedSteps={["upload", "build"]}
        onStepBack={vi.fn()}
      />
    );

    expect(screen.getByText("Review")).toBeInTheDocument();
  });

  it("shows available review hashes without inventing missing fields", () => {
    renderWithProviders(
      <PayloadReviewPanel
        hashes={{ sourceHash: "0x1234567890abcdef" }}
        payload={{ ok: true }}
        onCopy={vi.fn()}
        onDownload={vi.fn()}
      />
    );

    expect(screen.getByText("0x1234...cdef")).toBeInTheDocument();
    expect(screen.queryByText("artifactHash")).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run failing component tests**

Run:

```bash
npm run test -- src/components/shared/shared-components.test.tsx
```

Expected: FAIL because shared components do not exist.

- [ ] **Step 4: Implement `AbiMethodSelect`**

Write `src/components/shared/abi-method-select.tsx`:

```tsx
import type { AbiMethodOption } from "@/types/abi";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AbiMethodSelectProps = {
  id: string;
  label: string;
  methods: AbiMethodOption[];
  value: string;
  onValueChange: (value: string) => void;
  missingMessage?: string;
};

export function AbiMethodSelect({ id, label, methods, value, onValueChange, missingMessage }: AbiMethodSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger id={id} aria-invalid={Boolean(missingMessage)}>
          <SelectValue placeholder="Select ABI method" />
        </SelectTrigger>
        <SelectContent>
          {methods.map((method) => (
            <SelectItem key={method.value} value={method.value}>
              {method.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {missingMessage ? <p className="text-caption text-destructive">{missingMessage}</p> : null}
    </div>
  );
}
```

- [ ] **Step 5: Implement `ConstructorParamsForm`**

Write `src/components/shared/constructor-params-form.tsx`:

```tsx
import type { ConstructorField } from "@/types/abi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ConstructorParamsFormProps = {
  constructorFields: ConstructorField[];
  values: Record<string, string>;
  onValuesChange: (values: Record<string, string>) => void;
};

export function ConstructorParamsForm({ constructorFields, values, onValuesChange }: ConstructorParamsFormProps) {
  if (constructorFields.length === 0) {
    return <p className="text-sm text-muted-foreground">No constructor parameters.</p>;
  }

  return (
    <div className="space-y-4">
      {constructorFields.map((field) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={`constructor-${field.name}`}>{field.name}</Label>
          <Input
            id={`constructor-${field.name}`}
            value={values[field.name] ?? ""}
            placeholder={field.type}
            onChange={(event) => onValuesChange({ ...values, [field.name]: event.target.value })}
          />
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 6: Implement `ProgressSteps` and `AppHeader`**

Write `src/components/shared/progress-steps.tsx`:

```tsx
import type { DeployStep, DeployStepId } from "@/types/deploy";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

type ProgressStepsProps = {
  steps: DeployStep[];
  currentStep: DeployStepId;
  completedSteps: DeployStepId[];
  onStepBack: (step: DeployStepId) => void;
};

export function ProgressSteps({ steps, currentStep, completedSteps, onStepBack }: ProgressStepsProps) {
  const currentIndex = steps.findIndex((step) => step.id === currentStep);
  const progress = ((currentIndex + 1) / steps.length) * 100;

  return (
    <div className="space-y-4">
      <Progress value={progress} />
      <div className="grid grid-cols-4 gap-3">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = step.id === currentStep;
          return (
            <Button
              key={step.id}
              type="button"
              variant={isCurrent ? "default" : "outline"}
              disabled={index > currentIndex && !isCompleted}
              onClick={() => index < currentIndex && onStepBack(step.id)}
              className="h-auto min-h-toolbar flex-col items-start gap-2 text-left"
            >
              <span>{step.label}</span>
              <Badge variant={isCompleted ? "secondary" : "outline"}>{isCurrent ? "Current" : isCompleted ? "Done" : "Pending"}</Badge>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
```

Write `src/components/shared/app-header.tsx`:

```tsx
import { Settings } from "lucide-react";
import { appName } from "@/config/app-config";
import { Button } from "@/components/ui/button";

type AppHeaderProps = {
  walletLabel: string;
  onConnectWallet: () => void;
  onOpenSettings: () => void;
};

export function AppHeader({ walletLabel, onConnectWallet, onOpenSettings }: AppHeaderProps) {
  return (
    <header className="flex h-toolbar items-center justify-between border-b bg-card px-6">
      <h1 className="text-lg font-semibold">{appName}</h1>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={onConnectWallet}>
          {walletLabel}
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={onOpenSettings} aria-label="Settings">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
```

- [ ] **Step 7: Implement review and result panels**

Write `src/components/shared/payload-review-panel.tsx`:

```tsx
import type { DeploymentHashes } from "@/types/deploy";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { shortHash } from "@/utils/format-utils";

type PayloadReviewPanelProps = {
  hashes: DeploymentHashes;
  payload: unknown;
  onCopy: () => void;
  onDownload: () => void;
};

const hashLabels: Array<[keyof DeploymentHashes, string]> = [
  ["sourceHash", "sourceHash"],
  ["artifactHash", "artifactHash"],
  ["constructorInputHash", "constructorInputHash"],
  ["signedPayloadHash", "signedPayloadHash"]
];

export function PayloadReviewPanel({ hashes, payload, onCopy, onDownload }: PayloadReviewPanelProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        {hashLabels
          .filter(([key]) => hashes[key])
          .map(([key, label]) => (
            <div key={key} className="rounded-md border bg-card p-3">
              <p className="text-caption text-muted-foreground">{label}</p>
              <p className="font-mono text-sm">{shortHash(hashes[key])}</p>
            </div>
          ))}
      </div>
      <ScrollArea className="h-64 rounded-md border bg-card p-4">
        <pre className="text-sm">{JSON.stringify(payload, null, 2)}</pre>
      </ScrollArea>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCopy}>
          Copy JSON
        </Button>
        <Button type="button" onClick={onDownload}>
          Download JSON
        </Button>
      </div>
    </div>
  );
}
```

Write `src/components/shared/result-summary.tsx`:

```tsx
import type { DeployResult } from "@/types/deploy";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatStatus, shortHash } from "@/utils/format-utils";

type ResultSummaryProps = {
  result: DeployResult | null;
};

export function ResultSummary({ result }: ResultSummaryProps) {
  if (!result) {
    return <p className="text-sm text-muted-foreground">No deployment result yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <Badge>{formatStatus(result.status)}</Badge>
        {result.transactionHash ? <Badge variant="outline">{shortHash(result.transactionHash)}</Badge> : null}
        {result.lyquidId ? <Badge variant="outline">{result.lyquidId}</Badge> : null}
        {result.signedPayloadHash ? <Badge variant="outline">{shortHash(result.signedPayloadHash)}</Badge> : null}
      </div>
      <ScrollArea className="h-48 rounded-md border bg-card p-4">
        <pre className="text-sm">{JSON.stringify(result.raw, null, 2)}</pre>
      </ScrollArea>
    </div>
  );
}
```

- [ ] **Step 8: Implement `SettingsDialog`**

Write `src/components/shared/settings-dialog.tsx`:

```tsx
import { useEffect, useState } from "react";
import type { DefaultSettings } from "@/config/default-settings-config";
import type { AbiMethodOption } from "@/types/abi";
import { AbiMethodSelect } from "./abi-method-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: DefaultSettings;
  methodOptions: AbiMethodOption[];
  methodErrors: {
    abi?: string;
    buildMethod?: string;
    deployMethod?: string;
  };
  onSave: (settings: DefaultSettings) => void;
};

export function SettingsDialog({ open, onOpenChange, settings, methodOptions, methodErrors, onSave }: SettingsDialogProps) {
  const [draft, setDraft] = useState(settings);

  useEffect(() => {
    if (open) {
      setDraft(settings);
    }
  }, [open, settings]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-screen overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rpc-endpoint">RPC Endpoint</Label>
            <Input id="rpc-endpoint" value={draft.rpcEndpoint} onChange={(event) => setDraft({ ...draft, rpcEndpoint: event.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lyquid-id">Lyquid ID</Label>
            <Input id="lyquid-id" value={draft.lyquidId} onChange={(event) => setDraft({ ...draft, lyquidId: event.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="abi">ABI</Label>
            <Textarea id="abi" rows={8} value={draft.abi} onChange={(event) => setDraft({ ...draft, abi: event.target.value })} aria-invalid={Boolean(methodErrors.abi)} />
            {methodErrors.abi ? <p className="text-caption text-destructive">{methodErrors.abi}</p> : null}
          </div>
          <AbiMethodSelect
            id="build-method"
            label="Build Method"
            methods={methodOptions}
            value={draft.buildMethod}
            onValueChange={(buildMethod) => setDraft({ ...draft, buildMethod })}
            missingMessage={methodErrors.buildMethod}
          />
          <AbiMethodSelect
            id="deploy-method"
            label="Deploy Method"
            methods={methodOptions}
            value={draft.deployMethod}
            onValueChange={(deployMethod) => setDraft({ ...draft, deployMethod })}
            missingMessage={methodErrors.deployMethod}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              onSave(draft);
              onOpenChange(false);
            }}
          >
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

- [ ] **Step 9: Update shared component registry statuses**

Modify these Shared Component Registry rows in `docs/agent/registries.md`:

```markdown
| `AppHeader` | `src/components/shared/app-header.tsx` | active | Global top bar with product name, wallet connect action, and settings trigger | `walletLabel`, `onConnectWallet`, `onOpenSettings` | Rendering the app-level header | Uses `Button` |
| `ProgressSteps` | `src/components/shared/progress-steps.tsx` | active | Four-step deploy progress with current step, completed states, and back navigation support | `steps`, `currentStep`, `completedSteps`, `onStepBack` | Showing the Cloud Deploy workflow | Uses `Button`, `Progress`, `Badge` |
| `SettingsDialog` | `src/components/shared/settings-dialog.tsx` | active | Persisted settings editor for RPC endpoint, Lyquid ID, ABI, Build Method, and Deploy Method | `open`, `onOpenChange`, `settings`, `methodOptions`, `methodErrors`, `onSave` | Editing Cloud Deploy settings together | Uses `Dialog`, `Input`, `Textarea`, `Select`, `Button`, `Label` |
| `AbiMethodSelect` | `src/components/shared/abi-method-select.tsx` | active | ABI-backed method dropdown with missing-method error display | `methods`, `value`, `onValueChange`, `missingMessage` | Selecting Build Method or Deploy Method from parsed ABI options | Uses `Select`, `Label` |
| `ConstructorParamsForm` | `src/components/shared/constructor-params-form.tsx` | active | Renders constructor inputs from ABI-derived fields and returns collected values | `constructorFields`, `values`, `onValuesChange` | Step 2 needs constructor parameters | Uses `Input`, `Label` |
| `PayloadReviewPanel` | `src/components/shared/payload-review-panel.tsx` | active | Displays hashes, prepared/deploy payload, raw JSON, copy, and download actions | `hashes`, `payload`, `onCopy`, `onDownload` | Step 3 reviews build/deploy output | Uses `Button`, `ScrollArea` |
| `ResultSummary` | `src/components/shared/result-summary.tsx` | active | Displays deploy result fields and raw response | `result` | Step 4 displays deployment result | Uses `Badge`, `ScrollArea` |
```

- [ ] **Step 10: Verify shared components**

Run:

```bash
npm run test -- src/components/shared/shared-components.test.tsx
npm run typecheck
```

Expected: both commands pass.

- [ ] **Step 11: Commit**

```bash
git add docs/agent/registries.md src/components/shared src/test/render.tsx
git commit -m "feat: add shared deploy UI components"
```

---

### Task 9: Add Wagmi Provider and App Shell

**Files:**
- Create: `src/components/providers/web3-provider.tsx`
- Create: `src/layout/app-shell.tsx`
- Modify: `src/app.tsx`
- Create: `src/layout/app-shell.test.tsx`

- [ ] **Step 1: Write failing shell test**

Write `src/layout/app-shell.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { deploySteps } from "@/config/deploy-steps-config";
import { renderWithProviders } from "@/test/render";
import { AppShell } from "./app-shell";

describe("AppShell", () => {
  it("renders header and progress", () => {
    renderWithProviders(
      <AppShell
        currentStep="upload"
        completedSteps={[]}
        walletLabel="Connect Wallet"
        onConnectWallet={vi.fn()}
        onOpenSettings={vi.fn()}
        onStepBack={vi.fn()}
      >
        <p>Upload content</p>
      </AppShell>
    );

    expect(screen.getByText("Cloud Deploy")).toBeInTheDocument();
    expect(screen.getByText(deploySteps[0].label)).toBeInTheDocument();
    expect(screen.getByText("Upload content")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run failing shell test**

Run:

```bash
npm run test -- src/layout/app-shell.test.tsx
```

Expected: FAIL because `app-shell.tsx` does not exist.

- [ ] **Step 3: Implement web3 provider**

Write `src/components/providers/web3-provider.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { mainnet } from "wagmi/chains";

const wagmiConfig = createConfig({
  chains: [mainnet],
  transports: {
    [mainnet.id]: http()
  }
});

type Web3ProviderProps = {
  children: ReactNode;
};

export function Web3Provider({ children }: Web3ProviderProps) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
```

- [ ] **Step 4: Implement app shell**

Write `src/layout/app-shell.tsx`:

```tsx
import type { ReactNode } from "react";
import { deploySteps } from "@/config/deploy-steps-config";
import type { DeployStepId } from "@/types/deploy";
import { AppHeader } from "@/components/shared/app-header";
import { ProgressSteps } from "@/components/shared/progress-steps";

type AppShellProps = {
  children: ReactNode;
  currentStep: DeployStepId;
  completedSteps: DeployStepId[];
  walletLabel: string;
  onConnectWallet: () => void;
  onOpenSettings: () => void;
  onStepBack: (step: DeployStepId) => void;
};

export function AppShell({ children, currentStep, completedSteps, walletLabel, onConnectWallet, onOpenSettings, onStepBack }: AppShellProps) {
  return (
    <div className="flex h-screen flex-col bg-background">
      <AppHeader walletLabel={walletLabel} onConnectWallet={onConnectWallet} onOpenSettings={onOpenSettings} />
      <main className="flex min-h-0 flex-1 flex-col">
        <section className="border-b bg-card px-6 py-5">
          <ProgressSteps steps={deploySteps} currentStep={currentStep} completedSteps={completedSteps} onStepBack={onStepBack} />
        </section>
        <section className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{children}</section>
      </main>
    </div>
  );
}
```

- [ ] **Step 5: Wrap app with provider**

Modify `src/app.tsx`:

```tsx
import HomePage from "@/pages/index";
import { Web3Provider } from "@/components/providers/web3-provider";

export function App() {
  return (
    <Web3Provider>
      <HomePage />
    </Web3Provider>
  );
}
```

- [ ] **Step 6: Verify shell**

Run:

```bash
npm run test -- src/layout/app-shell.test.tsx
npm run typecheck
```

Expected: both commands pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/providers src/layout src/app.tsx
git commit -m "feat: add app shell and web3 provider"
```

---

### Task 10: Implement Upload and Build Steps

**Files:**
- Create: `src/components/upload-step.tsx`
- Create: `src/components/build-step.tsx`
- Create: `src/components/upload-build-steps.test.tsx`

- [ ] **Step 1: Write failing upload/build tests**

Write `src/components/upload-build-steps.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { BuildStep } from "./build-step";
import { UploadStep } from "./upload-step";

describe("UploadStep and BuildStep", () => {
  it("reports uploaded project metadata", async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();
    renderWithProviders(<UploadStep onUpload={onUpload} onContinue={vi.fn()} metadata={null} />);

    await user.upload(screen.getByLabelText("Project archive"), new File(["abc"], "cloud.zip", { type: "application/zip" }));

    expect(onUpload).toHaveBeenCalledWith(expect.objectContaining({
      metadata: { name: "cloud.zip", fileCount: 1, totalSize: 3 }
    }));
  });

  it("renders constructor fields before build", () => {
    renderWithProviders(
      <BuildStep
        constructorFields={[{ name: "owner", type: "address" }]}
        constructorValues={{ owner: "" }}
        onConstructorValuesChange={vi.fn()}
        onBuild={vi.fn()}
        canBuild
        error={null}
      />
    );

    expect(screen.getByLabelText("owner")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run failing upload/build tests**

Run:

```bash
npm run test -- src/components/upload-build-steps.test.tsx
```

Expected: FAIL because components do not exist.

- [ ] **Step 3: Implement `UploadStep`**

Write `src/components/upload-step.tsx`:

```tsx
import type { ProjectMetadata } from "@/types/deploy";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getProjectMetadata } from "@/utils/file-utils";

type UploadStepProps = {
  metadata: ProjectMetadata | null;
  onUpload: (project: { metadata: ProjectMetadata; files: File[] }) => void;
  onContinue: () => void;
};

export function UploadStep({ metadata, onUpload, onContinue }: UploadStepProps) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="space-y-2">
        <Label htmlFor="project-archive">Project archive</Label>
        <Input
          id="project-archive"
          type="file"
          accept=".zip"
          onChange={(event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length > 0) {
              onUpload({ metadata: getProjectMetadata(files), files });
            }
          }}
        />
      </div>
      {metadata ? (
        <div className="rounded-md border bg-card p-4">
          <p className="font-medium">{metadata.name}</p>
          <p className="text-sm text-muted-foreground">
            {metadata.fileCount} file(s), {metadata.totalSize} bytes
          </p>
        </div>
      ) : null}
      <div className="flex justify-end">
        <Button type="button" disabled={!metadata} onClick={onContinue}>
          Continue
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement `BuildStep`**

Write `src/components/build-step.tsx`:

```tsx
import type { ConstructorField } from "@/types/abi";
import { Button } from "@/components/ui/button";
import { ConstructorParamsForm } from "@/components/shared/constructor-params-form";

type BuildStepProps = {
  constructorFields: ConstructorField[];
  constructorValues: Record<string, string>;
  onConstructorValuesChange: (values: Record<string, string>) => void;
  onBuild: () => void;
  canBuild: boolean;
  error: string | null;
};

export function BuildStep({ constructorFields, constructorValues, onConstructorValuesChange, onBuild, canBuild, error }: BuildStepProps) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <ConstructorParamsForm constructorFields={constructorFields} values={constructorValues} onValuesChange={onConstructorValuesChange} />
      {error ? <p className="rounded-md border border-destructive bg-card p-3 text-sm text-destructive">{error}</p> : null}
      <div className="flex justify-end">
        <Button type="button" disabled={!canBuild} onClick={onBuild}>
          Build
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Verify upload/build steps**

Run:

```bash
npm run test -- src/components/upload-build-steps.test.tsx
npm run typecheck
```

Expected: both commands pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/upload-step.tsx src/components/build-step.tsx src/components/upload-build-steps.test.tsx
git commit -m "feat: add upload and build steps"
```

---

### Task 11: Implement Review and Deploy Steps

**Files:**
- Create: `src/components/review-step.tsx`
- Create: `src/components/deploy-step.tsx`
- Create: `src/components/review-deploy-steps.test.tsx`

- [ ] **Step 1: Write failing review/deploy tests**

Write `src/components/review-deploy-steps.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { DeployStep } from "./deploy-step";
import { ReviewStep } from "./review-step";

describe("ReviewStep and DeployStep", () => {
  it("renders review payload actions", () => {
    renderWithProviders(
      <ReviewStep
        reviewPayload={{ hashes: { sourceHash: "0x1234567890abcdef" }, payload: { ok: true } }}
        onCopy={vi.fn()}
        onDownload={vi.fn()}
        onContinue={vi.fn()}
      />
    );

    expect(screen.getByText("Copy JSON")).toBeInTheDocument();
    expect(screen.getByText("Download JSON")).toBeInTheDocument();
  });

  it("asks for update confirmation when lyquidId exists", async () => {
    const user = userEvent.setup();
    const onDeploy = vi.fn();
    renderWithProviders(<DeployStep lyquidId="lyquid-1" result={null} onDeploy={onDeploy} error={null} />);

    await user.click(screen.getByRole("button", { name: "Deploy" }));
    expect(screen.getByText("Deploy as update to this Lyquid?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Deploy as Update" }));
    expect(onDeploy).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run failing review/deploy tests**

Run:

```bash
npm run test -- src/components/review-deploy-steps.test.tsx
```

Expected: FAIL because components do not exist.

- [ ] **Step 3: Implement `ReviewStep`**

Write `src/components/review-step.tsx`:

```tsx
import type { ReviewPayload } from "@/types/deploy";
import { Button } from "@/components/ui/button";
import { PayloadReviewPanel } from "@/components/shared/payload-review-panel";

type ReviewStepProps = {
  reviewPayload: ReviewPayload | null;
  onCopy: () => void;
  onDownload: () => void;
  onContinue: () => void;
};

export function ReviewStep({ reviewPayload, onCopy, onDownload, onContinue }: ReviewStepProps) {
  if (!reviewPayload) {
    return <p className="text-sm text-muted-foreground">Build output is required before review.</p>;
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PayloadReviewPanel hashes={reviewPayload.hashes} payload={reviewPayload.payload} onCopy={onCopy} onDownload={onDownload} />
      <div className="flex justify-end">
        <Button type="button" onClick={onContinue}>
          Proceed to Deploy
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Implement `DeployStep`**

Write `src/components/deploy-step.tsx`:

```tsx
import { useState } from "react";
import type { DeployResult } from "@/types/deploy";
import { ResultSummary } from "@/components/shared/result-summary";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type DeployStepProps = {
  lyquidId: string;
  result: DeployResult | null;
  onDeploy: () => void;
  error: string | null;
};

export function DeployStep({ lyquidId, result, onDeploy, error }: DeployStepProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDeployClick = () => {
    if (lyquidId) {
      setConfirmOpen(true);
      return;
    }

    onDeploy();
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      {error ? <p className="rounded-md border border-destructive bg-card p-3 text-sm text-destructive">{error}</p> : null}
      <ResultSummary result={result} />
      <div className="flex justify-end">
        <Button type="button" onClick={handleDeployClick}>
          Deploy
        </Button>
      </div>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deploy as update to this Lyquid?</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                onDeploy();
              }}
            >
              Deploy as Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

- [ ] **Step 5: Verify review/deploy steps**

Run:

```bash
npm run test -- src/components/review-deploy-steps.test.tsx
npm run typecheck
```

Expected: both commands pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/review-step.tsx src/components/deploy-step.tsx src/components/review-deploy-steps.test.tsx
git commit -m "feat: add review and deploy steps"
```

---

### Task 12: Compose the Single-Page MVP Flow

**Files:**
- Modify: `src/pages/index.tsx`
- Create: `src/pages/index.test.tsx`

- [ ] **Step 1: Write failing page integration tests**

Write `src/pages/index.test.tsx`:

```tsx
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { lyquidTestAbi } from "@/test/test-abi";
import { renderWithProviders } from "@/test/render";
import { useDeploySessionStore } from "@/store/deploy-session-store";
import { useSettingsStore } from "@/store/settings-store";
import HomePage from "./index";

describe("HomePage", () => {
  beforeEach(() => {
    useDeploySessionStore.setState(useDeploySessionStore.getInitialState(), true);
    useSettingsStore.setState(useSettingsStore.getInitialState(), true);
    useSettingsStore.getState().saveSettings({
      rpcEndpoint: "http://localhost:8545",
      lyquidId: "",
      abi: lyquidTestAbi,
      buildMethod: "compileProject(bytes)",
      deployMethod: "publishProject(bytes)"
    });
  });

  it("renders upload as the first step", () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText("Cloud Deploy")).toBeInTheDocument();
    expect(screen.getByLabelText("Project archive")).toBeInTheDocument();
  });

  it("moves from upload to build", async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);
    await user.upload(screen.getByLabelText("Project archive"), new File(["abc"], "cloud.zip"));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("button", { name: "Build" })).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run failing page tests**

Run:

```bash
npm run test -- src/pages/index.test.tsx
```

Expected: FAIL because `src/pages/index.tsx` is still the temporary page.

- [ ] **Step 3: Compose the page**

Write `src/pages/index.tsx`:

```tsx
import { useMemo, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { BuildStep } from "@/components/build-step";
import { DeployStep } from "@/components/deploy-step";
import { ReviewStep } from "@/components/review-step";
import { SettingsDialog } from "@/components/shared/settings-dialog";
import { UploadStep } from "@/components/upload-step";
import { AppShell } from "@/layout/app-shell";
import { useDeploySessionStore } from "@/store/deploy-session-store";
import { useSettingsStore } from "@/store/settings-store";
import type { DeployStepId } from "@/types/deploy";
import { dispatchSelectedMethod } from "@/utils/request/request-dispatcher";
import { downloadJson } from "@/utils/download-utils";
import { hashConstructorInput, hashPayload, hashSource } from "@/utils/hash-utils";

const completedByStep: Record<DeployStepId, DeployStepId[]> = {
  upload: [],
  build: ["upload"],
  review: ["upload", "build"],
  deploy: ["upload", "build", "review"]
};

export default function HomePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const account = useAccount();
  const { connect } = useConnect();
  const settings = useSettingsStore();
  const session = useDeploySessionStore();

  const walletLabel = account.address ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}` : "Connect Wallet";
  const canBuild = Boolean(session.uploadedProject && settings.parsedAbi && settings.buildMethod && !settings.methodErrors.buildMethod);

  const handleBuild = async () => {
    if (!settings.parsedAbi || !session.uploadedProject) {
      session.setCurrentError("Upload and valid ABI settings are required.");
      return;
    }

    try {
      const sourceBytes = new TextEncoder().encode(JSON.stringify(session.uploadedProject.metadata));
      const sourceHash = await hashSource(sourceBytes);
      const constructorInputHash = await hashConstructorInput(session.constructorValues);
      const raw = await dispatchSelectedMethod({
        parsedAbi: settings.parsedAbi,
        selectedMethod: settings.buildMethod,
        args: [sourceHash],
        context: {
          rpcEndpoint: settings.rpcEndpoint,
          accountAddress: account.address,
          offChainFetch: fetch
        }
      });
      const artifactHash = await hashPayload(raw);

      session.setBuildResult({
        hashes: { sourceHash, artifactHash, constructorInputHash },
        logs: [],
        payload: raw,
        raw
      });
    } catch (error) {
      session.setCurrentError(error instanceof Error ? error.message : "Build failed.");
    }
  };

  const handleDeploy = async () => {
    if (!settings.parsedAbi || !session.reviewPayload) {
      session.setCurrentError("Review payload is required before deploy.");
      return;
    }

    try {
      const raw = await dispatchSelectedMethod({
        parsedAbi: settings.parsedAbi,
        selectedMethod: settings.deployMethod,
        args: [JSON.stringify(session.reviewPayload.payload)],
        context: {
          rpcEndpoint: settings.rpcEndpoint,
          accountAddress: account.address,
          offChainFetch: fetch
        }
      });
      const signedPayloadHash = await hashPayload(raw);
      session.setDeployResult({
        status: "submitted",
        signedPayloadHash,
        raw
      });
    } catch (error) {
      session.setCurrentError(error instanceof Error ? error.message : "Deploy failed.");
    }
  };

  const stepContent = useMemo(() => {
    if (session.currentStep === "upload") {
      return (
        <UploadStep
          metadata={session.uploadedProject?.metadata ?? null}
          onUpload={session.setUploadedProject}
          onContinue={() => session.goToStep("build")}
        />
      );
    }

    if (session.currentStep === "build") {
      return (
        <BuildStep
          constructorFields={settings.constructorFields}
          constructorValues={session.constructorValues}
          onConstructorValuesChange={session.setConstructorValues}
          onBuild={handleBuild}
          canBuild={canBuild}
          error={session.currentError}
        />
      );
    }

    if (session.currentStep === "review") {
      return (
        <ReviewStep
          reviewPayload={session.reviewPayload}
          onCopy={() => navigator.clipboard.writeText(JSON.stringify(session.reviewPayload?.payload ?? {}, null, 2))}
          onDownload={() => downloadJson("cloud-deploy-payload.json", session.reviewPayload?.payload ?? {})}
          onContinue={() => session.goToStep("deploy")}
        />
      );
    }

    return <DeployStep lyquidId={settings.lyquidId} result={session.deployResult} onDeploy={handleDeploy} error={session.currentError} />;
  }, [account.address, canBuild, session, settings]);

  return (
    <>
      <AppShell
        currentStep={session.currentStep}
        completedSteps={completedByStep[session.currentStep]}
        walletLabel={walletLabel}
        onConnectWallet={() => connect({ connector: injected() })}
        onOpenSettings={() => setSettingsOpen(true)}
        onStepBack={session.goToStep}
      >
        {stepContent}
      </AppShell>
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={{
          rpcEndpoint: settings.rpcEndpoint,
          lyquidId: settings.lyquidId,
          abi: settings.abi,
          buildMethod: settings.buildMethod,
          deployMethod: settings.deployMethod
        }}
        methodOptions={settings.methodOptions}
        methodErrors={settings.methodErrors}
        onSave={settings.saveSettings}
      />
    </>
  );
}
```

- [ ] **Step 4: Verify page composition**

Run:

```bash
npm run test -- src/pages/index.test.tsx
npm run typecheck
```

Expected: both commands pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/index.tsx src/pages/index.test.tsx
git commit -m "feat: compose cloud deploy MVP flow"
```

---

### Task 13: Final Verification and Browser Check

**Files:**
- Modify only if verification finds defects in files from prior tasks.

- [ ] **Step 1: Run full automated checks**

Run:

```bash
npm run test
npm run typecheck
npm run build
```

Expected: all commands pass.

- [ ] **Step 2: Start the dev server**

Run:

```bash
npm run dev
```

Expected: Vite starts and prints a local URL such as `http://localhost:5173`.

- [ ] **Step 3: Open the app in the Browser plugin**

Open:

```text
http://localhost:5173
```

Expected visual checks:

- Header shows `Cloud Deploy`, `Connect Wallet`, and settings icon button.
- Progress shows Upload, Build, Review, Deploy in one row on desktop.
- The app occupies the viewport as a deploy tool, not a landing page.
- Upload step accepts a zip archive and enables `Continue`.
- Settings dialog opens and contains RPC Endpoint, Lyquid ID, ABI, Build Method, and Deploy Method.
- Text does not overlap at desktop width.

- [ ] **Step 4: Check mobile layout**

Use Browser viewport width around `390px`.

Expected visual checks:

- Header controls remain usable.
- Step controls do not overlap text.
- Settings dialog remains scrollable.
- Current step content remains reachable without horizontal scrolling.

- [ ] **Step 5: Commit verification fixes if needed**

If changes were needed:

```bash
git add src
git commit -m "fix: polish cloud deploy MVP verification issues"
```

If no changes were needed, do not create an empty commit.

---

## Self-Review Checklist

- Spec coverage:
  - Single-page `100vh` deploy console: Tasks 9, 12, 13.
  - Upload, Build, Review, Deploy workflow: Tasks 2, 6, 8, 10, 11, 12.
  - Settings persistence only: Task 5.
  - ABI-driven method options and existence errors: Tasks 3, 5, 8.
  - Constructor parameters: Tasks 3, 8, 10, 12.
  - On-chain/off-chain dispatch without hard-coded method names: Task 7.
  - Update confirmation when `lyquidId` exists: Task 11.
  - Review/result hashes and raw JSON: Tasks 4, 8, 11, 12.
  - Tests named in spec: Tasks 3 through 13.
- Placeholder scan: no task uses deferred implementation language.
- Type consistency:
  - `DeployStepId` values are `upload`, `build`, `review`, `deploy` across config, store, shell, and page.
  - ABI selected method values use function signatures such as `compileProject(bytes)`.
  - `settings-store` owns persisted settings; `deploy-session-store` owns runtime data.
- Known implementation attention:
  - If `npx shadcn@latest add` generates class names with arbitrary values, replace them with semantic tokens before committing.
  - If wagmi connector behavior differs under the installed version, keep `Web3Provider` small and adapt only the provider/connection boundary.
  - If viem rejects the mock test ABI extension field, keep the metadata read typed locally and preserve the raw ABI item for encoding.
