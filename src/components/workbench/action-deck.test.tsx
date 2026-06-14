import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { ActionDeck } from "./action-deck";

describe("ActionDeck", () => {
  it("keeps prepare and deploy actions visible before an artifact is selected", () => {
    renderWithProviders(
      <ActionDeck
        selectedArtifactPath=""
        constructorFields={[]}
        constructorValues={{}}
        isBuilding={false}
        isDeploying={false}
        onConstructorValuesChange={vi.fn()}
        onBuild={vi.fn()}
        onDeploy={vi.fn()}
      />
    );

    expect(screen.getByText("No artifact selected")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Prepare" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Deploy" })).toBeDisabled();
  });

  it("renders prepare and deploy cards for a selected artifact", async () => {
    const user = userEvent.setup();
    const onBuild = vi.fn();
    const onDeploy = vi.fn();

    renderWithProviders(
      <ActionDeck
        selectedArtifactPath="demo/deploy.json"
        constructorFields={[]}
        constructorValues={{}}
        isBuilding={false}
        isDeploying={false}
        onConstructorValuesChange={vi.fn()}
        onBuild={onBuild}
        onDeploy={onDeploy}
      />
    );

    await user.click(screen.getByRole("button", { name: "Prepare" }));
    await user.click(screen.getByRole("button", { name: "Deploy" }));

    expect(onBuild).toHaveBeenCalledOnce();
    expect(onDeploy).toHaveBeenCalledOnce();
  });

  it("shows loading labels while actions are pending", () => {
    renderWithProviders(
      <ActionDeck
        selectedArtifactPath="demo/deploy.json"
        constructorFields={[]}
        constructorValues={{}}
        isBuilding
        isDeploying
        onConstructorValuesChange={vi.fn()}
        onBuild={vi.fn()}
        onDeploy={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Preparing..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Deploying..." })).toBeDisabled();
  });
});
