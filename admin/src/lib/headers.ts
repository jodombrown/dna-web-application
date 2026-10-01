// Handoff 40-B section 5: the admin host's response headers. Ruling 438's six, at least as strict
// as the member app's (src/lib/csp.ts), and two more: X-Robots-Tag so nothing here is indexed, and
// frame-ancestors 'none', which the member policy already carries. img-src is cut to the host's
// own files and data:, because the one image this app shows beyond its wordmark is the TOTP QR
// code, which Supabase returns as a data: URL; the member app's blob:, https: and Supabase storage
// sources have no use here. Permissions-Policy closes the camera, which the member app opens for
// its composer. Static assets carry the same set from admin/public/_headers.
import { SUPABASE_URL } from "@/lib/supabase";

export function adminContentSecurityPolicy(nonce: string | undefined): string {
  const script = nonce ? `script-src 'self' 'nonce-${nonce}'` : "script-src 'self'";
  const supabase = SUPABASE_URL.replace(/\/$/, "");
  return [
    "default-src 'self'",
    `connect-src 'self' ${supabase} ${supabase.replace(/^https:/, "wss:")}`,
    "img-src 'self' data:",
    script,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

export function adminSecurityHeaders(nonce: string | undefined): [string, string][] {
  return [
    ["Content-Security-Policy", adminContentSecurityPolicy(nonce)],
    ["X-Frame-Options", "DENY"],
    ["Referrer-Policy", "strict-origin-when-cross-origin"],
    ["Strict-Transport-Security", "max-age=31536000; includeSubDomains"],
    ["X-Content-Type-Options", "nosniff"],
    ["Permissions-Policy", "camera=(), geolocation=(), microphone=()"],
    ["X-Robots-Tag", "noindex"],
  ];
}
