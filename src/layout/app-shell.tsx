import type { ReactNode } from "react";
import { deploySteps } from "@/config/deploy-steps-config";
import type { DeployStepId } from "@/types/deploy";
import { AppHeader } from "@/components/shared/app-header";
import { ProgressSteps } from "@/components/shared/progress-steps";

type AppShellProps = {
  children: ReactNode;
  currentStep?: DeployStepId;
  completedSteps?: DeployStepId[];
  walletLabel: string;
  walletAddress?: string;
  onConnectWallet: () => void;
  onCopyWalletAddress: () => void;
  onDisconnectWallet: () => void;
  onOpenSettings?: () => void;
  onStepBack?: (step: DeployStepId) => void;
  showProgress?: boolean;
};

export function AppShell({
  children,
  currentStep,
  completedSteps,
  walletLabel,
  walletAddress,
  onConnectWallet,
  onCopyWalletAddress,
  onDisconnectWallet,
  onOpenSettings,
  onStepBack,
  showProgress = true
}: AppShellProps) {
  return (
    <div className="flex h-screen w-full max-w-full flex-col overflow-hidden bg-background">
      <AppHeader
        walletLabel={walletLabel}
        walletAddress={walletAddress}
        onConnectWallet={onConnectWallet}
        onCopyWalletAddress={onCopyWalletAddress}
        onDisconnectWallet={onDisconnectWallet}
        onOpenSettings={onOpenSettings}
      />
      <main className="mx-auto flex min-h-0 min-w-0 w-full flex-1 flex-col overflow-hidden">
        {showProgress && currentStep && completedSteps && onStepBack ? (
          <section className="border-b bg-card px-6 py-5">
            <ProgressSteps steps={deploySteps} currentStep={currentStep} completedSteps={completedSteps} onStepBack={onStepBack} />
          </section>
        ) : null}
        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{children}</section>
      </main>
    </div>
  );
}
