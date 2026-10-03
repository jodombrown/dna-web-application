// Brief 14 (SPEC 41-14 Part A item 5; extraction 41-14 sections 1.6 and 5.4; rulings 1343, 1346),
// ported from the prototype's `composerNode()`. The thread's one composer: the strips above the row
// (the quote, the editing strip, the media draft with its 72px thumbnail, the media notice, the voice
// draft, the link preview draft with its remove control, the upload refusal, the not-sent line with
// Retry, the rate-limit line, the mention picker), then the row: Attach (image or video, no
// document, 1346), the field or the recording line, and Send in the thread's C or the mic. The field
// is a plain textarea on Input's tokens (extraction 5.3: Input has no autosizing single-row mode);
// it wraps, grows to 120px and then scrolls. Enter sends on pointer and Shift+Enter breaks; on touch
// return breaks and the button sends. The mention query is the trailing `@word` of the text; up to
// five members whose name starts with it are offered, and a pick replaces the word with `@Name `.
// Nothing here is stored anywhere: the unsent text is the caller's state for this tab (1351).
import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { Avatar } from "./Avatar";
import { Button } from "./Button";
import { Icon } from "./Icon";
import { IconButton } from "./IconButton";
import { Menu } from "./Menu";
import { RecordControl, VoiceRecorder } from "./VoiceRecorder";
import { mmss } from "./VoicePlayer";
import type { C } from "./cmeta";
import { useMode, type Mode } from "@/lib/tier";

export type ComposerMention = { id: string; name: string; src?: string | undefined };

export type MessageComposerProps = {
  value: string;
  onChange: (value: string) => void;
  onSend?: (() => void) | undefined;
  c?: C | undefined;
  /** `from` is the quoted author's name or `yourself`; the strip reads `Replying to {from}`. */
  quote?: { from: string; text: string } | null | undefined;
  onRemoveQuote?: (() => void) | undefined;
  editing?: boolean | undefined;
  onRemoveEdit?: (() => void) | undefined;
  /** The media draft: the caller's object URL for the thumbnail (MediaBlock image, 1/1). */
  media?: { kind: "image" | "video"; thumbnail: ReactNode } | null | undefined;
  onRemoveMedia?: (() => void) | undefined;
  voice?: { durationMs: number } | null | undefined;
  onRemoveVoice?: (() => void) | undefined;
  /** The link preview draft, rendered by the caller (MediaBlock link), with its remove control here. */
  preview?: ReactNode;
  onRemovePreview?: (() => void) | undefined;
  /** The thread's other members, for the mention picker. */
  mentions?: ComposerMention[] | undefined;
  onMention?: ((member: ComposerMention) => void) | undefined;
  /** The one-time media notice (1346), with its OK. */
  notice?: boolean | undefined;
  onNoticeOk?: (() => void) | undefined;
  /** The upload refusal line, with its OK. */
  error?: string | null | undefined;
  onErrorOk?: (() => void) | undefined;
  /** Not sent: the text stays, a grey mark, Retry. */
  failed?: boolean | undefined;
  onRetry?: (() => void) | undefined;
  /** Rate limited: the line, the field disabled, no number. */
  limited?: boolean | undefined;
  input?: Mode | undefined;
  onAttach?: ((kind: "image" | "video") => void) | undefined;
  /** Seconds elapsed while recording; null when not. */
  recording?: number | null | undefined;
  onRecordStart?: (() => void) | undefined;
  onRecordStop?: (() => void) | undefined;
  onRecordCancel?: (() => void) | undefined;
  /** The attach menu renders in place (a scaled frame) when false; default the body portal. */
  menuPortal?: boolean | undefined;
  style?: CSSProperties | undefined;
};

const FIELD_MIN = 44;
const FIELD_MAX = 120;

export function MessageComposer({
  value,
  onChange,
  onSend,
  c,
  quote,
  onRemoveQuote,
  editing = false,
  onRemoveEdit,
  media,
  onRemoveMedia,
  voice,
  onRemoveVoice,
  preview,
  onRemovePreview,
  mentions = [],
  onMention,
  notice = false,
  onNoticeOk,
  error,
  onErrorOk,
  failed = false,
  onRetry,
  limited = false,
  input,
  onAttach,
  recording = null,
  onRecordStart,
  onRecordStop,
  onRecordCancel,
  menuPortal = true,
  style,
}: MessageComposerProps) {
  const detected = useMode();
  const mode = input || detected;
  const touch = mode === "touch";
  const [attachOpen, setAttachOpen] = useState(false);
  const [focus, setFocus] = useState(false);
  const attachRef = useRef<HTMLSpanElement>(null);
  const field = useRef<HTMLTextAreaElement>(null);
  const isRecording = recording !== null && recording !== undefined;
  // Grows with the text to the 120 cap, on every render of the field, for engines without
  // `field-sizing: content`.
  useLayoutEffect(() => {
    const el = field.current;
    if (!el) return;
    el.style.height = FIELD_MIN + "px";
    el.style.height = Math.min(FIELD_MAX, Math.max(FIELD_MIN, el.scrollHeight)) + "px";
  }, [value, isRecording]);
  const mentionMatch = /@([A-Za-z]*)$/.exec(value);
  const mentionQuery = mentionMatch ? (mentionMatch[1] ?? "").toLowerCase() : null;
  const candidates =
    mentionQuery !== null
      ? mentions.filter((m) => m.name.toLowerCase().startsWith(mentionQuery)).slice(0, 5)
      : [];
  const pick = (m: ComposerMention) => {
    onChange(value.replace(/@[A-Za-z]*$/, "@" + m.name + " "));
    onMention?.(m);
    field.current?.focus();
  };
  const hasContent = !!(value.trim() || media || voice);
  const canSend = (hasContent || editing) && !isRecording && !limited;
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey && !touch) {
      e.preventDefault();
      if (canSend) onSend?.();
    }
  };
  const strip = (label: string, text: string | null, onRemove: (() => void) | undefined) => (
    <div
      data-strip
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        padding: "var(--space-1) var(--space-1) var(--space-1) var(--space-3)",
        borderRadius: "var(--radius-m)",
        background: "var(--bg-sunken)",
        fontSize: "var(--text-xs)",
        lineHeight: "var(--text-xs-lh)",
      }}
    >
      <span style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 1 }}>
        <span style={{ fontWeight: "var(--weight-medium)" as unknown as number }}>{label}</span>
        {text && (
          <span
            style={{
              color: "var(--ink-2)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {text}
          </span>
        )}
      </span>
      <IconButton name="x" label="Remove" input={mode} size={36} onClick={onRemove} />
    </div>
  );
  const textBtn = (label: string, onClick: (() => void) | undefined) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        all: "unset",
        cursor: "pointer",
        minHeight: "var(--target-min)",
        display: "inline-flex",
        alignItems: "center",
        fontSize: "var(--text-xs)",
        fontWeight: "var(--weight-medium)" as unknown as number,
        color: "var(--ink)",
        textDecoration: "underline",
        textDecorationColor: "var(--line-strong)",
        textUnderlineOffset: 2,
        fontFamily: "var(--font-sans)",
        flex: "none",
      }}
    >
      {label}
    </button>
  );
  return (
    <div
      data-message-composer
      data-editing={editing ? "1" : undefined}
      data-recording={isRecording ? "1" : undefined}
      style={{
        flex: "none",
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-2)",
        padding: "var(--space-2) var(--space-3) var(--space-3)",
        borderTop: "1px solid var(--line)",
        background: "var(--bg)",
        fontFamily: "var(--font-sans)",
        color: "var(--ink)",
        ...style,
      }}
    >
      {quote && strip("Replying to " + quote.from, quote.text, onRemoveQuote)}
      {editing && strip("Editing", null, onRemoveEdit)}
      {media && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <div style={{ width: 72, flex: "none" }}>{media.thumbnail}</div>
          <div style={{ flex: 1, minWidth: 0 }}>
            {strip(
              media.kind === "video" ? "Video attached" : "Image attached",
              null,
              onRemoveMedia,
            )}
          </div>
        </div>
      )}
      {notice && (
        <div
          role="status"
          data-media-notice
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            fontSize: "var(--text-xs)",
            lineHeight: "var(--text-xs-lh)",
            color: "var(--ink-3)",
            padding: "0 var(--space-1)",
          }}
        >
          <Icon name="shield-check" size={14} />
          <span style={{ flex: 1 }}>Location and camera data are removed from what you send.</span>
          {textBtn("OK", onNoticeOk)}
        </div>
      )}
      {voice && strip("Voice note, " + mmss(voice.durationMs / 1000), null, onRemoveVoice)}
      {preview && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: "var(--space-2)" }}>
          <div style={{ flex: 1, minWidth: 0 }}>{preview}</div>
          <IconButton name="x" label="Remove the preview" input={mode} onClick={onRemovePreview} />
        </div>
      )}
      {error && (
        <div
          role="alert"
          data-upload-refused
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            fontSize: "var(--text-xs)",
            color: "var(--error)",
            padding: "0 var(--space-1)",
          }}
        >
          <span style={{ flex: 1 }}>{error}</span>
          {textBtn("OK", onErrorOk)}
        </div>
      )}
      {failed && (
        <div
          role="alert"
          data-not-sent
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            fontSize: "var(--text-xs)",
            color: "var(--ink-3)",
            padding: "0 var(--space-1)",
          }}
        >
          <span
            aria-hidden="true"
            style={{
              width: 8,
              height: 8,
              borderRadius: 999,
              background: "var(--ink-4)",
              flex: "none",
            }}
          />
          <span style={{ flex: 1 }}>Not sent. Your message is still here.</span>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </div>
      )}
      {limited && (
        <div
          role="status"
          data-rate-limited
          style={{ fontSize: "var(--text-xs)", color: "var(--ink-3)", padding: "0 var(--space-1)" }}
        >
          You are sending quickly. Wait a moment before the next message.
        </div>
      )}
      {mentionQuery !== null && candidates.length > 0 && (
        <div
          role="listbox"
          aria-label="Mention a member"
          data-mention-picker
          style={{
            display: "flex",
            flexDirection: "column",
            borderRadius: "var(--radius-m)",
            border: "1px solid var(--line)",
            background: "var(--surface)",
            overflow: "hidden",
          }}
        >
          {candidates.map((m) => (
            <button
              key={m.id}
              type="button"
              role="option"
              aria-selected={false}
              onClick={() => pick(m)}
              style={{
                all: "unset",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                minHeight: "var(--target-primary)",
                padding: "0 var(--space-3)",
                fontSize: "var(--text-s)",
                fontFamily: "inherit",
              }}
            >
              <Avatar name={m.name} src={m.src} size={28} />
              {m.name}
            </button>
          ))}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "flex-end", gap: "var(--space-1)" }}>
        {!isRecording && !editing && (
          <span ref={attachRef} style={{ display: "inline-flex", flex: "none" }}>
            <IconButton
              name="image"
              label="Attach an image or video"
              input={mode}
              aria-haspopup="menu"
              aria-expanded={attachOpen}
              onClick={() => setAttachOpen((o) => !o)}
              data-testid="attach"
            />
            <Menu
              open={attachOpen}
              onClose={() => setAttachOpen(false)}
              anchorRef={attachRef}
              items={[
                { id: "image", label: "Image", icon: "image", onSelect: () => onAttach?.("image") },
                { id: "video", label: "Video", icon: "video", onSelect: () => onAttach?.("video") },
              ]}
              label="Attach"
              input={mode}
              placement="top-start"
              portal={menuPortal}
            />
          </span>
        )}
        {isRecording ? (
          <VoiceRecorder
            input={mode}
            recording
            elapsed={recording ?? 0}
            onCancel={onRecordCancel}
          />
        ) : (
          <textarea
            ref={field}
            rows={1}
            aria-label="Message"
            placeholder={editing ? "Edit your message" : "Message"}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={onKey}
            onFocus={() => setFocus(true)}
            onBlur={() => setFocus(false)}
            disabled={limited}
            data-testid="message-field"
            style={{
              flex: 1,
              minWidth: 0,
              boxSizing: "border-box",
              display: "block",
              width: "100%",
              minHeight: FIELD_MIN,
              maxHeight: FIELD_MAX,
              padding: "11px 12px",
              margin: 0,
              borderRadius: "var(--radius-m)",
              border: "1px solid " + (focus ? "var(--ink)" : "transparent"),
              background: focus ? "var(--surface)" : "var(--bg-sunken)",
              fontFamily: "var(--font-sans)",
              fontSize: "var(--text-s)",
              lineHeight: "var(--text-s-lh)",
              color: "var(--ink)",
              resize: "none",
              overflowY: "auto",
              whiteSpace: "pre-wrap",
              overflowWrap: "anywhere",
              wordBreak: "break-word",
              outline: "none",
              opacity: limited ? 0.6 : 1,
              transition: "border-color var(--dur-default) var(--ease)",
            }}
          />
        )}
        {(hasContent || editing) && !isRecording ? (
          <IconButton
            name="send"
            label={editing ? "Save" : "Send"}
            c={c}
            active
            input={mode}
            disabled={!canSend}
            onClick={onSend}
            data-testid="send"
          />
        ) : (
          <RecordControl
            input={mode}
            recording={isRecording}
            onStart={onRecordStart}
            onStop={onRecordStop}
            onCancel={onRecordCancel}
          />
        )}
      </div>
    </div>
  );
}
