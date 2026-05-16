import { useState } from "react";
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
import { downloadJson } from "@/utils/download-utils";
import { hashConstructorInput, hashPayload, hashSource } from "@/utils/hash-utils";
import { dispatchSelectedMethod } from "@/utils/request/request-dispatcher";

const completedByStep: Record<DeployStepId, DeployStepId[]> = {
  upload: [],
  build: ["upload"],
  review: ["upload", "build"],
  deploy: ["upload", "build", "review"]
};

export default function HomePage() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const account = useAccount();
  const { connect } = useConnect();
  const settings = useSettingsStore();
  const session = useDeploySessionStore();

  const walletLabel = account.address ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}` : "Connect Wallet";
  const canBuild = Boolean(session.uploadedProject && settings.parsedAbi && settings.buildMethod && !settings.methodErrors.buildMethod);

  const handleBuild = async () => {
    if (!settings.parsedAbi || !session.uploadedProject) {
      session.setCurrentError("Upload and valid ABI settings are required.");
      return;
    }

    try {
      const sourceBytes = new TextEncoder().encode(JSON.stringify(session.uploadedProject.metadata));
      const sourceHash = await hashSource(sourceBytes);
      const constructorInputHash = await hashConstructorInput(session.constructorValues);
      const raw = await dispatchSelectedMethod({
        parsedAbi: settings.parsedAbi,
        selectedMethod: settings.buildMethod,
        args: [sourceHash],
        context: {
          rpcEndpoint: settings.rpcEndpoint,
          accountAddress: account.address,
          offChainFetch: fetch
        }
      });
      const artifactHash = await hashPayload(raw);

      session.setBuildResult({
        hashes: { sourceHash, artifactHash, constructorInputHash },
        logs: [],
        payload: raw,
        raw
      });
    } catch (error) {
      session.setCurrentError(error instanceof Error ? error.message : "Build failed.");
    }
  };

  const handleDeploy = async () => {
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
          accountAddress: account.address,
          offChainFetch: fetch
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
    <DeployStep lyquidId={settings.lyquidId} result={session.deployResult} onDeploy={handleDeploy} error={session.currentError} />
  );

  if (session.currentStep === "upload") {
    stepContent = (
      <UploadStep
        metadata={session.uploadedProject?.metadata ?? null}
        onUpload={session.setUploadedProject}
        onContinue={() => session.goToStep("build")}
      />
    );
  }

  if (session.currentStep === "build") {
    stepContent = (
      <BuildStep
        constructorFields={settings.constructorFields}
        constructorValues={session.constructorValues}
        onConstructorValuesChange={session.setConstructorValues}
        onBuild={handleBuild}
        canBuild={canBuild}
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
        onConnectWallet={() => connect({ connector: injected() })}
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
