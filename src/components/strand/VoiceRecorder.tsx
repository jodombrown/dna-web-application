// Brief 14 (SPEC 41-14 Part A item 5; extraction 41-14 sections 1.6 and 5.4), ported from the
// prototype's recording line and mic in `composerNode()`. Two pieces in one part, because the
// composer swaps them in on opposite ends of its row: `VoiceRecorder` is the line that replaces the
// field while recording (a breathing ink dot, `Recording 0:07`, `, release to stop` on touch, and
// Cancel), and `RecordControl` is the mic, which becomes `check` while recording. On touch the mic is
// held: pointer down starts, up stops, and one stable wrapper holds the pointer capture for the whole
// hold so the release lands on the element the finger pressed. On pointer a click starts and a click
// stops. The clock is the caller's; `elapsed` is seconds.
import type { CSSProperties, PointerEvent } from "react";
import { Button } from "./Button";
import { IconButton } from "./IconButton";
import { mmss } from "./VoicePlayer";
import { useMode, type Mode } from "@/lib/tier";

export type VoiceRecorderProps = {
  input?: Mode | undefined;
  recording: boolean;
  /** Seconds. */
  elapsed: number;
  onCancel?: (() => void) | undefined;
  style?: CSSProperties | undefined;
};

export function VoiceRecorder({ input, recording, elapsed, onCancel, style }: VoiceRecorderProps) {
  const detected = useMode();
  const mode = input || detected;
  if (!recording) return null;
  return (
    <div
      role="status"
      aria-live="polite"
      data-voice-recorder
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: "var(--target-primary)",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        padding: "0 var(--space-3)",
        borderRadius: "var(--radius-m)",
        background: "var(--bg-sunken)",
        fontSize: "var(--text-s)",
        fontFamily: "var(--font-sans)",
        color: "var(--ink)",
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: "var(--ink)",
          animation: "strand-breathe 1.2s var(--ease) infinite",
          flex: "none",
        }}
      />
      <span style={{ flex: 1, minWidth: 0 }}>
        Recording {mmss(elapsed)}
        {mode === "touch" ? ", release to stop" : ""}
      </span>
      <Button variant="ghost" size="sm" onClick={onCancel}>
        Cancel
      </Button>
    </div>
  );
}

export type RecordControlProps = {
  input?: Mode | undefined;
  recording: boolean;
  onStart?: (() => void) | undefined;
  onStop?: (() => void) | undefined;
  onCancel?: (() => void) | undefined;
  style?: CSSProperties | undefined;
};

export function RecordControl({
  input,
  recording,
  onStart,
  onStop,
  onCancel,
  style,
}: RecordControlProps) {
  const detected = useMode();
  const mode = input || detected;
  if (mode === "touch")
    return (
      <span
        data-record-control="touch"
        onPointerDown={(e: PointerEvent<HTMLSpanElement>) => {
          if (recording) return;
          e.preventDefault();
          e.currentTarget.setPointerCapture?.(e.pointerId);
          onStart?.();
        }}
        onPointerUp={() => {
          if (recording) onStop?.();
        }}
        onPointerCancel={() => {
          if (recording) onCancel?.();
        }}
        onContextMenu={(e) => e.preventDefault()}
        style={{
          display: "inline-flex",
          touchAction: "none",
          userSelect: "none",
          WebkitUserSelect: "none",
          ...style,
        }}
      >
        <IconButton
          name={recording ? "check" : "mic"}
          label={recording ? "Release to stop recording" : "Hold to record a voice note"}
          input={mode}
          active={recording}
          data-testid="record"
        />
      </span>
    );
  return (
    <IconButton
      name={recording ? "check" : "mic"}
      label={recording ? "Stop recording" : "Record a voice note"}
      input={mode}
      active={recording}
      onClick={() => (recording ? onStop?.() : onStart?.())}
      data-record-control="pointer"
      data-testid="record"
      style={style}
    />
  );
}
