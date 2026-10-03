// Brief 14 (SPEC 41-14 Part A item 5; extraction 41-14 sections 1.5 and 5.4), ported from the
// prototype's `voicePlayer()`: play or pause, a scrub range named `Position` with its value in
// words, and `{elapsed} / {total}` as `m:ss`. Controlled: the caller owns the audio element and its
// clock, this draws the state it is given. The pause glyph is Strand's `pause` icon, added with this
// brief where the prototype drew a square. `0:00 / 0:42` is a duration, not a count (section 4).
import type { CSSProperties } from "react";
import { Icon } from "./Icon";

export type VoicePlayerProps = {
  /** Seconds. */
  duration: number;
  /** Seconds. */
  position: number;
  playing: boolean;
  onToggle?: (() => void) | undefined;
  onSeek?: ((seconds: number) => void) | undefined;
  /** Inside an own bubble the control sits on --surface; on another's, --bg-sunken. */
  own?: boolean | undefined;
  style?: CSSProperties | undefined;
};

/** `0:42`, `12:05`. */
export function mmss(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  return m + ":" + String(s % 60).padStart(2, "0");
}

export function VoicePlayer({
  duration,
  position,
  playing,
  onToggle,
  onSeek,
  own = false,
  style,
}: VoicePlayerProps) {
  const max = Math.max(1, Math.round(duration));
  const pos = Math.min(max, Math.max(0, position));
  return (
    <div
      role="group"
      aria-label="Voice note"
      data-voice-player
      data-playing={playing ? "1" : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        minWidth: 200,
        fontFamily: "var(--font-sans)",
        ...style,
      }}
    >
      <style>
        {".strand-voice-range{-webkit-appearance:none;appearance:none;width:100%;height:24px;background:transparent;accent-color:var(--ink);margin:0;cursor:pointer}" +
          ".strand-voice-range::-webkit-slider-runnable-track{height:3px;border-radius:2px;background:var(--line-strong)}" +
          ".strand-voice-range::-webkit-slider-thumb{-webkit-appearance:none;width:14px;height:14px;margin-top:-5.5px;border-radius:999px;background:var(--ink)}" +
          ".strand-voice-range::-moz-range-track{height:3px;border-radius:2px;background:var(--line-strong)}" +
          ".strand-voice-range::-moz-range-thumb{width:14px;height:14px;border:0;border-radius:999px;background:var(--ink)}" +
          ".strand-voice-range:focus-visible{outline:2px solid var(--focus);outline-offset:2px}"}
      </style>
      <button
        type="button"
        aria-label={playing ? "Pause" : "Play"}
        onClick={onToggle}
        style={{
          all: "unset",
          cursor: "pointer",
          width: "var(--target-primary)",
          height: "var(--target-primary)",
          borderRadius: 999,
          background: own ? "var(--surface)" : "var(--bg-sunken)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flex: "none",
          color: "var(--ink)",
        }}
      >
        <Icon name={playing ? "pause" : "play"} size={18} />
      </button>
      <input
        type="range"
        className="strand-voice-range"
        min={0}
        max={max}
        step={1}
        value={pos}
        aria-label="Position"
        aria-valuetext={mmss(pos) + " of " + mmss(max)}
        onChange={(e) => onSeek?.(Number(e.target.value))}
        style={{ flex: 1 }}
      />
      <span
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--ink-3)",
          fontVariantNumeric: "tabular-nums",
          flex: "none",
        }}
      >
        {mmss(pos)} / {mmss(max)}
      </span>
    </div>
  );
}
