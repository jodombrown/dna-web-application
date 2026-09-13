// Supabase Auth is the one auth path. Session state is shared through a small provider.
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { getSupabase } from "./supabase";
import { markRecoveryPending } from "./recovery";

export type Member = {
  id: string;
  name: string;
  email: string | undefined;
  avatar: string | undefined;
  /** The member's public address (/m/:handle), from the members row the sign-up trigger creates (Brief 3). */
  handle?: string | undefined;
};

type AuthState = {
  ready: boolean;
  session: Session | null;
  member: Member | null;
  /** W27: re-read the members row (name, handle) after a profile save, so the shell carries it. */
  refreshMember: () => Promise<void>;
};

const AuthContext = createContext<AuthState>({
  ready: false,
  session: null,
  member: null,
  refreshMember: async () => {},
});

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

// The members row (Brief 3) carries the handle and the name the member set on their profile;
// auth metadata stays the fallback so the shell renders before the row arrives.
async function withProfile(session: Session | null): Promise<Member | null> {
  const sb = getSupabase();
  const base = memberFromUser(session?.user);
  if (!sb || !base) return base;
  const { data } = await sb.from("members").select("handle,name").eq("id", base.id).maybeSingle();
  return data ? { ...base, handle: data.handle, name: data.name || base.name } : base;
}

type AuthCore = Omit<AuthState, "refreshMember">;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthCore>({ ready: false, session: null, member: null });
  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let active = true;
    void sb.auth.getSession().then(async ({ data }) => {
      const member = await withProfile(data.session);
      if (!active) return;
      setState({ ready: true, session: data.session, member });
    });
    const { data: sub } = sb.auth.onAuthStateChange((event, session) => {
      if (!active) return;
      // Ruling 240: the second reading of a recovery, for the case where the fragment was consumed
      // before this app's own capture could see it. The gate in the root route acts on the flag.
      if (event === "PASSWORD_RECOVERY") markRecoveryPending();
      setState({ ready: true, session, member: memberFromUser(session?.user) });
      void withProfile(session).then((member) => {
        if (active) setState((s) => (s.session === session ? { ...s, member } : s));
      });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);
  // W27: after a profile save the shell re-reads the members row, so the name it carries (header,
  // greeting, account panel) is the one just saved rather than the one read at sign-in.
  const refreshMember = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    const { data } = await sb.auth.getSession();
    const member = await withProfile(data.session);
    setState((s) => (s.session?.user.id === member?.id ? { ...s, member } : s));
  }, []);
  const value = useMemo(() => ({ ...state, refreshMember }), [state, refreshMember]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
