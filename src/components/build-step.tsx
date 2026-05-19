import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type BuildStepProps = {
  onBuild: () => void;
  onBack?: () => void;
  canBuild: boolean;
  isBuilding: boolean;
  error: string | null;
};

export function BuildStep({ onBuild, onBack, canBuild, isBuilding, error }: BuildStepProps) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {error ? <p className="rounded-md border border-destructive bg-card p-3 text-sm text-destructive">{error}</p> : null}
      <div className="flex flex-wrap justify-between gap-2">
        {onBack ? (
          <Button type="button" variant="ghost" onClick={onBack}>
            <ArrowLeft className="size-4" />
            Back
          </Button>
        ) : <span />}
        <Button type="button" disabled={!canBuild || isBuilding} onClick={onBuild}>
          {isBuilding ? "Building..." : "Build"}
        </Button>
      </div>
    </div>
  );
}
