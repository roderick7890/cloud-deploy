import { useState, type ReactNode } from "react";
import { ArrowLeft, ChevronDown, ChevronRight, LoaderCircle } from "lucide-react";
import type { BuildResult, DeployResult } from "@/types/deploy";
import { Button } from "@/components/ui/button";
import { PayloadReviewPanel } from "@/components/shared/payload-review-panel";
import { Textarea } from "@/components/ui/textarea";

type ReviewStepProps = {
  buildResult: BuildResult | null;
  deployResult: DeployResult | null;
  contractAbi?: unknown;
  nodeHost?: string;
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
  onCopyAbi?: () => void;
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

type FoldSectionProps = {
  title: string;
  hint?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
};

function FoldSection({ title, hint, open, onToggle, children }: FoldSectionProps) {
  const Icon = open ? ChevronDown : ChevronRight;

  return (
    <section className="[&:not(:last-child)]:border-b py-4 [&:first-of-type]:pt-0">
      <Button
        type="button"
        variant="ghost"
        aria-expanded={open}
        aria-label={hint ? `${title} ${hint}` : title}
        onClick={onToggle}
        className="w-full justify-start gap-2 rounded-sm px-1 py-1 text-left"
      >
        <Icon className="size-4 shrink-0" />
        <span className="font-medium">{title}</span>
        {hint ? <span className="truncate text-caption text-muted-foreground">{hint}</span> : null}
      </Button>
      {open ? <div className="pt-3 px-7">{children}</div> : null}
    </section>
  );
}

export function ReviewStep({
  buildResult,
  deployResult,
  nodeHost,
  isBuilding = false,
  isDeploying = false,
  isWalletConnected = false,
  currentError,
  onBack,
  onBuild,
  onDeploy,
  onConnectWallet,
  onCopyBuild,
  onDownloadBuild
}: ReviewStepProps) {
  const [isDeploymentDataOpen, setIsDeploymentDataOpen] = useState(false);
  const [isDeployResultOpen, setIsDeployResultOpen] = useState(true);
  const buildPayload = buildResult?.payload ?? buildResult?.raw;

  const deployTransactionJson = jsonText(deployResult?.transactionRaw ?? deployResult?.raw);
  const transactionUrl = nodeHost && deployResult?.transactionHash ? `https://${nodeHost}/lyquor/txs/${deployResult.transactionHash}` : "";

  return (
    <div className="relative flex min-h-0 flex-1 flex-col gap-5 overflow-auto">
      {onBack ? (
        <div className="flex">
          <Button type="button" variant="ghost" onClick={onBack} className="p-0 hover:bg-transparent!">
            <ArrowLeft className="size-4" />
            Back
          </Button>
        </div>
      ) : null}
      {currentError ? <p className="rounded-md border border-destructive bg-card p-3 text-sm text-destructive">{currentError}</p> : null}

      <div>
        <FoldSection
          title="Deployment Data"
          open={isDeploymentDataOpen}
          onToggle={() => setIsDeploymentDataOpen((value) => !value)}
        >
          {isBuilding ? (
            <LoadingState label="Preparing..." />
          ) : buildResult ? (
            <PayloadReviewPanel hashes={buildResult.hashes} payload={buildPayload} onCopy={onCopyBuild} onDownload={onDownloadBuild} />
          ) : (
            <EmptyState
              title="Deployment data has not been prepared"
              description="Deploy will prepare contract creation data from the selected artifact."
              action={onBuild ? (
                <Button type="button" variant="outline" disabled={isDeploying} onClick={onBuild}>
                  Prepare
                </Button>
              ) : undefined}
            />
          )}
        </FoldSection>

        <FoldSection
          title="Deploy Result"
          open={isDeployResultOpen}
          onToggle={() => setIsDeployResultOpen((value) => !value)}
        >
          {isDeploying ? (
            <LoadingState label="Deploying..." />
          ) : deployResult ? (
            <div className="space-y-4">
              {deployResult.transactionHash ? (
                // <div className="rounded-md border bg-background p-3">
                //   <p className="text-caption text-muted-foreground">txHash</p>
                //   <p className="break-all font-mono text-sm">{deployResult.transactionHash}</p>
                // </div>

                <div className="flex flex-col flex-1">
                  <p className="font-medium text-sm text-muted-foreground/80 mb-1">txHash</p>
                  {transactionUrl ? (
                    <a href={transactionUrl} target="_blank" rel="noopener noreferrer" className="break-all underline">
                      {deployResult.transactionHash}
                    </a>
                  ) : (
                    <p className="break-all">{deployResult.transactionHash}</p>
                  )}
                </div>
              ) : null}
              <Textarea aria-label="Deploy transaction JSON" value={deployTransactionJson} readOnly rows={14} className="w-full font-mono" />
            </div>
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
              title="Deployment data required"
              description="Deploy will start after contract creation data is prepared."
            />
          )}
        </FoldSection>

      </div>
    </div>
  );
}
