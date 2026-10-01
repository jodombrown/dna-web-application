import { Outlet, createRootRoute, HeadContent, Scripts, useRouter } from "@tanstack/react-router";
import type { ReactNode } from "react";
import appCss from "@/styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "DNA Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: () => <Outlet />,
});

function RootShell({ children }: { children: ReactNode }) {
  const nonce = useRouter().options.ssr?.nonce;
  return (
    <html lang="en">
      <head>
        <HeadContent />
        {nonce && <meta property="csp-nonce" content={nonce} />}
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}
