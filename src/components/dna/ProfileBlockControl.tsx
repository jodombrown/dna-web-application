// Brief 4A, the block control (B4A-SPEC.md sections 4, 5, 8, 9, 10 and 11; rulings 198, 207, 208,
// 211, 220, 221, 222). One overflow item and one confirm sheet in two variants, appended to
// Profile's Visitor action row. It is the whole surface: block has no route, no list, no settings
// page and no moderation view, because ruling 198 keeps /m/:handle loading for both parties and
// ruling 208 puts unblock in the same place as block.
//
// This lives on the page, not in Strand (B4A section 4). Profile v3 has no masthead overflow, and
// ruling 221 gives Strand a Menu component that has not landed. Until it does, this spec is
// normative and this file is the implementation; when Menu ships, the panel below is what gets
// swapped for it. Likewise the focus management: ruling 222 puts it in Strand's Sheet, the
// amendment (STRAND-HANDOFF.md 3c.2) has not landed, and B4A section 11 requires Code to implement
// and verify it here rather than inherit it, so `heading focus in, opener focus out, Tab trapped
// while open` is done on this page and re-verified when the amendment arrives.
//
// Copy is verbatim from B4A section 9 and carries no numerals, no toast and no word for the state
// (B4A sections 5 and 13). Nothing here is written to or shown to the other party (ruling 198).
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { Button } from "@/components/strand/Button";
import { IconButton } from "@/components/strand/IconButton";
import { Sheet } from "@/components/strand/Sheet";

export type ProfileBlockControlProps = {
  /** The member's first name, for every string that names them. */
  first: string;
  /** The member's full name, for the two sheet headings. */
  name: string;
  /** profile_view.viewer_blocked: the viewer's own block. Never the converse (B4A section 7). */
  blocked: boolean;
  tier: "compact" | "medium" | "expanded";
  onBlock: () => Promise<void>;
  onUnblock: () => Promise<void>;
};

const MENU_WIDTH = 240;

const PANEL: CSSProperties = {
  position: "absolute",
  top: 50,
  minWidth: MENU_WIDTH,
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 14,
  boxShadow: "var(--shadow-stack)",
  padding: "6px 0",
  zIndex: 20,
};

const ITEM: CSSProperties = {
  all: "unset",
  boxSizing: "border-box",
  display: "flex",
  alignItems: "center",
  width: "100%",
  minHeight: 44,
  padding: "0 16px",
  fontFamily: "var(--font-sans)",
  fontSize: 15,
  fontWeight: 500,
  color: "var(--ink)",
  cursor: "pointer",
};

/** Focusable descendants, in document order, for the Tab trap (ruling 222). */
function focusables(root: HTMLElement): HTMLElement[] {
  return Array.from(
    root.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    ),
  );
}

export function ProfileBlockControl({
  first,
  name,
  blocked,
  tier,
  onBlock,
  onUnblock,
}: ProfileBlockControlProps) {
  const compact = tier === "compact";
  const [menu, setMenu] = useState(false);
  // The panel is anchored below the trigger at left 0 (B4A section 4). The trigger is the last
  // control in a wrapping row, so at 360 and 390 that edge can sit within 240 of the frame; the
  // panel then flips to the trigger's right edge rather than crossing it, because ruling 61's
  // matrix is checked for horizontal overflow at every width.
  const [flip, setFlip] = useState(false);
  const [sheet, setSheet] = useState<null | "block" | "unblock">(null);
  const [busy, setBusy] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const item = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  // Strand's IconButton is a ported function component that takes no ref (rulings 70, 72: system
  // changes happen in Strand first, so the page does not grow one here). The trigger is its own
  // button inside this wrapper, so the wrapper addresses it.
  const triggerEl = () =>
    wrap.current?.querySelector<HTMLButtonElement>('[data-testid="block-menu-trigger"]') ?? null;

  const toTrigger = useCallback(() => triggerEl()?.focus(), []);

  const openMenu = () => {
    const el = triggerEl();
    if (el) {
      const r = el.getBoundingClientRect();
      setFlip(r.left + MENU_WIDTH > document.documentElement.clientWidth - 8);
    }
    setMenu(true);
  };

  const closeMenu = useCallback(
    (restore: boolean) => {
      setMenu(false);
      if (restore) toTrigger();
    },
    [toTrigger],
  );

  // Esc closes and returns focus to the trigger; pointer down outside closes (B4A section 4).
  useEffect(() => {
    if (!menu) return;
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeMenu(true);
      }
    };
    const down = (e: PointerEvent) => {
      const t = e.target as Node | null;
      if (triggerEl()?.contains(t as Node)) return;
      if (item.current?.parentElement?.contains(t as Node)) return;
      closeMenu(false);
    };
    window.addEventListener("keydown", key, true);
    window.addEventListener("pointerdown", down, true);
    item.current?.focus();
    return () => {
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("pointerdown", down, true);
    };
  }, [menu, closeMenu]);

  // B4A section 11 and ruling 222: focus lands on the sheet's heading, which is what will happen
  // rather than the control that does it. Strand's Sheet mounts its children from its own effect, a
  // commit after `open` flips, so an effect here has no heading to focus yet; the callback ref
  // fires when the element attaches, whenever that is.
  const headingRef = useCallback((el: HTMLHeadingElement | null) => {
    heading.current = el;
    el?.focus();
  }, []);

  // Ruling 222: focus is trapped inside the dialog while it is open.
  useEffect(() => {
    if (!sheet) return;
    const key = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const root = dialog.current;
      if (!root) return;
      const items = focusables(root);
      if (!items.length) return;
      const firstEl = items[0] as HTMLElement;
      const lastEl = items[items.length - 1] as HTMLElement;
      const active = document.activeElement;
      if (
        e.shiftKey &&
        (active === firstEl || active === heading.current || !root.contains(active))
      ) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    };
    window.addEventListener("keydown", key, true);
    return () => window.removeEventListener("keydown", key, true);
  }, [sheet]);

  /** Every dismissal, and the confirm itself, returns focus to the ellipsis trigger. */
  const closeSheet = useCallback(() => {
    setSheet(null);
    toTrigger();
  }, [toTrigger]);

  const confirm = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await (sheet === "unblock" ? onUnblock() : onBlock());
      closeSheet();
    } finally {
      setBusy(false);
    }
  };

  const verb = blocked ? "Unblock" : "Block";
  const body = (
    <div
      ref={dialog}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 24,
        padding: "24px 24px 32px",
        overflowY: "auto",
        minHeight: 0,
      }}
    >
      <h2
        ref={headingRef}
        tabIndex={-1}
        style={{
          margin: 0,
          outline: "none",
          fontFamily: "var(--font-display)",
          fontWeight: 400,
          fontSize: 26,
          lineHeight: 1.2,
          color: "var(--ink)",
          textWrap: "balance",
        }}
      >
        {verb} {name}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {(sheet === "unblock"
          ? [
              `${first} can find you and reach you on DNA again, and sees your profile as any member does.`,
              "Your connection and follow do not come back. They must be re-made.",
            ]
          : [
              `${first} will not find you or reach you on DNA.`,
              `${first} will see only what a signed-out visitor sees of your profile.`,
              "Your connection and any follow between you end.",
            ]
        ).map((line) => (
          <p key={line} style={{ margin: 0, fontSize: 17, lineHeight: 1.5, color: "var(--ink)" }}>
            {line}
          </p>
        ))}
      </div>
      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.45, color: "var(--ink-3)" }}>
        {sheet === "unblock"
          ? `${first} is not told.`
          : `${first} is not told. You can undo this from ${first}’s profile.`}
      </p>
      <div style={{ display: "flex", gap: 8, paddingTop: 8, flexWrap: "wrap" }}>
        <Button variant="secondary" onClick={closeSheet} data-testid="block-cancel">
          Cancel
        </Button>
        <Button
          variant={sheet === "unblock" ? "primary" : "danger"}
          onClick={() => void confirm()}
          disabled={busy}
          data-testid="block-confirm"
        >
          {verb} {first}
        </Button>
      </div>
    </div>
  );

  return (
    <div
      ref={wrap}
      style={{ position: "relative", display: "inline-flex" }}
      data-testid="block-control"
    >
      <IconButton
        name="ellipsis"
        label="More"
        aria-haspopup="menu"
        aria-expanded={menu}
        onClick={() => (menu ? closeMenu(true) : openMenu())}
        style={{ border: "1px solid var(--line)", borderRadius: "var(--radius-m)" }}
        data-testid="block-menu-trigger"
      />
      {menu && (
        <div
          role="menu"
          aria-label="More"
          data-testid="block-menu"
          style={flip ? { ...PANEL, right: 0 } : { ...PANEL, left: 0 }}
        >
          <button
            ref={item}
            type="button"
            role="menuitem"
            onClick={() => {
              setMenu(false);
              setSheet(blocked ? "unblock" : "block");
            }}
            style={ITEM}
            data-testid="block-menu-item"
          >
            {verb} {first}
          </button>
        </div>
      )}
      <Sheet
        open={!!sheet}
        onClose={closeSheet}
        variant={compact ? "sheet" : "drawer"}
        width={560}
        label={`${verb} ${first}`}
        // A confirm sheet hugs its content on compact; Strand's Sheet defaults a bottom sheet to
        // the full frame, which is the composer's shape, not this one.
        style={compact ? { height: "auto", maxHeight: "calc(100% - 24px)" } : undefined}
      >
        {body}
      </Sheet>
    </div>
  );
}
