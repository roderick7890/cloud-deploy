import { Rocket } from "lucide-react";
import type { AbiParameter } from "viem";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ActionDeckProps = {
  selectedArtifactPath: string;
  constructorFields: readonly AbiParameter[];
  constructorValues: Record<string, string>;
  isDeploying: boolean;
  onConstructorValuesChange: (values: Record<string, string>) => void;
  onDeploy: () => void;
};

function getFieldName(field: AbiParameter, index: number) {
  return "name" in field && typeof field.name === "string" && field.name.length > 0 ? field.name : `arg${index}`;
}

export function ActionDeck({
  selectedArtifactPath,
  constructorFields,
  constructorValues,
  isDeploying,
  onConstructorValuesChange,
  onDeploy
}: ActionDeckProps) {
  const hasTarget = Boolean(selectedArtifactPath);
  const targetLabel = selectedArtifactPath || "No artifact selected";

  return (
    <div className="flex h-full min-h-0 gap-4 p-4 [&_section]:w-64">
      <section className="flex min-h-0 flex-col gap-4 overflow-auto rounded-md border bg-background p-4">
        <div className="space-y-2">
          <h2 className="font-semibold">Constructor</h2>
          <p className="break-all text-sm text-muted-foreground">{targetLabel}</p>
        </div>
        {constructorFields.length > 0 ? (
          <div className="space-y-3">
            {constructorFields.map((field, index) => {
              const name = getFieldName(field, index);

              return (
                <div key={`${name}:${field.type}`} className="space-y-1">
                  <Label htmlFor={`constructor-${name}`}>{name}</Label>
                  <Input
                    id={`constructor-${name}`}
                    value={constructorValues[name] ?? ""}
                    placeholder={field.type}
                    onChange={(event) => onConstructorValuesChange({ ...constructorValues, [name]: event.target.value })}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No user constructor parameters.</p>
        )}
      </section>

      <section className="flex min-h-0 flex-col justify-between gap-4 rounded-md border bg-background p-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">Deploy</h2>
          </div>
          <p className="text-sm text-muted-foreground">Wallet signed create tx</p>
        </div>
        <Button type="button" disabled={!hasTarget || isDeploying} onClick={onDeploy}>
          {isDeploying ? "Deploying..." : "Deploy"}
        </Button>
      </section>
    </div>
  );
}
