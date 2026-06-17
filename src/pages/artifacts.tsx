import { useMemo, useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { ArtifactDeploySurface } from "@/components/artifact-deploy-surface";
import { ArtifactReviewSurface } from "@/components/artifact-review-surface";
import { ArtifactWorkspaceSidebar } from "@/components/artifact-workspace-sidebar";
import { AppSettingsDialog } from "@/components/app-settings-dialog";
import { AppShell } from "@/layout/app-shell";
import { useArtifactWorkspaceStore } from "@/store/artifact-workspace-store";
import { useSettingsStore } from "@/store/settings-store";
import type { ArtifactSource, ArtifactWorkspace } from "@/types/artifact-workspace";
import type { BuildResult, DeployResult, DeployStepId } from "@/types/deploy";
import { buildShakerPushCommand, buildWorkspaceEndpointsFromNodeHost, buildWorkspaceEndpointsFromRpcEndpoint, getInitialArtifactSelection } from "@/utils/artifact-workspace-utils";
import { hashPayload } from "@/utils/hash-utils";
import type { LyquidDeploymentArtifact } from "@/utils/lyquid-deployment-artifact";
import { fetchLyquidDeploymentArtifactFromOci } from "@/utils/oci-deployment-artifact";
import { createBrowserWalletTransactionClient } from "@/utils/request/browser-wallet-client";
import { sendLyquidDeployment } from "@/utils/request/lyquid-deployment-sender";
import { fetchNetworkBartenderInfo } from "@/utils/request/lyquid-info-client";
import { createRequestSenderContext } from "@/utils/request/sdk-transport-client";
import { createDeploymentBuildResult, getErrorMessage, getTransactionHash } from "./artifacts-page-utils";

type BrowserWindowWithWallet = Window & {
  ethereum?: Parameters<typeof createBrowserWalletTransactionClient>[0];
};

export default function ArtifactsPage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isFetchingBartender, setIsFetchingBartender] = useState(false);
  const [isLoadingArtifact, setIsLoadingArtifact] = useState(false);
  const [currentStep, setCurrentStep] = useState<DeployStepId>("upload");
  const [selectedArtifact, setSelectedArtifact] = useState<LyquidDeploymentArtifact | null>(null);
  const [constructorValues, setConstructorValues] = useState<Record<string, string>>({});
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null);
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);
  const [currentError, setCurrentError] = useState<string | null>(null);
  const { workspaces, selection, setWorkspaces, setSelection } = useArtifactWorkspaceStore();
  const settings = useSettingsStore();
  const account = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const selectedWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === selection.workspaceId) ?? workspaces[0],
    [selection.workspaceId, workspaces]
  );
  const selectedSource = useMemo(
    () => selectedWorkspace?.artifacts.find((artifact) => artifact.id === selection.artifactId) ?? selectedWorkspace?.artifacts[0],
    [selection.artifactId, selectedWorkspace]
  );
  const walletLabel = account.address ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}` : "Connect Wallet";
  const connectWallet = () => connect({ connector: injected() });
  const copyWalletAddress = () => (account.address ? navigator.clipboard.writeText(account.address) : undefined);
  const pushCommand = selectedWorkspace && selectedSource ? buildShakerPushCommand(selectedWorkspace, selectedSource) : "";
  const rpcEndpoint = selectedWorkspace?.rpcEndpoint ?? settings.rpcEndpoint;

  const saveWorkspaceSettings = (values: Partial<Pick<typeof settings, "rpcEndpoint" | "bartenderAddress">>) => {
    settings.saveSettings({
      rpcEndpoint: values.rpcEndpoint ?? settings.rpcEndpoint,
      bartenderAddress: values.bartenderAddress ?? settings.bartenderAddress,
      abi: settings.abi,
      buildMethod: settings.buildMethod,
      deployMethod: settings.deployMethod
    });
  };

  const resetArtifactState = () => {
    setSelectedArtifact(null);
    setConstructorValues({});
    setBuildResult(null);
    setDeployResult(null);
    setCurrentStep("upload");
  };

  const selectSource = (workspace: ArtifactWorkspace, artifact: ArtifactSource) => {
    setSelection({ workspaceId: workspace.id, artifactId: artifact.id });
    saveWorkspaceSettings({ rpcEndpoint: workspace.rpcEndpoint });
    setCurrentError(null);
    resetArtifactState();
  };

  const patchSelectedSource = (patch: Partial<Pick<ArtifactSource, "repository" | "reference">>) => {
    setWorkspaces((current) =>
      current.map((workspace) =>
        workspace.id === selection.workspaceId
          ? {
              ...workspace,
              artifacts: workspace.artifacts.map((artifact) => (artifact.id === selection.artifactId ? { ...artifact, ...patch } : artifact))
            }
          : workspace
      )
    );
    resetArtifactState();
  };

  const patchArtifactReference = (workspaceId: string, artifactId: string, patch: Pick<ArtifactSource, "repository" | "reference">) => {
    setWorkspaces((current) =>
      current.map((workspace) =>
        workspace.id === workspaceId
          ? {
              ...workspace,
              artifacts: workspace.artifacts.map((artifact) => (artifact.id === artifactId ? { ...artifact, ...patch } : artifact))
            }
          : workspace
      )
    );
    resetArtifactState();
  };

  const patchWorkspaceHost = (workspaceId: string, value: string) => {
    const endpoints = buildWorkspaceEndpointsFromNodeHost(value);

    setWorkspaces((current) => current.map((workspace) => (workspace.id === workspaceId ? { ...workspace, ...endpoints } : workspace)));
    if (workspaceId === selectedWorkspace?.id) {
      saveWorkspaceSettings({ rpcEndpoint: endpoints.rpcEndpoint });
      resetArtifactState();
    }
  };

  const patchSelectedRpcEndpoint = (value: string) => {
    const endpoints = buildWorkspaceEndpointsFromRpcEndpoint(value);

    saveWorkspaceSettings({ rpcEndpoint: endpoints.rpcEndpoint });
    if (selectedWorkspace) {
      setWorkspaces((current) => current.map((workspace) => (workspace.id === selectedWorkspace.id ? { ...workspace, ...endpoints } : workspace)));
    }
    resetArtifactState();
  };

  const addArtifact = (workspaceId: string): ArtifactSource | null => {
    const artifact: ArtifactSource = {
      id: `artifact-${Date.now()}`,
      repository: "lyquids/new",
      reference: "latest"
    };
    const workspace = workspaces.find((item) => item.id === workspaceId);

    if (!workspace) {
      return null;
    }

    setWorkspaces((current) =>
      current.map((item) => (item.id === workspaceId ? { ...item, artifacts: [...item.artifacts, artifact] } : item))
    );
    setSelection({ workspaceId, artifactId: artifact.id });
    saveWorkspaceSettings({ rpcEndpoint: workspace.rpcEndpoint });
    resetArtifactState();

    return artifact;
  };

  const addWorkspace = (): ArtifactWorkspace => {
    const endpoints = buildWorkspaceEndpointsFromNodeHost("localhost:10087");
    const artifact: ArtifactSource = {
      id: `artifact-${Date.now()}`,
      repository: "lyquids/new",
      reference: "latest"
    };
    const workspace: ArtifactWorkspace = {
      id: `workspace-${Date.now()}`,
      ...endpoints,
      artifacts: [artifact]
    };

    setWorkspaces((current) => [...current, workspace]);
    setSelection({ workspaceId: workspace.id, artifactId: artifact.id });
    saveWorkspaceSettings({ rpcEndpoint: workspace.rpcEndpoint });
    resetArtifactState();

    return workspace;
  };

  const removeWorkspace = (workspaceId: string) => {
    setWorkspaces((current) => {
      const next = current.filter((workspace) => workspace.id !== workspaceId);
      if (selection.workspaceId === workspaceId) {
        const nextSelection = getInitialArtifactSelection(next);
        setSelection(nextSelection);
        const nextWorkspace = next.find((workspace) => workspace.id === nextSelection.workspaceId);
        if (nextWorkspace) {
          saveWorkspaceSettings({ rpcEndpoint: nextWorkspace.rpcEndpoint });
        }
      }
      return next;
    });
    resetArtifactState();
  };

  const removeArtifact = (workspaceId: string, artifactId: string) => {
    setWorkspaces((current) => {
      const next = current.map((workspace) =>
        workspace.id === workspaceId ? { ...workspace, artifacts: workspace.artifacts.filter((artifact) => artifact.id !== artifactId) } : workspace
      );
      if (selection.workspaceId === workspaceId && selection.artifactId === artifactId) {
        const workspace = next.find((item) => item.id === workspaceId);
        const nextArtifact = workspace?.artifacts[0];
        setSelection(nextArtifact ? { workspaceId, artifactId: nextArtifact.id } : getInitialArtifactSelection(next));
      }
      return next;
    });
    resetArtifactState();
  };

  const prepareDeploymentData = (): BuildResult | null => {
    if (!selectedArtifact) {
      setCurrentError("Load a Lyquid artifact from the selected repository before deploy.");
      return null;
    }

    if (!settings.bartenderAddress) {
      setCurrentError("Enter the network Bartender Address before deploy.");
      return null;
    }

    const result = createDeploymentBuildResult({
      artifact: selectedArtifact,
      bartenderAddress: settings.bartenderAddress,
      constructorValues
    });

    setBuildResult(result);
    return result;
  };

  const handleDeploy = async (updateLyquidId?: string) => {
    setDeployResult(null);
    setCurrentError(null);
    const prepared = buildResult ?? prepareDeploymentData();

    if (!prepared || !selectedArtifact) {
      return;
    }

    if (!account.address) {
      connectWallet();
      return;
    }

    try {
      setIsDeploying(true);
      const offChainFetch = (input: RequestInfo | URL, init?: RequestInit) => fetch(input, init);
      const raw = await sendLyquidDeployment({
        artifact: selectedArtifact,
        bartenderAddress: settings.bartenderAddress,
        updateLyquidId,
        constructorValues,
        context: createRequestSenderContext({
          rpcEndpoint,
          accountAddress: account.address,
          walletClient: createBrowserWalletTransactionClient((window as BrowserWindowWithWallet).ethereum),
          offChainFetch
        })
      });
      const transactionHash = getTransactionHash(raw);
      const signedPayloadHash = await hashPayload(raw);

      setDeployResult({
        transactionHash,
        lyquidId: raw.lyquidId,
        status: raw.status,
        signedPayloadHash,
        raw,
        transactionRaw: raw.receipt,
        contractAbi: selectedArtifact.contractAbi
      });
      setCurrentStep("review");
    } catch (error) {
      setCurrentError(getErrorMessage(error, "Deploy failed."));
    } finally {
      setIsDeploying(false);
    }
  };

  const handleFetchBartender = async () => {
    setCurrentError(null);

    if (!rpcEndpoint) {
      setCurrentError("Enter RPC Endpoint before fetching Bartender Address.");
      return;
    }

    try {
      setIsFetchingBartender(true);
      const context = createRequestSenderContext({
        rpcEndpoint,
        offChainFetch: (input, init) => fetch(input, init)
      });
      const info = await fetchNetworkBartenderInfo({ serviceTransport: context.serviceTransport });

      if (!info) {
        setCurrentError("Node did not return a Bartender Address.");
        return;
      }

      saveWorkspaceSettings({ bartenderAddress: info.contractAddress });
      resetArtifactState();
    } catch (error) {
      setCurrentError(getErrorMessage(error, "Fetch Bartender Address failed."));
    } finally {
      setIsFetchingBartender(false);
    }
  };

  const handleLoadArtifact = async () => {
    if (!selectedSource) {
      return;
    }

    setCurrentError(null);
    setBuildResult(null);
    setDeployResult(null);

    try {
      setIsLoadingArtifact(true);
      const artifact = await fetchLyquidDeploymentArtifactFromOci({
        rpcEndpoint,
        repository: selectedSource.repository,
        reference: selectedSource.reference,
        fetchImpl: (input, init) => fetch(input, init)
      });

      setSelectedArtifact(artifact);
      setConstructorValues({});
      setCurrentStep("upload");
    } catch (error) {
      setSelectedArtifact(null);
      setCurrentError(getErrorMessage(error, "Load artifact failed."));
    } finally {
      setIsLoadingArtifact(false);
    }
  };

  const contractAbi = deployResult?.contractAbi ?? buildResult?.contractAbi ?? selectedArtifact?.contractAbi;

  return (
    <>
      <AppShell
        walletLabel={walletLabel}
        walletAddress={account.address}
        onConnectWallet={connectWallet}
        onCopyWalletAddress={copyWalletAddress}
        onDisconnectWallet={disconnect}
        onOpenSettings={() => setSettingsOpen(true)}
        showProgress={false}
      >
        <div className="flex min-h-0 flex-1">
          <ArtifactWorkspaceSidebar
            workspaces={workspaces}
            selectedWorkspaceId={selectedWorkspace?.id ?? ""}
            selectedArtifactId={selectedSource?.id ?? ""}
            onSelectSource={selectSource}
            onAddWorkspace={addWorkspace}
            onAddArtifact={addArtifact}
            onWorkspaceHostChange={patchWorkspaceHost}
            onRemoveWorkspace={removeWorkspace}
            onArtifactReferenceChange={patchArtifactReference}
            onRemoveArtifact={removeArtifact}
          />

          <section className="min-w-0 flex-1 overflow-auto border-l p-4">
            {currentError ? <p className="mb-4 rounded-md border border-destructive bg-card p-3 text-sm text-destructive">{currentError}</p> : null}
            {currentStep === "review" ? (
              <ArtifactReviewSurface
                buildResult={buildResult}
                deployResult={deployResult}
                contractAbi={contractAbi}
                isDeploying={isDeploying}
                isWalletConnected={Boolean(account.address)}
                currentError={currentError}
                onBack={() => setCurrentStep("upload")}
                onDeploy={() => void handleDeploy()}
                onConnectWallet={connectWallet}
              />
            ) : selectedSource ? (
              <ArtifactDeploySurface
                source={selectedSource}
                rpcEndpoint={rpcEndpoint}
                bartenderAddress={settings.bartenderAddress}
                artifact={selectedArtifact}
                isLoading={isLoadingArtifact}
                isDeploying={isDeploying}
                isFetchingBartender={isFetchingBartender}
                pushCommand={pushCommand}
                onRpcEndpointChange={patchSelectedRpcEndpoint}
                onBartenderAddressChange={(value) => {
                  saveWorkspaceSettings({ bartenderAddress: value });
                  resetArtifactState();
                }}
                onFetchBartender={handleFetchBartender}
                onRepositoryChange={(value) => patchSelectedSource({ repository: value })}
                onReferenceChange={(value) => patchSelectedSource({ reference: value })}
                onLoad={handleLoadArtifact}
                onDeploy={handleDeploy}
                constructorValues={constructorValues}
                onConstructorValuesChange={(values) => {
                  setConstructorValues(values);
                  setBuildResult(null);
                  setDeployResult(null);
                }}
              />
            ) : null}
          </section>
        </div>
      </AppShell>
      <AppSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </>
  );
}
