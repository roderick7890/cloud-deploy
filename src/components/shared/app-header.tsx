import { Settings } from "lucide-react";
import { appName } from "@/config/app-config";
import { Button } from "@/components/ui/button";

type AppHeaderProps = {
  walletLabel: string;
  onConnectWallet: () => void;
  onOpenSettings: () => void;
};

export function AppHeader({ walletLabel, onConnectWallet, onOpenSettings }: AppHeaderProps) {
  return (
    <header className="flex h-toolbar items-center justify-between border-b bg-card px-6">
      <h1 className="text-lg font-semibold">{appName}</h1>
      <div className="flex items-center gap-2">
        <Button type="button" variant="outline" onClick={onConnectWallet}>
          {walletLabel}
        </Button>
        <Button type="button" variant="ghost" size="icon" onClick={onOpenSettings} aria-label="Settings">
          <Settings className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
