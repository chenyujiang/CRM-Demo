import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";

import { ToastProvider, useToast } from "@/contexts/ToastContext";

function TestHarness() {
  const { showToast } = useToast();
  return (
    <div>
      <button onClick={() => showToast("Contact saved")}>Trigger success</button>
      <button onClick={() => showToast("Something went wrong", "error")}>Trigger error</button>
    </div>
  );
}

describe("ToastContext", () => {
  test("shows a toast when triggered", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: /trigger success/i }));

    expect(await screen.findByText("Contact saved")).toBeInTheDocument();
  });

  test("distinguishes an error toast from a success toast", async () => {
    const user = userEvent.setup();
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    );

    await user.click(screen.getByRole("button", { name: /trigger error/i }));

    const toast = await screen.findByText("Something went wrong");
    expect(toast.closest('[role="status"]')).toHaveAttribute("data-variant", "error");
  });

  test("auto-dismisses a toast after a delay", () => {
    vi.useFakeTimers();
    render(
      <ToastProvider>
        <TestHarness />
      </ToastProvider>,
    );

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: /trigger success/i }));
    });
    expect(screen.getByText("Contact saved")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(screen.queryByText("Contact saved")).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  test("throws when used outside a ToastProvider", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestHarness />)).toThrow(/ToastProvider/);
    consoleError.mockRestore();
  });
});
