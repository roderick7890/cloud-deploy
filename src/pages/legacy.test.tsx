import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSettingsStore } from "@/store/settings-store";
import { renderWithProviders } from "@/test/render";
import LegacyPage from "./legacy";

const sendLyquidDeploymentMock = vi.hoisted(() => vi.fn());
const accountAddressMock = vi.hoisted(() => ({ value: undefined as `0x${string}` | undefined }));
const connectMock = vi.hoisted(() => vi.fn());

const contractAbi = [{ type: "function", name: "increment", inputs: [] }];
const artifactDescriptor = JSON.stringify({
  name: "demo",
  deploymentBytecode: "0x6001",
  imageHash: `0x${"1".repeat(64)}`,
  repoHint: "registry.local/demo:latest",
  abiStr: "string greeting",
  contractAbi
});

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: accountAddressMock.value }),
  useConnect: () => ({ connect: connectMock }),
  useDisconnect: () => ({ disconnect: vi.fn() })
}));

vi.mock("wagmi/connectors", () => ({
  injected: () => ({ id: "injected" })
}));

vi.mock("@/utils/request/lyquid-deployment-sender", () => ({
  sendLyquidDeployment: sendLyquidDeploymentMock
}));

function folderFile(contents: string, name: string, path: string) {
  const file = new File([contents], name);
  Object.defineProperty(file, "webkitRelativePath", {
    value: path
  });
  return file;
}

async function uploadAndSelectArtifact() {
  const user = userEvent.setup();

  renderWithProviders(<LegacyPage />);
  await user.upload(screen.getByLabelText("Build artifact folder"), [
    folderFile(artifactDescriptor, "deploy.json", "demo/deploy.json"),
    folderFile("notes", "README.md", "demo/README.md")
  ]);
  await user.click(await screen.findByRole("button", { name: "Select demo/deploy.json" }));

  return user;
}

describe("LegacyPage", () => {
  beforeEach(() => {
    sendLyquidDeploymentMock.mockReset();
    connectMock.mockReset();
    accountAddressMock.value = undefined;
    Object.defineProperty(window, "ethereum", {
      configurable: true,
      value: { request: vi.fn().mockResolvedValue("0x0") }
    });
    useSettingsStore.setState(useSettingsStore.getInitialState(), true);
    useSettingsStore.getState().saveSettings({
      rpcEndpoint: "http://localhost:8545",
      bartenderAddress: "0x0000000000000000000000000000000000000001",
      lyquidId: "",
      abi: "[]",
      buildMethod: "",
      deployMethod: ""
    });
  });

  it("uses the legacy layout with artifact upload and no build/source-only actions", async () => {
    const user = await uploadAndSelectArtifact();

    expect(screen.getByLabelText("Build artifact folder")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Artifact JSON only" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Source only" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Build" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deploy" })).toBeEnabled();
    expect(screen.getByLabelText("greeting")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Artifact JSON only" }));
    expect(screen.queryByText("README.md")).not.toBeInTheDocument();
  });

  it("prepares deployment data before asking a disconnected wallet to connect", async () => {
    const user = await uploadAndSelectArtifact();
    await user.type(screen.getByLabelText("greeting"), "hello");

    await user.click(screen.getByRole("button", { name: "Deploy" }));

    expect(await screen.findByText("Deployment Data")).toBeInTheDocument();
    expect(screen.getByText("Deploy Result")).toBeInTheDocument();
    expect(screen.getByText("Connect wallet to deploy")).toBeInTheDocument();
    expect((screen.getByLabelText("Contract ABI") as HTMLTextAreaElement).value).toContain('"name": "increment"');
    expect(screen.getByText(/calldata/)).toBeInTheDocument();
    expect(sendLyquidDeploymentMock).not.toHaveBeenCalled();
  });

  it("deploys the selected artifact with a wallet-signed contract creation transaction", async () => {
    const transactionHash = "0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318";
    accountAddressMock.value = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    sendLyquidDeploymentMock.mockResolvedValue({
      transactionHash,
      contractAddress: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
      lyquidId: "Lyquid-demo",
      status: "success",
      receipt: { transactionHash, status: "0x1", contractAddress: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788" },
      submittedTransaction: { to: null, calldata: "0x6001", bartender: "0x0000000000000000000000000000000000000001" }
    });
    const user = await uploadAndSelectArtifact();

    await user.type(screen.getByLabelText("greeting"), "hello");
    await user.click(screen.getByRole("button", { name: "Deploy" }));

    await waitFor(() => {
      expect(sendLyquidDeploymentMock).toHaveBeenCalledWith(
        expect.objectContaining({
          bartenderAddress: "0x0000000000000000000000000000000000000001",
          constructorValues: { greeting: "hello" },
          context: expect.objectContaining({
            rpcEndpoint: "http://localhost:8545",
            accountAddress: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
          })
        })
      );
    });
    expect(await screen.findByText(transactionHash)).toBeInTheDocument();
    expect((screen.getByLabelText("Deploy transaction JSON") as HTMLTextAreaElement).value).toContain('"contractAddress"');
  });
});
