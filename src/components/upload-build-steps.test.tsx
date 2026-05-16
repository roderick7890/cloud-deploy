import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { BuildStep } from "./build-step";
import { UploadStep } from "./upload-step";

describe("UploadStep and BuildStep", () => {
  it("reports uploaded project metadata", async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();
    renderWithProviders(<UploadStep onUpload={onUpload} onContinue={vi.fn()} metadata={null} />);

    await user.upload(screen.getByLabelText("Project archive"), new File(["abc"], "cloud.zip", { type: "application/zip" }));

    expect(onUpload).toHaveBeenCalledWith(expect.objectContaining({
      metadata: { name: "cloud.zip", fileCount: 1, totalSize: 3 }
    }));
  });

  it("renders constructor fields before build", () => {
    renderWithProviders(
      <BuildStep
        constructorFields={[{ name: "owner", type: "address" }]}
        constructorValues={{ owner: "" }}
        onConstructorValuesChange={vi.fn()}
        onBuild={vi.fn()}
        canBuild
        error={null}
      />
    );

    expect(screen.getByLabelText("owner")).toBeInTheDocument();
  });
});
