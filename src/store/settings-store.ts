import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultSettings, type DefaultSettings } from "@/config/default-settings-config";
import { settingsStorageKey, settingsVersion } from "@/config/storage-config";
import type { AbiDerivedState } from "@/types/abi";
import { deriveAbiState } from "@/utils/abi/abi-utils";
import { getHostedNodeEndpoint } from "@/utils/hosted-node-utils";

type SettingsState = DefaultSettings & AbiDerivedState & {
  saveSettings: (settings: DefaultSettings) => void;
};

function deriveSettings(settings: DefaultSettings) {
  return {
    ...settings,
    ...deriveAbiState(settings)
  };
}

export function getInitialSettings(settings: DefaultSettings, hostname?: string) {
  return {
    ...settings,
    rpcEndpoint: settings.rpcEndpoint || getHostedNodeEndpoint(hostname)
  };
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...deriveSettings(getInitialSettings(defaultSettings)),
      saveSettings: (settings) => set(deriveSettings(settings))
    }),
    {
      name: settingsStorageKey,
      version: settingsVersion,
      partialize: (state) => ({
        rpcEndpoint: state.rpcEndpoint,
        bartenderAddress: state.bartenderAddress,
        abi: state.abi,
        buildMethod: state.buildMethod,
        deployMethod: state.deployMethod
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.saveSettings({
            rpcEndpoint: state.rpcEndpoint || getHostedNodeEndpoint(),
            bartenderAddress: state.bartenderAddress ?? "",
            abi: state.abi,
            buildMethod: state.buildMethod,
            deployMethod: state.deployMethod
          });
        }
      }
    }
  )
);
