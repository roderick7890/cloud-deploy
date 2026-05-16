import { beforeEach, describe, expect, it } from "vitest";
import { useDeploySessionStore } from "./deploy-session-store";

describe("deploy-session-store", () => {
  beforeEach(() => {
    useDeploySessionStore.setState(useDeploySessionStore.getInitialState(), true);
  });

  it("moves forward and backward through deploy steps", () => {
    useDeploySessionStore.getState().goToNextStep();
    expect(useDeploySessionStore.getState().currentStep).toBe("build");
    useDeploySessionStore.getState().goToPreviousStep();
    expect(useDeploySessionStore.getState().currentStep).toBe("upload");
  });

  it("clears downstream runtime state when project changes", () => {
    useDeploySessionStore.getState().setBuildResult({ hashes: {}, logs: [], raw: { ok: true } });
    useDeploySessionStore.getState().setReviewPayload({ hashes: {}, payload: { ready: true } });
    useDeploySessionStore.getState().setDeployResult({ status: "success", raw: { ok: true } });

    useDeploySessionStore.getState().setUploadedProject({
      metadata: { name: "cloud", fileCount: 1, totalSize: 3 },
      files: [new File(["abc"], "Cargo.toml")],
      rootName: "cloud",
      tree: [],
      tomlFiles: [],
      selectedTomlPath: "Cargo.toml"
    });

    expect(useDeploySessionStore.getState().buildResult).toBeNull();
    expect(useDeploySessionStore.getState().reviewPayload).toBeNull();
    expect(useDeploySessionStore.getState().deployResult).toBeNull();
  });

  it("does not persist runtime state", () => {
    useDeploySessionStore.getState().setCurrentError("Encoding failed");
    expect(localStorage.getItem("cloud-deploy-session")).toBeNull();
  });
});
