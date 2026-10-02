// POST /api/messages/media (handoff 41-B section 3; rulings 1346, 1374, 346, 347, 1353): upload and
// finalize in one. The body is the bytes; `thread`, `client_id`, `w`, `h` and `duration_ms` are query
// parameters; `Content-Type` is one of the seven mimes. The member comes from the bearer, the size
// from Content-Length, the mime from the leading bytes as well as the declaration, the object goes to
// R2 through the binding as a stream with a known length (never buffered), and the row is written
// through `messenger_media_record` with the member's own JWT. If the record refuses, the object is
// deleted and its word is the answer. The client sends `messenger_send(..., 'media' | 'voice', ...,
// media_id)` next; 41-C wires that.
//
// This file carries only `server`, so TanStack Start prunes it from the client route tree and the
// server-only helper never reaches the browser bundle.
import { createFileRoute } from "@tanstack/react-router";
import {
  MESSAGE_AUDIO_MAX_MS,
  MESSAGE_MEDIA_MAX_BYTES,
  asRecorded,
  isMessageMediaMime,
  isUuid,
  json,
  memberFromRequest,
  messageMediaBucket,
  positiveInt,
  readHead,
  refusalFromPostgres,
  refuse,
  sniff,
} from "@/lib/server/messenger-media.server";

export const Route = createFileRoute("/api/messages/media")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const member = await memberFromRequest(request);
        if (member instanceof Response) return member;

        const url = new URL(request.url);
        const thread = url.searchParams.get("thread");
        const clientId = url.searchParams.get("client_id");
        if (!isUuid(thread) || !isUuid(clientId)) return refuse("bad_media");

        const declared = (request.headers.get("content-type") ?? "")
          .split(";")[0]!
          .trim()
          .toLowerCase();
        if (!isMessageMediaMime(declared)) return refuse("bad_media");

        // The size is the declared length, which the Workers runtime already bounded at the edge
        // (a body over the plan's ceiling is a 413 before this code runs); a body with no length
        // cannot be streamed to R2 with a known length, so it is refused rather than buffered.
        const lengthHeader = request.headers.get("content-length");
        const size = lengthHeader && /^\d{1,12}$/.test(lengthHeader) ? Number(lengthHeader) : NaN;
        if (!Number.isInteger(size) || size < 1) return refuse("bad_media");
        if (size > MESSAGE_MEDIA_MAX_BYTES) return refuse("too_large");

        const audio = declared.startsWith("audio/");
        let width: number | null = null;
        let height: number | null = null;
        if (audio) {
          const duration = positiveInt(url.searchParams.get("duration_ms"));
          if (duration == null || duration > MESSAGE_AUDIO_MAX_MS) return refuse("bad_media");
        } else {
          width = positiveInt(url.searchParams.get("w"));
          height = positiveInt(url.searchParams.get("h"));
          if (width == null || height == null) return refuse("bad_media");
        }

        const { bucket, source } = await messageMediaBucket(request);
        const envHeader = { "x-dna-env-source": source };
        if (!bucket) return refuse("unavailable", 503, envHeader);
        if (!request.body) return refuse("bad_media", 400, envHeader);
        if (typeof FixedLengthStream !== "function") return refuse("unavailable", 503, envHeader);

        // Sniff the leading bytes, then replay them ahead of the remainder into a stream of the
        // declared length. R2 requires a known length for a streamed body, and the request body's
        // own length does not survive a reader, so FixedLengthStream carries it.
        const reader = request.body.getReader();
        const { chunks, head } = await readHead(reader);
        const sniffed = sniff(head, declared);
        if (!sniffed) {
          await reader.cancel().catch(() => undefined);
          return refuse("bad_media", 400, envHeader);
        }

        const fixed = new FixedLengthStream(size);
        const pump = (async () => {
          const writer = fixed.writable.getWriter();
          try {
            for (const c of chunks) await writer.write(c);
            for (;;) {
              const r = await reader.read();
              if (r.done) break;
              if (r.value && r.value.byteLength) await writer.write(r.value);
            }
            await writer.close();
          } catch (e) {
            await writer.abort(e).catch(() => undefined);
            throw e;
          }
        })();

        const key = `${thread}/${clientId}/${crypto.randomUUID()}`;
        try {
          await Promise.all([
            bucket.put(key, fixed.readable, {
              httpMetadata: { contentType: sniffed },
              customMetadata: { thread, member: member.uid },
            }),
            pump,
          ]);
        } catch {
          // A body shorter or longer than its Content-Length, or a dropped connection: R2 keeps
          // nothing from a failed put, and the client sees the one word it already knows.
          await bucket.delete(key).catch(() => undefined);
          return refuse("bad_media", 400, envHeader);
        }

        const { data, error } = await member.sb.rpc("messenger_media_record", {
          p_thread: thread,
          p_storage_path: key,
          p_mime: sniffed,
          p_byte_size: size,
          p_width: width,
          p_height: height,
        });
        if (error) {
          await bucket.delete(key).catch(() => undefined);
          const refused = refusalFromPostgres(error);
          refused.headers.set("x-dna-env-source", source);
          return refused;
        }
        const row = asRecorded(data);
        if (!row) {
          await bucket.delete(key).catch(() => undefined);
          return refuse("unavailable", 503, envHeader);
        }
        return json(
          {
            media_id: row.id,
            mime: row.mime,
            width: row.width,
            height: row.height,
            byte_size: row.byte_size,
          },
          200,
          envHeader,
        );
      },
    },
  },
});
