import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("global shadcn theme tokens", () => {
  it("defines Tailwind v4 CSS theme tokens used by shadcn components", () => {
    const globalsCss = readFileSync(join(process.cwd(), "src/styles/globals.css"), "utf8");

    expect(globalsCss).toContain('@import "tailwindcss" source(none);');
    expect(globalsCss).toContain('@source "../**/*.{ts,tsx}";');
    expect(globalsCss).toContain("--popover:");
    expect(globalsCss).toContain("--popover-foreground:");
    expect(globalsCss).toContain("--color-popover: hsl(var(--popover));");
    expect(globalsCss).toContain("--color-popover-foreground: hsl(var(--popover-foreground));");
  });
});
