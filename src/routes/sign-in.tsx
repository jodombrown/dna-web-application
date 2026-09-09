// Supabase Auth, email and password. The one auth path (CLAUDE.md). Sign-up collects a display
// name into user metadata; the composer header and cards read it from there.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/strand/Button";
import { Input } from "@/components/strand/Input";
import { assetBase } from "@/components/strand/cmeta";
import { useAuth } from "@/lib/auth";
import { getSupabase } from "@/lib/supabase";
import { useTheme } from "@/lib/tier";

export const Route = createFileRoute("/sign-in")({
  // ?join=1 opens the form in its sign-up state (the public profile's "Join DNA", Brief 3).
  validateSearch: (search: Record<string, unknown>): { join?: boolean } =>
    search["join"] === true || search["join"] === "1" || search["join"] === 1 ? { join: true } : {},
  component: SignIn,
});

function SignIn() {
  const { ready, member } = useAuth();
  const navigate = useNavigate();
  const { join } = Route.useSearch();
  useTheme();
  const [mode, setMode] = useState<"in" | "up">(join ? "up" : "in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && member) void navigate({ to: "/feed", search: {} });
  }, [ready, member, navigate]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const sb = getSupabase();
    if (!sb) return;
    setBusy(true);
    setNote(null);
    try {
      if (mode === "in") {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) setNote(error.message);
      } else {
        const { data, error } = await sb.auth.signUp({
          email,
          password,
          options: { data: { full_name: name } },
        });
        if (error) setNote(error.message);
        else if (!data.session) setNote("Check your email to confirm the account, then sign in.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "var(--bg)",
      }}
    >
      <form
        onSubmit={(e) => void submit(e)}
        style={{ width: "100%", maxWidth: 400, display: "flex", flexDirection: "column", gap: 14 }}
      >
        <img
          src={assetBase() + "logo.png"}
          alt="DNA"
          style={{ height: 40, width: "auto", alignSelf: "flex-start", display: "block" }}
        />
        <h1
          style={{
            margin: 0,
            fontFamily: "var(--font-display)",
            fontWeight: 400,
            fontSize: 26,
            lineHeight: 1.2,
          }}
        >
          {mode === "in" ? "Sign in to DNA" : "Join DNA"}
        </h1>
        {mode === "up" && (
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName((e.target as HTMLInputElement).value)}
            autoComplete="name"
            required
          />
        )}
        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
          autoComplete="email"
          required
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword((e.target as HTMLInputElement).value)}
          autoComplete={mode === "in" ? "current-password" : "new-password"}
          required
        />
        {note && <div style={{ fontSize: 15, color: "var(--ink-2)" }}>{note}</div>}
        <Button type="submit" disabled={busy} full>
          {mode === "in" ? "Sign in" : "Create account"}
        </Button>
        <Button variant="ghost" type="button" onClick={() => setMode(mode === "in" ? "up" : "in")}>
          {mode === "in" ? "New here? Create an account" : "Have an account? Sign in"}
        </Button>
      </form>
    </div>
  );
}
