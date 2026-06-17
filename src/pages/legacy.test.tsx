import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSettingsStore } from "@/store/settings-store";
import { renderWithProviders } from "@/test/render";
import LegacyPage from "./legacy";

const sendLyquidDeploymentMock = vi.hoisted(() => vi.fn());
const accountAddressMock = vi.hoisted(() => ({ value: undefined as `0x${string}` | undefined }));
const connectMock = vi.hoisted(() => vi.fn());

const contractAbi = [{ type: "function", name: "increment", inputs: [] }];
const manifest = {
  config: { digest: `sha256:${"2".repeat(64)}` },
  layers: [
    { annotations: { assetType: "lyquid" }, digest: `sha256:${"3".repeat(64)}` },
    { annotations: { assetType: "evm-deployment-bytecode" }, digest: `sha256:${"4".repeat(64)}` }
  ]
};

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

async function uploadAndSelectArtifact() {
  const user = userEvent.setup();

  renderWithProviders(<LegacyPage />);
  fireEvent.change(screen.getByLabelText("Repository"), { target: { value: "lyquids/local" } });
  fireEvent.change(screen.getByLabelText("Reference"), { target: { value: "latest" } });
  await user.click(screen.getByRole("button", { name: "Load Artifact" }));
  await screen.findByDisplayValue(/evm-deployment-bytecode/);

  return user;
}

describe("LegacyPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    sendLyquidDeploymentMock.mockReset();
    connectMock.mockReset();
    accountAddressMock.value = undefined;
    Object.defineProperty(window, "ethereum", {
      configurable: true,
      value: { request: vi.fn().mockResolvedValue("0x0") }
    });
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);

      if (url.endsWith("/v2/lyquids/local/manifests/latest")) {
        return new Response(JSON.stringify(manifest), {
          status: 200,
          headers: {
            "content-type": "application/vnd.oci.image.manifest.v1+json",
            "docker-content-digest": `sha256:${"1".repeat(64)}`
          }
        });
      }

      if (url.endsWith(`/v2/lyquids/local/blobs/sha256:${"2".repeat(64)}`)) {
        return new Response(JSON.stringify({ name: "demo", abi_str: "string greeting", os_version: "0.0", contractAbi }), { status: 200 });
      }

      if (url.endsWith(`/v2/lyquids/local/blobs/sha256:${"4".repeat(64)}`)) {
        return new Response(new Uint8Array([0x60, 0x01]), { status: 200 });
      }

      throw new Error(`Unexpected fetch ${url}`);
    });
    useSettingsStore.setState(useSettingsStore.getInitialState(), true);
    useSettingsStore.getState().saveSettings({
      rpcEndpoint: "http://localhost:8545",
      bartenderAddress: "0x0000000000000000000000000000000000000001",
      abi: "[]",
      buildMethod: "",
      deployMethod: ""
    });
  });

  it("uses the legacy layout with OCI artifact loading and no build/source-only actions", async () => {
    await uploadAndSelectArtifact();

    expect(screen.getByLabelText("RPC Endpoint")).toHaveValue("http://localhost:8545");
    expect((screen.getByLabelText("Manifest JSON") as HTMLTextAreaElement).value).toContain("evm-deployment-bytecode");
    expect((screen.getByLabelText("Metadata JSON") as HTMLTextAreaElement).value).toContain("abi_str");
    expect(screen.getByLabelText("Deployment Bytecode")).toHaveValue("0x6001");
    expect(screen.queryByRole("button", { name: "Artifact JSON only" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Source only" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Build" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deploy" })).toBeEnabled();
    expect(screen.getByLabelText("greeting")).toBeInTheDocument();
  });

  it("asks a disconnected wallet to connect without opening the review step", async () => {
    const user = await uploadAndSelectArtifact();
    await user.type(screen.getByLabelText("greeting"), "hello");

    await user.click(screen.getByRole("button", { name: "Deploy" }));

    expect(connectMock).toHaveBeenCalled();
    expect(screen.queryByText("Deployment Data")).not.toBeInTheDocument();
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
          updateLyquidId: undefined,
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

  it("passes the optional update Lyquid ID to deployment", async () => {
    accountAddressMock.value = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    sendLyquidDeploymentMock.mockResolvedValue({
      transactionHash: "0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318",
      contractAddress: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788",
      lyquidId: "Lyquid-demo",
      status: "success",
      receipt: { transactionHash: "0x8d829216d0bb9e030e2f49f861733855b9cd5ca9709294287419a8787199b318", status: "0x1", contractAddress: "0x610178dA211FEF7D417bC0e6FeD39F05609AD788" }
    });
    const user = await uploadAndSelectArtifact();

    await user.type(screen.getByLabelText("Update to (optional)"), "Lyquid-ss7x5edzcxjszfykf3edlyl44etxn256htzqa");
    await user.click(screen.getByRole("button", { name: "Deploy" }));

    await waitFor(() => {
      expect(sendLyquidDeploymentMock).toHaveBeenCalledWith(
        expect.objectContaining({
          updateLyquidId: "Lyquid-ss7x5edzcxjszfykf3edlyl44etxn256htzqa"
        })
      );
    });
  });
});
