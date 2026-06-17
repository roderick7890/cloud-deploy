import { ReviewStep } from "@/components/review-step";
import type { BuildResult, DeployResult } from "@/types/deploy";
import { downloadJson } from "@/utils/download-utils";

type ArtifactReviewSurfaceProps = {
  buildResult: BuildResult | null;
  deployResult: DeployResult | null;
  contractAbi?: unknown;
  nodeHost?: string;
  isDeploying: boolean;
  isWalletConnected: boolean;
  currentError: string | null;
  onBack: () => void;
  onDeploy: () => void;
  onConnectWallet: () => void;
};

export function ArtifactReviewSurface({
  buildResult,
  deployResult,
  contractAbi,
  nodeHost,
  isDeploying,
  isWalletConnected,
  currentError,
  onBack,
  onDeploy,
  onConnectWallet
}: ArtifactReviewSurfaceProps) {
  return (
    <ReviewStep
      buildResult={buildResult}
      deployResult={deployResult}
      contractAbi={contractAbi}
      nodeHost={nodeHost}
      isDeploying={isDeploying}
      isWalletConnected={isWalletConnected}
      currentError={currentError}
      onBack={onBack}
      onDeploy={onDeploy}
      onConnectWallet={onConnectWallet}
      onCopyBuild={() => navigator.clipboard.writeText(JSON.stringify(buildResult?.payload ?? buildResult?.raw ?? {}, null, 2))}
      onDownloadBuild={() => downloadJson("cloud-deploy-deployment-data.json", buildResult?.payload ?? buildResult?.raw ?? {})}
      onCopyAbi={() => navigator.clipboard.writeText(JSON.stringify(contractAbi ?? {}, null, 2))}
    />
  );
}
