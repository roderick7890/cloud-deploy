# Demo Lyquid

This bundled Lyquid project is a recording fixture for the Cloud Deploy MVP.

It is derived from the `ldk-lyquid-create` minimal template assets because `cargo generate` is not installed on this machine. The source shape matches the canonical minimal Lyquid project contract closely enough for the frontend upload/build/review/deploy recording path.

## Cloud Deploy Demo Settings

- RPC Endpoint: `http://127.0.0.1:10087/api`
- ABI: copy from `examples/demo-lyquid/cloud-deploy-demo.abi.json`
- Build Method: `compileProject(bytes32)`
- Deploy Method: `publishProject(string)`
- Constructor value: `Hello Cloud Deploy`

## Recording Flow

1. Run `npm run demo:zip`.
2. Run `npm run dev -- --host 127.0.0.1`.
3. Open `http://127.0.0.1:5173/`.
4. Open Settings and paste the demo values above.
5. Upload `.tmp/demo-lyquid.zip`.
6. Continue to Build, enter `Hello Cloud Deploy`, and click Build.
7. Review the generated hashes and JSON payload.
8. Click Deploy.

To show the update confirmation dialog, set `Lyquid ID` to a non-empty value such as `lyquid-demo-recording` before Step 8.

The current frontend MVP encodes ABI-selected requests and displays the result payload for recording. It does not yet submit a real chain transaction.
