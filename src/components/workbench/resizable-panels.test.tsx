import { fireEvent, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/render";
import { ResizeHandle } from "./resizable-panels";

describe("ResizeHandle", () => {
  it("calls drag callbacks for pointer movement", () => {
    const onDrag = vi.fn();
    renderWithProviders(<ResizeHandle ariaLabel="Resize panes" onDrag={onDrag} />);

    const handle = screen.getByRole("separator", { name: "Resize panes" });
    fireEvent.pointerDown(handle, { clientX: 100, clientY: 100 });
    fireEvent.pointerMove(window, { clientX: 130, clientY: 120 });
    fireEvent.pointerUp(window);

    expect(onDrag).toHaveBeenCalledWith({ deltaX: 30, deltaY: 20 });
  });
});
