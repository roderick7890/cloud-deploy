# Two-Lyquid Deploy Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert the existing Cloud Deploy MVP into a two-Lyquid flow where Settings configure an existing Deployer Lyquid and the uploaded Target/Test Lyquid is deployed through it.

**Architecture:** Keep the Vite React SPA and the current Upload, Build, Review, Deploy page shape. Rename the persisted environment identifier from ambiguous `lyquidId` to `deployerLyquidId`, keep Target/Test Lyquid data in runtime session state, make request dispatch require an explicit Deployer call target, force Build through the off-chain sender, force Deploy through the on-chain sender, and gate Deploy behind wallet connection.

**Tech Stack:** Vite, React, TypeScript, Tailwind CSS, shadcn/ui, Zustand, `zustand.persist`, wagmi, viem, Vitest, React Testing Library.

---

## Required Reading

- `AGENTS.md`
- `docs/agent/frontend.md`
- `docs/agent/registries.md`
- `docs/superpowers/specs/2026-05-16-two-lyquid-deploy-flow-design.md`

Keep the user override from the current branch: this is a Vite app, not Next.js. Continue to use `src/pages/index.tsx` as the page composition module.

Mention both required receipts in the final implementation response:

- `Followed docs/agent/frontend.md frontend rules.`
- `Followed docs/agent/registries.md registries.`

## Scope Check

This plan handles one bounded subsystem: the two-Lyquid deploy flow inside the existing Cloud Deploy frontend. It does not add devnet management, Deployer Lyquid creation, Deployer Lyquid deployment, deployment history, or mock success paths.

## File Structure Map

- Modify `src/config/default-settings-config.ts`: rename the persisted environment field to `deployerLyquidId`.
- Modify `src/config/storage-config.ts`: bump persisted settings version so local storage can migrate from `lyquidId`.
- Modify `src/store/settings-store.ts`: migrate `lyquidId` to `deployerLyquidId`, persist only environment settings, and keep ABI/method reconciliation.
- Modify `src/store/settings-store.test.ts`: assert persisted `deployerLyquidId` and migration behavior.
- Modify `src/types/deploy.ts`: add Target/Test Lyquid package summary and deployment evidence fields.
- Modify `src/store/deploy-session-store.ts`: store uploaded target package summaries and reset downstream runtime state.
- Modify `src/store/deploy-session-store.test.ts`: cover runtime-only target package state and reset behavior.
- Modify `src/utils/file-utils.ts`: produce target package metadata, archive bytes, and package evidence.
- Modify `src/utils/file-utils.test.ts`: cover valid target package evidence and invalid upload errors.
- Modify `src/utils/request/request-types.ts`: split Deployer call target from Target/Test deployment subject and add required transport.
- Modify `src/utils/request/request-dispatcher.ts`: require `deployerLyquidId`, validate required transport, and pass it to senders.
- Modify `src/utils/request/request-dispatcher.test.ts`: prove the dispatcher cannot omit the Deployer call target or use the wrong transport.
- Modify `src/utils/request/on-chain-sender.ts`: encode selected ABI methods and submit `readContract` or `writeContract` to the Deployer address when clients are available.
- Modify `src/utils/request/off-chain-sender.ts`: include `deployerLyquidId` in the off-chain request body.
- Modify `src/test/test-abi.ts`: mark the test build method as off-chain and keep the test deploy method on-chain.
- Create `src/utils/request/error-utils.ts`: map raw request errors to user-actionable messages.
- Create `src/utils/request/error-utils.test.ts`: cover the error categories from the spec.
- Modify `src/components/shared/settings-dialog.tsx`: relabel and edit `Deployer Lyquid ID`.
- Modify `src/components/shared/payload-review-panel.tsx`: show Deployer ID, Target package summary, method, hashes, and request preview.
- Modify `src/components/shared/result-summary.tsx`: show Target/Test Lyquid evidence using target-specific field names.
- Modify `src/components/review-step.tsx`: pass Deployer/Target context to the review panel.
- Modify `src/components/deploy-step.tsx`: remove update confirmation behavior tied to `lyquidId`; deploy through the configured Deployer.
- Modify `src/pages/index.tsx`: wire `deployerLyquidId`, target archive bytes, off-chain Build, on-chain Deploy, wallet/public clients, and error mapping.
- Modify `src/components/review-deploy-steps.test.tsx`: cover Review and Deploy UI wording.
- Modify `src/components/shared/shared-components.test.tsx`: cover target-aware review and target evidence display.
- Modify `src/pages/index.test.tsx`: cover the integrated Settings field rename and build gating.
- Modify `docs/agent/registries.md`: update `SettingsDialog`, `PayloadReviewPanel`, `ResultSummary`, and utility registry summaries.

---

### Task 1: Rename Persisted Environment Setting

**Files:**
- Modify: `src/config/default-settings-config.ts`
- Modify: `src/config/storage-config.ts`
- Modify: `src/store/settings-store.ts`
- Modify: `src/store/settings-store.test.ts`

- [ ] **Step 1: Write failing settings tests**

Replace the first test in `src/store/settings-store.test.ts` and add the migration test:

```ts
it("persists only deployer environment settings", () => {
  useSettingsStore.getState().saveSettings({
    rpcEndpoint: "http://localhost:8545",
    deployerLyquidId: "0x0000000000000000000000000000000000000001",
    abi: lyquidTestAbi,
    buildMethod: "compileProject(bytes)",
    deployMethod: "publishProject(bytes)"
  });

  const raw = localStorage.getItem("cloud-deploy-settings");
  expect(raw).toContain("deployerLyquidId");
  expect(raw).not.toContain("lyquidId");
  expect(raw).not.toContain("targetLyquidId");
  expect(raw).not.toContain("buildResult");
  expect(raw).not.toContain("uploadedProject");
});

it("migrates old lyquidId settings into deployerLyquidId", async () => {
  localStorage.setItem(
    "cloud-deploy-settings",
    JSON.stringify({
      state: {
        rpcEndpoint: "http://localhost:8545",
        lyquidId: "legacy-deployer",
        abi: lyquidTestAbi,
        buildMethod: "compileProject(bytes)",
        deployMethod: "publishProject(bytes)"
      },
      version: 1
    })
  );

  useSettingsStore.setState(useSettingsStore.getInitialState(), true);
  await useSettingsStore.persist.rehydrate();

  expect(useSettingsStore.getState().deployerLyquidId).toBe("legacy-deployer");
});
```

Update all existing `saveSettings` calls in this test file to use `deployerLyquidId` instead of `lyquidId`.

- [ ] **Step 2: Run the settings tests and verify failure**

Run:

```bash
npm run test -- src/store/settings-store.test.ts
```

Expected: FAIL because `DefaultSettings` and `settings-store` do not expose `deployerLyquidId`.

- [ ] **Step 3: Rename the default settings field**

Replace `src/config/default-settings-config.ts` with:

```ts
export type DefaultSettings = {
  rpcEndpoint: string;
  deployerLyquidId: string;
  abi: string;
  buildMethod: string;
  deployMethod: string;
};

export const defaultSettings: DefaultSettings = {
  rpcEndpoint: "",
  deployerLyquidId: "",
  abi: "[]",
  buildMethod: "",
  deployMethod: ""
};
```

- [ ] **Step 4: Bump the persisted settings version**

Replace `src/config/storage-config.ts` with:

```ts
export const settingsStorageKey = "cloud-deploy-settings";
export const settingsVersion = 2;
```

- [ ] **Step 5: Update settings-store persistence and migration**

In `src/store/settings-store.ts`, add this local type above `deriveSettings`:

```ts
type PersistedSettingsV1 = Omit<DefaultSettings, "deployerLyquidId"> & {
  deployerLyquidId?: string;
  lyquidId?: string;
};
```

Replace the `partialize`, add `migrate`, and update `onRehydrateStorage`:

```ts
partialize: (state) => ({
  rpcEndpoint: state.rpcEndpoint,
  deployerLyquidId: state.deployerLyquidId,
  abi: state.abi,
  buildMethod: state.buildMethod,
  deployMethod: state.deployMethod
}),
migrate: (persistedState, version) => {
  if (version < 2 && persistedState && typeof persistedState === "object") {
    const legacy = persistedState as PersistedSettingsV1;
    return deriveSettings({
      rpcEndpoint: legacy.rpcEndpoint ?? "",
      deployerLyquidId: legacy.deployerLyquidId ?? legacy.lyquidId ?? "",
      abi: legacy.abi ?? "[]",
      buildMethod: legacy.buildMethod ?? "",
      deployMethod: legacy.deployMethod ?? ""
    });
  }

  return persistedState;
},
onRehydrateStorage: () => (state) => {
  if (state) {
    state.saveSettings({
      rpcEndpoint: state.rpcEndpoint,
      deployerLyquidId: state.deployerLyquidId,
      abi: state.abi,
      buildMethod: state.buildMethod,
      deployMethod: state.deployMethod
    });
  }
}
```

- [ ] **Step 6: Run the settings tests and verify pass**

Run:

```bash
npm run test -- src/store/settings-store.test.ts
```

Expected: PASS.

- [ ] **Step 7: Commit Task 1**

```bash
git add src/config/default-settings-config.ts src/config/storage-config.ts src/store/settings-store.ts src/store/settings-store.test.ts
git commit -m "refactor: rename deployer lyquid setting"
```

---

### Task 2: Add Target Package Runtime Evidence

**Files:**
- Modify: `src/types/deploy.ts`
- Modify: `src/store/deploy-session-store.ts`
- Modify: `src/store/deploy-session-store.test.ts`
- Modify: `src/utils/file-utils.ts`
- Modify: `src/utils/file-utils.test.ts`
- Modify: `src/components/upload-step.tsx`

- [ ] **Step 1: Write failing file utility tests**

Add these tests to `src/utils/file-utils.test.ts`:

```ts
it("extracts target package evidence from visible project files", () => {
  const files = [
    new File(["manifest"], "demo/Cargo.toml", { type: "text/plain" }),
    new File(["abi"], "demo/cloud-deploy-demo.abi.json", { type: "application/json" }),
    new File(["source"], "demo/src/lib.rs", { type: "text/plain" })
  ];

  expect(getProjectMetadata(files)).toEqual({
    name: "demo",
    fileCount: 3,
    totalSize: 17,
    evidence: {
      hasManifest: true,
      hasAbi: true,
      hasSource: true,
      archiveName: undefined
    },
    validationErrors: []
  });
});

it("accepts a non-empty zip as archive evidence", () => {
  const files = [new File(["zip-bytes"], "demo-lyquid.zip", { type: "application/zip" })];

  expect(getProjectMetadata(files)).toEqual({
    name: "demo-lyquid.zip",
    fileCount: 1,
    totalSize: 9,
    evidence: {
      hasManifest: false,
      hasAbi: false,
      hasSource: false,
      archiveName: "demo-lyquid.zip"
    },
    validationErrors: []
  });
});

it("reports an empty upload as invalid target package input", () => {
  expect(getProjectMetadata([]).validationErrors).toEqual(["Upload a Target/Test Lyquid package."]);
});
```

- [ ] **Step 2: Write failing session store tests**

Add this test to `src/store/deploy-session-store.test.ts`:

```ts
it("clears downstream target deployment data when a new target package is uploaded", () => {
  const project = {
    metadata: {
      name: "demo-lyquid.zip",
      fileCount: 1,
      totalSize: 9,
      evidence: {
        hasManifest: false,
        hasAbi: false,
        hasSource: false,
        archiveName: "demo-lyquid.zip"
      },
      validationErrors: []
    },
    files: [new File(["zip-bytes"], "demo-lyquid.zip")]
  };

  useDeploySessionStore.getState().setBuildResult({
    hashes: { sourceHash: "0xabc" },
    logs: ["built"],
    payload: { prepared: true },
    raw: { prepared: true }
  });
  useDeploySessionStore.getState().setDeployResult({
    status: "submitted",
    targetLyquidId: "target-1",
    raw: {}
  });

  useDeploySessionStore.getState().setUploadedProject(project);

  expect(useDeploySessionStore.getState().uploadedProject?.metadata.name).toBe("demo-lyquid.zip");
  expect(useDeploySessionStore.getState().buildResult).toBeNull();
  expect(useDeploySessionStore.getState().reviewPayload).toBeNull();
  expect(useDeploySessionStore.getState().deployResult).toBeNull();
});
```

- [ ] **Step 3: Run focused tests and verify failure**

Run:

```bash
npm run test -- src/utils/file-utils.test.ts src/store/deploy-session-store.test.ts
```

Expected: FAIL because metadata evidence and `targetLyquidId` do not exist.

- [ ] **Step 4: Extend deployment types**

In `src/types/deploy.ts`, replace `ProjectMetadata` and `DeployResult` with:

```ts
export type TargetPackageEvidence = {
  hasManifest: boolean;
  hasAbi: boolean;
  hasSource: boolean;
  archiveName?: string;
};

export type ProjectMetadata = {
  name: string;
  fileCount: number;
  totalSize: number;
  evidence: TargetPackageEvidence;
  validationErrors: string[];
};

export type DeployResult = {
  transactionHash?: string;
  targetLyquidId?: string;
  targetAddress?: string;
  status?: string;
  signedPayloadHash?: string;
  raw: unknown;
};
```

- [ ] **Step 5: Implement target package metadata extraction**

Replace `src/utils/file-utils.ts` with:

```ts
import type { ProjectMetadata, TargetPackageEvidence } from "@/types/deploy";

function isArchive(fileName: string) {
  return fileName.toLowerCase().endsWith(".zip");
}

function inferProjectName(files: File[]) {
  const firstFile = files[0];

  if (!firstFile) {
    return "Untitled project";
  }

  const firstPath = firstFile.webkitRelativePath || firstFile.name;
  return firstPath.includes("/") ? firstPath.split("/")[0] : firstFile.name;
}

function getEvidence(files: File[]): TargetPackageEvidence {
  const names = files.map((file) => file.webkitRelativePath || file.name);
  const archive = files.length === 1 && isArchive(names[0] ?? "") ? names[0] : undefined;

  return {
    hasManifest: names.some((name) => name.endsWith("Cargo.toml")),
    hasAbi: names.some((name) => name.endsWith(".abi.json") || name.endsWith("abi.json")),
    hasSource: names.some((name) => name.endsWith(".rs") || name.includes("/src/")),
    archiveName: archive
  };
}

function getValidationErrors(files: File[], evidence: TargetPackageEvidence) {
  if (files.length === 0) {
    return ["Upload a Target/Test Lyquid package."];
  }

  if (files.length === 1 && evidence.archiveName && files[0].size > 0) {
    return [];
  }

  if (evidence.hasManifest && evidence.hasSource) {
    return [];
  }

  return ["Target/Test Lyquid package needs a manifest and source files, or a non-empty zip archive."];
}

export function getProjectMetadata(files: File[]): ProjectMetadata {
  const evidence = getEvidence(files);

  return {
    name: inferProjectName(files),
    fileCount: files.length,
    totalSize: files.reduce((sum, file) => sum + file.size, 0),
    evidence,
    validationErrors: getValidationErrors(files, evidence)
  };
}

export async function readProjectArchive(file: File) {
  return new Uint8Array(await file.arrayBuffer());
}
```

- [ ] **Step 6: Update UploadStep to block invalid target package uploads**

In `src/components/upload-step.tsx`, change the Continue button to:

```tsx
<Button type="button" disabled={!metadata || metadata.validationErrors.length > 0} onClick={onContinue}>
  Continue
</Button>
```

Add this block after the metadata card:

```tsx
{metadata?.validationErrors.map((error) => (
  <p key={error} className="rounded-md border border-destructive bg-card p-3 text-sm text-destructive">
    {error}
  </p>
))}
```

- [ ] **Step 7: Run focused tests and verify pass**

Run:

```bash
npm run test -- src/utils/file-utils.test.ts src/store/deploy-session-store.test.ts src/components/upload-build-steps.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit Task 2**

```bash
git add src/types/deploy.ts src/store/deploy-session-store.ts src/store/deploy-session-store.test.ts src/utils/file-utils.ts src/utils/file-utils.test.ts src/components/upload-step.tsx
git commit -m "feat: track target package evidence"
```

---

### Task 3: Make Request Dispatch Require Deployer Target and Step Transport

**Files:**
- Modify: `src/utils/request/request-types.ts`
- Modify: `src/utils/request/request-dispatcher.ts`
- Modify: `src/utils/request/request-dispatcher.test.ts`
- Modify: `src/utils/request/on-chain-sender.ts`
- Modify: `src/utils/request/off-chain-sender.ts`
- Modify: `src/test/test-abi.ts`

- [ ] **Step 1: Write failing dispatcher tests**

Add this test to `src/utils/request/request-dispatcher.test.ts`:

```ts
it("passes deployerLyquidId to the selected sender", async () => {
  const parsedAbi = parseAbiSource(lyquidTestAbi);
  const context: RequestSenderContext = {
    rpcEndpoint: "http://localhost:8545",
    deployerLyquidId: "0x0000000000000000000000000000000000000001",
    accountAddress: "0x0000000000000000000000000000000000000002",
    walletClient: {} as never,
    publicClient: {} as never,
    offChainFetch: vi.fn()
  };
  const onChainSender = vi.fn().mockResolvedValue({ raw: { chain: true } });

  await dispatchSelectedMethod({
      parsedAbi,
      selectedMethod: "publishProject(bytes)",
      requiredTransport: "on-chain",
      args: ["0x1234"],
      context,
      onChainSender,
    offChainSender: vi.fn()
  });

  expect(onChainSender).toHaveBeenCalledWith(
    expect.objectContaining({
      deployerLyquidId: "0x0000000000000000000000000000000000000001"
    })
  );
});

it("fails locally when deployerLyquidId is missing", async () => {
  await expect(
    dispatchSelectedMethod({
      parsedAbi: parseAbiSource(lyquidTestAbi),
      selectedMethod: "publishProject(bytes)",
      requiredTransport: "off-chain",
      args: ["0x1234"],
      context: { rpcEndpoint: "http://localhost:8545", deployerLyquidId: "", offChainFetch: vi.fn() },
      onChainSender: vi.fn(),
      offChainSender: vi.fn()
    })
  ).rejects.toThrow("Deployer Lyquid ID is required.");
});

it("fails locally when the selected method transport does not match the workflow step", async () => {
  await expect(
    dispatchSelectedMethod({
      parsedAbi: parseAbiSource(lyquidTestAbi),
      selectedMethod: "publishProject(bytes)",
      requiredTransport: "off-chain",
      args: ["0x1234"],
      context: {
        rpcEndpoint: "http://localhost:8545",
        deployerLyquidId: "0x0000000000000000000000000000000000000001",
        offChainFetch: vi.fn()
      },
      onChainSender: vi.fn(),
      offChainSender: vi.fn()
    })
  ).rejects.toThrow("Selected method must use off-chain transport.");
});
```

- [ ] **Step 2: Add sender tests for target usage**

Add to `src/utils/request/request-dispatcher.test.ts`:

```ts
it("does not accept target lyquid evidence as the call target", async () => {
  await expect(
    dispatchSelectedMethod({
      parsedAbi: parseAbiSource(lyquidTestAbi),
      selectedMethod: "compileProject(bytes)",
      requiredTransport: "off-chain",
      args: ["0x1234"],
      context: {
        rpcEndpoint: "http://localhost:8545",
        deployerLyquidId: "",
        offChainFetch: vi.fn()
      },
      onChainSender: vi.fn(),
      offChainSender: vi.fn()
    })
  ).rejects.toThrow("Deployer Lyquid ID is required.");
});
```

Also update every existing `dispatchSelectedMethod` call in `src/utils/request/request-dispatcher.test.ts` so on-chain method tests use `publishProject(bytes)` with `requiredTransport: "on-chain"` and off-chain method tests use `compileProject(bytes)` or `prepareProject(bytes32)` with `requiredTransport: "off-chain"`.

- [ ] **Step 3: Run dispatcher tests and verify failure**

Run:

```bash
npm run test -- src/utils/request/request-dispatcher.test.ts
```

Expected: FAIL because `deployerLyquidId` and `requiredTransport` are not part of the request boundary.

- [ ] **Step 4: Update request types**

Replace `src/utils/request/request-types.ts` with:

```ts
import type { Address, PublicClient, WalletClient } from "viem";
import type { NormalizedAbiMethod, ParsedAbi } from "@/types/abi";

export type RequestSenderContext = {
  rpcEndpoint: string;
  deployerLyquidId: string;
  accountAddress?: Address;
  walletClient?: WalletClient;
  publicClient?: PublicClient;
  offChainFetch: typeof fetch;
};

export type SelectedMethodRequest = {
  parsedAbi: ParsedAbi;
  selectedMethod: string;
  requiredTransport: RequestTransport;
  args: unknown[];
  context: RequestSenderContext;
};

export type MethodSenderInput = {
  method: NormalizedAbiMethod;
  deployerLyquidId: string;
  args: unknown[];
  context: RequestSenderContext;
};

export type MethodSender = (input: MethodSenderInput) => Promise<unknown>;
```

- [ ] **Step 5: Mark the test build method as off-chain**

In `src/test/test-abi.ts`, add the Lyquid transport hint to the `compileProject` ABI item:

```ts
{
  type: "function",
  name: "compileProject",
  stateMutability: "nonpayable",
  inputs: [{ name: "source", type: "bytes", internalType: "bytes" }],
  outputs: [{ name: "artifactHash", type: "bytes32", internalType: "bytes32" }],
  "x-lyquid-transport": "off-chain"
}
```

Keep `publishProject(bytes)` without an off-chain transport hint so it remains on-chain.

- [ ] **Step 6: Update request dispatcher**

Replace the validation and sender call in `src/utils/request/request-dispatcher.ts` with:

```ts
if (!context.deployerLyquidId.trim()) {
  throw new Error("Deployer Lyquid ID is required.");
}

if (method.transport !== requiredTransport) {
  throw new Error(`Selected method must use ${requiredTransport} transport.`);
}

const sender = requiredTransport === "off-chain" ? offChainSender : onChainSender;
return sender({ method, deployerLyquidId: context.deployerLyquidId, args, context });
```

- [ ] **Step 7: Update on-chain sender**

Replace `src/utils/request/on-chain-sender.ts` with:

```ts
import { encodeFunctionData, isAddress } from "viem";
import type { MethodSenderInput } from "./request-types";

export async function sendOnChainMethod({ method, deployerLyquidId, args, context }: MethodSenderInput) {
  if (!context.rpcEndpoint) {
    throw new Error("RPC endpoint is required.");
  }

  if (!isAddress(deployerLyquidId)) {
    throw new Error("Deployer Lyquid address is required for on-chain methods.");
  }

  const data = encodeFunctionData({
    abi: [method.abiItem],
    functionName: method.name,
    args
  });

  if (method.abiItem.stateMutability === "view" || method.abiItem.stateMutability === "pure") {
    if (!context.publicClient) {
      return {
        data,
        method: method.signature,
        transport: "on-chain",
        raw: { encodedData: data, deployerLyquidId, rpcEndpoint: context.rpcEndpoint }
      };
    }

    const raw = await context.publicClient.readContract({
      address: deployerLyquidId,
      abi: [method.abiItem],
      functionName: method.name,
      args
    });

    return { data, method: method.signature, transport: "on-chain", raw };
  }

  if (!context.walletClient) {
    return {
      data,
      method: method.signature,
      transport: "on-chain",
      raw: { encodedData: data, deployerLyquidId, rpcEndpoint: context.rpcEndpoint }
    };
  }

  const contractRequest = {
    address: deployerLyquidId,
    abi: [method.abiItem],
    functionName: method.name,
    args
  } as const;

  const transactionHash = context.accountAddress
    ? await context.walletClient.writeContract({ ...contractRequest, account: context.accountAddress })
    : await context.walletClient.writeContract(contractRequest);

  return {
    data,
    method: method.signature,
    transport: "on-chain",
    transactionHash,
    raw: { transactionHash }
  };
}
```

- [ ] **Step 8: Update off-chain sender**

In `src/utils/request/off-chain-sender.ts`, add `deployerLyquidId` to the function parameters and body:

```ts
export async function sendOffChainMethod({ method, deployerLyquidId, args, context }: MethodSenderInput) {
  if (!context.rpcEndpoint) {
    throw new Error("RPC endpoint is required.");
  }

  const body = {
    deployerLyquidId,
    method: method.signature,
    data: encodeFunctionData({
      abi: [method.abiItem],
      functionName: method.name,
      args
    })
  };
```

Leave the existing fetch/JSON/error handling below that block.

- [ ] **Step 9: Run request tests and typecheck**

Run:

```bash
npm run test -- src/utils/request/request-dispatcher.test.ts
npm run typecheck
```

Expected: both PASS.

- [ ] **Step 10: Commit Task 3**

```bash
git add src/utils/request/request-types.ts src/utils/request/request-dispatcher.ts src/utils/request/request-dispatcher.test.ts src/utils/request/on-chain-sender.ts src/utils/request/off-chain-sender.ts src/test/test-abi.ts
git commit -m "feat: require deployer lyquid request target"
```

---

### Task 4: Add User-Actionable Request Error Mapping

**Files:**
- Create: `src/utils/request/error-utils.ts`
- Create: `src/utils/request/error-utils.test.ts`
- Modify: `docs/agent/registries.md`

- [ ] **Step 1: Write failing error utility tests**

Create `src/utils/request/error-utils.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getRequestErrorMessage } from "./error-utils";

describe("error-utils", () => {
  it("maps RPC endpoint failures", () => {
    expect(getRequestErrorMessage(new Error("RPC endpoint is required."))).toBe("RPC endpoint is required. Check Settings and local devnet status.");
  });

  it("maps deployer target failures", () => {
    expect(getRequestErrorMessage(new Error("Deployer Lyquid ID is required."))).toBe("Deployer Lyquid ID is required. Check Settings.");
  });

  it("maps wallet rejection failures", () => {
    expect(getRequestErrorMessage(new Error("User rejected the request"))).toBe("Wallet request was rejected. Retry the action when ready.");
  });

  it("maps missing wallet connection failures", () => {
    expect(getRequestErrorMessage(new Error("Wallet connection is required for on-chain deploy."))).toBe("Wallet connection is required for on-chain deploy.");
  });

  it("maps method transport mismatches", () => {
    expect(getRequestErrorMessage(new Error("Selected method must use off-chain transport."))).toBe("Selected ABI method uses the wrong transport. Build requires off-chain and Deploy requires on-chain.");
  });

  it("maps unknown failures without dropping raw message", () => {
    expect(getRequestErrorMessage(new Error("execution reverted"))).toBe("Deployer Lyquid call failed: execution reverted");
  });
});
```

- [ ] **Step 2: Run the error utility tests and verify failure**

Run:

```bash
npm run test -- src/utils/request/error-utils.test.ts
```

Expected: FAIL because `error-utils.ts` does not exist.

- [ ] **Step 3: Implement error mapping**

Create `src/utils/request/error-utils.ts`:

```ts
export function getRequestErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (normalized.includes("rpc endpoint")) {
    return "RPC endpoint is required. Check Settings and local devnet status.";
  }

  if (normalized.includes("deployer lyquid id") || normalized.includes("deployer lyquid address")) {
    return "Deployer Lyquid ID is required. Check Settings.";
  }

  if (normalized.includes("selected method")) {
    return "Selected ABI method does not exist. Check Settings.";
  }

  if (normalized.includes("wrong transport") || normalized.includes("must use off-chain") || normalized.includes("must use on-chain")) {
    return "Selected ABI method uses the wrong transport. Build requires off-chain and Deploy requires on-chain.";
  }

  if (normalized.includes("wallet connection is required")) {
    return "Wallet connection is required for on-chain deploy.";
  }

  if (normalized.includes("user rejected") || normalized.includes("rejected the request")) {
    return "Wallet request was rejected. Retry the action when ready.";
  }

  if (normalized.includes("invalid abi") || normalized.includes("abi")) {
    return `ABI configuration failed: ${message}`;
  }

  return `Deployer Lyquid call failed: ${message}`;
}
```

- [ ] **Step 4: Update utility registry**

In `docs/agent/registries.md`, add this row to the Utility Registry table:

```markdown
| `request/error-utils` | `src/utils/request/error-utils.ts` | active | Convert raw request and wallet errors into user-actionable Cloud Deploy messages | `getRequestErrorMessage` | Build, Deploy | Keep raw details in logs/results; primary UI errors should point to the likely correction |
```

- [ ] **Step 5: Run tests**

Run:

```bash
npm run test -- src/utils/request/error-utils.test.ts
```

Expected: PASS.

- [ ] **Step 6: Commit Task 4**

```bash
git add src/utils/request/error-utils.ts src/utils/request/error-utils.test.ts docs/agent/registries.md
git commit -m "feat: map deploy request errors"
```

---

### Task 5: Update Settings and Shared UI Language

**Files:**
- Modify: `src/components/shared/settings-dialog.tsx`
- Modify: `src/components/shared/payload-review-panel.tsx`
- Modify: `src/components/shared/result-summary.tsx`
- Modify: `src/components/shared/shared-components.test.tsx`
- Modify: `docs/agent/registries.md`

- [ ] **Step 1: Write failing shared component tests**

Add these tests to `src/components/shared/shared-components.test.tsx`:

```tsx
it("renders review context with deployer and target labels", () => {
  renderWithProviders(
    <PayloadReviewPanel
      deployerLyquidId="0x0000000000000000000000000000000000000001"
      deployMethod="publishProject(bytes)"
      targetPackage={{ name: "demo-lyquid.zip", fileCount: 1, totalSize: 9 }}
      hashes={{ sourceHash: "0x1234567890abcdef" }}
      payload={{ ok: true }}
      onCopy={vi.fn()}
      onDownload={vi.fn()}
    />
  );

  expect(screen.getByText("Deployer Lyquid")).toBeInTheDocument();
  expect(screen.getByText("Target/Test Lyquid")).toBeInTheDocument();
  expect(screen.getByText("demo-lyquid.zip")).toBeInTheDocument();
  expect(screen.getByText("publishProject(bytes)")).toBeInTheDocument();
});

it("renders target-specific deployment evidence", () => {
  renderWithProviders(
    <ResultSummary
      result={{
        status: "submitted",
        targetLyquidId: "target-1",
        targetAddress: "0x0000000000000000000000000000000000000003",
        raw: { ok: true }
      }}
    />
  );

  expect(screen.getByText("target-1")).toBeInTheDocument();
  expect(screen.getByText("0x0000...0003")).toBeInTheDocument();
});
```

- [ ] **Step 2: Run shared component tests and verify failure**

Run:

```bash
npm run test -- src/components/shared/shared-components.test.tsx
```

Expected: FAIL because the shared components do not accept Deployer/Target props yet.

- [ ] **Step 3: Update SettingsDialog copy and field**

In `src/components/shared/settings-dialog.tsx`:

Replace the dialog description with:

```tsx
<DialogDescription>Configure the RPC endpoint, Deployer Lyquid ID, ABI, and selected ABI methods.</DialogDescription>
```

Replace the Lyquid ID field with:

```tsx
<div className="space-y-2">
  <Label htmlFor="deployer-lyquid-id">Deployer Lyquid ID</Label>
  <Input
    id="deployer-lyquid-id"
    value={draft.deployerLyquidId}
    onChange={(event) => setDraft({ ...draft, deployerLyquidId: event.target.value })}
  />
</div>
```

- [ ] **Step 4: Update PayloadReviewPanel props and context display**

In `src/components/shared/payload-review-panel.tsx`, replace `PayloadReviewPanelProps` with:

```ts
type TargetPackageSummary = {
  name: string;
  fileCount: number;
  totalSize: number;
};

type PayloadReviewPanelProps = {
  deployerLyquidId: string;
  deployMethod: string;
  targetPackage: TargetPackageSummary | null;
  hashes: DeploymentHashes;
  payload: unknown;
  onCopy: () => void;
  onDownload: () => void;
};
```

Change the component signature:

```tsx
export function PayloadReviewPanel({ deployerLyquidId, deployMethod, targetPackage, hashes, payload, onCopy, onDownload }: PayloadReviewPanelProps) {
```

Add this context block before the hash grid:

```tsx
<div className="grid gap-3 md:grid-cols-3">
  <div className="rounded-md border bg-card p-3">
    <p className="text-caption text-muted-foreground">Deployer Lyquid</p>
    <p className="break-all font-mono text-sm">{deployerLyquidId || "Not configured"}</p>
  </div>
  <div className="rounded-md border bg-card p-3">
    <p className="text-caption text-muted-foreground">Deploy Method</p>
    <p className="break-all font-mono text-sm">{deployMethod || "Not selected"}</p>
  </div>
  <div className="rounded-md border bg-card p-3">
    <p className="text-caption text-muted-foreground">Target/Test Lyquid</p>
    <p className="font-medium">{targetPackage?.name ?? "No package"}</p>
    {targetPackage ? (
      <p className="text-sm text-muted-foreground">
        {targetPackage.fileCount} file(s), {targetPackage.totalSize} bytes
      </p>
    ) : null}
  </div>
</div>
```

- [ ] **Step 5: Update ResultSummary for target-specific evidence**

In `src/components/shared/result-summary.tsx`, replace the `lyquidId` badge with:

```tsx
{result.targetLyquidId ? <Badge variant="outline">{result.targetLyquidId}</Badge> : null}
{result.targetAddress ? <Badge variant="outline">{shortAddress(result.targetAddress)}</Badge> : null}
```

Also update the formatter import at the top of `src/components/shared/result-summary.tsx`:

```ts
import { formatStatus, shortAddress, shortHash } from "@/utils/format-utils";
```

- [ ] **Step 6: Update registry summaries**

In `docs/agent/registries.md`, update these rows:

```markdown
| `SettingsDialog` | `src/components/shared/settings-dialog.tsx` | active | Persisted settings editor for RPC endpoint, Deployer Lyquid ID, ABI, Build Method, and Deploy Method | `open`, `onOpenChange`, `settings`, `methodOptions`, `methodErrors`, `onSave` | Editing Cloud Deploy environment settings together | Uses `Dialog`, `Input`, `Textarea`, `Select`, `Button`, `Label` |
| `PayloadReviewPanel` | `src/components/shared/payload-review-panel.tsx` | active | Displays Deployer Lyquid, Target/Test Lyquid package summary, selected deploy method, hashes, request payload, copy, and download actions | `deployerLyquidId`, `deployMethod`, `targetPackage`, `hashes`, `payload`, `onCopy`, `onDownload` | Step 3 reviews the exact Deployer call and target package | Uses `Button`, `ScrollArea` |
| `ResultSummary` | `src/components/shared/result-summary.tsx` | active | Displays target deployment result fields and raw response | `result` | Step 4 displays deployed Target/Test Lyquid evidence | Uses `Badge`, `ScrollArea` |
```

- [ ] **Step 7: Run shared tests**

Run:

```bash
npm run test -- src/components/shared/shared-components.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit Task 5**

```bash
git add src/components/shared/settings-dialog.tsx src/components/shared/payload-review-panel.tsx src/components/shared/result-summary.tsx src/components/shared/shared-components.test.tsx docs/agent/registries.md
git commit -m "feat: clarify deployer and target UI"
```

---

### Task 6: Wire the Page Flow to Deployer and Target Concepts

**Files:**
- Modify: `src/components/review-step.tsx`
- Modify: `src/components/deploy-step.tsx`
- Modify: `src/components/review-deploy-steps.test.tsx`
- Modify: `src/pages/index.tsx`
- Modify: `src/pages/index.test.tsx`

- [ ] **Step 1: Write failing Review/Deploy component tests**

Replace the update-confirmation test in `src/components/review-deploy-steps.test.tsx` with:

```tsx
it("deploys directly through the configured deployer when wallet is connected", async () => {
  const user = userEvent.setup();
  const onDeploy = vi.fn();
  renderWithProviders(<DeployStep result={null} onDeploy={onDeploy} error={null} isWalletConnected onConnectWallet={vi.fn()} />);

  await user.click(screen.getByRole("button", { name: "Deploy" }));

  expect(onDeploy).toHaveBeenCalledTimes(1);
  expect(screen.queryByText("Deploy as update to this Lyquid?")).not.toBeInTheDocument();
});

it("prompts for wallet connection before on-chain deploy", async () => {
  const user = userEvent.setup();
  const onDeploy = vi.fn();
  const onConnectWallet = vi.fn().mockResolvedValue(undefined);
  renderWithProviders(<DeployStep result={null} onDeploy={onDeploy} error={null} isWalletConnected={false} onConnectWallet={onConnectWallet} />);

  await user.click(screen.getByRole("button", { name: "Deploy" }));
  expect(screen.getByText("Connect wallet to deploy")).toBeInTheDocument();

  await user.click(screen.getByRole("button", { name: "Connect and Deploy" }));

  expect(onConnectWallet).toHaveBeenCalledTimes(1);
  expect(onDeploy).toHaveBeenCalledTimes(1);
});
```

Update the review render test to pass the new props:

```tsx
<ReviewStep
  deployerLyquidId="0x0000000000000000000000000000000000000001"
  deployMethod="publishProject(bytes)"
  targetPackage={{ name: "demo-lyquid.zip", fileCount: 1, totalSize: 9 }}
  reviewPayload={{ hashes: { sourceHash: "0x1234567890abcdef" }, payload: { ok: true } }}
  onCopy={vi.fn()}
  onDownload={vi.fn()}
  onContinue={vi.fn()}
/>
```

- [ ] **Step 2: Write failing page integration test**

In `src/pages/index.test.tsx`, update settings setup to use `deployerLyquidId`, then add:

Also update the `wagmi` mock to include the new hooks used by `HomePage`:

```ts
vi.mock("wagmi", () => ({
  useAccount: () => ({ address: undefined }),
  useConnect: () => ({ connect: vi.fn(), connectAsync: vi.fn().mockResolvedValue(undefined) }),
  usePublicClient: () => undefined,
  useWalletClient: () => ({ data: undefined })
}));
```

```tsx
it("opens settings with a Deployer Lyquid ID field", async () => {
  const user = userEvent.setup();
  renderWithProviders(<HomePage />);

  await user.click(screen.getByRole("button", { name: "Settings" }));

  expect(screen.getByLabelText("Deployer Lyquid ID")).toBeInTheDocument();
  expect(screen.queryByLabelText("Lyquid ID")).not.toBeInTheDocument();
});
```

- [ ] **Step 3: Run component/page tests and verify failure**

Run:

```bash
npm run test -- src/components/review-deploy-steps.test.tsx src/pages/index.test.tsx
```

Expected: FAIL because ReviewStep, DeployStep, and HomePage still use `lyquidId`.

- [ ] **Step 4: Update ReviewStep props**

Replace `src/components/review-step.tsx` with:

```tsx
import type { ProjectMetadata, ReviewPayload } from "@/types/deploy";
import { Button } from "@/components/ui/button";
import { PayloadReviewPanel } from "@/components/shared/payload-review-panel";

type ReviewStepProps = {
  deployerLyquidId: string;
  deployMethod: string;
  targetPackage: Pick<ProjectMetadata, "name" | "fileCount" | "totalSize"> | null;
  reviewPayload: ReviewPayload | null;
  onCopy: () => void;
  onDownload: () => void;
  onContinue: () => void;
};

export function ReviewStep({ deployerLyquidId, deployMethod, targetPackage, reviewPayload, onCopy, onDownload, onContinue }: ReviewStepProps) {
  if (!reviewPayload) {
    return <p className="text-sm text-muted-foreground">Build output is required before review.</p>;
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <PayloadReviewPanel
        deployerLyquidId={deployerLyquidId}
        deployMethod={deployMethod}
        targetPackage={targetPackage}
        hashes={reviewPayload.hashes}
        payload={reviewPayload.payload}
        onCopy={onCopy}
        onDownload={onDownload}
      />
      <div className="flex justify-end">
        <Button type="button" onClick={onContinue}>
          Proceed to Deploy
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Add DeployStep wallet gate**

Replace `src/components/deploy-step.tsx` with:

```tsx
import type { DeployResult } from "@/types/deploy";
import { ResultSummary } from "@/components/shared/result-summary";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useState } from "react";

type DeployStepProps = {
  result: DeployResult | null;
  onDeploy: () => void;
  isWalletConnected: boolean;
  onConnectWallet: () => Promise<void>;
  error: string | null;
};

export function DeployStep({ result, onDeploy, isWalletConnected, onConnectWallet, error }: DeployStepProps) {
  const [connectOpen, setConnectOpen] = useState(false);

  const handleDeployClick = () => {
    if (!isWalletConnected) {
      setConnectOpen(true);
      return;
    }

    onDeploy();
  };

  const handleConnectAndDeploy = async () => {
    await onConnectWallet();
    setConnectOpen(false);
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
      <Dialog open={connectOpen} onOpenChange={setConnectOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect wallet to deploy</DialogTitle>
            <DialogDescription>Deploy is an on-chain action. Connect a wallet before submitting the Deployer Lyquid transaction.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setConnectOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleConnectAndDeploy}>
              Connect and Deploy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 6: Wire HomePage settings and request context**

In `src/pages/index.tsx`, import these hooks and helpers:

```ts
import { toHex } from "viem";
import { useAccount, useConnect, usePublicClient, useWalletClient } from "wagmi";
import { getRequestErrorMessage } from "@/utils/request/error-utils";
import { readProjectArchive } from "@/utils/file-utils";
```

Replace the existing `const { connect } = useConnect();` hook with these hook calls inside `HomePage`:

```ts
const publicClient = usePublicClient();
const { connectAsync } = useConnect();
const { data: walletClient } = useWalletClient();
```

Update the `AppShell` wallet action so the header connect button still works:

```tsx
onConnectWallet={() => connectAsync({ connector: injected() })}
```

Replace `canBuild` with:

```ts
const selectedBuildMethod = settings.methodOptions.find((method) => method.value === settings.buildMethod);
const canBuild = Boolean(
  session.uploadedProject &&
    settings.deployerLyquidId &&
    settings.parsedAbi &&
    settings.buildMethod &&
    selectedBuildMethod?.transport === "off-chain" &&
    !settings.methodErrors.buildMethod &&
    session.uploadedProject.metadata.validationErrors.length === 0
);
```

In `handleBuild`, replace the source argument with archive bytes:

```ts
const archiveBytes = await readProjectArchive(session.uploadedProject.files[0]);
const sourceHash = await hashSource(archiveBytes);
const constructorInputHash = await hashConstructorInput(session.constructorValues);
const raw = await dispatchSelectedMethod({
  parsedAbi: settings.parsedAbi,
  selectedMethod: settings.buildMethod,
  requiredTransport: "off-chain",
  args: [toHex(archiveBytes)],
  context: {
    rpcEndpoint: settings.rpcEndpoint,
    deployerLyquidId: settings.deployerLyquidId,
    offChainFetch: fetch
  }
});
```

In `handleDeploy`, add the wallet guard before dispatch:

```ts
if (!account.address || !walletClient) {
  session.setCurrentError("Wallet connection is required for on-chain deploy.");
  return;
}
```

In `handleDeploy`, replace the dispatch request fields:

```ts
requiredTransport: "on-chain",
context: {
  rpcEndpoint: settings.rpcEndpoint,
  deployerLyquidId: settings.deployerLyquidId,
  accountAddress: account.address,
  walletClient,
  publicClient,
  offChainFetch: fetch
}
```

Replace both catch blocks with:

```ts
session.setCurrentError(getRequestErrorMessage(error));
```

Replace the default deploy step:

```tsx
let stepContent = (
  <DeployStep
    result={session.deployResult}
    onDeploy={handleDeploy}
    isWalletConnected={Boolean(account.address)}
    onConnectWallet={() => connectAsync({ connector: injected() }).then(() => undefined)}
    error={session.currentError}
  />
);
```

Pass new ReviewStep props:

```tsx
<ReviewStep
  deployerLyquidId={settings.deployerLyquidId}
  deployMethod={settings.deployMethod}
  targetPackage={session.uploadedProject?.metadata ?? null}
  reviewPayload={session.reviewPayload}
  onCopy={() => navigator.clipboard.writeText(JSON.stringify(session.reviewPayload?.payload ?? {}, null, 2))}
  onDownload={() => downloadJson("cloud-deploy-payload.json", session.reviewPayload?.payload ?? {})}
  onContinue={() => session.goToStep("deploy")}
/>
```

Pass new SettingsDialog settings:

```tsx
settings={{
  rpcEndpoint: settings.rpcEndpoint,
  deployerLyquidId: settings.deployerLyquidId,
  abi: settings.abi,
  buildMethod: settings.buildMethod,
  deployMethod: settings.deployMethod
}}
```

- [ ] **Step 7: Run component/page tests**

Run:

```bash
npm run test -- src/components/review-deploy-steps.test.tsx src/pages/index.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Commit Task 6**

```bash
git add src/components/review-step.tsx src/components/deploy-step.tsx src/components/review-deploy-steps.test.tsx src/pages/index.tsx src/pages/index.test.tsx
git commit -m "feat: wire two-lyquid page flow"
```

---

### Task 7: Extract Target Deployment Evidence

**Files:**
- Modify: `src/types/deploy.ts`
- Create: `src/utils/request/deploy-result-utils.ts`
- Create: `src/utils/request/deploy-result-utils.test.ts`
- Modify: `src/pages/index.tsx`
- Modify: `docs/agent/registries.md`

- [ ] **Step 1: Write failing deploy result utility tests**

Create `src/utils/request/deploy-result-utils.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { getDeployResultEvidence } from "./deploy-result-utils";

describe("deploy-result-utils", () => {
  it("extracts target evidence from direct result fields", () => {
    expect(
      getDeployResultEvidence({
        targetLyquidId: "target-1",
        targetAddress: "0x0000000000000000000000000000000000000003",
        transactionHash: "0xabc"
      })
    ).toEqual({
      targetLyquidId: "target-1",
      targetAddress: "0x0000000000000000000000000000000000000003",
      transactionHash: "0xabc",
      hasUsableEvidence: true
    });
  });

  it("extracts target evidence from raw transaction hash wrapper", () => {
    expect(getDeployResultEvidence({ raw: { transactionHash: "0xabc" } })).toEqual({
      transactionHash: "0xabc",
      hasUsableEvidence: false
    });
  });
});
```

- [ ] **Step 2: Run deploy result utility tests and verify failure**

Run:

```bash
npm run test -- src/utils/request/deploy-result-utils.test.ts
```

Expected: FAIL because `deploy-result-utils.ts` does not exist.

- [ ] **Step 3: Implement evidence extraction**

Create `src/utils/request/deploy-result-utils.ts`:

```ts
type Evidence = {
  targetLyquidId?: string;
  targetAddress?: string;
  transactionHash?: string;
  hasUsableEvidence: boolean;
};

function readStringField(value: unknown, field: string) {
  if (!value || typeof value !== "object") {
    return undefined;
  }

  const record = value as Record<string, unknown>;
  return typeof record[field] === "string" ? record[field] : undefined;
}

export function getDeployResultEvidence(raw: unknown): Evidence {
  const nestedRaw = raw && typeof raw === "object" ? (raw as Record<string, unknown>).raw : undefined;

  const targetLyquidId = readStringField(raw, "targetLyquidId") ?? readStringField(raw, "lyquidId") ?? readStringField(nestedRaw, "targetLyquidId") ?? readStringField(nestedRaw, "lyquidId");
  const targetAddress = readStringField(raw, "targetAddress") ?? readStringField(raw, "address") ?? readStringField(nestedRaw, "targetAddress") ?? readStringField(nestedRaw, "address");
  const transactionHash = readStringField(raw, "transactionHash") ?? readStringField(nestedRaw, "transactionHash");

  return {
    targetLyquidId,
    targetAddress,
    transactionHash,
    hasUsableEvidence: Boolean(targetLyquidId || targetAddress)
  };
}
```

- [ ] **Step 4: Use evidence extraction in HomePage**

In `src/pages/index.tsx`, import:

```ts
import { getDeployResultEvidence } from "@/utils/request/deploy-result-utils";
```

In `handleDeploy`, after `const signedPayloadHash = await hashPayload(raw);`, add:

```ts
const evidence = getDeployResultEvidence(raw);
```

Replace `session.setDeployResult` with:

```ts
session.setDeployResult({
  status: evidence.hasUsableEvidence ? "submitted" : "submitted-no-target-evidence",
  signedPayloadHash,
  transactionHash: evidence.transactionHash,
  targetLyquidId: evidence.targetLyquidId,
  targetAddress: evidence.targetAddress,
  raw
});
```

- [ ] **Step 5: Update utility registry**

Add this row to the Utility Registry table in `docs/agent/registries.md`:

```markdown
| `request/deploy-result-utils` | `src/utils/request/deploy-result-utils.ts` | active | Extract Target/Test Lyquid deployment evidence from ABI-shaped raw deploy results | `getDeployResultEvidence` | Deploy | Use target-specific field names in UI even when raw result uses legacy `lyquidId` |
```

- [ ] **Step 6: Run focused tests**

Run:

```bash
npm run test -- src/utils/request/deploy-result-utils.test.ts src/pages/index.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit Task 7**

```bash
git add src/utils/request/deploy-result-utils.ts src/utils/request/deploy-result-utils.test.ts src/pages/index.tsx docs/agent/registries.md
git commit -m "feat: extract target deploy evidence"
```

---

### Task 8: Final Verification and Documentation Consistency

**Files:**
- Modify if needed: `docs/agent/registries.md`
- Modify if needed: `examples/demo-lyquid/README.md`

- [ ] **Step 1: Update the Target/Test Lyquid README wording**

If `examples/demo-lyquid/README.md` does not already say that the example is a Target/Test Lyquid and not the Deployer Lyquid, add this paragraph:

```markdown
This example is the Target/Test Lyquid used by Cloud Deploy validation. It is uploaded and deployed through an already configured Deployer Lyquid. It is not the Deployer Lyquid itself.
```

- [ ] **Step 2: Search for ambiguous user-facing Lyquid ID wording**

Run:

```bash
rg -n "Lyquid ID|lyquidId|Deploy as update|Update" src docs examples
```

Expected: remaining matches are either legacy migration code, spec/history docs, target-specific fields, or explicitly say `Deployer Lyquid ID` / `targetLyquidId`.

- [ ] **Step 3: Run the full test suite**

Run:

```bash
npm run test
```

Expected: PASS.

- [ ] **Step 4: Run typecheck**

Run:

```bash
npm run typecheck
```

Expected: PASS.

- [ ] **Step 5: Run build**

Run:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 6: Run lint**

Run:

```bash
npm run lint
```

Expected: PASS or only existing Fast Refresh warnings from shadcn-generated UI files.

- [ ] **Step 7: Start the local dev server**

Run:

```bash
npm run dev -- --host 127.0.0.1
```

Expected: Vite prints a local URL such as `http://127.0.0.1:5173/`.

- [ ] **Step 8: Browser smoke check**

Open the local URL with the Browser plugin and verify:

- Settings contains `Deployer Lyquid ID`.
- Upload accepts `.tmp/demo-lyquid.zip` after `npm run demo:zip`.
- Build is disabled until Deployer Lyquid ID, ABI, an off-chain build method, and a valid Target/Test Lyquid package are present.
- Build does not require wallet connection.
- Review shows Deployer Lyquid, Deploy Method, and Target/Test Lyquid.
- Deploy no longer opens an update confirmation dialog just because the Deployer Lyquid ID is present.
- Deploy opens the wallet connection dialog when no wallet is connected, then continues the on-chain deploy after connection.

- [ ] **Step 9: Commit Task 8**

```bash
git add docs/agent/registries.md examples/demo-lyquid/README.md
git commit -m "docs: clarify target lyquid fixture"
```

If neither file changed in this task, do not create an empty commit.

---

## Implementation Notes

- Do not add UI for devnet startup or Deployer Lyquid deployment.
- Do not store Target/Test Lyquid identifiers in persisted settings.
- Keep `lyquidId` only in migration code and old design/spec history.
- Treat `deployerLyquidId` as the Deployer call target and `targetLyquidId` / `targetAddress` as deploy result evidence.
- Do not hard-code ABI method names. The test ABI uses `compileProject(bytes)` and `publishProject(bytes)` only as test fixture values selected by the user.
- Enforce workflow transport: Build requires an ABI method marked off-chain; Deploy requires an on-chain ABI method and a connected wallet.
- Keep package upload data in `deploy-session-store`.
- Keep static defaults and storage keys in `src/config`.
- Keep request parsing, error mapping, and deployment evidence extraction in `src/utils/request`.

## Final Verification

Before reporting completion, run:

```bash
npm run test
npm run typecheck
npm run build
npm run lint
```

Then start the Vite dev server and perform the Browser smoke check from Task 8.
