import js from "@eslint/js";
import eslintPluginPrettier from "eslint-plugin-prettier/recommended";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", ".output", ".vinxi", ".wrangler"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "no-restricted-imports": [
        "error",
        {
          paths: [
            {
              name: "server-only",
              message:
                "TanStack Start does not use the Next.js `server-only` package. Rename the module to `*.server.ts` or mark it with `@tanstack/react-start/server-only`.",
            },
          ],
        },
      ],
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "@typescript-eslint/no-unused-vars": "off",
      // Ruling 387: the retired sender exists in the contact module so a grep finds it once, and
      // nowhere else. Reading it from a surface or an edge function is a lint failure, whichever
      // path the module was imported by.
      "no-restricted-syntax": [
        "error",
        {
          selector: 'MemberExpression[property.name="legacySender"]',
          message:
            "The legacy sender is retired (ruling 387). Send from AUTH_SENDER or NOTIFICATION_SENDER in the contact module.",
        },
        {
          selector: 'MemberExpression[computed=true][property.value="legacySender"]',
          message:
            "The legacy sender is retired (ruling 387). Send from AUTH_SENDER or NOTIFICATION_SENDER in the contact module.",
        },
      ],
    },
  },
  // The two constants files define the retired entry; that is the one hit the rule above protects.
  {
    files: ["src/lib/contact.ts", "supabase/functions/_shared/contact.ts"],
    rules: { "no-restricted-syntax": "off" },
  },
  eslintPluginPrettier,
);
