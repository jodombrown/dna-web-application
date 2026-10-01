// The admin app's build (Brief 12 12A-2, handoff 40-B, rulings 1290, 1291). The root vite.config.ts,
// option for option, with this directory as the Vite root: the routes, the router, the server entry
// and the generated route tree live under admin/src, the `@` alias still resolves to the root src/
// so every foundation is imported and never copied, and Nitro's cloudflare-pages preset emits
// admin/dist for the Pages project `dna-admin`. The member app's build reads nothing here.
import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

const here = fileURLToPath(new URL(".", import.meta.url)).replace(/\/$/, "");
const repo = fileURLToPath(new URL("..", import.meta.url)).replace(/\/$/, "");

export default defineConfig(({ command, mode }) => ({
  root: here,
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: [`${here}/tsconfig.json`] }),
    tanstackStart({
      srcDirectory: "src",
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
      server: { entry: "server" },
    }),
    ...(command === "build"
      ? [
          nitro({
            defaultPreset: "cloudflare-module",
            preset: "cloudflare-pages",
            // Ruling 184's asset contract, by path: the wordmark, the fonts and the icons are the
            // root public/ tree's files, served from this build at the same paths, with no file
            // copied into the repository twice. Nitro copies these in order and never overwrites,
            // so this app's own public/ (admin/public) is listed first and its _headers and
            // robots.txt are the ones that ship (section 5 of the handoff); the member app's copies
            // of those two, and its PWA manifest, are ignored by name as well, so the order is not
            // the only thing keeping them out.
            publicAssets: [
              { dir: `${here}/public`, baseURL: "/", maxAge: 0 },
              {
                dir: `${repo}/public`,
                baseURL: "/",
                maxAge: 0,
                ignore: ["**/_headers", "**/robots.txt", "**/manifest.webmanifest"],
              },
            ],
          }),
        ]
      : []),
    viteReact(),
  ],
  define: Object.fromEntries(
    Object.entries(loadEnv(mode, repo, "VITE_")).map(([key, value]) => [
      `import.meta.env.${key}`,
      JSON.stringify(value),
    ]),
  ),
  ...(command === "build" && mode === "development"
    ? {
        environments: {
          client: { define: { "process.env.NODE_ENV": JSON.stringify("development") } },
        },
        esbuild: { keepNames: true },
      }
    : {}),
  css: { transformer: "lightningcss" },
  resolve: {
    alias: { "@": `${repo}/src` },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
    ignoreOutdatedRequests: true,
  },
  server: {
    host: "::",
    port: 8081,
    watch: { awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 } },
  },
}));
