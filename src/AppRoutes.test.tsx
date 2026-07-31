import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test } from "vitest";

import { AppRoutes } from "@/AppRoutes";
import { AuthProvider } from "@/contexts/AuthContext";
import { ToastProvider } from "@/contexts/ToastContext";
import type { authService as realAuthService, Session } from "@/services/authService";

/**
 * A fake implementing the same shape as the real authService — this is the
 * data-service seam in action: UI tests inject this instead of mocking
 * `supabase` or hitting a real network call.
 */
function createFakeAuthService(): typeof realAuthService {
  let session: Session | null = null;
  let listeners: Array<(s: Session | null) => void> = [];

  return {
    async signIn(_email, password) {
      if (password !== "correct-password") {
        throw new Error("Invalid login credentials");
      }
      session = { userId: "fake-user-id", email: _email };
      listeners.forEach((listener) => listener(session));
      return session;
    },
    async signOut() {
      session = null;
      listeners.forEach((listener) => listener(session));
    },
    async getSession() {
      return session;
    },
    onAuthStateChange(callback) {
      listeners.push(callback);
      return () => {
        listeners = listeners.filter((listener) => listener !== callback);
      };
    },
  };
}

function renderApp(authService: typeof realAuthService, initialPath = "/login") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <ToastProvider>
        <AuthProvider authService={authService}>
          <AppRoutes />
        </AuthProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("login flow", () => {
  test("logs in, reaches the app shell, then logs out back to the login screen", async () => {
    const user = userEvent.setup();
    renderApp(createFakeAuthService());

    expect(
      await screen.findByRole("heading", { name: /log in/i }),
    ).toBeInTheDocument();

    await user.type(screen.getByLabelText(/email/i), "demo@example.com");
    await user.type(screen.getByLabelText(/password/i), "correct-password");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByRole("navigation")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /contacts/i }),
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /log out/i }));

    expect(
      await screen.findByRole("heading", { name: /log in/i }),
    ).toBeInTheDocument();
  });

  test("shows an error and stays on the login screen for wrong credentials", async () => {
    const user = userEvent.setup();
    renderApp(createFakeAuthService());

    await user.type(screen.getByLabelText(/email/i), "demo@example.com");
    await user.type(screen.getByLabelText(/password/i), "wrong-password");
    await user.click(screen.getByRole("button", { name: /log in/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /invalid login credentials/i,
    );
    expect(
      screen.getByRole("heading", { name: /log in/i }),
    ).toBeInTheDocument();
  });

  test("redirects an unauthenticated visitor from a protected route to login", async () => {
    renderApp(createFakeAuthService(), "/contacts");

    expect(
      await screen.findByRole("heading", { name: /log in/i }),
    ).toBeInTheDocument();
  });
});
