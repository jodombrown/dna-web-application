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
  /** The word beside the mark in ConsoleShell's bar, and the Failure screen's heading. */
  shellHeading: "Admin",
  /** ConsoleShell access none (12B extraction §2, shell): the one sentence under the bar. */
  noRole:
    "Your role does not include the Overview. Sign out and ask the founder for a role that does.",
  menuTitle: "Console",
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

/**
 * The console's eight destinations in brief order, with the one line each shows (12B extraction §1,
 * shell; R2 §1). Only the Overview is available; the seven others read "Not yet" until their consoles
 * exist. Rendered by ConsoleShell at the console root and nowhere else.
 */
export const CONSOLE_DESTINATIONS: {
  id: string;
  label: string;
  line?: string;
  available: boolean;
}[] = [
  { id: "overview", label: "Overview", available: true },
  {
    id: "members",
    label: "Members",
    line: "Invite cohorts, suspensions and erasure requests. Every look at a member is logged.",
    available: false,
  },
  {
    id: "moderation",
    label: "Moderation",
    line: "Reports from every surface, the queue and the first takedowns.",
    available: false,
  },
  {
    id: "relationships",
    label: "Relationships",
    line: "Partners, sponsors, investors, press and chapter contacts, by stage.",
    available: false,
  },
  {
    id: "communications",
    label: "Communications",
    line: "The newsletter: compose, lists and sending.",
    available: false,
  },
  {
    id: "events",
    label: "Events",
    line: "Convene operations, editorial picks, corridors and thresholds.",
    available: false,
  },
  {
    id: "legal",
    label: "Legal",
    line: "Data requests: export, erasure, and the Terms and Privacy versions each member accepted.",
    available: false,
  },
  {
    id: "system",
    label: "System",
    line: "Health: failed deploys, errors, Edge Function failures and email bounces.",
    available: false,
  },
];

/** Ruling 1311: the roles that open the Overview. Every other role sees the shell's refusal. */
export const OVERVIEW_ROLES = ["admin", "analyst"] as const;
