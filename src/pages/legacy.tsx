import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { OciArtifactStep } from "@/components/oci-artifact-step";
import { ReviewStep } from "@/components/review-step";
import { SettingsDialog } from "@/components/shared/settings-dialog";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/layout/app-shell";
import { useSettingsStore } from "@/store/settings-store";
import type { BuildResult, DeployResult, DeployStepId } from "@/types/deploy";
import { downloadJson } from "@/utils/download-utils";
import { hashPayload } from "@/utils/hash-utils";
import { buildLyquidDeploymentTransaction, type LyquidDeploymentArtifact } from "@/utils/lyquid-deployment-artifact";
import { fetchLyquidDeploymentArtifactFromOci } from "@/utils/oci-deployment-artifact";
import { createBrowserWalletTransactionClient } from "@/utils/request/browser-wallet-client";
import { sendLyquidDeployment } from "@/utils/request/lyquid-deployment-sender";

type BrowserWindowWithWallet = Window & {
  ethereum?: Parameters<typeof createBrowserWalletTransactionClient>[0];
};

function getTransactionHash(raw: unknown) {
  return raw && typeof raw === "object" && "transactionHash" in raw && typeof raw.transactionHash === "string" ? raw.transactionHash : undefined;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function LegacyPage() {
  const settings = useSettingsStore();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [isLoadingArtifact, setIsLoadingArtifact] = useState(false);
  const [currentStep, setCurrentStep] = useState<DeployStepId>("upload");
  const [rpcEndpoint, setRpcEndpoint] = useState(settings.rpcEndpoint);
  const [repository, setRepository] = useState("lyquids/local");
  const [reference, setReference] = useState("latest");
  const [selectedArtifact, setSelectedArtifact] = useState<LyquidDeploymentArtifact | null>(null);
  const [constructorValues, setConstructorValues] = useState<Record<string, string>>({});
  const [buildResult, setBuildResult] = useState<BuildResult | null>(null);
  const [deployResult, setDeployResult] = useState<DeployResult | null>(null);
  const [currentError, setCurrentError] = useState<string | null>(null);
  const account = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const walletLabel = account.address ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}` : "Connect Wallet";
  const canRunAction = Boolean(selectedArtifact) && !isDeploying && !isLoadingArtifact;
  const connectWallet = () => connect({ connector: injected() });
  const copyWalletAddress = () => (account.address ? navigator.clipboard.writeText(account.address) : undefined);

  const prepareDeploymentData = (): BuildResult | null => {
    if (!selectedArtifact) {
      setCurrentError("Load a Lyquid artifact from node /v2 before deploy.");
      return null;
    }

    if (!settings.bartenderAddress) {
      setCurrentError("Configure the network Bartender contract address in Settings before deploy.");
      return null;
    }

    const transaction = buildLyquidDeploymentTransaction({
      artifact: selectedArtifact,
      bartenderAddress: settings.bartenderAddress,
      constructorValues
    });
    const raw = {
      artifact: {
        name: selectedArtifact.name,
        imageHash: selectedArtifact.imageHash,
        repoHint: selectedArtifact.repoHint,
        abiStr: selectedArtifact.abiStr,
        osVersion: selectedArtifact.osVersion,
        raw: selectedArtifact.raw
      },
      transaction: transaction.submittedTransaction,
      parameters: transaction.parameters
    };
    const result: BuildResult = {
      hashes: { artifactHash: selectedArtifact.imageHash },
      logs: [],
      payload: raw,
      raw,
      contractAbi: selectedArtifact.contractAbi
    };

    setBuildResult(result);
    return result;
  };

  const handleDeploy = async () => {
    setCurrentStep("review");
    setDeployResult(null);
    setCurrentError(null);
    const prepared = buildResult ?? prepareDeploymentData();

    if (!prepared || !selectedArtifact) {
      return;
    }

    if (!account.address) {
      return;
    }

    try {
      setIsDeploying(true);
      const raw = await sendLyquidDeployment({
        artifact: selectedArtifact,
        bartenderAddress: settings.bartenderAddress,
        constructorValues,
        context: {
          rpcEndpoint,
          accountAddress: account.address,
          walletClient: createBrowserWalletTransactionClient((window as BrowserWindowWithWallet).ethereum),
          offChainFetch: (input, init) => fetch(input, init)
        }
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
    } catch (error) {
      setCurrentError(getErrorMessage(error, "Deploy failed."));
    } finally {
      setIsDeploying(false);
    }
  };

  const handleLoadArtifact = async () => {
    setCurrentError(null);
    setBuildResult(null);
    setDeployResult(null);

    try {
      setIsLoadingArtifact(true);
      const artifact = await fetchLyquidDeploymentArtifactFromOci({
        rpcEndpoint,
        repository,
        reference,
        fetchImpl: (input, init) => fetch(input, init)
      });

      setSelectedArtifact(artifact);
      setConstructorValues({});
    } catch (error) {
      setSelectedArtifact(null);
      setCurrentError(getErrorMessage(error, "Load artifact failed."));
    } finally {
      setIsLoadingArtifact(false);
    }
  };

  const contractAbi = deployResult?.contractAbi ?? buildResult?.contractAbi ?? selectedArtifact?.contractAbi;
  const uploadActions = (
    <div className="flex flex-wrap justify-end gap-2">
      <Button type="button" disabled={!canRunAction} onClick={handleDeploy}>
        {isDeploying ? "Deploying..." : "Deploy"}
      </Button>
    </div>
  );

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
        {currentStep === "review" ? (
          <ReviewStep
            buildResult={buildResult}
            deployResult={deployResult}
            contractAbi={contractAbi}
            isDeploying={isDeploying}
            isWalletConnected={Boolean(account.address)}
            currentError={currentError}
            onBack={() => setCurrentStep("upload")}
            onDeploy={handleDeploy}
            onConnectWallet={connectWallet}
            onCopyBuild={() => navigator.clipboard.writeText(JSON.stringify(buildResult?.payload ?? buildResult?.raw ?? {}, null, 2))}
            onDownloadBuild={() => downloadJson("cloud-deploy-deployment-data.json", buildResult?.payload ?? buildResult?.raw ?? {})}
            onCopyAbi={() => navigator.clipboard.writeText(JSON.stringify(contractAbi ?? {}, null, 2))}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-auto p-6">
            {currentError ? <p className="mb-4 rounded-md border border-destructive bg-card p-3 text-sm text-destructive">{currentError}</p> : null}
            <OciArtifactStep
              rpcEndpoint={rpcEndpoint}
              repository={repository}
              reference={reference}
              artifact={selectedArtifact}
              isLoading={isLoadingArtifact}
              onRpcEndpointChange={(value) => {
                setRpcEndpoint(value);
                setSelectedArtifact(null);
                setBuildResult(null);
                setDeployResult(null);
              }}
              onRepositoryChange={(value) => {
                setRepository(value);
                setSelectedArtifact(null);
                setBuildResult(null);
                setDeployResult(null);
              }}
              onReferenceChange={(value) => {
                setReference(value);
                setSelectedArtifact(null);
                setBuildResult(null);
                setDeployResult(null);
              }}
              onLoad={handleLoadArtifact}
              constructorValues={constructorValues}
              onConstructorValuesChange={(values) => {
                setConstructorValues(values);
                setBuildResult(null);
                setDeployResult(null);
              }}
              actions={uploadActions}
            />
          </div>
        )}
      </AppShell>
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={{
          rpcEndpoint: settings.rpcEndpoint,
          bartenderAddress: settings.bartenderAddress,
          lyquidId: settings.lyquidId,
          abi: settings.abi,
          buildMethod: settings.buildMethod,
          deployMethod: settings.deployMethod
        }}
        methodOptions={settings.methodOptions}
        methodErrors={settings.methodErrors}
        onSave={settings.saveSettings}
      />
    </>
  );
}
