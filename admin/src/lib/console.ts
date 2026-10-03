// What the console's pages share (handoff 45-D Part B): the staff member's roles, their own Settings,
// the company's Settings and the vocabularies, read once by the console's gate at aal2 and handed to
// the Overview and Settings, so the Overview opens on the person's defaults in the company zone and
// a change made in Settings is what the Overview reads next. One provider, in admin/src/routes/
// _console.tsx; each page reads it through `useConsole`.
import { createContext, useContext } from "react";
import type { Vocabularies } from "@/lib/vocabularies";
import type { OrgSettings, StaffSettings } from "./settings";

export type SettingsRead =
  | { status: "loading" }
  | { status: "ready"; staff: StaffSettings; org: OrgSettings }
  | { status: "failed" };

export type ConsoleContext = {
  roles: string[];
  isAdmin: boolean;
  /** The staff member's display name, the one the bar shows. */
  name: string;
  settings: SettingsRead;
  /** Null until loaded, and when the read failed: every option list then renders empty (194). */
  vocab: Vocabularies | null;
  reloadSettings: () => void;
  setStaff: (staff: StaffSettings) => void;
  setOrg: (org: OrgSettings) => void;
  /** Ends every session of the account and shows the signed-out screen; throws when refused. */
  signOutEverywhere: () => Promise<void>;
};

const Ctx = createContext<ConsoleContext | null>(null);

export const ConsoleProvider = Ctx.Provider;

export function useConsole(): ConsoleContext {
  const c = useContext(Ctx);
  if (!c) throw new Error("useConsole: no console above this page");
  return c;
}
