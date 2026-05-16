import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("global shadcn theme tokens", () => {
  it("defines popover colors used by SelectContent", () => {
    const globalsCss = readFileSync(join(process.cwd(), "src/styles/globals.css"), "utf8");
    const tailwindConfig = readFileSync(join(process.cwd(), "tailwind.config.ts"), "utf8");

    expect(globalsCss).toContain("--popover:");
    expect(globalsCss).toContain("--popover-foreground:");
    expect(tailwindConfig).toContain("popover:");
    expect(tailwindConfig).toContain("--popover");
  });
});
