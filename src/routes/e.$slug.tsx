// /e/:slug (Brief 10; rulings 662, 1024, 1028, 1029): the public event page, outside the shell and
// rendered on the server. The loader reads `public.event_public_page(slug)` with the anon key; null
// is the not-found state, thrown as the router's own notFound so the response is a 404. The head
// carries the link-preview tags a crawler reads from the served markup: title, description (when,
// place or format word, presenter), the cover through event-media when there is one, the URL, and
// the summary_large_image card. Search indexing stays off until the founder rules on it.
import { createFileRoute, notFound } from "@tanstack/react-router";
import { createIsomorphicFn } from "@tanstack/react-start";
import { getRequestUrl } from "@tanstack/react-start/server";
import { PublicEventSurface } from "@/components/dna/PublicEventSurface";
import { eventOwnWhen, placeWord } from "@/components/dna/EventParts";
import { eventMediaUrl, publicEventPath } from "@/lib/event-page";
import { loadPublicEventPage } from "@/lib/event-public";
import { ErrorComponent } from "./__root";

/** This deployment's origin: the request's on the server, the window's in the browser. */
const originOf = createIsomorphicFn()
  .server((): string => {
    try {
      return getRequestUrl({ xForwardedHost: true, xForwardedProto: true }).origin;
    } catch {
      return "";
    }
  })
  .client((): string => (typeof window !== "undefined" ? window.location.origin : ""));

export const Route = createFileRoute("/e/$slug")({
  loader: async ({ params }) => {
    const page = await loadPublicEventPage(params.slug);
    if (!page) throw notFound();
    return { page, slug: params.slug, origin: originOf() };
  },
  head: ({ loaderData }) => {
    if (!loaderData) return { meta: [{ name: "robots", content: "noindex" }] };
    const { page, slug, origin } = loaderData;
    const ev = page.event;
    const when = eventOwnWhen({
      starts_at: ev.starts_at,
      ends_at: ev.ends_at,
      doors_at: ev.doors_at,
      timezone: ev.timezone,
      window_basis: ev.window_basis,
      expected_window_end: ev.expected_window_end,
      past: ev.past,
      city: page.place?.city ?? null,
    });
    const where = placeWord(ev.mode, page.place);
    const presenter = page.presented_by.name ?? page.host?.name ?? null;
    const description = [when, where, presenter ? "Presented by " + presenter : null]
      .filter(Boolean)
      .join(" · ");
    const cover = !ev.cancelled && page.media[0] ? page.media[0] : null;
    return {
      meta: [
        { title: ev.title + " · DNA" },
        { name: "description", content: description },
        { name: "robots", content: "noindex" },
        { property: "og:title", content: ev.title },
        { property: "og:description", content: description },
        { property: "og:type", content: "website" },
        { property: "og:url", content: origin + publicEventPath(slug) },
        ...(cover
          ? [
              { property: "og:image", content: eventMediaUrl(slug, { position: cover.position }) },
              { property: "og:image:width", content: String(cover.width) },
              { property: "og:image:height", content: String(cover.height) },
            ]
          : []),
        { name: "twitter:card", content: cover ? "summary_large_image" : "summary" },
        { name: "twitter:title", content: ev.title },
        { name: "twitter:description", content: description },
      ],
    };
  },
  component: PublicEventRoute,
  // A failed read (the project unreachable) renders the system page, never the router's default.
  errorComponent: ErrorComponent,
});

function PublicEventRoute() {
  const { page, slug } = Route.useLoaderData();
  return <PublicEventSurface page={page} slug={slug} />;
}
