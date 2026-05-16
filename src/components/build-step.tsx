import type { ConstructorField } from "@/types/abi";
import { Button } from "@/components/ui/button";
import { ConstructorParamsForm } from "@/components/shared/constructor-params-form";

type BuildStepProps = {
  constructorFields: ConstructorField[];
  constructorValues: Record<string, string>;
  onConstructorValuesChange: (values: Record<string, string>) => void;
  onBuild: () => void;
  canBuild: boolean;
  error: string | null;
};

export function BuildStep({ constructorFields, constructorValues, onConstructorValuesChange, onBuild, canBuild, error }: BuildStepProps) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <ConstructorParamsForm constructorFields={constructorFields} values={constructorValues} onValuesChange={onConstructorValuesChange} />
      {error ? <p className="rounded-md border border-destructive bg-card p-3 text-sm text-destructive">{error}</p> : null}
      <div className="flex justify-end">
        <Button type="button" disabled={!canBuild} onClick={onBuild}>
          Build
        </Button>
      </div>
    </div>
  );
}
