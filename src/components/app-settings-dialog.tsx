import { SettingsDialog } from "@/components/shared/settings-dialog";
import { useSettingsStore } from "@/store/settings-store";

type AppSettingsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AppSettingsDialog({ open, onOpenChange }: AppSettingsDialogProps) {
  const settings = useSettingsStore();

  return (
    <SettingsDialog
      open={open}
      onOpenChange={onOpenChange}
      settings={{
        rpcEndpoint: settings.rpcEndpoint,
        bartenderAddress: settings.bartenderAddress,
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
