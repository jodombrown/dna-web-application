// Supabase Auth is the one auth path. Session state is shared through a small provider.
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";

export type Member = {
  id: string;
  name: string;
  email: string | undefined;
  avatar: string | undefined;
};

type AuthState = { ready: boolean; session: Session | null; member: Member | null };

const AuthContext = createContext<AuthState>({ ready: false, session: null, member: null });

export function memberFromUser(user: User | null | undefined): Member | null {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const name =
    (typeof meta["full_name"] === "string" && meta["full_name"]) ||
    (typeof meta["name"] === "string" && meta["name"]) ||
    (user.email ? user.email.split("@")[0] : "") ||
    "Member";
  const avatar =
    typeof meta["avatar_url"] === "string" ? (meta["avatar_url"] as string) : undefined;
  return { id: user.id, name: String(name), email: user.email, avatar };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ ready: false, session: null, member: null });
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let active = true;
    void sb.auth.getSession().then(({ data }) => {
      if (!active) return;
      setState({ ready: true, session: data.session, member: memberFromUser(data.session?.user) });
    });
    const { data: sub } = sb.auth.onAuthStateChange((_event, session) => {
      if (!active) return;
      setState({ ready: true, session, member: memberFromUser(session?.user) });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  const value = useMemo(() => state, [state]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
