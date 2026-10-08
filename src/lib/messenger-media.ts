// Brief 14 (SPEC 41-14 Part B "Media"; 41-B): the thread's media on the client. A message's bytes
// come through GET /api/messages/media/{id} with the bearer, so an <img>, <video> or <audio> cannot
// load them by URL; `useMessageMedia` fetches once per id for the tab and hands each element its own
// object URL of those bytes, revoked when the element goes, and the mime the blob carries, which is
// how the bubble knows an image from a video (the projection carries the media id alone; 1574).
// `useAudio` is the clock behind VoicePlayer. `useRecorder` is the voice note: MediaRecorder on the
// microphone, WebM Opus where the engine has it and MP4 AAC on Safari, the duration from the
// recorder's own clock. Nothing here is stored anywhere.
import { useCallback, useEffect, useRef, useState } from "react";
import { deliverImageUrl, fetchMessageMedia } from "./media";

export type LoadedMedia = { url: string; mime: string };

const cache = new Map<string, Promise<Blob | null>>();

export function useMessageMedia(mediaId: string | null | undefined): LoadedMedia | null {
  const [state, setState] = useState<LoadedMedia | null>(null);
  useEffect(() => {
    if (!mediaId) {
      setState(null);
      return;
    }
    let active = true;
    let url: string | null = null;
    let p = cache.get(mediaId);
    if (!p) {
      p = fetchMessageMedia(mediaId);
      cache.set(mediaId, p);
    }
    void p.then((blob) => {
      if (!active) return;
      if (!blob) {
        cache.delete(mediaId);
        setState(null);
        return;
      }
      // The blob's type is what the route answered as Content-Type.
      url = URL.createObjectURL(blob);
      setState({ url, mime: blob.type });
    });
    return () => {
      active = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, [mediaId]);
  return state;
}

export type AudioState = {
  duration: number;
  position: number;
  playing: boolean;
  toggle: () => void;
  seek: (seconds: number) => void;
};

/** One <audio> per player, created on first play; position in seconds from the element's own clock. */
export function useAudio(url: string | null): AudioState {
  const el = useRef<HTMLAudioElement | null>(null);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!url || typeof Audio === "undefined") return;
    const a = new Audio(url);
    a.preload = "metadata";
    el.current = a;
    const onMeta = () => setDuration(Number.isFinite(a.duration) ? a.duration : 0);
    const onTime = () => setPosition(a.currentTime);
    const onEnd = () => {
      setPlaying(false);
      setPosition(a.duration || 0);
    };
    const onPause = () => setPlaying(false);
    const onPlay = () => setPlaying(true);
    a.addEventListener("loadedmetadata", onMeta);
    a.addEventListener("durationchange", onMeta);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("ended", onEnd);
    a.addEventListener("pause", onPause);
    a.addEventListener("play", onPlay);
    return () => {
      a.pause();
      a.removeEventListener("loadedmetadata", onMeta);
      a.removeEventListener("durationchange", onMeta);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("play", onPlay);
      el.current = null;
    };
  }, [url]);
  const toggle = useCallback(() => {
    const a = el.current;
    if (!a) return;
    if (a.paused) {
      if (a.ended || (a.duration && a.currentTime >= a.duration)) a.currentTime = 0;
      void a.play().catch(() => undefined);
    } else a.pause();
  }, []);
  const seek = useCallback((s: number) => {
    const a = el.current;
    if (!a) return;
    a.currentTime = s;
    setPosition(s);
  }, []);
  return { duration, position, playing, toggle, seek };
}

export type Recording = { blob: Blob; mime: string; durationMs: number };

export type RecorderState = {
  /** Seconds elapsed while recording; null when not recording. */
  elapsed: number | null;
  supported: boolean;
  start: () => Promise<boolean>;
  /** Resolves with the recording, or null when it was cancelled or too short. */
  stop: () => Promise<Recording | null>;
  cancel: () => void;
};

const MIME_PREFERENCE = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

function pickMime(): string | null {
  if (typeof MediaRecorder === "undefined") return null;
  for (const m of MIME_PREFERENCE) if (MediaRecorder.isTypeSupported(m)) return m;
  return null;
}

export function useRecorder(): RecorderState {
  const [elapsed, setElapsed] = useState<number | null>(null);
  const rec = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const startedAt = useRef(0);
  const timer = useRef<number | null>(null);
  const cancelled = useRef(false);
  const supported =
    typeof navigator !== "undefined" && !!navigator.mediaDevices && pickMime() !== null;
  const release = useCallback(() => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    rec.current = null;
    setElapsed(null);
  }, []);
  useEffect(() => release, [release]);
  const start = useCallback(async () => {
    const mime = pickMime();
    if (!mime || rec.current) return false;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.current = s;
      const r = new MediaRecorder(s, { mimeType: mime });
      chunks.current = [];
      cancelled.current = false;
      r.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.current.push(e.data);
      };
      rec.current = r;
      startedAt.current = Date.now();
      setElapsed(0);
      timer.current = window.setInterval(
        () => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)),
        1000,
      );
      r.start(250);
      return true;
    } catch {
      release();
      return false;
    }
  }, [release]);
  const stop = useCallback(
    () =>
      new Promise<Recording | null>((resolve) => {
        const r = rec.current;
        if (!r) {
          resolve(null);
          return;
        }
        const durationMs = Date.now() - startedAt.current;
        const mime = r.mimeType.split(";")[0] ?? "audio/webm";
        r.onstop = () => {
          const parts = chunks.current;
          release();
          if (cancelled.current || durationMs < 1000 || !parts.length) {
            resolve(null);
            return;
          }
          resolve({ blob: new Blob(parts, { type: mime }), mime, durationMs });
        };
        r.stop();
      }),
    [release],
  );
  const cancel = useCallback(() => {
    cancelled.current = true;
    const r = rec.current;
    if (r && r.state !== "inactive") r.stop();
    release();
  }, [release]);
  return { elapsed, supported, start, stop, cancel };
}

// ---------------------------------------------------------------------------------------------------
// Member avatars on the Messenger surfaces: profile-media masters delivered at the row's size (346),
// signed once per path for the tab.
// ---------------------------------------------------------------------------------------------------
const avatars = new Map<string, Promise<string | undefined>>();

export function avatarUrl(path: string | null | undefined, size = 44): Promise<string | undefined> {
  if (!path) return Promise.resolve(undefined);
  const key = path + "@" + size;
  let p = avatars.get(key);
  if (!p) {
    // A signing that fails leaves the row on its initials and is not kept, so the next render asks
    // again instead of holding a rejection for the session.
    p = deliverImageUrl("profile-media", path, {
      width: size * 2,
      height: size * 2,
      resize: "cover",
    }).catch(() => {
      avatars.delete(key);
      return undefined;
    });
    avatars.set(key, p);
  }
  return p;
}

export function useAvatarUrl(path: string | null | undefined, size = 44): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    let active = true;
    void avatarUrl(path, size).then((u) => {
      if (active) setUrl(u);
    });
    return () => {
      active = false;
    };
  }, [path, size]);
  return url;
}
