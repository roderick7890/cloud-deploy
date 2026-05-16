import { create } from "zustand";
import { persist } from "zustand/middleware";
import { defaultSettings, type DefaultSettings } from "@/config/default-settings-config";
import { settingsStorageKey, settingsVersion } from "@/config/storage-config";
import type { AbiMethodOption, ConstructorField, ParsedAbi } from "@/types/abi";
import { getConstructorFields, getMethodOptions, methodExists, parseAbiSource } from "@/utils/abi/abi-utils";

type MethodErrors = {
  buildMethod?: string;
  deployMethod?: string;
  abi?: string;
};

type SettingsState = DefaultSettings & {
  parsedAbi: ParsedAbi | null;
  methodOptions: AbiMethodOption[];
  constructorFields: ConstructorField[];
  methodErrors: MethodErrors;
  saveSettings: (settings: DefaultSettings) => void;
};

function deriveSettings(settings: DefaultSettings) {
  try {
    const parsedAbi = parseAbiSource(settings.abi);
    const methodOptions = getMethodOptions(parsedAbi);
    const constructorFields = getConstructorFields(parsedAbi);
    const methodErrors: MethodErrors = {};

    if (settings.buildMethod && !methodExists(parsedAbi, settings.buildMethod)) {
      methodErrors.buildMethod = "Build method does not exist.";
    }

    if (settings.deployMethod && !methodExists(parsedAbi, settings.deployMethod)) {
      methodErrors.deployMethod = "Deploy method does not exist.";
    }

    return {
      ...settings,
      parsedAbi,
      methodOptions,
      constructorFields,
      methodErrors
    };
  } catch (error) {
    return {
      ...settings,
      parsedAbi: null,
      methodOptions: [],
      constructorFields: [],
      methodErrors: {
        abi: error instanceof Error ? error.message : "Invalid ABI JSON"
      }
    };
  }
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
