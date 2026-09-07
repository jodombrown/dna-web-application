// The two rails of the expanded canvas (SPEC sections 2.1 and 2.2). Left: the member's quick state
// in three RailWidgets 24 apart (Coming up, Your Spaces, Saved). Right: "DIA suggests", scoped to the
// current surface. Both grounded-or-empty; no engine writes suggestions yet, so the right rail's
// empty line is the true launch state.
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Avatar } from "@/components/strand/Avatar";
import { RailWidget } from "@/components/strand/RailWidget";
import { C_LABEL } from "@/components/strand/cmeta";
import type { Member } from "@/lib/auth";
import { loadRailState } from "@/lib/rails";

const row = { padding: "8px 0", borderTop: "1px solid var(--line)" } as const;

export function LeftRail({ member }: { member: Member }) {
  const navigate = useNavigate();
  const onFeed = useLocation({ select: (l) => l.pathname === "/feed" });
  const { data } = useQuery({
    queryKey: ["rails", member.id],
    queryFn: () => loadRailState(member),
  });
  return (
    <>
      <RailWidget title="Coming up" empty="Nothing coming up. Events you join appear here.">
        {data?.events.map((e) => (
          <div key={e.id} style={{ ...row, display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.35 }}>{e.title}</span>
            {e.when && <span style={{ fontSize: 13, color: "var(--ink-3)" }}>{e.when}</span>}
          </div>
        ))}
      </RailWidget>
      <RailWidget title="Your Spaces" empty="No Spaces yet. Start one or join one.">
        {data?.spaces.map((s) => (
          <div key={s.id} style={{ ...row, display: "flex", alignItems: "center", gap: 10 }}>
            <Avatar name={s.name} size={28} style={{ borderRadius: 6 }} />
            <span style={{ fontSize: 15, fontWeight: 500, lineHeight: 1.35 }}>{s.name}</span>
          </div>
        ))}
      </RailWidget>
      <RailWidget title="Saved" empty="Nothing saved. Use the bookmark on any post.">
        {data?.saved.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              if (!p.id) return;
              // From Feed the card expands in place (and scrolls into view); elsewhere the
              // direct-link view renders with "Back to Feed" (ruling 105).
              void navigate({
                to: "/posts/$id",
                params: { id: p.id },
                search: {},
                resetScroll: false,
                ...(onFeed ? { state: { fromFeed: true, reveal: true } } : {}),
              });
            }}
            style={{
              all: "unset",
              cursor: "pointer",
              display: "flex",
              flexDirection: "column",
              gap: 2,
              ...row,
              textAlign: "left",
            }}
          >
            <span
              style={{
                fontSize: 15,
                fontWeight: 500,
                lineHeight: 1.35,
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {(typeof p.fields.title?.value === "string" && p.fields.title.value) ||
                p.body.split("\n")[0] ||
                "Post"}
            </span>
            {p.c_category !== "system" && (
              <span style={{ fontSize: 13, color: "var(--c-" + p.c_category + "-text)" }}>
                {C_LABEL[p.c_category]}
              </span>
            )}
          </button>
        ))}
      </RailWidget>
    </>
  );
}

export function RightRail() {
  return (
    <RailWidget
      title="DIA suggests"
      empty="DIA has nothing to suggest yet. Suggestions start once there is activity in your Feed."
    />
  );
}
