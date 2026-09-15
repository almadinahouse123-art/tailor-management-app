import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import {
  endLocalSession,
  getLocalAccount,
  getLocalSession,
  setLocalCredentials,
  startLocalSession,
  verifyLocalCredentials,
  type LocalSession,
} from "@/lib/local-auth";

interface AuthCtx {
  user: User | null;
  session: Session | null;
  /** Offline/device-local session (set after local setup or offline unlock). */
  localUser: LocalSession | null;
  /** True when a device passcode has already been created on this device. */
  hasLocalAccount: boolean;
  /** The app may be used (cloud session OR local session). */
  authed: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  /** First-run offline setup: create the device passcode and enter the app. */
  setupLocal: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
}

const Ctx = createContext<AuthCtx | null>(null);

const isNetworkError = (e: unknown) => {
  const msg = String((e as any)?.message ?? e ?? "");
  return (
    /Failed to fetch|NetworkError|network|fetch failed|Load failed|timeout|ERR_INTERNET|offline/i.test(
      msg,
    ) || (e as any)?.name === "TypeError"
  );
};

const isOnline = () => (typeof navigator === "undefined" ? true : navigator.onLine);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [localUser, setLocalUser] = useState<LocalSession | null>(null);
  const [hasLocal, setHasLocal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setUser(s?.user ?? null);
    });

    void (async () => {
      // The local checks never touch the network, so a fully offline cold start
      // still resolves and lets the user in.
      const [account, local] = await Promise.all([getLocalAccount(), getLocalSession()]);
      if (!cancelled) {
        setHasLocal(!!account);
        setLocalUser(local);
      }
      try {
        const { data } = await supabase.auth.getSession();
        if (!cancelled) {
          setSession(data.session);
          setUser(data.session?.user ?? null);
        }
      } catch {
        /* offline: keep the local session */
      }
      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const localUnlock = async (email: string, password: string) => {
    const ok = await verifyLocalCredentials(email, password);
    if (!ok) return { error: "Incorrect email or passcode for this device" };
    const s = await startLocalSession(email);
    setLocalUser(s);
    return { error: null };
  };

  const value: AuthCtx = {
    user,
    session,
    localUser,
    hasLocalAccount: hasLocal,
    authed: !!user || !!localUser,
    loading,
    signIn: async (email, password) => {
      if (!isOnline()) return localUnlock(email, password);
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          if (isNetworkError(error)) return localUnlock(email, password);
          return { error: error.message };
        }
      } catch (e) {
        if (isNetworkError(e)) return localUnlock(email, password);
        return { error: String((e as any)?.message ?? e) };
      }
      // Mirror the credentials locally so the app opens offline next time.
      try {
        await setLocalCredentials(email, password, { cloudLinked: true });
        setHasLocal(true);
        const s = await startLocalSession(email);
        setLocalUser(s);
      } catch {
        /* local mirror is best-effort */
      }
      return { error: null };
    },
    signUp: async (email, password) => {
      if (!isOnline()) {
        // No cloud reachable: create the device account so work can start now.
        try {
          await setLocalCredentials(email, password);
          setHasLocal(true);
          const s = await startLocalSession(email);
          setLocalUser(s);
          return { error: null };
        } catch (e) {
          return { error: String((e as any)?.message ?? e) };
        }
      }
      try {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) {
          if (isNetworkError(error)) {
            await setLocalCredentials(email, password);
            setHasLocal(true);
            setLocalUser(await startLocalSession(email));
            return { error: null };
          }
          return { error: error.message };
        }
      } catch (e) {
        return { error: String((e as any)?.message ?? e) };
      }
      try {
        await setLocalCredentials(email, password, { cloudLinked: true });
        setHasLocal(true);
      } catch {
        /* ignore */
      }
      return { error: null };
    },
    setupLocal: async (email, password) => {
      try {
        await setLocalCredentials(email, password);
        setHasLocal(true);
        const s = await startLocalSession(email);
        setLocalUser(s);
        return { error: null };
      } catch (e) {
        return { error: String((e as any)?.message ?? e) };
      }
    },
    resetPassword: async (email) => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      return { error: error?.message ?? null };
    },
    updatePassword: async (password) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (!error) {
        const account = await getLocalAccount();
        if (account) {
          try {
            await setLocalCredentials(account.email, password, { cloudLinked: true });
          } catch {
            /* ignore */
          }
        }
      }
      return { error: error?.message ?? null };
    },
    signOut: async () => {
      await endLocalSession();
      setLocalUser(null);
      try {
        await supabase.auth.signOut();
      } catch {
        /* offline sign-out still clears the local session */
      }
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
