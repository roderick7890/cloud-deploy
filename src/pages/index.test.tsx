import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { encodeFunctionResult } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { useSettingsStore } from "@/store/settings-store";
import { useWorkbenchStore } from "@/store/workbench-store";
import HomePage from "./index";

const fetchRpcTransactionMock = vi.hoisted(() => vi.fn());
const dispatchSelectedMethodMock = vi.hoisted(() => vi.fn());
const accountAddressMock = vi.hoisted(() => ({ value: undefined as `0x${string}` | undefined }));
const pageTestAbi = [
  {
    type: "function",
    name: "compileProject",
    stateMutability: "nonpayable",
    inputs: [{ name: "source", type: "bytes", internalType: "bytes" }],
    outputs: [{ name: "payload", type: "bytes", internalType: "bytes" }]
  },
  {
    type: "function",
    name: "publishProject",
    stateMutability: "payable",
    inputs: [{ name: "payload", type: "bytes", internalType: "bytes" }],
    outputs: [{ name: "lyquidId", type: "string", internalType: "string" }]
  }
] as const;

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: accountAddressMock.value }),
  useConnect: () => ({ connect: vi.fn() }),
  useDisconnect: () => ({ disconnect: vi.fn() })
}));

vi.mock("wagmi/connectors", () => ({
  injected: () => ({ id: "injected" })
}));

vi.mock("@/utils/request/rpc-transaction-client", () => ({
  fetchRpcTransaction: fetchRpcTransactionMock
}));

vi.mock("@/utils/request/request-dispatcher", () => ({
  dispatchSelectedMethod: dispatchSelectedMethodMock
}));

describe("HomePage", () => {
  function folderFile(contents: string, name: string, path: string) {
    const file = new File([contents], name);
    Object.defineProperty(file, "webkitRelativePath", {
      value: path
    });
    return file;
  }

  beforeEach(() => {
    fetchRpcTransactionMock.mockReset();
    dispatchSelectedMethodMock.mockReset();
    accountAddressMock.value = undefined;
    Object.defineProperty(window, "ethereum", {
      configurable: true,
      value: { request: vi.fn().mockResolvedValue("0x0") }
    });
    useWorkbenchStore.setState(useWorkbenchStore.getInitialState(), true);
    useSettingsStore.setState(useSettingsStore.getInitialState(), true);
    useSettingsStore.getState().saveSettings({
      rpcEndpoint: "http://localhost:8545",
      lyquidId: "",
      abi: JSON.stringify(pageTestAbi),
      buildMethod: "compileProject(bytes)",
      deployMethod: "publishProject(bytes)"
    });
  });

  it("renders upload as the first step", () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText("Cloud Deploy")).toBeInTheDocument();
    expect(screen.getByLabelText("Project folder")).toBeInTheDocument();
    expect(screen.queryByText("Upload")).not.toBeInTheDocument();
  });

  it("shows build and deploy actions after explicitly selecting a TOML target", async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);
    await user.upload(screen.getByLabelText("Project folder"), [
      folderFile('[package]\nname = "demo"\n', "Cargo.toml", "demo/Cargo.toml"),
      folderFile("pub fn run() {}", "lib.rs", "demo/src/lib.rs")
    ]);

    expect(await screen.findByText("Select a TOML target to build or deploy.")).toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Use demo/Cargo.toml as deploy target" }));

    expect(screen.getByRole("button", { name: "Build" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deploy" })).toBeInTheDocument();
  });

  it("auto-builds before deploy when no build payload exists for the selected target", async () => {
    const user = userEvent.setup();
    accountAddressMock.value = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const buildRaw = encodeFunctionResult({
      abi: pageTestAbi,
      functionName: "compileProject",
      result: "0x1234"
    });
    dispatchSelectedMethodMock
      .mockResolvedValueOnce(buildRaw)
      .mockResolvedValueOnce({ transactionHash: "0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318", status: "submitted" });

    renderWithProviders(<HomePage />);
    await user.upload(screen.getByLabelText("Project folder"), [
      folderFile('[package]\nname = "demo"\n', "Cargo.toml", "demo/Cargo.toml"),
      folderFile("pub fn run() {}", "lib.rs", "demo/src/lib.rs")
    ]);
    await user.click(await screen.findByRole("radio", { name: "Use demo/Cargo.toml as deploy target" }));
    await user.click(screen.getByRole("button", { name: "Deploy" }));

    await waitFor(() => {
      expect(dispatchSelectedMethodMock).toHaveBeenCalledTimes(2);
    });
    expect(dispatchSelectedMethodMock.mock.calls[0][0]).toMatchObject({ selectedMethod: "compileProject(bytes)" });
    expect(dispatchSelectedMethodMock.mock.calls[1][0]).toMatchObject({ selectedMethod: "publishProject(bytes)" });
    expect(await screen.findByText(/transactionHash/)).toBeInTheDocument();
  });

  it("updates a pending deploy transaction when the configured RPC can return it", async () => {
    const user = userEvent.setup();
    accountAddressMock.value = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const transactionHash = "0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318";
    const buildRaw = encodeFunctionResult({
      abi: pageTestAbi,
      functionName: "compileProject",
      result: "0x1234"
    });
    dispatchSelectedMethodMock.mockResolvedValueOnce(buildRaw).mockResolvedValueOnce({ transactionHash, status: "submitted" });
    fetchRpcTransactionMock.mockResolvedValue({ hash: transactionHash, input: "0xabcdef" });

    renderWithProviders(<HomePage />);
    await user.upload(screen.getByLabelText("Project folder"), [
      folderFile('[package]\nname = "demo"\n', "Cargo.toml", "demo/Cargo.toml"),
      folderFile("pub fn run() {}", "lib.rs", "demo/src/lib.rs")
    ]);
    await user.click(await screen.findByRole("radio", { name: "Use demo/Cargo.toml as deploy target" }));
    await user.click(screen.getByRole("button", { name: "Deploy" }));

    await waitFor(() => {
      expect(fetchRpcTransactionMock).toHaveBeenCalledWith({
        rpcEndpoint: "http://localhost:8545",
        transactionHash,
        offChainFetch: expect.any(Function)
      });
    });
    expect(await screen.findByLabelText("Transaction found")).toBeInTheDocument();
  });
});
