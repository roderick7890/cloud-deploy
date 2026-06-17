import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { lyquidTestAbi } from "@/test/test-abi";
import { renderWithProviders } from "@/test/render";
import { parseAbiSource, getMethodOptions } from "@/utils/abi/abi-utils";
import { AbiMethodSelect } from "./abi-method-select";
import { AppHeader } from "./app-header";
import { ConstructorParamsForm } from "./constructor-params-form";
import { PayloadReviewPanel } from "./payload-review-panel";
import { ProgressSteps } from "./progress-steps";
import { ResultSummary } from "./result-summary";
import { SettingsDialog } from "./settings-dialog";

describe("shared components", () => {
  it("shows wallet profile actions when connected", async () => {
    const user = userEvent.setup();
    const onCopyWalletAddress = vi.fn();
    const onDisconnectWallet = vi.fn();

    renderWithProviders(
      <AppHeader
        walletLabel="0x1234...abcd"
        walletAddress="0x123400000000000000000000000000000000abcd"
        onConnectWallet={vi.fn()}
        onCopyWalletAddress={onCopyWalletAddress}
        onDisconnectWallet={onDisconnectWallet}
        onOpenSettings={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "0x1234...abcd" }));
    await user.click(screen.getByRole("menuitem", { name: "Copy" }));
    expect(onCopyWalletAddress).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "0x1234...abcd" }));
    await user.click(screen.getByRole("menuitem", { name: "Logout" }));
    expect(onDisconnectWallet).toHaveBeenCalledTimes(1);
  });

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

  it("saves RPC and Bartender address from settings", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    renderWithProviders(
      <SettingsDialog
        open
        onOpenChange={vi.fn()}
        settings={{ rpcEndpoint: "", bartenderAddress: "", abi: "[]", buildMethod: "", deployMethod: "" }}
        onSave={onSave}
      />
    );

    await user.type(screen.getByLabelText("RPC Endpoint"), "http://localhost:8545");
    await user.type(screen.getByLabelText("Bartender Contract Address"), "0x0000000000000000000000000000000000000001");
    await user.click(screen.getByRole("button", { name: "Save Settings" }));

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        rpcEndpoint: "http://localhost:8545",
        bartenderAddress: "0x0000000000000000000000000000000000000001"
      })
    );
  });

  it("only shows RPC and Bartender controls in settings", () => {
    renderWithProviders(
      <SettingsDialog
        open
        onOpenChange={vi.fn()}
        settings={{ rpcEndpoint: "", bartenderAddress: "", abi: "[]", buildMethod: "", deployMethod: "" }}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByLabelText("RPC Endpoint")).toHaveClass("w-full");
    expect(screen.getByLabelText("Bartender Contract Address")).toHaveClass("w-full");
    expect(screen.queryByLabelText("Lyquid ID")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("ABI")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Build Method")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Deploy Method")).not.toBeInTheDocument();
  });

  it("stretches constructor inputs to their form row width", () => {
    renderWithProviders(<ConstructorParamsForm constructorFields={[{ name: "owner", type: "address" }]} values={{ owner: "" }} onValuesChange={vi.fn()} />);

    expect(screen.getByLabelText("owner")).toHaveClass("w-full");
  });

  it("renders constructor inputs and reports values", async () => {
    const user = userEvent.setup();
    const onValuesChange = vi.fn();
    let values: Record<string, string> = { owner: "" };
    const { rerender } = renderWithProviders(
      <ConstructorParamsForm
        constructorFields={[{ name: "owner", type: "address" }]}
        values={values}
        onValuesChange={(nextValues) => {
          values = nextValues;
          onValuesChange(nextValues);
          rerender(
            <ConstructorParamsForm
              constructorFields={[{ name: "owner", type: "address" }]}
              values={values}
              onValuesChange={(updatedValues) => {
                values = updatedValues;
                onValuesChange(updatedValues);
              }}
            />
          );
        }}
      />
    );

    await user.clear(screen.getByLabelText("owner"));
    await user.type(screen.getByLabelText("owner"), "3");
    expect(onValuesChange).toHaveBeenCalledWith({ owner: "3" });
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

    expect(screen.getByText("0x123456...abcdef")).toBeInTheDocument();
    expect(screen.queryByText("artifactHash")).not.toBeInTheDocument();
  });

  it("keeps long review JSON lines horizontally scrollable", () => {
    const { container } = renderWithProviders(
      <PayloadReviewPanel
        hashes={{ sourceHash: "0x1234567890abcdef" }}
        payload={{ raw: { result: "0x".padEnd(180, "a") } }}
        onCopy={vi.fn()}
        onDownload={vi.fn()}
      />
    );

    expect(container.querySelector('[data-json-scroll-content="true"]')).not.toHaveClass("overflow-x-auto");
    expect(container.querySelector("pre")).toHaveClass("w-max", "min-w-full", "whitespace-pre");
  });

  it("keeps long deploy result JSON lines horizontally scrollable", () => {
    const { container } = renderWithProviders(
      <ResultSummary
        result={{
          status: "submitted",
          raw: {
            jsonrpc: "2.0",
            result: "0x".padEnd(180, "b")
          }
        }}
      />
    );

    expect(container.querySelector('[data-json-scroll-content="true"]')).not.toHaveClass("overflow-x-auto");
    expect(container.querySelector("pre")).toHaveClass("w-max", "min-w-full", "whitespace-pre");
  });

  it("shows deploy transaction details beside a copyable ABI panel", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText }
    });

    renderWithProviders(
      <ResultSummary
        result={{
          status: "submitted",
          transactionHash: "0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318",
          raw: {
            transactionHash: "0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318",
            chainId: 31337,
            contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
            data: "0xabcdef",
            method: "deploy(bytes)",
            deployAbi: {
              type: "function",
              name: "deploy",
              inputs: [{ name: "code", type: "bytes" }]
            },
            transaction: {
              from: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
              to: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
              input: "0xabcdef"
            }
          }
        }}
      />
    );

    expect(screen.getByText("Transaction Details")).toBeInTheDocument();
    expect(screen.getByText("Chain ID")).toBeInTheDocument();
    expect(screen.getByText("31337")).toBeInTheDocument();
    expect(screen.getByText("Calldata")).toBeInTheDocument();
    expect(screen.getAllByText("0xabcdef").length).toBeGreaterThan(0);
    expect(screen.getByText("Contract ABI")).toBeInTheDocument();
    expect(screen.getAllByText(/"name": "deploy"/).length).toBeGreaterThan(0);
    await user.click(screen.getByRole("button", { name: "Copy ABI" }));
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('"name": "deploy"'));
  });

  it("shows transaction lookup progress and check states", () => {
    const transactionHash = "0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318";
    const { rerender } = renderWithProviders(
      <ResultSummary
        result={{
          status: "submitted",
          transactionHash,
          raw: {
            transactionHash,
            transactionLookupPending: true
          }
        }}
      />
    );

    expect(screen.getByLabelText("Transaction lookup pending")).toBeInTheDocument();

    rerender(
      <ResultSummary
        result={{
          status: "submitted",
          transactionHash,
          raw: {
            transactionHash,
            transaction: {
              hash: transactionHash,
              input: "0xabcdef"
            }
          }
        }}
      />
    );

    expect(screen.getByLabelText("Transaction found")).toBeInTheDocument();
  });

  it("collapses and expands long calldata", async () => {
    const user = userEvent.setup();
    const calldata = "0x".padEnd(260, "a");

    renderWithProviders(
      <ResultSummary
        result={{
          status: "submitted",
          transactionHash: "0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318",
          raw: {
            transactionHash: "0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318",
            data: calldata
          }
        }}
      />
    );

    expect(screen.queryByText(calldata)).not.toBeInTheDocument();
    expect(screen.getByText(`${calldata.slice(0, 160)}...`)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Expand Calldata" }));
    expect(screen.getByText(calldata)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Collapse Calldata" }));
    expect(screen.queryByText(calldata)).not.toBeInTheDocument();
  });
});
