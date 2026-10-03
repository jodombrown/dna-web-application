// The admin app's appearance (ruling 1377, handoff 45-C item 1; ruling 1393, handoff 45-D Part B
// item 3). The account's choice governs: System, Light or Dark, stored on the staff member's own
// row through public.admin_staff_settings_save and read back by public.admin_staff_settings_read.
// System follows the device exactly as 45-C built it. The member app's `dna.theme` key and its
// `?theme=` override are the member app's (src/lib/tier.ts, rulings 92, 599) and are read by
// nothing here. The tokens are strand.css's one `[data-theme="dark"]` set, reached by the same
// attribute the member app stamps on the document element.
//
// The account's value lives in the database, and the first paint happens before any read can
// answer, so this origin keeps a copy of it in local storage under `APPEARANCE_KEY`: "light" or
// "dark" when the account says so, and nothing when the account says System or no account value has
// been read yet, in which case the device decides. The console writes the copy whenever it reads the
// account's value after load and whenever Settings changes it (`setAppearanceCopy`), so the copy
// follows the account on every device after that device's first load (handoff 45-D arm 8).
//
// The work is done twice, in the same steps. `DEVICE_THEME_SCRIPT` is inlined in the root's head
// with the response's CSP nonce (ruling 438), so the attribute is set before first paint and a dark
// choice never sees the light ground. It is a literal and not `follow.toString()`, because the
// server build wraps functions in esbuild's `__name()`, which the browser has not got, and the
// script would throw before setting anything. The script also marks the root `data-prepaint`,
// because the arms read the arrival of `data-theme` as hydration (G140) and the script sets it
// before React has attached anything; `useAppearance` clears the mark from an effect, so
// `data-theme` without `data-prepaint` still means the client has taken over. The hook subscribes
// again after hydration, to the device, to the copy changing in this tab (`APPEARANCE_EVENT`) and in
// another (`storage`), so a remount of the root never leaves the attribute behind either.
import { useEffect } from "react";

/** This origin's copy of the account's appearance: "light", "dark", or absent for System. */
export const APPEARANCE_KEY = "dna.admin.appearance";
/** Dispatched on window when this tab writes the copy, since `storage` fires only in other tabs. */
const APPEARANCE_EVENT = "dna-admin-appearance";

/** The value this tab last set, which wins over storage so a refused write still applies here. */
let chosen: "light" | "dark" | null | undefined;

function readCopy(): "light" | "dark" | null {
  if (chosen !== undefined) return chosen;
  try {
    const v = localStorage.getItem(APPEARANCE_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

/**
 * Sets `data-theme` from the copy, or from `prefers-color-scheme` when the copy says nothing, and the
 * `theme-color` meta from the resolved `--bg`, then follows every change of either.
 * `DEVICE_THEME_SCRIPT` is the same steps.
 */
function follow(): () => void {
  const root = document.documentElement;
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const apply = () => {
    root.setAttribute("data-theme", readCopy() ?? (mql.matches ? "dark" : "light"));
    const bg = getComputedStyle(root).getPropertyValue("--bg").trim();
    const meta = document.querySelector('meta[name="theme-color"]');
    if (bg && meta) meta.setAttribute("content", bg);
  };
  const onStorage = (e: StorageEvent) => {
    if (e.key !== null && e.key !== APPEARANCE_KEY) return;
    chosen = undefined;
    apply();
  };
  apply();
  mql.addEventListener("change", apply);
  window.addEventListener(APPEARANCE_EVENT, apply);
  window.addEventListener("storage", onStorage);
  return () => {
    mql.removeEventListener("change", apply);
    window.removeEventListener(APPEARANCE_EVENT, apply);
    window.removeEventListener("storage", onStorage);
  };
}

export const DEVICE_THEME_SCRIPT =
  "try{var r=document.documentElement,q=matchMedia('(prefers-color-scheme: dark)'),c=function(){" +
  "try{var v=localStorage.getItem('" +
  APPEARANCE_KEY +
  "');return v==='light'||v==='dark'?v:null}catch(e){return null}},a=function(){" +
  "r.setAttribute('data-theme',c()||(q.matches?'dark':'light'));" +
  "var b=getComputedStyle(r).getPropertyValue('--bg').trim(),m=document.querySelector('meta[name=\"theme-color\"]');" +
  "if(b&&m)m.setAttribute('content',b)};" +
  "a();q.addEventListener('change',a);r.setAttribute('data-prepaint','')}catch(e){}";

export function useAppearance(): void {
  useEffect(() => {
    const stop = follow();
    document.documentElement.removeAttribute("data-prepaint");
    return stop;
  }, []);
}

/**
 * Keeps this origin's copy in step with the account's value and applies it at once (1393: the
 * choice applies the moment it is made). "system", or any value that is not light or dark, removes
 * the copy so the device decides.
 */
export function setAppearanceCopy(value: string | null): void {
  chosen = value === "light" || value === "dark" ? value : null;
  try {
    if (value === "light" || value === "dark") localStorage.setItem(APPEARANCE_KEY, value);
    else localStorage.removeItem(APPEARANCE_KEY);
  } catch {
    // Storage refused (a private window): `chosen` still applies it in this tab, and the next load
    // paints from the device until the account is read again.
  }
  window.dispatchEvent(new Event(APPEARANCE_EVENT));
}
