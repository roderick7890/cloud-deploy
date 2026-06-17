import { beforeEach, describe, expect, it } from "vitest";
import { lyquidTestAbi } from "@/test/test-abi";
import { getInitialSettings, useSettingsStore } from "./settings-store";

describe("settings-store", () => {
  beforeEach(() => {
    localStorage.clear();
    useSettingsStore.setState(useSettingsStore.getInitialState(), true);
  });

  it("persists only settings", () => {
    useSettingsStore.getState().saveSettings({
      rpcEndpoint: "http://localhost:8545",
      bartenderAddress: "0x0000000000000000000000000000000000000001",
      abi: lyquidTestAbi,
      buildMethod: "compileProject(bytes)",
      deployMethod: "publishProject(bytes)"
    });

    const raw = localStorage.getItem("cloud-deploy-settings");
    expect(raw).toContain("rpcEndpoint");
    expect(raw).toContain("bartenderAddress");
    expect(raw).not.toContain("buildResult");
    expect(raw).not.toContain("uploadedProject");
  });

  it("reports missing selected methods after ABI changes", () => {
    useSettingsStore.getState().saveSettings({
      rpcEndpoint: "",
      bartenderAddress: "",
      abi: lyquidTestAbi,
      buildMethod: "compileProject(bytes)",
      deployMethod: "publishProject(bytes)"
    });

    useSettingsStore.getState().saveSettings({
      rpcEndpoint: "",
      bartenderAddress: "",
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
      bartenderAddress: "",
      abi: lyquidTestAbi,
      buildMethod: "",
      deployMethod: ""
    });

    expect(useSettingsStore.getState().methodOptions.map((option) => option.value)).toContain("compileProject(bytes)");
  });

  it("uses the hosted devnet node endpoint when no endpoint is persisted", () => {
    expect(
      getInitialSettings(
        {
          rpcEndpoint: "",
          bartenderAddress: "",
          abi: "[]",
          buildMethod: "",
          deployMethod: ""
        },
        "ss7x5edzcxjszfykf3edlyl44etxn256htzqa.2folhfgf4kuyfdenaq3l4dnamv7yxrnqq3zbp64thfa5esqgxhv6wzqa.devnet-alpha.lyquor.dev"
      ).rpcEndpoint
    ).toBe(
      "https://2folhfgf4kuyfdenaq3l4dnamv7yxrnqq3zbp64thfa5esqgxhv6wzqa.devnet-alpha.lyquor.dev/api"
    );
  });
});
