// The Feed's loading state (SPEC v3 section 3): three ghost cards in the list's own position, one
// status with an accessible name and no words on screen. Moved out of FeedSurface.tsx under handoff
// 31-B item 13 so Discovery's lanes load with the same three cards; the render is unchanged and the
// Feed's name stays the default. `lane` lays the same three cards along a Discovery lane at
// `--lane-card-width` (731), which is the one thing a lane position needs that a column does not.
export function Ghosts({
  label = "Loading Feed",
  lane,
}: {
  label?: string;
  lane?: boolean | undefined;
}) {
  const block = (h: number, w: string) => (
    <span style={{ height: h, width: w, borderRadius: 6, background: "var(--bg-sunken)" }} />
  );
  return (
    <div
      role="status"
      aria-label={label}
      style={
        lane
          ? { display: "flex", gap: 12, overflow: "hidden" }
          : { display: "flex", flexDirection: "column", gap: 12 }
      }
    >
      {[1, 2, 3].map((g) => (
        <div
          key={g}
          aria-hidden="true"
          style={{
            ...(lane ? { flex: "none", width: "var(--lane-card-width)" } : null),
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: 14,
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <span
              style={{ width: 40, height: 40, borderRadius: 10, background: "var(--bg-sunken)" }}
            />
            <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
              {block(12, "40%")}
              {block(10, "60%")}
            </span>
          </div>
          {block(18, "80%")}
          {block(12, "100%")}
          {block(12, "70%")}
        </div>
      ))}
    </div>
  );
}
