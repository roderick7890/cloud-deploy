import { useState } from "react";
import type { DeployResult } from "@/types/deploy";
import { ResultSummary } from "@/components/shared/result-summary";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

type DeployStepProps = {
  lyquidId: string;
  result: DeployResult | null;
  onDeploy: () => void;
  error: string | null;
};

export function DeployStep({ lyquidId, result, onDeploy, error }: DeployStepProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  const handleDeployClick = () => {
    if (lyquidId) {
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
        <Button type="button" onClick={handleDeployClick}>
          Deploy
        </Button>
      </div>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deploy as update to this Lyquid?</AlertDialogTitle>
            <AlertDialogDescription>The current Lyquid ID is set, so this deployment will be submitted as an update.</AlertDialogDescription>
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
    </div>
  );
}
