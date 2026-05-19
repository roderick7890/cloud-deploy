import type { AbiMethodOption } from "@/types/abi";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type AbiMethodSelectProps = {
  id: string;
  label: string;
  methods: AbiMethodOption[];
  value: string;
  onValueChange: (value: string) => void;
  missingMessage?: string;
};

export function AbiMethodSelect({ id, label, methods, value, onValueChange, missingMessage }: AbiMethodSelectProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="w-full" id={id} aria-invalid={Boolean(missingMessage)}>
          <SelectValue placeholder="Select ABI method" />
        </SelectTrigger>
        <SelectContent>
          {methods.map((method) => (
            <SelectItem key={method.value} value={method.value}>
              {method.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {missingMessage ? <p className="text-caption text-destructive">{missingMessage}</p> : null}
    </div>
  );
}
