// The two rails of the expanded canvas (ruling 79, corrected by 86). Left: the member's own quick
// state. Right: DIA suggestions scoped to the current surface. Both grounded-or-empty; no engine
// writes suggestions yet, so the right rail's empty line is the true launch state.
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { CBadge } from "@/components/strand/CBadge";
import { RailRow, RailWidget } from "@/components/strand/RailWidget";
import type { Member } from "@/lib/auth";
import { markOpenedFromFeed } from "@/lib/overlay";
import { loadRailState } from "@/lib/rails";

export function LeftRail({ member }: { member: Member }) {
  const navigate = useNavigate();
  const { data } = useQuery({
    queryKey: ["rails", member.id],
    queryFn: () => loadRailState(member),
  });
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }} data-rail="left">
      <RailWidget title="Upcoming convenings" empty="No convenings on your calendar yet.">
        {data?.events.map((e) => (
          <RailRow
            key={e.id}
            lead={<CBadge c="convene" size={28} />}
            title={e.title}
            meta={e.when || undefined}
          />
        ))}
      </RailWidget>
      <RailWidget title="Active Spaces" empty="You are not in a Space yet.">
        {data?.spaces.map((s) => (
          <RailRow key={s.id} lead={<CBadge c="collaborate" size={28} />} title={s.name} />
        ))}
      </RailWidget>
      <RailWidget title="Saved" empty="Nothing saved yet.">
        {data?.saved.map((p) => (
          <RailRow
            key={p.id}
            lead={<CBadge c={p.c_category === "system" ? "brand" : p.c_category} size={28} />}
            title={
              (typeof p.fields.title?.value === "string" && p.fields.title.value) ||
              p.body.split("\n")[0] ||
              "Post"
            }
            meta={p.meta}
            onClick={() => {
              if (!p.id) return;
              markOpenedFromFeed();
              void navigate({
                to: "/posts/$id",
                params: { id: p.id },
                search: {},
                resetScroll: false,
              });
            }}
          />
        ))}
      </RailWidget>
    </div>
  );
}

export function RightRail({ surface }: { surface: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }} data-rail="right">
      <RailWidget
        title={"DIA suggestions · " + surface}
        empty="Nothing to suggest yet. DIA only surfaces what is grounded in real activity."
      />
    </div>
  );
}
