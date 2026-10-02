// Handoff 40-D arms 1 and 2 (Strand compile v1790885781186000, rulings 1309 and 1310): the seven
// admin parts render, and hasNumber reads a number.
//
// What the repository's Strand harness is, and why this arm is not it (555): the mount arms in
// tests/mount.cjs read a Strand part off the page that binds it, on the deployed preview, and
// scripts/token-check.mjs proves every token a part cites is declared in both themes. No page binds
// the seven yet (the admin app's binding is the 12B handoff's decision, and the member app imports
// none of them), so there is no deployed page for a mount arm to open. This arm loads the barrel
// through Vite's SSR module loader, the same transform the app's server build runs, and renders
// each part in each of its states through react-dom/server, failing on a throw and on a missing
// landmark. It is static and runs in the deploy job, beside the token check: the two together are
// "renders without error in both themes", because every part reads tokens only and nothing in the
// seven branches on data-theme or prefers-color-scheme, which arm 1c reads off the sources.
//
// Every check is recorded by name (228); a throw inside a render is a FAIL with the error, never a
// crash of the arm.
// Usage: node tests/strand-admin.cjs
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const PARTS = [
  "ConsoleShell",
  "MeasureCard",
  "Sparkline",
  "StackedBars",
  "BarList",
  "DataTable",
  "DiaNote",
];

let passed = 0,
  failed = 0;
function record(name, ok, detail) {
  if (ok) passed++;
  else failed++;
  console.log((ok ? "PASS " : "FAIL ") + name + (detail ? ": " + detail : ""));
}

/** Renders `el` to a string, reporting a throw as a failed check rather than ending the arm. */
function render(renderToString, name, el, expect = []) {
  let html;
  try {
    html = renderToString(el);
  } catch (e) {
    record(name, false, "threw " + (e && e.message ? e.message : String(e)));
    return "";
  }
  const missing = expect.filter((s) => !html.includes(s));
  record(name, missing.length === 0, missing.length ? "missing " + JSON.stringify(missing) : "");
  return html;
}

(async () => {
  // Arm 1c, static: nothing in the seven branches on theme (extraction, "Rules that bind every
  // part"). The tokens themselves are scripts/token-check.mjs's.
  for (const p of PARTS) {
    const src = fs.readFileSync(path.join(ROOT, "src/components/strand", p + ".tsx"), "utf8");
    record(
      p + " reads tokens only: no data-theme or prefers-color-scheme branch",
      !/data-theme|prefers-color-scheme/.test(src),
    );
  }

  const { createServer } = await import("vite");
  const react = (await import("@vitejs/plugin-react")).default;
  const server = await createServer({
    configFile: false,
    root: ROOT,
    logLevel: "error",
    appType: "custom",
    plugins: [react()],
    resolve: { alias: { "@": path.join(ROOT, "src") } },
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const React = require("react");
    const { renderToString } = require("react-dom/server");
    const h = React.createElement;

    // Done Means 1: importable from src/components/strand, the barrel.
    let strand;
    try {
      strand = await server.ssrLoadModule("/src/components/strand/index.ts");
    } catch (e) {
      record("the barrel loads", false, e && e.message ? e.message : String(e));
      throw e;
    }
    record("the barrel loads", true);
    for (const p of PARTS)
      record(p + " is exported from src/components/strand", typeof strand[p] === "function");
    record("hasNumber is exported beside DiaNote", typeof strand.hasNumber === "function");
    if (failed) throw new Error("the barrel is incomplete");

    const { ConsoleShell, MeasureCard, Sparkline, StackedBars, BarList, DataTable, DiaNote } =
      strand;

    // Arm 1: every part, every state. Expected strings are the landmarks the extraction names.
    const destinations = [
      { id: "overview", label: "Overview", line: "The headline and the levers." },
      { id: "safety", label: "Safety", line: "Reports from every surface.", available: false },
    ];
    const staff = { name: "Ama Mensah", role: "Founder" };
    render(
      renderToString,
      "ConsoleShell expanded: header, nav Console, main, current and not-yet rows",
      h(
        ConsoleShell,
        { staff, destinations, current: "overview", tier: "expanded", input: "pointer" },
        h("p", null, "The page"),
      ),
      [
        'data-console-shell="expanded"',
        "<header",
        'aria-label="Console"',
        "<main",
        'aria-current="page"',
        'aria-disabled="true"',
        "Not yet",
        "Founder",
        "Sign out",
        "The page",
      ],
    );
    const compact = render(
      renderToString,
      "ConsoleShell compact touch: the opener, no left nav, role hidden",
      h(
        ConsoleShell,
        { staff, destinations, tier: "compact", input: "touch" },
        h("p", null, "Page"),
      ),
      ['data-console-shell="compact"', 'aria-label="Open navigation"', 'aria-expanded="false"'],
    );
    record(
      "ConsoleShell compact: no <nav> until the drawer opens, and no role",
      !compact.includes("<nav") && !compact.includes("Founder"),
    );
    const none = render(
      renderToString,
      "ConsoleShell access none: the bar stays, one sentence, no navigation or page",
      h(
        ConsoleShell,
        { staff, destinations, tier: "expanded", access: "none" },
        h("p", null, "Page"),
      ),
      ["<header", "Your role does not include this page."],
    );
    record(
      "ConsoleShell access none renders no nav, no main and no page",
      !none.includes("<nav") && !none.includes("<main") && !none.includes(">Page<"),
    );
    render(
      renderToString,
      "ConsoleShell with no tier given renders expanded first",
      h(ConsoleShell, { staff, destinations: [] }),
      ['data-console-shell="expanded"'],
    );

    const sizes = { m: "var(--display-l)", l: "var(--figure-l)", xl: "var(--figure-xl)" };
    for (const size of ["m", "l", "xl"])
      render(
        renderToString,
        "MeasureCard data size " + size + ": section, h3, figure rung, change, trend, tag",
        h(MeasureCard, {
          label: "Mobilized members",
          window: "Week to Thu 1 Oct, vs the week before",
          value: "112",
          unit: "members",
          change: "Up 18 from 94",
          trend: [3, 5, 4, 8],
          trendLabels: ["Fri 25 Sep", "Thu 1 Oct"],
          lines: ["One line under the figure."],
          tag: "Intent",
          size,
        }),
        [
          'aria-label="Mobilized members"',
          "<h3",
          sizes[size],
          "Up 18 from 94",
          "<svg",
          "Intent",
          "One line under the figure.",
        ],
      );
    const empty = render(
      renderToString,
      "MeasureCard empty: the label, the window and emptyText",
      h(MeasureCard, {
        label: "Invites",
        window: "This week",
        state: "empty",
        emptyText: "No invites sent in this period.",
        value: 0,
      }),
      ["Invites", "This week", "No invites sent in this period."],
    );
    record("MeasureCard empty renders no zero", !empty.includes(">0<"));
    render(
      renderToString,
      "MeasureCard notConnected: the default sentence in --ink-3",
      h(MeasureCard, { label: "Ledger", state: "notConnected" }),
      ["Not yet connected.", "var(--ink-3)"],
    );
    render(
      renderToString,
      "MeasureCard loading: role status, aria-busy, ghost figure",
      h(MeasureCard, { label: "Ledger", state: "loading" }),
      ['role="status"', 'aria-busy="true"', 'aria-hidden="true"'],
    );
    render(
      renderToString,
      "MeasureCard error: role alert, --error border, default title, body, Try again",
      h(MeasureCard, {
        label: "Corridors",
        state: "error",
        errorText: "The corridor projection did not answer.",
        onRetry: () => {},
      }),
      [
        'role="alert"',
        "var(--error)",
        "Corridors could not load.",
        "The corridor projection did not answer.",
        "Try again",
      ],
    );
    render(
      renderToString,
      "MeasureCard with children renders them under the lines",
      h(MeasureCard, { label: "Split", value: "9" }, h("em", null, "child")),
      ["<em>child</em>"],
    );

    render(
      renderToString,
      "Sparkline default with labels: decorative svg, one path, start and end",
      h(Sparkline, { values: [1, 3, 2, 5], startLabel: "Fri", endLabel: "Thu" }),
      ['aria-hidden="true"', "var(--ink)", "Fri", "Thu"],
    );
    render(
      renderToString,
      "Sparkline small with area: --ink-3 stroke and a --bg-sunken fill",
      h(Sparkline, { values: [1, 3, 2, 5], variant: "small", area: true }),
      ["var(--ink-3)", "var(--bg-sunken)"],
    );
    render(
      renderToString,
      "Sparkline with label: role img",
      h(Sparkline, { values: [1, 2], label: "Mobilized, last seven days" }),
      ['role="img"', 'aria-label="Mobilized, last seven days"'],
    );
    record(
      "Sparkline flat renders nothing",
      renderToString(h(Sparkline, { values: [4, 4, 4] })) === "",
    );
    record(
      "Sparkline with one finite value renders nothing",
      renderToString(h(Sparkline, { values: [4, NaN, Infinity] })) === "",
    );

    render(
      renderToString,
      "StackedBars two series: role img labelled by the legend, two inks, totals in words",
      h(StackedBars, {
        series: [
          [2, 4, 1],
          [1, 0, 3],
        ],
        legend: ["Members", "Guests"],
      }),
      ['role="img"', 'aria-label="Members and Guests"', "var(--ink-4)", "<ul", ">7<", ">4<"],
    );
    {
      const warned = [];
      const orig = console.warn;
      console.warn = (m) => warned.push(String(m));
      try {
        render(
          renderToString,
          "StackedBars three series: the third is ignored",
          h(StackedBars, { series: [[1], [1], [9]], legend: ["a", "b", "c"], label: "abc" }),
          ['aria-label="abc"'],
        );
      } finally {
        console.warn = orig;
      }
      record(
        "StackedBars three series warns once on the console",
        warned.length === 1 && /at most two series/.test(warned[0]),
        JSON.stringify(warned),
      );
    }
    record(
      "StackedBars all zero renders nothing",
      renderToString(h(StackedBars, { series: [[0, 0], [0]] })) === "",
    );
    record(
      "StackedBars empty renders nothing",
      renderToString(h(StackedBars, { series: [] })) === "",
    );

    const bars = render(
      renderToString,
      "BarList: a list, label and count per row, bar aria-hidden, threshold tick, null row's note",
      h(BarList, {
        rows: [
          { id: "accra", label: "Accra", value: 1200, threshold: 1000 },
          { id: "lagos", label: "Lagos", value: 400 },
          { id: "ledger", label: "Ledger", value: null, note: "Arrives with 12C" },
        ],
      }),
      ["<ul", "Accra", "1,200", 'aria-hidden="true"', "calc(", "Arrives with 12C"],
    );
    record(
      "BarList null row renders no bar",
      (bars.match(/aria-hidden="true"/g) || []).length === 2,
    );
    render(
      renderToString,
      "BarList format writes the count",
      h(BarList, { rows: [{ label: "A", value: 3 }], format: (v) => v + " acts" }),
      ["3 acts"],
    );

    const columns = [
      { key: "corridor", label: "Corridor" },
      { key: "members", label: "Members", numeric: true },
      { key: "note", label: "Note", sortable: false },
    ];
    const rows = [
      { id: "a", corridor: "Accra to London", members: 40, note: "x" },
      { id: "b", corridor: "Lagos to Houston", members: 120, note: "y" },
    ];
    const table = render(
      renderToString,
      "DataTable pointer: table, scope col, hidden caption, region, 40px rows, Click footer",
      h(DataTable, { columns, rows, input: "pointer", caption: "Corridors by members" }),
      [
        "<table",
        'scope="col"',
        "<caption",
        'role="region"',
        'aria-label="Corridors by members"',
        "height:40px",
        "Click a column heading to sort.",
        'aria-sort="ascending"',
        "A to Z",
      ],
    );
    record(
      "DataTable uncontrolled sorts by the first column, A to Z",
      table.indexOf("Accra to London") < table.indexOf("Lagos to Houston"),
    );
    record(
      "DataTable: an unsortable heading carries no button and no aria-sort",
      /<th[^>]*>Note<\/th>/.test(table),
    );
    const touchTable = render(
      renderToString,
      "DataTable touch: 48px rows, 44px heading target, Tap footer",
      h(DataTable, { columns, rows, input: "touch" }),
      ["height:48px", "min-height:44px", "Tap a column heading to sort."],
    );
    record("DataTable touch: no pointer row height", !touchTable.includes("height:40px"));
    const desc = render(
      renderToString,
      "DataTable defaultSort numeric desc: high to low, descending, locale figures",
      h(DataTable, {
        columns,
        rows,
        input: "pointer",
        defaultSort: { key: "members", dir: "desc" },
      }),
      ['aria-sort="descending"', "high to low", "Members, high to low, sort"],
    );
    record(
      "DataTable numeric desc orders 120 before 40",
      desc.indexOf("Lagos to Houston") < desc.indexOf("Accra to London"),
    );
    const controlled = render(
      renderToString,
      "DataTable controlled: the caller's order stands, footer given",
      h(DataTable, {
        columns,
        rows: rows.slice().reverse(),
        sort: { key: "corridor", dir: "asc" },
        onSort: () => {},
        input: "pointer",
        footer: "Two corridors.",
      }),
      ["Two corridors."],
    );
    record(
      "DataTable controlled does not re-sort the caller's rows",
      controlled.indexOf("Lagos to Houston") < controlled.indexOf("Accra to London"),
    );
    render(
      renderToString,
      "DataTable render writes the cell",
      h(DataTable, {
        columns: [{ key: "k", label: "K", render: (v) => h("b", null, "r:" + v) }],
        rows: [{ k: "v" }],
        input: "pointer",
      }),
      ["<b>r:v</b>"],
    );

    render(
      renderToString,
      "DiaNote statements: section labelled, list, block link button Go to, doctrine line, glow",
      h(DiaNote, {
        statements: [
          {
            text: "More members mobilized after the Accra supper.",
            block: "Mobilization",
            onGo: () => {},
          },
          { text: "The corridor split did not move." },
        ],
      }),
      [
        'aria-label="DIA&#x27;s note"',
        "<ul",
        'aria-label="Go to Mobilization"',
        "DIA suggests what might explain a change.",
        "var(--glow-dia)",
      ],
    );
    render(
      renderToString,
      "DiaNote loading: role status, three ghost lines, the doctrine line",
      h(DiaNote, { loading: true }),
      [
        'role="status"',
        'aria-label="Loading DIA&#x27;s note"',
        "The numbers above are the record.",
      ],
    );
    render(
      renderToString,
      "DiaNote none: emptyText and the doctrine line",
      h(DiaNote, { statements: [] }),
      ["DIA has nothing to add for this period.", "The numbers above are the record."],
    );
    render(
      renderToString,
      "DiaNote custom title and closing",
      h(DiaNote, { title: "Note", closing: "Closing.", emptyText: "Nothing." }),
      ['aria-label="Note"', "Closing.", "Nothing."],
    );

    // Arm 2 (1301, 1310): hasNumber.
    const { hasNumber } = strand;
    for (const [text, want] of [
      ["after two events", true],
      ["a third of members", true],
      ["5 acts", true],
      ["after the events in Accra", false],
    ])
      record(
        "hasNumber(" + JSON.stringify(text) + ") is " + want,
        hasNumber(text) === want,
        "got " + hasNumber(text),
      );
  } finally {
    await server.close();
  }
  console.log(`\nstrand-admin: ${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => {
  console.error("strand-admin: the arm could not run:", e && e.stack ? e.stack : e);
  console.log(`\nstrand-admin: ${passed} passed, ${failed} failed, UNPROVEN (ruling 228)`);
  process.exit(1);
});
