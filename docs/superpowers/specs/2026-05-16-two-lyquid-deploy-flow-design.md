# Two-Lyquid Deploy Flow Design

Date: 2026-05-16

## Summary

Cloud Deploy should model deployment as a two-Lyquid flow:

- A pre-existing Deployer Lyquid provides the deployment environment.
- A Target/Test Lyquid is uploaded through Cloud Deploy and deployed by calling the Deployer Lyquid.

The Deployer Lyquid is not created, deployed, or managed by Cloud Deploy. It is an external prerequisite. Cloud Deploy stores its identifier and ABI configuration in Settings, then uses that configured Deployer Lyquid as the call target for build and deploy requests.

This design replaces the ambiguous single `lyquidId` meaning from the earlier MVP design with an explicit deployment-environment identifier.

## Goals

- Separate the Deployer Lyquid from the Target/Test Lyquid in product language, state, and request code.
- Let Cloud Deploy consume an already deployed Deployer Lyquid through Settings.
- Let users upload a simple Target/Test Lyquid and deploy it through the configured Deployer Lyquid.
- Preserve the progress-driven workflow: Upload, Build, Review, Deploy.
- Preserve ABI-selected build and deploy methods without hard-coded method names.
- Make Build an off-chain operation that does not require a connected wallet.
- Make Deploy an on-chain operation that requires a connected wallet before submission.
- Execute the deployment path against a real local devnet when the required external Deployer Lyquid and RPC endpoint are available.
- Keep deployment-attempt data runtime-only and local settings durable.

## Non-Goals

- No UI for starting or managing a local devnet.
- No UI for creating or deploying the Deployer Lyquid.
- No deployment history management.
- No persistence for uploaded Target/Test Lyquid packages, build results, prepared payloads, deployment receipts, logs, or Target/Test Lyquid identifiers.
- No fallback or mock deployment that is presented as a real deployment success.
- No hard-coded ABI method names such as `build`, `prepare`, `deploy`, `publish`, or `register`.

## Terms

### Deployer Lyquid

The Deployer Lyquid is the already deployed deployment environment. Cloud Deploy calls this Lyquid to prepare and deploy other Lyquids.

Cloud Deploy requires:

- a Deployer Lyquid ID or address;
- the Deployer Lyquid ABI or interaction description;
- selected ABI methods for build and deploy.

Cloud Deploy does not create, deploy, update, or own the Deployer Lyquid lifecycle.

### Target/Test Lyquid

The Target/Test Lyquid is the Lyquid package uploaded into Cloud Deploy during a deployment attempt. It is the subject being built and deployed.

The repository should include a small Target/Test Lyquid fixture for validation. This fixture is not the Deployer Lyquid. It exists to prove that Cloud Deploy can pass a target package through the configured deployment environment and receive usable deployment evidence.

## Product Shape

Cloud Deploy remains a focused `100vh` deployment tool with these steps:

1. Upload
2. Build
3. Review
4. Deploy

Settings are separate from the step content. Settings configure the deployment environment. Step content handles the current Target/Test Lyquid attempt.

## External Prerequisites

Before a real deployment attempt, the environment must already provide:

- a reachable local devnet RPC endpoint;
- an already deployed Deployer Lyquid;
- the Deployer Lyquid ID or address;
- an ABI or interaction description for the Deployer Lyquid.

Those prerequisites may be prepared outside Cloud Deploy with LDK tooling, but this spec treats that setup as external environment preparation rather than product behavior.

## Settings

Settings should persist only environment configuration:

- `rpcEndpoint`
- `deployerLyquidId`
- `abi`
- `buildMethod`
- `deployMethod`

`deployerLyquidId` replaces the ambiguous persisted `lyquidId` concept for this flow. It is the call target used by request dispatch. It must not be interpreted as the Target/Test Lyquid being deployed.

`settings-store` owns atomic reconciliation of `abi`, `buildMethod`, and `deployMethod`:

- if ABI parsing fails, method selection is invalid;
- if the selected build method no longer exists in the parsed ABI, clear or mark the build method invalid;
- if the selected deploy method no longer exists in the parsed ABI, clear or mark the deploy method invalid.

No Target/Test Lyquid fields belong in persisted settings.

## Runtime Session State

`deploy-session-store` should hold the current deployment attempt:

- uploaded Target/Test Lyquid package metadata;
- parsed target package summary, manifest summary, and ABI summary when available;
- build request status and result;
- review preview, including encoded payload or ABI-shaped request data;
- deploy transaction status;
- receipt or deployment evidence;
- logs and user-actionable errors.

This data is runtime-only. Refreshing the page may clear it.

## Request Dispatch Boundary

Request dispatch must distinguish the call target from the deployment subject:

- Call target: `deployerLyquidId` from Settings.
- Deployment subject: uploaded Target/Test Lyquid data from the runtime session.

The dispatcher and senders should avoid accepting a generic `lyquidId` when the meaning could be ambiguous. Function and type names should make the distinction explicit, using terms such as `deployerLyquidId`, `targetPackage`, `targetArtifact`, or `deploymentSubject`.

The existing on-chain and off-chain sender split remains valid, but the workflow fixes which sender each step uses:

- Build uses the off-chain sender. It must not require a connected wallet.
- Deploy uses the on-chain sender. It must require a connected wallet before submitting.

The selected ABI method drives encoding. The current workflow step drives the required transport. Cloud Deploy must not infer behavior from method names.

If the selected build method is not marked as off-chain in the ABI interaction surface, Build should fail locally with a method transport error. If the selected deploy method is not on-chain, Deploy should fail locally with a method transport error.

## Workflow

### Step 1: Upload

The user uploads or selects the Target/Test Lyquid package.

The app validates that the package has enough structure to be used as a deployment subject. At minimum, it should detect whether expected deployable materials such as manifest, ABI, source summary, or build metadata are present.

The upload step should display useful package facts such as project name, file count, size, and available manifest or ABI evidence.

### Step 2: Build

The app reads `deployerLyquidId`, `abi`, and `buildMethod` from Settings.

When the user runs Build:

- the selected build method is encoded according to the Deployer Lyquid ABI;
- the Target/Test Lyquid package or derived package materials are included according to the selected method's input shape;
- the request is dispatched to the Deployer Lyquid through the off-chain sender;
- no wallet connection is required;
- the build result is stored in runtime session state.

The build result may contain prepared payloads, hashes, artifacts, logs, or ABI-defined fields. The UI should display what is present without inventing unavailable fields.

### Step 3: Review

Review shows what will be sent to the Deployer Lyquid during Deploy.

It should clearly display:

- Deployer Lyquid ID or address;
- selected deploy method;
- Target/Test Lyquid package summary;
- constructor or configuration input when present;
- build output or prepared deployment input;
- encoded payload or equivalent request preview when available.

The Review step answers two questions for the user:

- Which Deployer Lyquid am I calling?
- Which Target/Test Lyquid am I deploying?

### Step 4: Deploy

The app reads `deployerLyquidId`, `abi`, and `deployMethod` from Settings and the prepared deployment input from the runtime session.

When the user runs Deploy:

- check whether a wallet is connected;
- if no wallet is connected, open a dialog that explains Deploy is on-chain and requires a wallet;
- after the user connects a wallet from that dialog, continue the deploy action;
- encode the selected deploy method according to the Deployer Lyquid ABI;
- submit the request to the configured Deployer Lyquid through the on-chain sender;
- capture transaction, receipt, returned values, events, or other deployment evidence exposed by the selected method;
- surface the Target/Test Lyquid deployment result when the evidence contains a usable Lyquid ID or address.

If the selected method returns no usable deployment evidence, the deployment should not be presented as fully verified. The UI should show the raw receipt or result and explain that no target identifier was found.

## Error Handling

Errors should be grouped by what the user can inspect next:

- RPC unavailable or wrong chain: check `rpcEndpoint` and local devnet status.
- Wallet/provider unavailable at Deploy: connect a wallet from the Deploy prompt or verify provider configuration.
- User rejected signature or transaction: retry the user action.
- Missing or malformed `deployerLyquidId`: check Settings.
- Deployer Lyquid not callable: verify that the configured identifier points to a deployed Deployer Lyquid.
- ABI parse failure: fix or re-import the Deployer Lyquid ABI.
- Method mismatch: select methods that still exist in the imported ABI.
- Transport mismatch: select an off-chain method for Build and an on-chain method for Deploy.
- Invalid Target/Test Lyquid package: upload a package with the required deployable materials.
- Deployer call failed or reverted: inspect logs, receipt, and Deployer Lyquid result details.
- No deployment evidence returned: inspect the selected deploy method and Deployer Lyquid return shape.

Raw technical details can remain available in logs, but the primary error message should point to the likely correction.

## Example Target/Test Lyquid

The project should keep a simple Target/Test Lyquid fixture under `examples/` or another clearly named example directory. It should be small enough to inspect and stable enough for automated validation.

The fixture should provide:

- a manifest or equivalent deployable entry point;
- source files needed by the LDK build/deploy surface;
- an ABI or exported interaction description when applicable;
- a short README explaining that it is the target package used by Cloud Deploy tests.

The fixture should not attempt to behave as the Deployer Lyquid.

## Testing

Unit tests should cover:

- settings persistence for `deployerLyquidId`;
- ABI reconciliation for `buildMethod` and `deployMethod`;
- runtime-only behavior of deployment session state;
- request dispatch using the Deployer Lyquid as call target;
- request dispatch requiring off-chain transport for Build and on-chain transport for Deploy;
- Deploy wallet gating: disconnected wallet opens the connect dialog, successful connection continues deployment;
- Target/Test Lyquid package validation;
- error mapping for common setup, ABI, package, and deploy failures.

Integration or manual verification should cover:

- entering a valid Deployer Lyquid ID or address in Settings;
- importing or pasting a valid Deployer Lyquid ABI;
- selecting build and deploy methods from the ABI;
- uploading the Target/Test Lyquid fixture;
- building through the configured Deployer Lyquid;
- reviewing the prepared deployment request;
- connecting a wallet when entering the on-chain Deploy step if needed;
- deploying through the configured Deployer Lyquid;
- observing usable Target/Test Lyquid deployment evidence.

## Migration From Current MVP Shape

The current MVP shape uses `lyquidId` as a persisted setting. That name is ambiguous in a two-Lyquid model because it could mean either the Deployer Lyquid or the Target/Test Lyquid.

The implementation should migrate toward explicit names:

- persisted environment field: `deployerLyquidId`;
- runtime deployment result fields: `targetLyquidId`, `targetAddress`, or similarly scoped names when evidence exists.

Any displayed labels should follow the same distinction:

- Settings: "Deployer Lyquid ID" or "Deployment Environment";
- Review/Deploy result: "Target Lyquid" or "Deployed Target".

## Acceptance Criteria

- Settings clearly configure an existing Deployer Lyquid, not the Target/Test Lyquid.
- The Target/Test Lyquid fixture is treated as upload/build/deploy input, not as global environment configuration.
- Request dispatch cannot accidentally use the Target/Test Lyquid as the call target.
- Build calls the configured Deployer Lyquid through the off-chain sender and does not require wallet connection.
- Deploy gates on wallet connection and calls the configured Deployer Lyquid through the on-chain sender.
- Deployment success displays evidence for the deployed Target/Test Lyquid when available.
- Setup steps for local devnet and Deployer Lyquid deployment remain outside Cloud Deploy product scope.
