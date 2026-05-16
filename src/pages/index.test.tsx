import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { lyquidTestAbi } from "@/test/test-abi";
import { renderWithProviders } from "@/test/render";
import { useDeploySessionStore } from "@/store/deploy-session-store";
import { useSettingsStore } from "@/store/settings-store";
import HomePage from "./index";

vi.mock("wagmi", () => ({
  useAccount: () => ({ address: undefined }),
  useConnect: () => ({ connect: vi.fn() })
}));

vi.mock("wagmi/connectors", () => ({
  injected: () => ({ id: "injected" })
}));

describe("HomePage", () => {
  beforeEach(() => {
    useDeploySessionStore.setState(useDeploySessionStore.getInitialState(), true);
    useSettingsStore.setState(useSettingsStore.getInitialState(), true);
    useSettingsStore.getState().saveSettings({
      rpcEndpoint: "http://localhost:8545",
      lyquidId: "",
      abi: lyquidTestAbi,
      buildMethod: "compileProject(bytes)",
      deployMethod: "publishProject(bytes)"
    });
  });

  it("renders upload as the first step", () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText("Cloud Deploy")).toBeInTheDocument();
    expect(screen.getByLabelText("Project archive")).toBeInTheDocument();
  });

  it("moves from upload to build", async () => {
    const user = userEvent.setup();
    renderWithProviders(<HomePage />);
    await user.upload(screen.getByLabelText("Project archive"), new File(["abc"], "cloud.zip"));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(screen.getByRole("button", { name: "Build" })).toBeInTheDocument();
  });
});
