import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { DeployStep } from "./deploy-step";
import { ReviewStep } from "./review-step";

describe("ReviewStep and DeployStep", () => {
  it("renders review payload actions", () => {
    renderWithProviders(
      <ReviewStep
        reviewPayload={{ hashes: { sourceHash: "0x1234567890abcdef" }, payload: { ok: true } }}
        onCopy={vi.fn()}
        onDownload={vi.fn()}
        onContinue={vi.fn()}
      />
    );

    expect(screen.getByText("Copy JSON")).toBeInTheDocument();
    expect(screen.getByText("Download JSON")).toBeInTheDocument();
  });

  it("asks for update confirmation when lyquidId exists", async () => {
    const user = userEvent.setup();
    const onDeploy = vi.fn();
    renderWithProviders(<DeployStep lyquidId="lyquid-1" result={null} onDeploy={onDeploy} error={null} />);

    await user.click(screen.getByRole("button", { name: "Deploy" }));
    expect(screen.getByText("Deploy as update to this Lyquid?")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Deploy as Update" }));
    expect(onDeploy).toHaveBeenCalledTimes(1);
  });
});
