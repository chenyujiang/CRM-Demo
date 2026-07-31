import { supabase } from "@/lib/supabase";

export interface Session {
  userId: string;
  email: string | null;
}

/**
 * The data-service seam for authentication: every Supabase Auth call in the
 * app goes through this module. UI code never imports `supabase` directly.
 * Later entity services (contacts, deals, tasks) should follow this same
 * shape — a small set of plain async functions the UI calls, and a single
 * module tests swap for a fake in UI tests.
 */
export const authService = {
  async signIn(email: string, password: string): Promise<Session> {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return { userId: data.user.id, email: data.user.email ?? null };
  },

  /**
   * Returns null when the project requires email confirmation — Supabase
   * creates the user but issues no session until they confirm via email.
   */
  async signUp(email: string, password: string): Promise<Session | null> {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    if (!data.session) return null;
    return { userId: data.session.user.id, email: data.session.user.email ?? null };
  },

  async signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  },

  async getSession(): Promise<Session | null> {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (!data.session) return null;
    return {
      userId: data.session.user.id,
      email: data.session.user.email ?? null,
    };
  },

  onAuthStateChange(callback: (session: Session | null) => void): () => void {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(
        session
          ? { userId: session.user.id, email: session.user.email ?? null }
          : null,
      );
    });
    return () => data.subscription.unsubscribe();
  },
};
