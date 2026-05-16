import { Hammer, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";

type ActionDeckProps = {
  selectedTomlPath: string;
  isBuilding: boolean;
  isDeploying: boolean;
  onBuild: () => void;
  onDeploy: () => void;
};

export function ActionDeck({ selectedTomlPath, isBuilding, isDeploying, onBuild, onDeploy }: ActionDeckProps) {
  const hasTarget = Boolean(selectedTomlPath);
  const targetLabel = selectedTomlPath || "No TOML target selected";

  return (
    <div className="grid h-full min-h-0 gap-4 p-4 md:grid-cols-2">
      <section className="flex min-h-0 flex-col justify-between gap-4 rounded-md border bg-background p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Hammer className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Build</h2>
          </div>
          <p className="break-all text-sm text-muted-foreground">{targetLabel}</p>
        </div>
        <Button type="button" disabled={!hasTarget || isBuilding} onClick={onBuild}>
          {isBuilding ? "Building..." : "Build"}
        </Button>
      </section>

      <section className="flex min-h-0 flex-col justify-between gap-4 rounded-md border bg-background p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Deploy</h2>
          </div>
          <p className="text-sm text-muted-foreground">Deploy runs build first when the current target has no prepared calldata.</p>
        </div>
        <Button type="button" disabled={!hasTarget || isDeploying} onClick={onDeploy}>
          {isDeploying ? "Deploying..." : "Deploy"}
        </Button>
      </section>
    </div>
  );
}
