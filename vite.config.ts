// The build, stated option by option (ruling 1142, handoff 33-C). Until 33-C this file called
// defineConfig from @lovable.dev/vite-tanstack-config 2.20.0, which assembled this config inside
// the package. What follows is that config as it applied outside Lovable's sandbox, less what served
// only the sandbox or the editor; the commit that replaced the wrapper names each part it left out.
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig, loadEnv } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command, mode }) => ({
  plugins: [
    tailwindcss(),
    tsConfigPaths({ projects: ["./tsconfig.json"] }),
    tanstackStart({
      // In the client environment an import of a file under a server/ directory, or of the
      // server-only specifier, is an error, so server code never ships to the browser.
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
      // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
      // nitro/vite builds from this
      server: { entry: "server" },
    }),
    // Build only: vite dev serves through TanStack Start's own dev server, not Nitro's.
    ...(command === "build"
      ? [
          nitro({
            // Nitro reads defaultPreset only when no preset is set, so preset decides the target.
            defaultPreset: "cloudflare-module",
            // Cloudflare Pages is the deploy target (per-branch preview deployments). Nitro emits
            // dist/ with _worker.js for Pages; wrangler.jsonc points Pages at it.
            preset: "cloudflare-pages",
          }),
        ]
      : []),
    viteReact(),
  ],
  // Every VITE_* value, from the environment and the .env files, as a compile-time constant.
  define: Object.fromEntries(
    Object.entries(loadEnv(mode, process.cwd(), "VITE_")).map(([key, value]) => [
      `import.meta.env.${key}`,
      JSON.stringify(value),
    ]),
  ),
  // bun run build:dev: the client keeps React's development build.
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
    alias: { "@": `${process.cwd()}/src` },
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
    port: 8080,
    // A changed file is read once its writes have settled, never half written.
    watch: { awaitWriteFinish: { stabilityThreshold: 1000, pollInterval: 100 } },
  },
}));
