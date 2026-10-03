// The admin app's theme follows the device's appearance and nothing else (ruling 1377, handoff
// 45-C item 1). No in-app switch and no stored choice: the member app's `dna.theme` key and its
// `?theme=` override are the member app's (src/lib/tier.ts, rulings 92, 599) and are read by
// nothing here. The tokens are strand.css's one `[data-theme="dark"]` set, reached by the same
// attribute the member app stamps on the document element.
//
// The work is done twice, in the same steps. `DEVICE_THEME_SCRIPT` is inlined in the root's head
// with the response's CSP nonce (ruling 438), so the attribute is set before first paint and a dark
// device never sees the light ground. It is a literal and not `followDevice.toString()`, because
// the server build wraps functions in esbuild's `__name()`, which the browser has not got, and the
// script would throw before setting anything. The script also marks the root `data-prepaint`, because
// the arms read the arrival of `data-theme` as hydration (G140) and the script now sets it before
// React has attached anything; `useDeviceTheme` clears the mark from an effect, so `data-theme`
// without `data-prepaint` still means the client has taken over. The hook subscribes again after
// hydration, so a remount of the root never leaves the attribute behind the device.
import { useEffect } from "react";

/**
 * Sets `data-theme` from `prefers-color-scheme` and the `theme-color` meta from the resolved
 * `--bg`, then follows every change of the setting. `DEVICE_THEME_SCRIPT` is the same steps.
 */
function followDevice(): () => void {
  const root = document.documentElement;
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  const apply = () => {
    root.setAttribute("data-theme", mql.matches ? "dark" : "light");
    const bg = getComputedStyle(root).getPropertyValue("--bg").trim();
    const meta = document.querySelector('meta[name="theme-color"]');
    if (bg && meta) meta.setAttribute("content", bg);
  };
  apply();
  mql.addEventListener("change", apply);
  return () => mql.removeEventListener("change", apply);
}

export const DEVICE_THEME_SCRIPT =
  "try{var r=document.documentElement,q=matchMedia('(prefers-color-scheme: dark)'),a=function(){" +
  "r.setAttribute('data-theme',q.matches?'dark':'light');" +
  "var b=getComputedStyle(r).getPropertyValue('--bg').trim(),m=document.querySelector('meta[name=\"theme-color\"]');" +
  "if(b&&m)m.setAttribute('content',b)};" +
  "a();q.addEventListener('change',a);r.setAttribute('data-prepaint','')}catch(e){}";

export function useDeviceTheme(): void {
  useEffect(() => {
    const stop = followDevice();
    document.documentElement.removeAttribute("data-prepaint");
    return stop;
  }, []);
}
