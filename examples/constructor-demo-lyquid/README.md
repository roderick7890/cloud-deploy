# Constructor Demo Lyquid

This example is a small target contract for testing Cloud Deploy constructor input handling.

Constructor arguments:

- `owner: address`
- `initialLabel: string`
- `limit: uint256`

Useful methods:

- `exportAbi()` returns this example's ABI JSON through the off-chain path.
- `getState()` returns `owner`, `label`, `limit`, and `counter`.
- `setLabel(string)` is owner-only.
- `increment(uint256)` increases `counter` until it reaches `limit`.

Import `constructor-demo-lyquid.abi.json` when you want the frontend to render constructor fields before build.
