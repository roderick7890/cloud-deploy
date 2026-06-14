import { useState } from "react";
import type { DefaultSettings } from "@/config/default-settings-config";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type SettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: DefaultSettings;
  methodOptions?: unknown[];
  methodErrors?: unknown;
  onSave: (settings: DefaultSettings) => void;
};

export function SettingsDialog({ open, onOpenChange, settings, onSave }: SettingsDialogProps) {
  const [draft, setDraft] = useState(settings);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent key={open ? `${settings.rpcEndpoint}:${settings.bartenderAddress}` : "closed"} className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Configure the RPC endpoint and network Bartender contract address.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="rpc-endpoint">RPC Endpoint</Label>
            <Input className="w-full" id="rpc-endpoint" value={draft.rpcEndpoint} onChange={(event) => setDraft({ ...draft, rpcEndpoint: event.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bartender-address">Bartender Contract Address</Label>
            <Input
              className="w-full"
              id="bartender-address"
              value={draft.bartenderAddress}
              onChange={(event) => setDraft({ ...draft, bartenderAddress: event.target.value })}
            />
          </div>
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
