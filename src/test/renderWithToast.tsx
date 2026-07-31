import { render, type RenderResult } from "@testing-library/react";
import type { ReactElement } from "react";

import { ToastProvider } from "@/contexts/ToastContext";

/** Renders a page under a real ToastProvider, matching how App.tsx wraps it. */
export function renderWithToast(ui: ReactElement): RenderResult {
  return render(<ToastProvider>{ui}</ToastProvider>);
}
