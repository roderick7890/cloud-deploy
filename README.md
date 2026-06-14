# Cloud Deploy

Cloud Deploy is a lightweight web tool for wallet-signed Lyquid deployments.

The default workbench expects a build artifact folder, not source code. The user uploads a folder containing a Lyquid deployment artifact descriptor JSON, reviews the generated contract-creation calldata, connects a wallet, signs the deployment transaction, and receives the deployed contract address plus the resolved Lyquid ID when the node endpoint can serve `GetLyquidByAddress`.

Artifact descriptor JSON supports these fields:

```json
{
  "name": "counter",
  "deploymentBytecode": "0x...",
  "imageHash": "0x...",
  "repoHint": "registry.example/counter:latest",
  "abiStr": "uint256 initialValue, string label",
  "deps": [],
  "contractAbi": []
}
```

`imageHash` may also be provided as `imageDigest: "sha256:..."`. Constructor fields come from `abiStr`, `constructorParameters`, or `constructor.inputs`. Settings stores the RPC endpoint and network Bartender contract address.

The project is intentionally small. It is a deployment utility, not a marketplace, registry, provenance system, or general Lyquid management platform.
