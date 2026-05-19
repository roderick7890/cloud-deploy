import { useMemo, useState } from "react";
import type { DefaultSettings } from "@/config/default-settings-config";
import type { AbiMethodErrors, AbiMethodOption } from "@/types/abi";
import { deriveAbiState } from "@/utils/abi/abi-utils";
import { AbiMethodSelect } from "./abi-method-select";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: DefaultSettings;
  methodOptions: AbiMethodOption[];
  methodErrors: AbiMethodErrors;
  onSave: (settings: DefaultSettings) => void;
};

export function SettingsDialog({ open, onOpenChange, settings, methodOptions, methodErrors, onSave }: SettingsDialogProps) {
  const [draft, setDraft] = useState(settings);
  const draftAbiState = useMemo(() => deriveAbiState(draft), [draft]);
  const visibleMethodOptions = draft.abi === settings.abi ? methodOptions : draftAbiState.methodOptions;
  const visibleMethodErrors = draft.abi === settings.abi && draft.buildMethod === settings.buildMethod && draft.deployMethod === settings.deployMethod ? methodErrors : draftAbiState.methodErrors;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent key={open ? JSON.stringify(settings) : "closed"} className="max-h-screen overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Configure the RPC endpoint, Lyquid ID, ABI, and selected ABI methods.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rpc-endpoint">RPC Endpoint</Label>
            <Input className="w-full" id="rpc-endpoint" value={draft.rpcEndpoint} onChange={(event) => setDraft({ ...draft, rpcEndpoint: event.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lyquid-id">Lyquid ID</Label>
            <Input className="w-full" id="lyquid-id" value={draft.lyquidId} onChange={(event) => setDraft({ ...draft, lyquidId: event.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="abi">ABI</Label>
            <Textarea className="w-full" id="abi" rows={8} value={draft.abi} onChange={(event) => setDraft({ ...draft, abi: event.target.value })} aria-invalid={Boolean(visibleMethodErrors.abi)} />
            {visibleMethodErrors.abi ? <p className="text-caption text-destructive">{visibleMethodErrors.abi}</p> : null}
          </div>
          <AbiMethodSelect
            id="build-method"
            label="Build Method"
            methods={visibleMethodOptions}
            value={draft.buildMethod}
            onValueChange={(buildMethod) => setDraft({ ...draft, buildMethod })}
            missingMessage={visibleMethodErrors.buildMethod}
          />
          <AbiMethodSelect
            id="deploy-method"
            label="Deploy Method"
            methods={visibleMethodOptions}
            value={draft.deployMethod}
            onValueChange={(deployMethod) => setDraft({ ...draft, deployMethod })}
            missingMessage={visibleMethodErrors.deployMethod}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => {
              onSave(draft);
              onOpenChange(false);
            }}
          >
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
