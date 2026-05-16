import type { ConstructorField } from "@/types/abi";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ConstructorParamsFormProps = {
  constructorFields: ConstructorField[];
  values: Record<string, string>;
  onValuesChange: (values: Record<string, string>) => void;
};

export function ConstructorParamsForm({ constructorFields, values, onValuesChange }: ConstructorParamsFormProps) {
  if (constructorFields.length === 0) {
    return <p className="text-sm text-muted-foreground">No constructor parameters.</p>;
  }

  return (
    <div className="space-y-4">
      {constructorFields.map((field) => (
        <div key={field.name} className="space-y-2">
          <Label htmlFor={`constructor-${field.name}`}>{field.name}</Label>
          <Input
            id={`constructor-${field.name}`}
            value={values[field.name] ?? ""}
            placeholder={field.type}
            onChange={(event) => onValuesChange({ ...values, [field.name]: event.target.value })}
          />
        </div>
      ))}
    </div>
  );
}
