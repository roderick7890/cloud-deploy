import { fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { lyquidTestAbi } from "@/test/test-abi";
import { renderWithProviders } from "@/test/render";
import { parseAbiSource, getMethodOptions } from "@/utils/abi/abi-utils";
import { AbiMethodSelect } from "./abi-method-select";
import { ConstructorParamsForm } from "./constructor-params-form";
import { PayloadReviewPanel } from "./payload-review-panel";
import { ProgressSteps } from "./progress-steps";
import { ResultSummary } from "./result-summary";
import { SettingsDialog } from "./settings-dialog";

describe("shared components", () => {
  it("shows ABI method select errors", () => {
    const parsed = parseAbiSource(lyquidTestAbi);
    renderWithProviders(
      <AbiMethodSelect
        id="build-method"
        label="Build Method"
        methods={getMethodOptions(parsed)}
        value="missing(bytes)"
        onValueChange={vi.fn()}
        missingMessage="Build method does not exist."
      />
    );

    expect(screen.getByText("Build method does not exist.")).toBeInTheDocument();
  });

  it("updates method options from a valid ABI draft before settings are saved", async () => {
    Element.prototype.scrollIntoView = vi.fn();

    renderWithProviders(
      <SettingsDialog
        open
        onOpenChange={vi.fn()}
        settings={{ rpcEndpoint: "", lyquidId: "", abi: "[]", buildMethod: "", deployMethod: "" }}
        methodOptions={[]}
        methodErrors={{}}
        onSave={vi.fn()}
      />
    );

    fireEvent.change(screen.getByLabelText("ABI"), { target: { value: lyquidTestAbi } });
    fireEvent.keyDown(screen.getByRole("combobox", { name: "Build Method" }), { key: "ArrowDown" });

    expect(await screen.findByText("compileProject(bytes)")).toBeInTheDocument();
  });

  it("renders constructor inputs and reports values", async () => {
    const user = userEvent.setup();
    const onValuesChange = vi.fn();
    let values: Record<string, string> = { owner: "" };
    const { rerender } = renderWithProviders(
      <ConstructorParamsForm
        constructorFields={[{ name: "owner", type: "address" }]}
        values={values}
        onValuesChange={(nextValues) => {
          values = nextValues;
          onValuesChange(nextValues);
          rerender(
            <ConstructorParamsForm
              constructorFields={[{ name: "owner", type: "address" }]}
              values={values}
              onValuesChange={(updatedValues) => {
                values = updatedValues;
                onValuesChange(updatedValues);
              }}
            />
          );
        }}
      />
    );

    await user.clear(screen.getByLabelText("owner"));
    await user.type(screen.getByLabelText("owner"), "3");
    expect(onValuesChange).toHaveBeenCalledWith({ owner: "3" });
  });

  it("renders deploy progress labels", () => {
    renderWithProviders(
      <ProgressSteps
        steps={[
          { id: "upload", label: "Upload", description: "Upload" },
          { id: "build", label: "Build", description: "Build" },
          { id: "review", label: "Review", description: "Review" },
          { id: "deploy", label: "Deploy", description: "Deploy" }
        ]}
        currentStep="review"
        completedSteps={["upload", "build"]}
        onStepBack={vi.fn()}
      />
    );

    expect(screen.getByText("Review")).toBeInTheDocument();
  });

  it("shows available review hashes without inventing missing fields", () => {
    renderWithProviders(
      <PayloadReviewPanel
        hashes={{ sourceHash: "0x1234567890abcdef" }}
        payload={{ ok: true }}
        onCopy={vi.fn()}
        onDownload={vi.fn()}
      />
    );

    expect(screen.getByText("0x1234...cdef")).toBeInTheDocument();
    expect(screen.queryByText("artifactHash")).not.toBeInTheDocument();
  });

  it("keeps long review JSON lines horizontally scrollable", () => {
    const { container } = renderWithProviders(
      <PayloadReviewPanel
        hashes={{ sourceHash: "0x1234567890abcdef" }}
        payload={{ raw: { result: "0x".padEnd(180, "a") } }}
        onCopy={vi.fn()}
        onDownload={vi.fn()}
      />
    );

    expect(container.querySelector('[data-json-scroll-content="true"]')).toHaveClass("overflow-x-auto");
    expect(container.querySelector("pre")).toHaveClass("w-max", "min-w-full", "whitespace-pre");
  });

  it("keeps long deploy result JSON lines horizontally scrollable", () => {
    const { container } = renderWithProviders(
      <ResultSummary
        result={{
          status: "submitted",
          raw: {
            jsonrpc: "2.0",
            result: "0x".padEnd(180, "b")
          }
        }}
      />
    );

    expect(container.querySelector('[data-json-scroll-content="true"]')).toHaveClass("overflow-x-auto");
    expect(container.querySelector("pre")).toHaveClass("w-max", "min-w-full", "whitespace-pre");
  });
});
