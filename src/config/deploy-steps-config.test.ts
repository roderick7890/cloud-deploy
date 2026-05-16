import { describe, expect, it } from "vitest";
import { deploySteps } from "./deploy-steps-config";

describe("deploySteps", () => {
  it("keeps the MVP workflow in order", () => {
    expect(deploySteps.map((step) => step.id)).toEqual(["upload", "build", "review", "deploy"]);
  });

  it("uses stable labels for the progress UI", () => {
    expect(deploySteps.map((step) => step.label)).toEqual(["Upload", "Build", "Review", "Deploy"]);
  });
});
