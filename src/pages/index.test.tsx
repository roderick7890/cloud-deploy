import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { useSettingsStore } from "@/store/settings-store";
import { useWorkbenchStore } from "@/store/workbench-store";
import HomePage from "./index";

const fetchRpcTransactionMock = vi.hoisted(() => vi.fn());
const sendLyquidDeploymentMock = vi.hoisted(() => vi.fn());
const accountAddressMock = vi.hoisted(() => ({ value: undefined as `0x${string}` | undefined }));
const uploadLabel = "Drop a build artifact folder here or choose one.";
const artifactDescriptor = JSON.stringify({
  name: "counter",
  deploymentBytecode: "0x60016002",
  imageHash: `0x${"1".repeat(64)}`,
  repoHint: "registry.local/counter:latest",
  abiStr: "uint256 initialValue"
});

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: accountAddressMock.value }),
  useConnect: () => ({ connect: vi.fn() }),
  useDisconnect: () => ({ disconnect: vi.fn() })
}));

vi.mock("wagmi/connectors", () => ({
  injected: () => ({ id: "injected" })
}));

vi.mock("@/utils/request/rpc-transaction-client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/utils/request/rpc-transaction-client")>()),
  fetchRpcTransaction: fetchRpcTransactionMock
}));

vi.mock("@/utils/request/lyquid-deployment-sender", () => ({
  sendLyquidDeployment: sendLyquidDeploymentMock
}));

describe("HomePage", () => {
  function folderFile(contents: string, name: string, path: string) {
    const file = new File([contents], name);
    Object.defineProperty(file, "webkitRelativePath", {
      value: path
    });
    return file;
  }

  async function uploadArtifact(user: ReturnType<typeof userEvent.setup>) {
    await user.upload(screen.getByLabelText(uploadLabel), [
      folderFile(artifactDescriptor, "deploy.json", "demo/deploy.json"),
      folderFile("wasm bytes", "counter.wasm", "demo/counter.wasm")
    ]);
  }

  beforeEach(() => {
    fetchRpcTransactionMock.mockReset();
    sendLyquidDeploymentMock.mockReset();
    accountAddressMock.value = undefined;
    Object.defineProperty(window, "ethereum", {
      configurable: true,
      value: { request: vi.fn().mockResolvedValue("0x0") }
    });
    useWorkbenchStore.setState(useWorkbenchStore.getInitialState(), true);
    useSettingsStore.setState(useSettingsStore.getInitialState(), true);
    useSettingsStore.getState().saveSettings({
      rpcEndpoint: "http://localhost:8545",
      bartenderAddress: "0x0000000000000000000000000000000000000001",
      abi: "[]",
      buildMethod: "",
      deployMethod: ""
    });
  });

  it("renders artifact upload as the first step", () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText("Cloud Deploy")).toBeInTheDocument();
    expect(screen.getByLabelText(uploadLabel)).toBeInTheDocument();
    expect(screen.queryByText("Upload")).not.toBeInTheDocument();
  });

  it("shows deploy without a separate prepare action after selecting an artifact descriptor", async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);
    await uploadArtifact(user);

    expect(await screen.findByLabelText("initialValue")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Prepare" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deploy" })).toBeInTheDocument();
  });

  it("opens the artifact descriptor content when selecting it", async () => {
    const user = userEvent.setup();

    renderWithProviders(<HomePage />);
    await uploadArtifact(user);
    await user.click(await screen.findByRole("button", { name: "Open demo/deploy.json" }));

    expect(screen.getByRole("tab", { name: "deploy.json" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByDisplayValue(/deploymentBytecode/)).toHaveAttribute("readonly");
  });

  it("deploys by sending a wallet-signed Lyquid create transaction", async () => {
    const user = userEvent.setup();
    const transactionHash = "0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318";
    accountAddressMock.value = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    sendLyquidDeploymentMock.mockResolvedValue({
      transactionHash,
      contractAddress: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
      lyquidId: "Lyquid-counter",
      status: "success",
      receipt: { transactionHash, status: "0x1", contractAddress: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788" },
      submittedTransaction: { to: null, calldata: "0x60016002", bartender: "0x0000000000000000000000000000000000000001" }
    });

    renderWithProviders(<HomePage />);
    await uploadArtifact(user);
    await user.type(await screen.findByLabelText("initialValue"), "7");
    await user.click(screen.getByRole("button", { name: "Deploy" }));

    await waitFor(() => {
      expect(sendLyquidDeploymentMock).toHaveBeenCalledWith(
        expect.objectContaining({
          bartenderAddress: "0x0000000000000000000000000000000000000001",
          constructorValues: { initialValue: "7" },
          context: expect.objectContaining({
            rpcEndpoint: "http://localhost:8545",
            accountAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
          })
        })
      );
    });
    expect(await screen.findByText(/Lyquid-counter/)).toBeInTheDocument();
  });

  it("opens deploy history with the original deploy run title shape", async () => {
    const transactionHash = "0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318";
    fetchRpcTransactionMock.mockResolvedValue({ hash: transactionHash, input: "0xabcdef" });
    useWorkbenchStore.getState().addDeployHistory({
      id: "history-1",
      txHash: transactionHash,
      timestamp: 1778916000000,
      targetFile: "demo/deploy.json",
      status: "success",
      env: {
        rpcEndpoint: "http://localhost:8545",
        artifactName: "counter"
      }
    });
    const user = userEvent.setup();

    renderWithProviders(<HomePage />);
    await user.click(screen.getByRole("button", { name: /Open deploy history/ }));

    expect(await screen.findByRole("tab", { name: "deploy_deploy.json_1778916000000" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "history_deploy.json_1778916000000" })).not.toBeInTheDocument();
  });
});
