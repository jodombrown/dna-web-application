// Design pass 01, strand-patch/PasswordField.jsx (rulings 392, 480, 491). One component on sign-up,
// sign-in, reset and change password. The eye toggle sits inside the field and the Show passwords
// checkbox is gone. The toggle is --target-primary square, carries aria-pressed, and its accessible
// name says what the tap will do. The shown state is announced once through a polite live region.
// Refusals render in the field's own line, so a real reason from the error mapping lands where the
// member is looking (414).
import {
  useId,
  useState,
  type CSSProperties,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Icon } from "./Icon";

export type PasswordFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "style" | "id"
> & {
  label?: ReactNode;
  hint?: ReactNode;
  /** The refusal, in the field's own line. Also flags the border. */
  error?: ReactNode;
  id?: string;
  style?: CSSProperties | undefined;
};

export function PasswordField({ label, hint, error, id, style, ...rest }: PasswordFieldProps) {
  const autoId = useId();
  const uid = id || autoId;
  const [shown, setShown] = useState(false);
  const [focus, setFocus] = useState(false);
  const [said, setSaid] = useState("");
  const toggle = () => {
    setShown((v) => {
      setSaid(v ? "Password hidden." : "Password shown.");
      return !v;
    });
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, ...style }}>
      {label && (
        <label htmlFor={uid} style={{ fontSize: 15, fontWeight: 500, color: "var(--ink-2)" }}>
          {label}
        </label>
      )}
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <input
          id={uid}
          type={shown ? "text" : "password"}
          onFocus={() => setFocus(true)}
          onBlur={() => setFocus(false)}
          aria-invalid={!!error}
          {...rest}
          style={{
            width: "100%",
            boxSizing: "border-box",
            fontFamily: "var(--font-sans)",
            fontSize: 17,
            lineHeight: 1.5,
            color: "var(--ink)",
            background: focus ? "var(--surface)" : "var(--bg-sunken)",
            border: "1px solid " + (error ? "var(--error)" : focus ? "var(--ink)" : "var(--line)"),
            borderRadius: "var(--radius-m)",
            padding: "0 var(--target-primary) 0 14px",
            minHeight: "var(--target-primary)",
            outline: "none",
            transition: "border-color var(--dur-default) var(--ease)",
          }}
        />
        <button
          type="button"
          onClick={toggle}
          aria-pressed={shown}
          aria-controls={uid}
          aria-label={shown ? "Hide password" : "Show password"}
          data-testid="password-eye"
          style={{
            all: "unset",
            boxSizing: "border-box",
            position: "absolute",
            right: 0,
            width: "var(--target-primary)",
            height: "var(--target-primary)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: "var(--ink-3)",
            borderRadius: "var(--radius-m)",
          }}
        >
          <Icon name={shown ? "eye-off" : "eye"} size={20} />
        </button>
      </div>
      <span
        role="status"
        aria-live="polite"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          overflow: "hidden",
          clipPath: "inset(50%)",
          whiteSpace: "nowrap",
        }}
      >
        {said}
      </span>
      {(error || hint) && (
        <div
          data-testid={error ? "password-refusal" : undefined}
          style={{ fontSize: 13, lineHeight: 1.4, color: error ? "var(--error)" : "var(--ink-3)" }}
        >
          {error || hint}
        </div>
      )}
    </div>
  );
}
