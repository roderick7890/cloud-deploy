import { useEffect, useState } from "react";
import { useAccount, useConnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { BuildStep } from "@/components/build-step";
import { DeployStep } from "@/components/deploy-step";
import { ReviewStep } from "@/components/review-step";
import { SettingsDialog } from "@/components/shared/settings-dialog";
import { UploadStep } from "@/components/upload-step";
import { AppShell } from "@/layout/app-shell";
import { useDeploySessionStore } from "@/store/deploy-session-store";
import { useSettingsStore } from "@/store/settings-store";
import type { DeployStepId } from "@/types/deploy";
import { findMethod } from "@/utils/abi/abi-utils";
import { prepareBuildMethodCall } from "@/utils/build-args-utils";
import { downloadJson } from "@/utils/download-utils";
import { hashPayload } from "@/utils/hash-utils";
import { fetchLyquidContractAddress } from "@/utils/request/lyquid-info-client";
import { dispatchSelectedMethod } from "@/utils/request/request-dispatcher";

type DeployTargetStatus = {
  requestKey: string;
  contractAddress: string | null;
  isChecking: boolean;
};

const completedByStep: Record<DeployStepId, DeployStepId[]> = {
  upload: [],
  build: ["upload"],
  review: ["upload", "build"],
  deploy: ["upload", "build", "review"]
};

export default function HomePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [deployTargetStatus, setDeployTargetStatus] = useState<DeployTargetStatus | null>(null);
  const account = useAccount();
  const { connect } = useConnect();
  const settings = useSettingsStore();
  const session = useDeploySessionStore();
  const setCurrentError = session.setCurrentError;

  const walletLabel = account.address ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}` : "Connect Wallet";
  const canBuild = Boolean(session.uploadedProject && settings.parsedAbi && settings.buildMethod && !settings.methodErrors.buildMethod);
  const connectWallet = () => connect({ connector: injected() });
  const deployTargetRequestKey =
    session.currentStep === "deploy" && settings.lyquidId && settings.rpcEndpoint ? `${settings.rpcEndpoint}\n${settings.lyquidId}` : null;
  const deployTargetContract = deployTargetStatus?.requestKey === deployTargetRequestKey ? deployTargetStatus.contractAddress : null;
  const isCheckingDeployTarget = Boolean(
    deployTargetRequestKey && (deployTargetStatus?.requestKey !== deployTargetRequestKey || deployTargetStatus.isChecking)
  );
  useEffect(() => {
    if (!deployTargetRequestKey) {
      return;
    }
    let cancelled = false;
    void Promise.resolve().then(async () => {
      if (cancelled) {
        return;
      }
      setDeployTargetStatus({
        requestKey: deployTargetRequestKey,
        contractAddress: null,
        isChecking: true
      });
      try {
        const contractAddress = await fetchLyquidContractAddress({
          rpcEndpoint: settings.rpcEndpoint,
          lyquidId: settings.lyquidId,
          offChainFetch: (input, init) => fetch(input, init)
        });
        if (!cancelled) {
          setDeployTargetStatus({
            requestKey: deployTargetRequestKey,
            contractAddress,
            isChecking: false
          });
        }
      } catch (error) {
        if (!cancelled) {
          setDeployTargetStatus({
            requestKey: deployTargetRequestKey,
            contractAddress: null,
            isChecking: false
          });
          setCurrentError(error instanceof Error ? error.message : "Failed to check Lyquid deployment status.");
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [deployTargetRequestKey, settings.lyquidId, settings.rpcEndpoint, setCurrentError]);

  const handleBuild = async () => {
    if (!settings.parsedAbi || !session.uploadedProject) {
      session.setCurrentError("Upload and valid ABI settings are required.");
      return;
    }

    try {
      setIsBuilding(true);
      session.setCurrentError(null);
      const buildMethod = findMethod(settings.parsedAbi, settings.buildMethod);
      if (!buildMethod) {
        session.setCurrentError("Selected build method does not exist.");
        return;
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

      session.setBuildResult({
        hashes: { sourceHash, artifactHash },
        logs: [],
        payload: raw,
        raw
      });
    } catch (error) {
      session.setCurrentError(error instanceof Error ? error.message : "Build failed.");
    } finally {
      setIsBuilding(false);
    }
  };

  const handleDeploy = async () => {
    if (!account.address) {
      session.setCurrentError("Connect wallet before deploying.");
      return;
    }

    if (!settings.parsedAbi || !session.reviewPayload) {
      session.setCurrentError("Review payload is required before deploy.");
      return;
    }

    try {
      const raw = await dispatchSelectedMethod({
        parsedAbi: settings.parsedAbi,
        selectedMethod: settings.deployMethod,
        args: [JSON.stringify(session.reviewPayload.payload)],
        context: {
          rpcEndpoint: settings.rpcEndpoint,
          lyquidId: settings.lyquidId,
          accountAddress: account.address,
          offChainFetch: (input, init) => fetch(input, init)
        }
      });
      const signedPayloadHash = await hashPayload(raw);
      session.setDeployResult({
        status: "submitted",
        signedPayloadHash,
        raw
      });
    } catch (error) {
      session.setCurrentError(error instanceof Error ? error.message : "Deploy failed.");
    }
  };

  let stepContent = (
    <DeployStep
      lyquidId={settings.lyquidId}
      isUpdateDeploy={Boolean(deployTargetContract)}
      isCheckingUpdateStatus={isCheckingDeployTarget}
      isWalletConnected={Boolean(account.address)}
      result={session.deployResult}
      onDeploy={handleDeploy}
      onConnectWallet={connectWallet}
      error={session.currentError}
    />
  );

  if (session.currentStep === "upload") {
    stepContent = (
      <UploadStep
        project={session.uploadedProject}
        onUpload={session.setUploadedProject}
        onContinue={() => session.goToStep("build")}
      />
    );
  }

  if (session.currentStep === "build") {
    stepContent = (
      <BuildStep
        onBuild={handleBuild}
        canBuild={canBuild}
        isBuilding={isBuilding}
        error={session.currentError}
      />
    );
  }

  if (session.currentStep === "review") {
    stepContent = (
      <ReviewStep
        reviewPayload={session.reviewPayload}
        onCopy={() => navigator.clipboard.writeText(JSON.stringify(session.reviewPayload?.payload ?? {}, null, 2))}
        onDownload={() => downloadJson("cloud-deploy-payload.json", session.reviewPayload?.payload ?? {})}
        onContinue={() => session.goToStep("deploy")}
      />
    );
  }

  return (
    <>
      <AppShell
        currentStep={session.currentStep}
        completedSteps={completedByStep[session.currentStep]}
        walletLabel={walletLabel}
        onConnectWallet={connectWallet}
        onOpenSettings={() => setSettingsOpen(true)}
        onStepBack={session.goToStep}
      >
        {stepContent}
      </AppShell>
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={{
          rpcEndpoint: settings.rpcEndpoint,
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
