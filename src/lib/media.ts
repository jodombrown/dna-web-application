// Rulings 346 to 348: the client half of the one media pipeline. Every surface that uploads an
// image calls normalizeImage before any bytes leave the device, and reads through deliverImageUrl.
// The avatar control is the first consumer; the composer and the profile cover adopt these two
// functions next, so the conversion, the resize and the metadata strip live here once, not in each
// surface.
import { getSupabase } from "./supabase";

export type MediaBucket = "profile-media" | "post-media";
export type ImageFormat = "image/jpeg" | "image/webp";

/** The pipeline's shared ceilings. A normalised master is far under the 10 MB bucket limit. */
export const MEDIA_MAX_EDGE = 2000;
export const MEDIA_JPEG_QUALITY = 0.85;

export type NormalizedImage = {
  /** Re-encoded bytes: converted to `type`, downscaled to fit MEDIA_MAX_EDGE, metadata stripped. */
  blob: Blob;
  width: number;
  height: number;
  type: ImageFormat;
};

/**
 * Decode `file`, downscale it to fit within `maxEdge`, and re-encode it as JPEG (or WebP). Drawing to
 * a canvas and exporting through toBlob is what strips EXIF, XMP and GPS on the client (ruling 347):
 * the exported bytes carry no metadata from the source. Returns null when the browser cannot decode
 * the file (a HEIC on a build without the system codec, a corrupt file); the caller then uploads the
 * original and the server's own strip and validation stand as the backstop.
 */
export async function normalizeImage(
  file: File,
  opts: { maxEdge?: number; quality?: number; format?: ImageFormat } = {},
): Promise<NormalizedImage | null> {
  if (typeof document === "undefined" || typeof createImageBitmap !== "function") return null;
  const maxEdge = opts.maxEdge ?? MEDIA_MAX_EDGE;
  const quality = opts.quality ?? MEDIA_JPEG_QUALITY;
  const type: ImageFormat = opts.format ?? "image/jpeg";

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null;
  }
  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // JPEG has no alpha; paint white behind a transparent source so it does not composite to black.
    if (type === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
    }
    ctx.drawImage(bitmap, 0, 0, w, h);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
    if (!blob) return null;
    return { blob, width: w, height: h, type };
  } catch {
    return null;
  } finally {
    bitmap.close();
  }
}

/** The extension the pipeline stores for a normalised master. */
export function extensionFor(type: ImageFormat): "jpg" | "webp" {
  return type === "image/webp" ? "webp" : "jpg";
}

export type Transform = {
  width?: number;
  height?: number;
  resize?: "cover" | "contain" | "fill";
  quality?: number;
};

/**
 * A signed URL for a stored master, rendered at a delivery size (ruling 346: one master serves every
 * size). Falls back to the untransformed signed master if the transform cannot be produced, so a
 * caller always gets a URL. Private buckets require the signed variant; the transform rides on it.
 */
export async function deliverImageUrl(
  bucket: MediaBucket,
  path: string | null | undefined,
  transform?: Transform,
): Promise<string | undefined> {
  const sb = getSupabase();
  if (!sb || !path) return undefined;
  if (transform) {
    const { data } = await sb.storage.from(bucket).createSignedUrl(path, 60 * 60, { transform });
    if (data?.signedUrl) return data.signedUrl;
  }
  const { data } = await sb.storage.from(bucket).createSignedUrl(path, 60 * 60);
  return data?.signedUrl ?? undefined;
}
