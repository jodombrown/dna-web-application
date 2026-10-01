// The code step at aal1 with a verified factor (handoff 40-B section 3, item 4): challenge and
// verify, then the console reads the standing again.
import { useState } from "react";
import { AuthAlert, AuthPage } from "@/components/dna/AuthSurface";
import { getSupabase } from "@/lib/supabase";
import { ADMIN_COPY } from "../lib/copy";
import { verifiedTotpFactor, verifyCode } from "../lib/session";
import { CodeField } from "./CodeField";

export function CodeStep({ onVerified }: { onVerified: () => void }) {
  const [alert, setAlert] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = async (code: string) => {
    const sb = getSupabase();
    if (!sb) return;
    setError(null);
    setAlert(null);
    setBusy(true);
    try {
      const factorId = await verifiedTotpFactor(sb);
      if (!factorId) {
        setAlert(ADMIN_COPY.failure);
        return;
      }
      const outcome = await verifyCode(sb, factorId, code);
      if (outcome === "ok") onVerified();
      else if (outcome === "wrong") setError(ADMIN_COPY.wrongCode);
      else setAlert(ADMIN_COPY.failure);
    } catch {
      setAlert(ADMIN_COPY.failure);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthPage
      data-testid="admin-code"
      heading={ADMIN_COPY.codeHeading}
      lead={ADMIN_COPY.codeInstruction}
    >
      {alert && <AuthAlert>{alert}</AuthAlert>}
      <CodeField error={error} busy={busy} onConfirm={(c) => void confirm(c)} />
    </AuthPage>
  );
}
