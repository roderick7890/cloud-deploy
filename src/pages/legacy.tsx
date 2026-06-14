import { useState } from "react";
import { useAccount, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { ReviewStep } from "@/components/review-step";
import { SettingsDialog } from "@/components/shared/settings-dialog";
import { Button } from "@/components/ui/button";
import { UploadStep } from "@/components/upload-step";
import { AppShell } from "@/layout/app-shell";
import { useDeploySessionStore } from "@/store/deploy-session-store";
import { useSettingsStore } from "@/store/settings-store";
import type { BuildResult } from "@/types/deploy";
import { findMethod } from "@/utils/abi/abi-utils";
import { prepareBuildMethodCall } from "@/utils/build-args-utils";
import { prepareDeployMethodCall, getDeployAbiFromBuildPayload } from "@/utils/deploy-args-utils";
import { downloadJson } from "@/utils/download-utils";
import { hashPayload } from "@/utils/hash-utils";
import { createBrowserWalletTransactionClient } from "@/utils/request/browser-wallet-client";
import { dispatchSelectedMethod } from "@/utils/request/request-dispatcher";
import { fetchRpcTransactionResponse } from "@/utils/request/rpc-transaction-client";

type BrowserWindowWithWallet = Window & {
  ethereum?: Parameters<typeof createBrowserWalletTransactionClient>[0];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getTransactionHash(raw: unknown) {
  return isRecord(raw) && typeof raw.transactionHash === "string" ? raw.transactionHash : undefined;
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function LegacyPage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const account = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const settings = useSettingsStore();
  const session = useDeploySessionStore();

  const walletLabel = account.address ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}` : "Connect Wallet";
  const hasSelectedToml = Boolean(session.uploadedProject?.selectedTomlPath);
  const canRunAction = hasSelectedToml && !isBuilding && !isDeploying;
  const connectWallet = () => connect({ connector: injected() });
  const copyWalletAddress = () => (account.address ? navigator.clipboard.writeText(account.address) : undefined);

  const runBuild = async (): Promise<BuildResult | null> => {
    if (!settings.parsedAbi || !session.uploadedProject) {
      session.setCurrentError("Upload and valid ABI settings are required.");
      return null;
    }

    const buildMethod = findMethod(settings.parsedAbi, settings.buildMethod);
    if (!buildMethod) {
      session.setCurrentError("Selected build method does not exist.");
      return null;
    }

    const { args, sourceHash } = await prepareBuildMethodCall({
      method: buildMethod,
      project: session.uploadedProject
    });
    const raw = await dispatchSelectedMethod({
      parsedAbi: settings.parsedAbi,
      selectedMethod: settings.buildMethod,
      args,
      context: {
        rpcEndpoint: settings.rpcEndpoint,
        lyquidId: settings.lyquidId,
        accountAddress: account.address,
        offChainFetch: (input, init) => fetch(input, init)
      }
    });
    const artifactHash = await hashPayload(raw);
    const reviewPayload = {
      hashes: { sourceHash, artifactHash },
      payload: raw
    };
    const buildResult: BuildResult = {
      hashes: reviewPayload.hashes,
      logs: [],
      payload: raw,
      raw,
      contractAbi: getDeployAbiFromBuildPayload(buildMethod, reviewPayload)
    };

    session.setBuildResult(buildResult);
    return buildResult;
  };

  const handleBuild = async () => {
    try {
      session.goToStep("review");
      setIsBuilding(true);
      session.setCurrentError(null);
      await runBuild();
    } catch (error) {
      session.setCurrentError(getErrorMessage(error, "Build failed."));
    } finally {
      setIsBuilding(false);
    }
  };

  const handleDeploy = async () => {
    session.goToStep("review");

    if (!account.address) {
      session.setCurrentError(null);
      return;
    }

    if (!settings.parsedAbi || !session.uploadedProject) {
      session.setCurrentError("Upload and valid ABI settings are required.");
      return;
    }

    try {
      session.setCurrentError(null);
      let buildResult = session.buildResult;

      if (!buildResult) {
        setIsBuilding(true);
        try {
          buildResult = await runBuild();
        } finally {
          setIsBuilding(false);
        }
      }

      setIsDeploying(true);
      const buildMethod = findMethod(settings.parsedAbi, settings.buildMethod);
      const deployMethod = findMethod(settings.parsedAbi, settings.deployMethod);

      if (!buildResult || !buildMethod || !deployMethod) {
        session.setCurrentError("Selected build or deploy method does not exist.");
        return;
      }

      const reviewPayload = {
        hashes: buildResult.hashes,
        payload: buildResult.payload ?? buildResult.raw
      };
      const { args, deployAbi } = prepareDeployMethodCall({
        buildMethod,
        deployMethod,
        project: session.uploadedProject,
        reviewPayload
      });
      const raw = await dispatchSelectedMethod({
        parsedAbi: settings.parsedAbi,
        selectedMethod: settings.deployMethod,
        args,
        context: {
          rpcEndpoint: settings.rpcEndpoint,
          lyquidId: settings.lyquidId,
          accountAddress: account.address,
          walletClient: createBrowserWalletTransactionClient((window as BrowserWindowWithWallet).ethereum),
          offChainFetch: (input, init) => fetch(input, init)
        }
      });
      const transactionHash = getTransactionHash(raw);
      let transactionRaw: unknown;

      if (transactionHash) {
        try {
          transactionRaw = await fetchRpcTransactionResponse({
            rpcEndpoint: settings.rpcEndpoint,
            transactionHash: transactionHash as `0x${string}`,
            offChainFetch: (input, init) => fetch(input, init)
          });
        } catch (error) {
          transactionRaw = {
            transactionHash,
            transactionLookupError: getErrorMessage(error, "Failed to fetch RPC transaction."),
            deployRaw: raw
          };
        }
      }

      const signedPayloadHash = await hashPayload(raw);

      session.setDeployResult({
        transactionHash,
        status: isRecord(raw) && typeof raw.status === "string" ? raw.status : "submitted",
        signedPayloadHash,
        raw,
        transactionRaw: transactionRaw ?? raw,
        contractAbi: deployAbi ?? buildResult.contractAbi
      });
    } catch (error) {
      session.setCurrentError(getErrorMessage(error, "Deploy failed."));
    } finally {
      setIsDeploying(false);
    }
  };

  const contractAbi = session.deployResult?.contractAbi ?? session.buildResult?.contractAbi;
  const uploadActions = (
    <div className="flex flex-wrap justify-end gap-2">
      <Button type="button" variant="outline" disabled={!canRunAction} onClick={handleBuild}>
        {isBuilding ? "Building..." : "Build"}
      </Button>
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
        {session.currentStep === "review" ? (
          <ReviewStep
            buildResult={session.buildResult}
            deployResult={session.deployResult}
            contractAbi={contractAbi}
            isBuilding={isBuilding}
            isDeploying={isDeploying}
            isWalletConnected={Boolean(account.address)}
            currentError={session.currentError}
            onBack={() => session.goToStep("upload")}
            onBuild={handleBuild}
            onDeploy={handleDeploy}
            onConnectWallet={connectWallet}
            onCopyBuild={() => navigator.clipboard.writeText(JSON.stringify(session.buildResult?.payload ?? session.buildResult?.raw ?? {}, null, 2))}
            onDownloadBuild={() => downloadJson("cloud-deploy-build-result.json", session.buildResult?.payload ?? session.buildResult?.raw ?? {})}
            onCopyAbi={() => navigator.clipboard.writeText(JSON.stringify(contractAbi ?? {}, null, 2))}
          />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col overflow-auto p-6">
            {session.currentError ? <p className="mb-4 rounded-md border border-destructive bg-card p-3 text-sm text-destructive">{session.currentError}</p> : null}
            <UploadStep project={session.uploadedProject} onUpload={session.setUploadedProject} actions={uploadActions} />
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
