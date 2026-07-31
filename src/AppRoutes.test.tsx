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
    async signUp(_email, _password) {
      // Simulates a project that requires email confirmation: the account
      // is created but no session is issued until the user confirms.
      return null;
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

describe("sign-up flow", () => {
  test("signing up shows a confirmation-pending state instead of entering the app", async () => {
    const user = userEvent.setup();
    renderApp(createFakeAuthService(), "/signup");

    await user.type(screen.getByLabelText(/^email/i), "new-user@example.com");
    await user.type(screen.getByLabelText(/^password/i), "Sup3rSecret!");
    await user.type(screen.getByLabelText(/confirm password/i), "Sup3rSecret!");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(
      await screen.findByRole("heading", { name: /check your email/i }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  test("blocks submission when the passwords don't match", async () => {
    const user = userEvent.setup();
    renderApp(createFakeAuthService(), "/signup");

    await user.type(screen.getByLabelText(/^email/i), "new-user@example.com");
    await user.type(screen.getByLabelText(/^password/i), "Sup3rSecret!");
    await user.type(screen.getByLabelText(/confirm password/i), "somethingElse!");
    await user.click(screen.getByRole("button", { name: /sign up/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/do not match/i);
    expect(screen.getByRole("heading", { name: /^sign up$/i })).toBeInTheDocument();
  });

  test("links between the login and sign-up screens", async () => {
    const user = userEvent.setup();
    renderApp(createFakeAuthService(), "/login");

    await user.click(screen.getByRole("link", { name: /sign up/i }));
    expect(await screen.findByRole("heading", { name: /^sign up$/i })).toBeInTheDocument();

    await user.click(screen.getByRole("link", { name: /log in/i }));
    expect(await screen.findByRole("heading", { name: /^log in$/i })).toBeInTheDocument();
  });
});
