# Compiler Workbench UI Design

## Goal

Replace the current four-step wizard with a lighter compiler-style deploy workbench. The new UI should keep the existing build and deploy logic, but make the workflow feel like selecting a build target, running actions, and reading output tabs.

## Selected Approach

Use a new workbench-oriented page composition and reuse the existing parsing, build, deploy, wallet, and RPC utilities. Do not keep the wizard steps as the main interaction model.

This keeps the already verified deployment path intact while removing the `Upload -> Build -> Review -> Deploy` navigation. The workbench owns UI state such as selected TOML, open tabs, split pane sizes, and deploy history. Existing request utilities continue to own RPC, ABI encoding, chain detection, wallet sending, and transaction lookup.

## Layout

The app remains a single-screen deploy tool with the existing header for settings and wallet profile actions.

The main body has four resizable areas:

- Left top: upload controls and resource tree.
- Left bottom: recent deploy history.
- Right top: closable tabs for file details, run output, and history output.
- Right bottom: action deck containing Build and Deploy cards.

The vertical split between left and right is resizable. The left top/bottom split is resizable. The right top/bottom split is resizable. Resize ratios are persisted as UI preferences.

The old progress navigation is removed. Workflow state appears through selected target state, action loading states, output tabs, and deploy history.

## Upload And Resource Tree

The upload area supports:

- Clicking to select a folder.
- Dragging in a folder.

Folder uploads use browser relative paths. Zip uploads are not supported.

Parsing success produces a current-session resource tree, TOML list, file metadata, and selectable build targets. Parsing failure opens a dialog with the failure reason. Failure cases include unreadable input, empty folder, no TOML targets, or no usable files.

The resource tree defaults to showing the full uploaded structure. A `Toml only` switch filters the tree to paths containing TOML files.

No build target is selected automatically. TOML files have a single-select control in the tree. Selecting a TOML makes it the active build/deploy target. Selection is not represented by row background color.

Clicking a TOML opens or focuses the `File Detail` tab and shows readonly TOML content. Clicking a non-TOML file opens or focuses `File Detail` and shows path, size, and a not-previewable message. Non-TOML files cannot become build targets.

## Tabs

The right top area is a compiler-style tab panel. Tabs are current-session state and are not restored after refresh.

Supported tabs:

- `File Detail`: opened or focused when the user clicks a file. Clicking another file updates the same tab.
- Build run tab: created for each Build click.
- Deploy run tab: created for each Deploy click.
- Deploy history tab: created or focused when the user opens a history record.

All tabs can be closed. Closing a tab removes it from the current session only. Closing a history tab does not delete the history record.

Run tab names use `{action}_{fileName}_{timestamp}`, for example `build_Cargo.toml_1778916001366`.

Output tabs use raw JSON as the primary content for the first implementation pass. More structured cards can be added later after the flow is stable.

## Build Output

Clicking Build creates a build run tab and starts the build request.

The build tab shows:

- Loading state while the request is in flight.
- Target file name and timestamp.
- Build raw JSON after success.
- Build error reason after failure.
- The ABI item for the actual build method.
- Copy actions for raw output and ABI item.

The build tab stores environment details under a single `env` object in its tab data, but the UI shows that environment only in a compact tooltip or popover. It must not be rendered as a large standalone card.

## Deploy Output

Clicking Deploy creates a deploy run tab.

If the selected TOML does not have a valid current-session build payload, Deploy first runs Build inside the deploy tab. If that build fails, Deploy stops and writes the full build error into the deploy tab. It must not send a deploy transaction after a failed automatic build.

If the selected TOML already has a valid current-session build payload, Deploy reuses it. Build payloads are scoped to the selected TOML; switching targets invalidates reuse across targets.

The deploy tab shows:

- Build loading/result when an automatic build is needed.
- Deploy loading while transaction submission is in flight.
- Deploy raw JSON after submission.
- txHash as soon as it is available.
- Transaction lookup loading beside txHash while `eth_getTransactionByHash` returns null or is still pending.
- Check state beside txHash after transaction details are found.
- Transaction raw JSON when fetched from RPC.
- Error reason for wallet, signing, RPC, chain switching, contract lookup, automatic build, or transaction lookup failures.
- The ABI item for the actual deploy method.
- Copy actions for deploy raw output, transaction raw output, and ABI item.

Environment details use the same compact `env` popover/tooltip approach as Build.

## Environment Snapshot

Build, Deploy, and history tab data may carry an `env` object to avoid repeated naming ambiguity. It can include:

- `rpcEndpoint`
- `lyquidId`
- `walletAddress`
- `chainId`
- `contractAddress`
- `buildMethod`
- `deployMethod`
- `buildMethodAbiItem`
- `deployMethodAbiItem`

The UI should not show this as a prominent card. It is supporting context shown through a small popover or tooltip.

Only method ABI items are stored for history and run context. The full target ABI is not stored in deploy history.

## Action Deck

The right bottom action deck is empty or shows a concise target-selection hint until a TOML is selected.

After a TOML is selected, the deck shows two large action cards:

- Build
- Deploy

Build and Deploy can both show loading. Deploy must also handle the automatic-build sub-state.

## Deploy History

The left bottom area shows the latest 10 deploy history records. This is the only persisted run-related history.

Deploy history records are created after a deploy transaction hash is produced. A record stores lightweight information only:

- `txHash`
- `timestamp`
- `targetFile`
- Local display `status`
- `env`

Deploy history does not store transaction details, receipt, calldata, transaction raw, or deploy raw. These can be re-fetched from RPC using the stored txHash.

When the user opens a history record, the app creates or focuses a deploy history tab and queries `eth_getTransactionByHash` using the record's `env.rpcEndpoint` and `txHash`. It must not fallback to the current settings RPC. If the historical RPC is unavailable or cannot find the transaction, the tab shows the error and a Retry action that uses the same historical RPC again.

When more than 10 history records exist, the oldest record is removed.

## Persistence

Persisted with Zustand:

- Existing settings.
- Workbench layout split ratios.
- Latest 10 deploy history records.

Current session only:

- Uploaded files.
- Resource tree.
- Selected TOML.
- Open tabs.
- Build payloads.
- Deploy raw results.
- Transaction raw details shown in tabs.
- Loading states.

No IndexedDB is introduced for this design.

## Error Handling

Use a dialog for upload parsing failures because the resource tree cannot be established.

Write action failures into the relevant output tab:

- Build request failure goes into the build tab.
- Deploy automatic build failure goes into the deploy tab and prevents transaction submission.
- Wallet, signing, RPC, chain switching, and deploy contract lookup failures go into the deploy tab.
- Transaction lookup failures go into the deploy or history tab and keep Retry available where applicable.

Error messages should include the concrete reason returned by the failing layer.

## Testing Plan

Cover the behavior with focused component, store, and utility tests:

- Upload parse failures open an error dialog with the failure reason.
- TOML single-selection is required before actions appear.
- `Toml only` filters the resource tree.
- Clicking TOML opens or updates `File Detail`.
- Clicking non-TOML shows metadata and no preview.
- Build creates a new run tab with loading, raw output, ABI item, and copy actions.
- Deploy creates a new run tab.
- Deploy automatically builds when no current target build payload exists.
- Deploy stops if automatic build fails and does not send a transaction.
- Deploy reuses the current target build payload when valid.
- Deploy success writes a lightweight history record.
- History keeps only the latest 10 records.
- Opening history uses the historical `env.rpcEndpoint`, not current settings.
- Transaction lookup shows loading, check, error, and Retry states.
- Split ratios persist across reload.
- Refresh clears uploaded resources and current tabs while preserving settings, split ratios, and deploy history.

## Out Of Scope

- Full workspace persistence.
- IndexedDB storage.
- Persisting uploaded file contents.
- Persisting current-session run tabs.
- Structured summary cards beyond the minimal txHash/loading/check and copy surfaces.
- Editing file contents.
- Previewing non-TOML file contents.
- Automatically changing historical deploy records to use current settings.
