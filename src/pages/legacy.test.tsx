import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { encodeFunctionResult } from "viem";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSettingsStore } from "@/store/settings-store";
import { useDeploySessionStore } from "@/store/deploy-session-store";
import { renderWithProviders } from "@/test/render";
import LegacyPage from "./legacy";

const dispatchSelectedMethodMock = vi.hoisted(() => vi.fn());
const fetchRpcTransactionResponseMock = vi.hoisted(() => vi.fn());
const accountAddressMock = vi.hoisted(() => ({ value: undefined as `0x${string}` | undefined }));
const connectMock = vi.hoisted(() => vi.fn());

const contractAbi = [{ type: "function", name: "increment", inputs: [] }];
const legacyTestAbi = [
  {
    type: "function",
    name: "compileProject",
    stateMutability: "nonpayable",
    inputs: [{ name: "source", type: "bytes", internalType: "bytes" }],
    outputs: [
      { name: "payload", type: "bytes", internalType: "bytes" },
      { name: "contractAbi", type: "string", internalType: "string" }
    ]
  },
  {
    type: "function",
    name: "publishProject",
    stateMutability: "payable",
    inputs: [
      { name: "payload", type: "bytes", internalType: "bytes" },
      { name: "contractAbi", type: "string", internalType: "string" }
    ],
    outputs: [{ name: "lyquidId", type: "string", internalType: "string" }]
  }
] as const;

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: accountAddressMock.value }),
  useConnect: () => ({ connect: connectMock }),
  useDisconnect: () => ({ disconnect: vi.fn() })
}));

vi.mock("wagmi/connectors", () => ({
  injected: () => ({ id: "injected" })
}));

vi.mock("@/utils/request/request-dispatcher", () => ({
  dispatchSelectedMethod: dispatchSelectedMethodMock
}));

vi.mock("@/utils/request/rpc-transaction-client", () => ({
  fetchRpcTransactionResponse: fetchRpcTransactionResponseMock
}));

function folderFile(contents: string, name: string, path: string) {
  const file = new File([contents], name);
  Object.defineProperty(file, "webkitRelativePath", {
    value: path
  });
  return file;
}

async function uploadAndSelectTarget() {
  const user = userEvent.setup();

  renderWithProviders(<LegacyPage />);
  await user.upload(screen.getByLabelText("Project folder"), [
    folderFile('[package]\nname = "demo"\n', "Cargo.toml", "demo/Cargo.toml"),
    folderFile("pub fn run() {}", "lib.rs", "demo/src/lib.rs")
  ]);
  await user.click(await screen.findByRole("button", { name: "Select demo/Cargo.toml" }));

  return user;
}

function buildResultData() {
  return encodeFunctionResult({
    abi: legacyTestAbi,
    functionName: "compileProject",
    result: ["0x1234", JSON.stringify(contractAbi)]
  });
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((promiseResolve, promiseReject) => {
    resolve = promiseResolve;
    reject = promiseReject;
  });

  return { promise, resolve, reject };
}

describe("LegacyPage", () => {
  beforeEach(() => {
    dispatchSelectedMethodMock.mockReset();
    fetchRpcTransactionResponseMock.mockReset();
    connectMock.mockReset();
    accountAddressMock.value = undefined;
    Object.defineProperty(window, "ethereum", {
      configurable: true,
      value: { request: vi.fn().mockResolvedValue("0x0") }
    });
    useDeploySessionStore.setState(useDeploySessionStore.getInitialState(), true);
    useSettingsStore.setState(useSettingsStore.getInitialState(), true);
    useSettingsStore.getState().saveSettings({
      rpcEndpoint: "http://localhost:8545",
      lyquidId: "",
      abi: JSON.stringify(legacyTestAbi),
      buildMethod: "compileProject(bytes)",
      deployMethod: "publishProject(bytes,string)"
    });
  });

  it("runs build from upload and shows build result with contract ABI only", async () => {
    const user = await uploadAndSelectTarget();
    dispatchSelectedMethodMock.mockResolvedValueOnce(buildResultData());

    await user.click(screen.getByRole("button", { name: "Build" }));

    expect(await screen.findByText("Build Result")).toBeInTheDocument();
    expect(screen.getByText("Deploy Result")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Connect Wallet" })).toHaveLength(2);
    expect(screen.getByLabelText("Contract ABI")).toHaveValue(JSON.stringify(contractAbi, null, 2));
    expect(dispatchSelectedMethodMock).toHaveBeenCalledTimes(1);
    expect(dispatchSelectedMethodMock.mock.calls[0][0]).toMatchObject({ selectedMethod: "compileProject(bytes)" });
  });

  it("shows build loading in preview while build is pending", async () => {
    const user = await uploadAndSelectTarget();
    const buildDeferred = deferred<string>();
    dispatchSelectedMethodMock.mockReturnValueOnce(buildDeferred.promise);

    await user.click(screen.getByRole("button", { name: "Build" }));

    expect(await screen.findByText("Build Result")).toBeInTheDocument();
    expect(screen.getByText("Building...")).toBeInTheDocument();
    expect(screen.getByText("Deploy Result")).toBeInTheDocument();

    buildDeferred.resolve(buildResultData());
    expect(await screen.findByLabelText("Contract ABI")).toHaveValue(JSON.stringify(contractAbi, null, 2));
  });

  it("returns from review to upload with a back button", async () => {
    const user = await uploadAndSelectTarget();
    dispatchSelectedMethodMock.mockResolvedValueOnce(buildResultData());

    await user.click(screen.getByRole("button", { name: "Build" }));
    expect(await screen.findByText("Build Result")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(screen.getByLabelText("Project folder")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Build" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deploy" })).toBeInTheDocument();
  });

  it("shows a wallet connection action in deploy result when the wallet is disconnected", async () => {
    const user = await uploadAndSelectTarget();

    await user.click(screen.getByRole("button", { name: "Deploy" }));

    expect(screen.getByText("Deploy Result")).toBeInTheDocument();
    expect(screen.getByText("Connect wallet to deploy")).toBeInTheDocument();
    expect(dispatchSelectedMethodMock).not.toHaveBeenCalled();

    const connectButtons = screen.getAllByRole("button", { name: "Connect Wallet" });
    await user.click(connectButtons[connectButtons.length - 1]);

    expect(connectMock).toHaveBeenCalledTimes(1);
  });

  it("enables build and deploy after selecting a TOML target even when ABI settings still need attention", async () => {
    useSettingsStore.setState(useSettingsStore.getInitialState(), true);

    await uploadAndSelectTarget();

    expect(screen.getByRole("button", { name: "Build" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Deploy" })).toBeEnabled();
  });

  it("deploys by building first, then shows build result, transaction JSON, and contract ABI", async () => {
    const transactionHash = "0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318";
    accountAddressMock.value = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const user = await uploadAndSelectTarget();
    dispatchSelectedMethodMock
      .mockResolvedValueOnce(buildResultData())
      .mockResolvedValueOnce({ transactionHash, status: "submitted" });
    fetchRpcTransactionResponseMock.mockResolvedValueOnce({
      jsonrpc: "2.0",
      id: "transaction",
      result: {
        hash: transactionHash,
        from: accountAddressMock.value,
        input: "0xabcdef"
      }
    });

    await user.click(screen.getByRole("button", { name: "Deploy" }));

    await waitFor(() => {
      expect(dispatchSelectedMethodMock).toHaveBeenCalledTimes(2);
    });
    expect(dispatchSelectedMethodMock.mock.calls[0][0]).toMatchObject({ selectedMethod: "compileProject(bytes)" });
    expect(dispatchSelectedMethodMock.mock.calls[1][0]).toMatchObject({ selectedMethod: "publishProject(bytes,string)" });
    expect(fetchRpcTransactionResponseMock).toHaveBeenCalledWith({
      rpcEndpoint: "http://localhost:8545",
      transactionHash,
      offChainFetch: expect.any(Function)
    });
    expect(await screen.findByText("Deploy Result")).toBeInTheDocument();
    expect(screen.getByText(transactionHash)).toBeInTheDocument();
    expect((screen.getByLabelText("Deploy transaction JSON") as HTMLTextAreaElement).value).toContain('"jsonrpc": "2.0"');
    expect((screen.getByLabelText("Deploy transaction JSON") as HTMLTextAreaElement).value).toContain('"input": "0xabcdef"');
    expect(screen.getByLabelText("Contract ABI")).toHaveValue(JSON.stringify(contractAbi, null, 2));
  });

  it("shows deploy loading in preview while deploy is pending", async () => {
    accountAddressMock.value = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const user = await uploadAndSelectTarget();
    const transactionHash = "0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318";
    const deployDeferred = deferred<{ transactionHash: string; status: string }>();
    dispatchSelectedMethodMock
      .mockResolvedValueOnce(buildResultData())
      .mockReturnValueOnce(deployDeferred.promise);

    await user.click(screen.getByRole("button", { name: "Build" }));
    expect(await screen.findByRole("button", { name: "Deploy" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Deploy" }));

    expect(screen.getByText("Deploying...")).toBeInTheDocument();

    deployDeferred.resolve({
      transactionHash,
      status: "submitted"
    });
    expect(await screen.findByText(transactionHash)).toBeInTheDocument();
  });

  it("keeps the deploy review debuggable when transaction lookup fails after txHash is returned", async () => {
    const transactionHash = "0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318";
    accountAddressMock.value = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    const user = await uploadAndSelectTarget();
    dispatchSelectedMethodMock
      .mockResolvedValueOnce(buildResultData())
      .mockResolvedValueOnce({ transactionHash, status: "submitted" });
    fetchRpcTransactionResponseMock.mockRejectedValueOnce(new Error("transaction not indexed"));

    await user.click(screen.getByRole("button", { name: "Deploy" }));

    expect(await screen.findByText("Deploy Result")).toBeInTheDocument();
    expect(screen.getByText(transactionHash)).toBeInTheDocument();
    expect((screen.getByLabelText("Deploy transaction JSON") as HTMLTextAreaElement).value).toContain("transaction not indexed");
    expect((screen.getByLabelText("Deploy transaction JSON") as HTMLTextAreaElement).value).toContain('"transactionHash"');
  });
});
