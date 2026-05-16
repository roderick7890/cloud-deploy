# Lyquid Deployer

This example is the deploy-capable Lyquid for the Cloud Deploy frontend.

## Methods

- `exportAbi()` is an off-chain `instance` method that returns the frontend-importable ABI JSON.
- `build(bytes project, bytes constructorInput, string projectName)` is an off-chain `instance` method. In this example it creates deterministic deploy code bytes from the uploaded project payload, constructor input, and project name, then returns `code`, `sourceHash`, `artifactHash`, and `targetAbi`.
- `deploy(bytes code, bytes constructorInput, bytes32 sourceHash, bytes32 artifactHash, string targetAbi, string repoHint)` is an on-chain `network` method. It increments `deployed_count`, derives a `LyquidID`, records deployment evidence, and returns the `LyquidID`.
- `deployedCount()`, `latestDeploymentFor(address)`, and `getDeployment(uint64)` expose deployment state.

## Frontend Flow

1. Import `cloud-deploy-lyquid.abi.json` into Cloud Deploy.
2. Select `build(bytes,bytes,string)` as the build method.
3. Select `deploy(bytes,bytes,bytes32,bytes32,string,string)` as the deploy method.
4. Upload a project archive, a single `.rs`, or prebuilt bytes. A production off-chain sender can replace the example `build` body with real `cargo build` execution and keep the same ABI.
5. Review the returned `code`, hashes, and ABI, then call `deploy` through the wallet.

The Lyquid runtime does not expose a host API for running Cargo inside the contract WASM. Real Rust compilation should happen in the off-chain sender or node-side build service, while the on-chain `deploy` method records and counts the deployment result.
