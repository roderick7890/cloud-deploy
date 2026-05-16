import { useState } from "react";
import type { DeployResult } from "@/types/deploy";
import { ResultSummary } from "@/components/shared/result-summary";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type DeployStepProps = {
  lyquidId: string;
  isUpdateDeploy: boolean;
  isCheckingUpdateStatus?: boolean;
  isWalletConnected: boolean;
  result: DeployResult | null;
  onDeploy: () => void;
  onConnectWallet: () => void;
  error: string | null;
};

export function DeployStep({
  lyquidId,
  isUpdateDeploy,
  isCheckingUpdateStatus = false,
  isWalletConnected,
  result,
  onDeploy,
  onConnectWallet,
  error
}: DeployStepProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [connectWalletOpen, setConnectWalletOpen] = useState(false);

  const handleDeployClick = () => {
    if (!isWalletConnected) {
      setConnectWalletOpen(true);
      return;
    }

    if (lyquidId && isUpdateDeploy) {
      setConfirmOpen(true);
      return;
    }

    onDeploy();
  };

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      {error ? <p className="rounded-md border border-destructive bg-card p-3 text-sm text-destructive">{error}</p> : null}
      <ResultSummary result={result} />
      <div className="flex justify-end">
        <Button type="button" disabled={isCheckingUpdateStatus} onClick={handleDeployClick}>
          {isCheckingUpdateStatus ? "Checking..." : "Deploy"}
        </Button>
      </div>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deploy as update to this Lyquid?</AlertDialogTitle>
            <AlertDialogDescription>The current Lyquid ID already resolves to a deployed contract, so this deployment will be submitted as an update.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmOpen(false);
                onDeploy();
              }}
            >
              Deploy as Update
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={connectWalletOpen} onOpenChange={setConnectWalletOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Connect wallet to deploy</AlertDialogTitle>
            <AlertDialogDescription>A connected wallet is required before Cloud Deploy can request a signed deployment transaction.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConnectWalletOpen(false);
                onConnectWallet();
              }}
            >
              Connect Wallet
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
