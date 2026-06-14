import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { ActionDeck } from "./action-deck";

describe("ActionDeck", () => {
  it("keeps deploy disabled before an artifact is selected without showing a prepare action", () => {
    renderWithProviders(
      <ActionDeck
        selectedArtifactPath=""
        constructorFields={[]}
        constructorValues={{}}
        isDeploying={false}
        onConstructorValuesChange={vi.fn()}
        onDeploy={vi.fn()}
      />
    );

    expect(screen.getByText("No artifact selected")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Prepare" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Deploy" })).toBeDisabled();
  });

  it("renders deploy for a selected artifact", async () => {
    const user = userEvent.setup();
    const onDeploy = vi.fn();

    renderWithProviders(
      <ActionDeck
        selectedArtifactPath="demo/deploy.json"
        constructorFields={[]}
        constructorValues={{}}
        isDeploying={false}
        onConstructorValuesChange={vi.fn()}
        onDeploy={onDeploy}
      />
    );

    await user.click(screen.getByRole("button", { name: "Deploy" }));

    expect(onDeploy).toHaveBeenCalledOnce();
  });

  it("shows a loading label while deploy is pending", () => {
    renderWithProviders(
      <ActionDeck
        selectedArtifactPath="demo/deploy.json"
        constructorFields={[]}
        constructorValues={{}}
        isDeploying
        onConstructorValuesChange={vi.fn()}
        onDeploy={vi.fn()}
      />
    );

    expect(screen.getByRole("button", { name: "Deploying..." })).toBeDisabled();
  });
});
