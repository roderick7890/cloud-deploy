import { Button } from "@/components/ui/button";

type BuildStepProps = {
  onBuild: () => void;
  canBuild: boolean;
  isBuilding: boolean;
  error: string | null;
};

export function BuildStep({ onBuild, canBuild, isBuilding, error }: BuildStepProps) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      {error ? <p className="rounded-md border border-destructive bg-card p-3 text-sm text-destructive">{error}</p> : null}
      <div className="flex justify-end">
        <Button type="button" disabled={!canBuild || isBuilding} onClick={onBuild}>
          {isBuilding ? "Building..." : "Build"}
        </Button>
      </div>
    </div>
  );
}
