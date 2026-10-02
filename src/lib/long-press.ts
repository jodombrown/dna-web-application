// Brief 14 (extraction 41-14 section 3, "Hover reveals row and message actions on pointer; long press
// on touch"; SPEC 41-14 Part A item 5): the touch gesture ThreadRow and MessageBubble share. A press
// held 450 ms fires; the click the browser raises when the finger lifts is swallowed, and the swallow
// clears itself after 700 ms so a later tap is never eaten. Pointer events only, so a mouse on a touch
// laptop takes the same path as a finger and a secondary button never starts a press. Ported from the
// prototype's `lp()` and `clickGuard()`; one module so the two parts cannot drift in their timings.
import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";

export const LONG_PRESS_MS = 450;
export const LONG_PRESS_SWALLOW_MS = 700;

export type LongPressHandlers<T extends Element> = {
  onPointerDown: (e: ReactPointerEvent<T>) => void;
  onPointerUp: () => void;
  onPointerLeave: () => void;
  onPointerCancel: () => void;
  onContextMenu: (e: ReactPointerEvent<T> | { preventDefault: () => void }) => void;
};

export function useLongPress<T extends Element = HTMLElement>(
  onFire: () => void,
): {
  handlers: LongPressHandlers<T>;
  /** Wraps a click handler so the click that belongs to a fired press is swallowed. */
  guard: (fn: () => void) => () => void;
} {
  const timer = useRef<number | null>(null);
  const clear = useRef<number | null>(null);
  const fired = useRef(false);
  const fire = useRef(onFire);
  fire.current = onFire;
  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
      if (clear.current) window.clearTimeout(clear.current);
    },
    [],
  );
  const stop = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };
  const handlers: LongPressHandlers<T> = {
    onPointerDown: (e) => {
      if (e.button !== undefined && e.button !== 0) return;
      stop();
      timer.current = window.setTimeout(() => {
        timer.current = null;
        fired.current = true;
        if (clear.current) window.clearTimeout(clear.current);
        clear.current = window.setTimeout(() => {
          fired.current = false;
          clear.current = null;
        }, LONG_PRESS_SWALLOW_MS);
        fire.current();
      }, LONG_PRESS_MS);
    },
    onPointerUp: stop,
    onPointerLeave: stop,
    onPointerCancel: stop,
    onContextMenu: (e) => e.preventDefault(),
  };
  const guard = (fn: () => void) => () => {
    if (fired.current) {
      fired.current = false;
      return;
    }
    fn();
  };
  return { handlers, guard };
}
