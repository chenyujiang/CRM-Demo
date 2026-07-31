import * as React from "react";
import { authService as defaultAuthService, type Session } from "@/services/authService";

interface AuthContextValue {
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  /** Returns false when the account still needs email confirmation (no session yet). */
  signUp: (email: string, password: string) => Promise<boolean>;
  signOut: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export interface AuthProviderProps {
  children: React.ReactNode;
  /**
   * The data-service seam: defaults to the real Supabase-backed authService.
   * UI tests inject a fake here instead of mocking the `supabase` module.
   */
  authService?: typeof defaultAuthService;
}

export function AuthProvider({
  children,
  authService = defaultAuthService,
}: AuthProviderProps) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    authService.getSession().then((s) => {
      setSession(s);
      setLoading(false);
    });
    return authService.onAuthStateChange(setSession);
  }, [authService]);

  const value = React.useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      signIn: async (email, password) => {
        const s = await authService.signIn(email, password);
        setSession(s);
      },
      signUp: async (email, password) => {
        const s = await authService.signUp(email, password);
        if (s) setSession(s);
        return s !== null;
      },
      signOut: async () => {
        await authService.signOut();
        setSession(null);
      },
    }),
    [session, loading, authService],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}
