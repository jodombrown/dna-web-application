// Enrolment at aal1 for a role holder with no verified factor (handoff 40-B section 3, item 3):
// enrol, show the QR code and the secret as text, take the code, challenge and verify, then the
// console reads the standing again. The QR code is Supabase's own data: URL in an img, which the
// admin policy's img-src admits (section 5); an img never runs what it shows, so the SVG text is
// not written into the document.
import { useEffect, useState } from "react";
import { AuthAlert, AuthPage, AuthSmall } from "@/components/dna/AuthSurface";
import { getSupabase } from "@/lib/supabase";
import { ADMIN_COPY } from "../lib/copy";
import { enrolTotp, totpDisabled, verifyCode, type Enrolment as Enrolled } from "../lib/session";
import { CodeField } from "./CodeField";

export function Enrolment({ onVerified }: { onVerified: () => void }) {
  const [enrolled, setEnrolled] = useState<Enrolled | null>(null);
  const [alert, setAlert] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sb = getSupabase();
    if (!sb) return;
    let active = true;
    enrolTotp(sb)
      .then((e) => {
        if (active) setEnrolled(e);
      })
      .catch((err: unknown) => {
        // Item 6: TOTP disabled for the project is the founder's setting; named by code in the
        // console, and the screen shows the one line it has for any failure.
        console.warn(
          JSON.stringify({
            event: totpDisabled(err) ? "totp_enrolment_disabled" : "totp_enrolment_failed",
            code: (err as { code?: string } | null)?.code ?? null,
          }),
        );
        if (active) setAlert(ADMIN_COPY.failure);
      });
    return () => {
      active = false;
    };
  }, []);

  const confirm = async (code: string) => {
    const sb = getSupabase();
    if (!sb || !enrolled) return;
    setError(null);
    setAlert(null);
    setBusy(true);
    try {
      const outcome = await verifyCode(sb, enrolled.factorId, code);
      if (outcome === "ok") onVerified();
      else if (outcome === "wrong") setError(ADMIN_COPY.wrongCode);
      else setAlert(ADMIN_COPY.failure);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthPage
      data-testid="admin-enrol"
      heading={ADMIN_COPY.enrolHeading}
      lead={ADMIN_COPY.enrolInstruction}
    >
      {alert && <AuthAlert>{alert}</AuthAlert>}
      {enrolled && (
        <>
          <img
            src={enrolled.qrCode}
            alt=""
            data-testid="admin-qr"
            style={{
              width: 200,
              height: 200,
              alignSelf: "center",
              display: "block",
              background: "#fff",
              borderRadius: "var(--radius-m)",
              padding: 8,
              boxSizing: "content-box",
            }}
          />
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <AuthSmall>{ADMIN_COPY.secretLabel}</AuthSmall>
            <code
              data-testid="admin-secret"
              style={{
                fontSize: 15,
                lineHeight: 1.5,
                color: "var(--ink)",
                wordBreak: "break-all",
                userSelect: "all",
              }}
            >
              {enrolled.secret}
            </code>
          </div>
          <CodeField error={error} busy={busy} onConfirm={(c) => void confirm(c)} />
        </>
      )}
    </AuthPage>
  );
}
