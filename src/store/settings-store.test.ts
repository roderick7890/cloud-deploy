import { beforeEach, describe, expect, it } from "vitest";
import { lyquidTestAbi } from "@/test/test-abi";
import { useSettingsStore } from "./settings-store";

describe("settings-store", () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.setState(useSettingsStore.getInitialState(), true);
  });

  it("persists only settings", () => {
    useSettingsStore.getState().saveSettings({
      rpcEndpoint: "http://localhost:8545",
      lyquidId: "lyquid-1",
      abi: lyquidTestAbi,
      buildMethod: "compileProject(bytes)",
      deployMethod: "publishProject(bytes)"
    });

    const raw = localStorage.getItem("cloud-deploy-settings");
    expect(raw).toContain("rpcEndpoint");
    expect(raw).not.toContain("buildResult");
    expect(raw).not.toContain("uploadedProject");
  });

  it("reports missing selected methods after ABI changes", () => {
    useSettingsStore.getState().saveSettings({
      rpcEndpoint: "",
      lyquidId: "",
      abi: lyquidTestAbi,
      buildMethod: "compileProject(bytes)",
      deployMethod: "publishProject(bytes)"
    });

    useSettingsStore.getState().saveSettings({
      rpcEndpoint: "",
      lyquidId: "",
      abi: "[]",
      buildMethod: "compileProject(bytes)",
      deployMethod: "publishProject(bytes)"
    });

    expect(useSettingsStore.getState().methodErrors).toEqual({
      buildMethod: "Build method does not exist.",
      deployMethod: "Deploy method does not exist."
    });
  });

  it("derives method options from current ABI", () => {
    useSettingsStore.getState().saveSettings({
      rpcEndpoint: "",
      lyquidId: "",
      abi: lyquidTestAbi,
      buildMethod: "",
      deployMethod: ""
    });

    expect(useSettingsStore.getState().methodOptions.map((option) => option.value)).toContain("compileProject(bytes)");
  });
});
