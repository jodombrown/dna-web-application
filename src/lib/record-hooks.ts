// The recorder's hooks (handoff 58-12C2 section 3): each kind fires once per real occurrence, on
// mount when the surface first shows and then on each change the handoff names. A re-render, a
// query refetch or a doubled effect records nothing, because every hook keys on a value and records
// only when that value changes, holding the last value in a ref that survives a remount of the same
// instance.
import { useEffect, useRef } from "react";
import { record, type RecordObject, type RecordProps } from "./record";

/**
 * Records `kind` on mount and again whenever `key` changes to a new non-null value. A null key
 * records nothing and does not count as a change, so a surface records its view once its state
 * is known and not for the loading frame before it.
 */
export function useRecordOnChange(
  kind: string,
  key: string | null,
  props?: RecordProps,
  object?: RecordObject,
): void {
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (key === null || last.current === key) return;
    last.current = key;
    record(kind, props, object);
    // props and object are read at the moment the key changes; the key is what names an occurrence.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, key]);
}

/**
 * Records `kind` each time `active` turns true: once per appearance of the thing it guards (an
 * empty state, a DIA line). While it stays true nothing more is recorded; false then true again is
 * a new appearance.
 */
export function useRecordWhen(kind: string, active: boolean, props?: RecordProps): void {
  const was = useRef(false);
  useEffect(() => {
    if (active && !was.current) record(kind, props);
    was.current = active;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, active]);
}

/** `empty_state_seen` for one EmptyState site, with its stable `<surface>.<case>` id. */
export function useEmptyStateSeen(state: string, shown: boolean): void {
  useRecordWhen("empty_state_seen", shown, { state });
}
