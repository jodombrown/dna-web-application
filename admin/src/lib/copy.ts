// Handoff 40-B section 3: the exact copy of the admin app's screens, and no other words on them.
export const ADMIN_COPY = {
  signInHeading: "DNA Admin",
  signInButton: "Sign in",
  /** Ruling 1329: the address itself comes from src/lib/contact.ts (387), never from here. */
  resetBefore: "Forgot your password? Email ",
  resetAfter: " and we will reset it.",
  resetSubject: "Admin password reset",
  mismatch: "That email and password do not match.",
  refusalHeading: "No admin access",
  refusalLine: "This account does not have access to the DNA admin console.",
  shellHeading: "Admin",
  shellLine: "Signed in with two-step verification.",
  enrolHeading: "Set up two-step sign-in",
  enrolInstruction:
    "Scan this code with an authenticator app, then enter the six-digit code it shows.",
  secretLabel: "Or enter this key by hand",
  codeHeading: "Two-step sign-in",
  codeInstruction: "Enter the six-digit code from your authenticator app.",
  codeField: "Code",
  confirm: "Confirm",
  signOut: "Sign out",
  wrongCode: "That code did not work. Try the current one.",
  failure: "Something went wrong. Try again.",
} as const;
