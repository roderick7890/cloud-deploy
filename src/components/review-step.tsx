import type { ReactNode } from "react";
import { ArrowLeft, Copy, LoaderCircle } from "lucide-react";
import type { BuildResult, DeployResult } from "@/types/deploy";
import { Button } from "@/components/ui/button";
import { PayloadReviewPanel } from "@/components/shared/payload-review-panel";
import { Textarea } from "@/components/ui/textarea";

type ReviewStepProps = {
  buildResult: BuildResult | null;
  deployResult: DeployResult | null;
  contractAbi?: unknown;
  isBuilding?: boolean;
  isDeploying?: boolean;
  isWalletConnected?: boolean;
  currentError?: string | null;
  onBack?: () => void;
  onBuild?: () => void;
  onDeploy?: () => void;
  onConnectWallet?: () => void;
  onCopyBuild: () => void;
  onDownloadBuild: () => void;
  onCopyAbi: () => void;
};

function jsonText(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

function LoadingState({ label }: { label: string }) {
  return (
    <div role="status" className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed bg-background py-12 text-sm text-muted-foreground">
      <LoaderCircle className="size-5 animate-spin text-foreground" />
      <span>{label}</span>
    </div>
  );
}

function EmptyState({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-dashed bg-background px-4 py-12 text-center">
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

export function ReviewStep({
  buildResult,
  deployResult,
  contractAbi,
  isBuilding = false,
  isDeploying = false,
  isWalletConnected = false,
  currentError,
  onBack,
  onBuild,
  onDeploy,
  onConnectWallet,
  onCopyBuild,
  onDownloadBuild,
  onCopyAbi
}: ReviewStepProps) {
  const buildPayload = buildResult?.payload ?? buildResult?.raw;

  const deployTransactionJson = jsonText(deployResult?.transactionRaw ?? deployResult?.raw);
  const contractAbiJson = contractAbi ? jsonText(contractAbi) : "";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-5 overflow-auto p-6 lg:pr-96">
      {onBack ? (
        <div className="flex">
          <Button type="button" variant="ghost" onClick={onBack}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
        </div>
      ) : null}
      {currentError ? <p className="rounded-md border border-destructive bg-card p-3 text-sm text-destructive">{currentError}</p> : null}
      <section className="flex flex-col gap-4 rounded-md border bg-card p-4">
        <div>
          <h2 className="text-base font-semibold">Build Result</h2>
          <p className="text-sm text-muted-foreground">Build evidence and raw payload for the selected TOML target.</p>
        </div>
        {isBuilding ? (
          <LoadingState label="Building..." />
        ) : buildResult ? (
          <PayloadReviewPanel hashes={buildResult.hashes} payload={buildPayload} onCopy={onCopyBuild} onDownload={onDownloadBuild} />
        ) : (
          <EmptyState
            title="Build has not started"
            description="Run build to generate payload evidence for this TOML target."
            action={onBuild ? (
              <Button type="button" variant="outline" disabled={isDeploying} onClick={onBuild}>
                Build
              </Button>
            ) : undefined}
          />
        )}
      </section>

      <section className="flex flex-col gap-4 rounded-md border bg-card p-4">
        <div>
          <h2 className="text-base font-semibold">Deploy Result</h2>
          <p className="text-sm text-muted-foreground">Submitted transaction hash and RPC transaction JSON for debugging.</p>
        </div>
        {isDeploying ? (
          <LoadingState label="Deploying..." />
        ) : deployResult ? (
          <>
            {deployResult.transactionHash ? (
              <div className="rounded-md border bg-background p-3">
                <p className="text-caption text-muted-foreground">txHash</p>
                <p className="break-all font-mono text-sm">{deployResult.transactionHash}</p>
              </div>
            ) : null}
            <Textarea aria-label="Deploy transaction JSON" value={deployTransactionJson} readOnly rows={14} className="w-full font-mono" />
          </>
        ) : !isWalletConnected ? (
          <EmptyState
            title="Connect wallet to deploy"
            description="A connected wallet is required before Cloud Deploy can request a signed deployment transaction."
            action={onConnectWallet ? (
              <Button type="button" onClick={onConnectWallet}>
                Connect Wallet
              </Button>
            ) : undefined}
          />
        ) : buildResult ? (
          <EmptyState
            title="Ready to deploy"
            description="No deploy transaction has been submitted yet."
            action={onDeploy ? (
              <Button type="button" disabled={isBuilding} onClick={onDeploy}>
                Deploy
              </Button>
            ) : undefined}
          />
        ) : (
          <EmptyState
            title="Build result required"
            description="Deploy will start after build has produced a payload."
          />
        )}
      </section>

      <aside className="flex flex-col gap-3 rounded-md border bg-card p-4 lg:absolute lg:right-6 lg:top-20 lg:w-80">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Contract ABI</h2>
          <Button type="button" variant="outline" size="sm" disabled={!contractAbiJson} onClick={onCopyAbi}>
            <Copy />
            Copy
          </Button>
        </div>
        <Textarea aria-label="Contract ABI" value={contractAbiJson} readOnly rows={18} className="w-full font-mono" />
      </aside>
    </div>
  );
}
