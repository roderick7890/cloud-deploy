import { SettingsDialog } from "@/components/shared/settings-dialog";
import { useSettingsStore } from "@/store/settings-store";

type WorkbenchSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function WorkbenchSettingsDialog({ open, onOpenChange }: WorkbenchSettingsDialogProps) {
  const settings = useSettingsStore();

  return (
    <SettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      settings={{
        rpcEndpoint: settings.rpcEndpoint,
        lyquidId: settings.lyquidId,
        abi: settings.abi,
        buildMethod: settings.buildMethod,
        deployMethod: settings.deployMethod
      }}
      methodOptions={settings.methodOptions}
      methodErrors={settings.methodErrors}
      onSave={settings.saveSettings}
    />
  );
}
