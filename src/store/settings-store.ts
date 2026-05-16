import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultSettings, type DefaultSettings } from "@/config/default-settings-config";
import { settingsStorageKey, settingsVersion } from "@/config/storage-config";
import type { AbiDerivedState } from "@/types/abi";
import { deriveAbiState } from "@/utils/abi/abi-utils";

type SettingsState = DefaultSettings & AbiDerivedState & {
  saveSettings: (settings: DefaultSettings) => void;
};

function deriveSettings(settings: DefaultSettings) {
  return {
    ...settings,
    ...deriveAbiState(settings)
  };
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...deriveSettings(defaultSettings),
      saveSettings: (settings) => set(deriveSettings(settings))
    }),
    {
      name: settingsStorageKey,
      version: settingsVersion,
      partialize: (state) => ({
        rpcEndpoint: state.rpcEndpoint,
        lyquidId: state.lyquidId,
        abi: state.abi,
        buildMethod: state.buildMethod,
        deployMethod: state.deployMethod
      }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.saveSettings({
            rpcEndpoint: state.rpcEndpoint,
            lyquidId: state.lyquidId,
            abi: state.abi,
            buildMethod: state.buildMethod,
            deployMethod: state.deployMethod
          });
        }
      }
    }
  )
);
