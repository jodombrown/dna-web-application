// The six-digit code and the Confirm act, shared by enrolment and the code step. The field is
// Strand's Input; a refusal renders in the field's own line, as the password field's does (392).
import { useState, type FormEvent } from "react";
import { Button } from "@/components/strand/Button";
import { Input } from "@/components/strand/Input";
import { ADMIN_COPY } from "../lib/copy";

export function CodeField({
  error,
  busy,
  onConfirm,
}: {
  error: string | null;
  busy: boolean;
  onConfirm: (code: string) => void;
}) {
  const [code, setCode] = useState("");
  const submit = (e: FormEvent) => {
    e.preventDefault();
    onConfirm(code.trim());
  };
  return (
    <form
      onSubmit={submit}
      noValidate
      aria-busy={busy}
      style={{ display: "flex", flexDirection: "column", gap: 14 }}
    >
      <Input
        label={ADMIN_COPY.codeField}
        inputMode="numeric"
        autoComplete="one-time-code"
        pattern="[0-9]*"
        maxLength={6}
        value={code}
        onChange={(e) => setCode((e.target as HTMLInputElement).value.replace(/\D/g, ""))}
        aria-invalid={!!error}
        {...(error ? { error } : {})}
        required
      />
      <Button type="submit" disabled={busy || code.length !== 6} full>
        {ADMIN_COPY.confirm}
      </Button>
    </form>
  );
}
