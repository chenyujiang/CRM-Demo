import * as React from "react";

import { cn } from "@/lib/utils";

export type ToastVariant = "success" | "error";

interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = React.createContext<ToastContextValue | null>(null);

const TOAST_DURATION_MS = 4000;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>([]);
  const nextId = React.useRef(1);

  const showToast = React.useCallback((message: string, variant: ToastVariant = "success") => {
    const id = nextId.current++;
    setToasts((current) => [...current, { id, message, variant }]);
    setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, TOAST_DURATION_MS);
  }, []);

  const value = React.useMemo<ToastContextValue>(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div aria-live="polite" className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="status"
            data-variant={toast.variant}
            className={cn(
              "rounded-md border px-4 py-2 text-sm shadow-lg",
              toast.variant === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-destructive/50 bg-destructive/10 text-destructive",
            )}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}

/**
 * Runs a delete action, toasting the outcome — the same
 * try/succeed-toast/catch-and-toast-error shape every delete handler needs.
 */
export async function deleteWithToast(
  action: () => Promise<void>,
  successMessage: string,
  failureMessage: string,
  showToast: ToastContextValue["showToast"],
): Promise<void> {
  try {
    await action();
    showToast(successMessage);
  } catch (err) {
    showToast(err instanceof Error ? err.message : failureMessage, "error");
  }
}
