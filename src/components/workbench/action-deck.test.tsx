import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { ActionDeck } from "./action-deck";

describe("ActionDeck", () => {
  it("asks for a TOML target before showing build and deploy actions", () => {
    renderWithProviders(<ActionDeck selectedTomlPath="" isBuilding={false} isDeploying={false} onBuild={vi.fn()} onDeploy={vi.fn()} />);

    expect(screen.getByText("Select a TOML target to build or deploy.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Build" })).not.toBeInTheDocument();
  });

  it("renders build and deploy cards for a selected target", async () => {
    const user = userEvent.setup();
    const onBuild = vi.fn();
    const onDeploy = vi.fn();

    renderWithProviders(<ActionDeck selectedTomlPath="demo/Cargo.toml" isBuilding={false} isDeploying={false} onBuild={onBuild} onDeploy={onDeploy} />);

    await user.click(screen.getByRole("button", { name: "Build" }));
    await user.click(screen.getByRole("button", { name: "Deploy" }));

    expect(onBuild).toHaveBeenCalledOnce();
    expect(onDeploy).toHaveBeenCalledOnce();
  });

  it("shows loading labels while actions are pending", () => {
    renderWithProviders(<ActionDeck selectedTomlPath="demo/Cargo.toml" isBuilding isDeploying onBuild={vi.fn()} onDeploy={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Building..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Deploying..." })).toBeDisabled();
  });
});
