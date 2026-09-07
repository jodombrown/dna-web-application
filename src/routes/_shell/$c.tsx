// One stub per C (/connect, /convene, /collaborate, /contribute, /convey) until its engine brief
// ships. Renders inside the shell, never its own chrome (ruling 69).
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CBadge } from "@/components/strand/CBadge";
import { C_LABEL, C_ORDER, type C } from "@/components/strand/cmeta";

export const Route = createFileRoute("/_shell/$c")({
  beforeLoad: ({ params }) => {
    if (!C_ORDER.includes(params.c as C)) throw notFound();
  },
  component: CStub,
});

function CStub() {
  const { c } = Route.useParams();
  const active = c as C;
  return (
    <section
      data-testid="c-stub"
      data-c={active}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--line)",
        borderRadius: 14,
        padding: "28px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: 14,
      }}
    >
      <CBadge c={active} size={48} label />
      <h1
        style={{
          margin: 0,
          fontFamily: "var(--font-display)",
          fontWeight: 400,
          fontSize: 26,
          lineHeight: 1.2,
        }}
      >
        {C_LABEL[active]} is next
      </h1>
      <p style={{ margin: 0, fontSize: 17, lineHeight: 1.5, color: "var(--ink-2)" }}>
        This engine has its own brief. Until it ships, everything you can see is in the Feed.
      </p>
      <Link to="/feed" search={{}} preload="intent" preloadDelay={80} data-testid="to-feed">
        Back to the Feed
      </Link>
    </section>
  );
}
