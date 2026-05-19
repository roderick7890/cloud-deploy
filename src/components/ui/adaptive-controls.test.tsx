import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  AlertDialog,
  AlertDialogContent
} from "@/components/ui/alert-dialog";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { renderWithProviders } from "@/test/render";

function expectNoFixedBoxClasses(className: string) {
  const classes = className.split(/\s+/);

  expect(classes).not.toContain("h-9");
  expect(classes).not.toContain("h-10");
  expect(classes).not.toContain("w-9");
  expect(classes).not.toContain("w-full");
  expect(classes.some((item) => item.startsWith("min-h"))).toBe(false);
  expect(classes.some((item) => item.startsWith("min-w"))).toBe(false);
}

describe("adaptive shadcn controls", () => {
  it("uses content-sized buttons by default", () => {
    expectNoFixedBoxClasses(buttonVariants());
    expectNoFixedBoxClasses(buttonVariants({ size: "default" }));
    expect(buttonVariants()).toContain("px-4");
    expect(buttonVariants()).toContain("py-2");

    renderWithProviders(<Button>Deploy selected target</Button>);

    expectNoFixedBoxClasses(screen.getByRole("button").className);
  });

  it("keeps the icon button size fixed", () => {
    expect(buttonVariants({ size: "icon" })).toContain("h-9");
    expect(buttonVariants({ size: "icon" })).toContain("w-9");
  });

  it("does not force fixed box classes on text inputs", () => {
    renderWithProviders(
      <>
        <Input aria-label="RPC endpoint" />
        <Textarea aria-label="ABI" />
        <Select>
          <SelectTrigger aria-label="Build Method">
            <SelectValue placeholder="Build Method" />
          </SelectTrigger>
        </Select>
      </>
    );

    expectNoFixedBoxClasses(screen.getByLabelText("RPC endpoint").className);
    expectNoFixedBoxClasses(screen.getByLabelText("ABI").className);
    expectNoFixedBoxClasses(screen.getByRole("combobox", { name: "Build Method" }).className);
  });

  it("uses flex dialog layout instead of grid", () => {
    renderWithProviders(
      <>
        <Dialog open>
          <DialogContent>Settings</DialogContent>
        </Dialog>
        <AlertDialog open>
          <AlertDialogContent>Confirm</AlertDialogContent>
        </AlertDialog>
      </>
    );

    expect(screen.getByText("Settings")).toHaveClass("flex", "flex-col");
    expect(screen.getByText("Settings")).not.toHaveClass("grid");
    expect(screen.getByText("Confirm")).toHaveClass("flex", "flex-col");
    expect(screen.getByText("Confirm")).not.toHaveClass("grid");
  });
});
