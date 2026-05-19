import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { DeployStep } from "./deploy-step";
import { ReviewStep } from "./review-step";

describe("ReviewStep and DeployStep", () => {
  it("renders review payload actions", () => {
    renderWithProviders(
      <ReviewStep
        buildResult={{ hashes: { sourceHash: "0x1234567890abcdef" }, logs: [], payload: { ok: true }, raw: { ok: true } }}
        deployResult={null}
        contractAbi={[{ type: "function", name: "increment", inputs: [] }]}
        isWalletConnected
        onCopyBuild={vi.fn()}
        onDownloadBuild={vi.fn()}
        onCopyAbi={vi.fn()}
        onConnectWallet={vi.fn()}
        onDeploy={vi.fn()}
      />
    );

    expect(screen.getByText("Build Result")).toBeInTheDocument();
    expect(screen.getByText("Deploy Result")).toBeInTheDocument();
    expect(screen.getByText("Copy JSON")).toBeInTheDocument();
    expect(screen.getByText("Download JSON")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deploy" })).toBeInTheDocument();
    expect((screen.getByLabelText("Contract ABI") as HTMLTextAreaElement).value).toContain('"name": "increment"');
  });

  it("renders build and deploy loading states in review", () => {
    renderWithProviders(
      <ReviewStep
        buildResult={null}
        deployResult={null}
        contractAbi={null}
        isBuilding
        isDeploying
        isWalletConnected
        onCopyBuild={vi.fn()}
        onDownloadBuild={vi.fn()}
        onCopyAbi={vi.fn()}
        onConnectWallet={vi.fn()}
        onDeploy={vi.fn()}
      />
    );

    expect(screen.getByText("Building...")).toBeInTheDocument();
    expect(screen.getByText("Deploying...")).toBeInTheDocument();
  });

  it("renders connect wallet in the deploy result card when disconnected", async () => {
    const user = userEvent.setup();
    const onConnectWallet = vi.fn();
    renderWithProviders(
      <ReviewStep
        buildResult={{ hashes: { sourceHash: "0x1234567890abcdef" }, logs: [], payload: { ok: true }, raw: { ok: true } }}
        deployResult={null}
        contractAbi={null}
        isWalletConnected={false}
        onCopyBuild={vi.fn()}
        onDownloadBuild={vi.fn()}
        onCopyAbi={vi.fn()}
        onConnectWallet={onConnectWallet}
        onDeploy={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Connect Wallet" }));

    expect(onConnectWallet).toHaveBeenCalledOnce();
  });

  it("renders a back action on the review step", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProviders(
      <ReviewStep
        buildResult={{ hashes: { sourceHash: "0x1234567890abcdef" }, logs: [], payload: { ok: true }, raw: { ok: true } }}
        deployResult={null}
        contractAbi={[{ type: "function", name: "increment", inputs: [] }]}
        isWalletConnected
        onBack={onBack}
        onCopyBuild={vi.fn()}
        onDownloadBuild={vi.fn()}
        onCopyAbi={vi.fn()}
        onConnectWallet={vi.fn()}
        onDeploy={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(onBack).toHaveBeenCalledOnce();
  });

  it("deploys normally when a Lyquid ID is set", async () => {
    const user = userEvent.setup();
    const onDeploy = vi.fn();
    renderWithProviders(<DeployStep isWalletConnected result={null} onDeploy={onDeploy} onConnectWallet={vi.fn()} error={null} />);

    await user.click(screen.getByRole("button", { name: "Deploy" }));

    expect(screen.queryByText("Deploy as update to this Lyquid?")).not.toBeInTheDocument();
    expect(onDeploy).toHaveBeenCalledTimes(1);
  });

  it("asks the user to connect a wallet before deploying", async () => {
    const user = userEvent.setup();
    const onDeploy = vi.fn();
    const onConnectWallet = vi.fn();
    renderWithProviders(<DeployStep isWalletConnected={false} result={null} onDeploy={onDeploy} onConnectWallet={onConnectWallet} error={null} />);

    await user.click(screen.getByRole("button", { name: "Deploy" }));
    expect(screen.getByText("Connect wallet to deploy")).toBeInTheDocument();
    expect(onDeploy).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Connect Wallet" }));
    expect(onConnectWallet).toHaveBeenCalledTimes(1);
  });

  it("renders a back action on the deploy step", async () => {
    const user = userEvent.setup();
    const onBack = vi.fn();
    renderWithProviders(<DeployStep isWalletConnected result={null} onBack={onBack} onDeploy={vi.fn()} onConnectWallet={vi.fn()} error={null} />);

    await user.click(screen.getByRole("button", { name: "Back" }));

    expect(onBack).toHaveBeenCalledOnce();
  });
});
