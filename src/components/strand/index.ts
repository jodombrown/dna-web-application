// Strand (DNA design system) ported from the app.diasporanetwork.africa extractions (B1-Composer-v3,
// B2-Shell-Feed-v3). Tokens live in src/styles/strand.css.
export * from "./cmeta";
export * from "./Icon";
export * from "./Avatar";
export * from "./Button";
export * from "./IconButton";
export * from "./Input";
export * from "./Switch";
export * from "./Checkbox";
export * from "./Toast";
export * from "./Sheet";
export * from "./CBadge";
export * from "./VerbChip";
export * from "./AudienceSelect";
export * from "./DiaLine";
export * from "./MediaBlock";
export * from "./PostCard";
export * from "./PulseDock";
export * from "./verb-schema";
export * from "./Composer";
export * from "./AppHeader";
export * from "./EmptyState";
export * from "./LensBar";
export * from "./NotificationBell";
export * from "./NotificationListItem";
export * from "./RailWidget";
// Brief 3 (B3-Profile-v3): the two core additions the compile carries.
export * from "./Select";
export * from "./Chip";
// Handoff 37-E (1232): the app's own parts, ported from the app project's strand-patch sources and
// Design pass 01 rather than from a Strand compile, live in src/components/dna/ and are not
// re-exported here: AttestationRail, AuthHead, BackRow, BadgeRow, CCard, CSheetBody, CardFade,
// IdentityMark, LinkRow, MemberCard, PasswordField, PatternPicker, PlaceTile, ProfileHeader,
// SectionCard, StanceBlock, VerbRow, VisibilitySelect, VocabularyPicker and cinfo. The folder's
// record is docs/strand-ports/v1790724894917128.md.
// Convene Pass 1 (ruling 673): the Segment part, the Composer its first caller.
export * from "./Segment";
// Strand re-sync to compile v1789885868097915 (handoff 29-A item 3, ruling 851): the two parts the
// compile carries and this tree did not. Discovery binds both (handoffs 31-B, 32-B and 33-A).
export * from "./FacetRail";
export * from "./Pane";
// Strand compile v1790212533284400 (handoff 32-A, correction 25 §2, ruling 1102): Menu, the list of
// acts a card's ellipsis summons. It reads --z-menu (1103). PostCard's discovery face renders it.
export * from "./Menu";
// Strand compile v1790410319010950 (corrections 30 and 31, ratified 1153; handoff 33-D item 2):
// Tooltip, which IconButton now wraps itself in (1146), and correction 30's three parts. No page
// binds BodyBlocks, PersonCard or BrowseTile yet; the first Discovery handoff and Brief 10
// Revision 4 do.
export * from "./Tooltip";
export * from "./BodyBlocks";
export * from "./PersonCard";
export * from "./BrowseTile";
// Strand compile v1790885781186000 (proposals 40, rulings 1306 and 1308; ratified 1309 and 1310;
// handoff 40-D item 2): the seven admin parts. The admin app imports them from here like every
// other Strand part; the member app imports none of them, and tests/admin-bundles.cjs reads that
// off its built output. LoadError stays in src/components/dna/ (1309). DiaNote's module also
// exports hasNumber, the 1301 check, beside the part (1310).
export * from "./ConsoleShell";
export * from "./MeasureCard";
export * from "./Sparkline";
export * from "./StackedBars";
export * from "./BarList";
export * from "./DataTable";
export * from "./DiaNote";
