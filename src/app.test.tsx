import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { App } from "./app";

vi.mock("@/components/providers/web3-provider", () => ({
  Web3Provider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

vi.mock("@/pages/index", () => ({
  default: () => <div>Home route</div>
}));

vi.mock("@/pages/legacy", () => ({
  default: () => <div>Legacy route</div>
}));

describe("App routing", () => {
  it("matches the artifact workbench at the root path", () => {
    window.history.pushState({}, "", "/");

    renderWithProviders(<App />);

    expect(screen.getByText("Home route")).toBeInTheDocument();
  });

  it("matches legacy under the GitHub Pages base path", () => {
    window.history.pushState({}, "", "/cloud-deploy/legacy");

    renderWithProviders(<App />);

    expect(screen.getByText("Legacy route")).toBeInTheDocument();
  });

  it("matches legacy under the GitHub Pages base path with a trailing slash", () => {
    window.history.pushState({}, "", "/cloud-deploy/legacy/");

    renderWithProviders(<App />);

    expect(screen.getByText("Legacy route")).toBeInTheDocument();
  });
});
