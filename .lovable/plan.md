# Add DNA favicon

Replace the default Lovable favicon with one derived from the existing DNA logo.

## Changes

1. Generate a square favicon from `public/strand/logo.png`.
   - Resize to fit within 64x64, preserving aspect ratio.
   - Pad with transparent background and center the logo.
   - Save as `public/favicon.png`.

2. Update `src/routes/__root.tsx`.
   - Replace the `{ rel: "icon", href: "/favicon.ico", type: "image/x-icon" }` link entry with `{ rel: "icon", type: "image/png", href: "/favicon.png" }`.

3. Remove the default `public/favicon.ico` so it is no longer served.
