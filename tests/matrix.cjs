// Responsive test matrix (ruling 61) for the shell, Feed, notifications and composer (B2.1: one-row
// header, three scroll containers, in-place expansion, the ten targeted checks). Points at
// BASE (a deployed Pages URL or a local server) with every Supabase endpoint mocked at the network
// layer, so the real client code paths run against a deterministic backend. Backend behaviour
// (RLS, the feed view) is verified separately in SQL against the live project.
// Usage: BASE=https://b2-shell-feed.dna-web-application.pages.dev WEBKIT=1 node tests/matrix.cjs
// Env: ONLY='[390,844]' runs one viewport; SPECIAL=publish,guards,keyboard,silence,shell,width,targeted,profile,connect,vocab,block,auth,onboarding runs flows only.
// Brief 3 profile flows live in tests/profile.cjs and Brief 4 Connect flows in tests/connect.cjs; both share this mock.
const { chromium, webkit } = require("playwright");
const fs = require("fs");
const path = require("path");

const BASE = process.env.BASE || "http://127.0.0.1:4173";
const OUT = process.env.OUT || path.join(__dirname, "matrix-out");
fs.mkdirSync(OUT, { recursive: true });
const SB = "dgspjevjoblujcoljvkn.supabase.co";
const VIEWPORTS = [
  [360, 800],
  [390, 844],
  [430, 932],
  [744, 1133],
  [820, 1180],
  [1024, 1366],
  [1366, 1024],
  [1280, 800],
  [1536, 960],
];
const FULL_PREVIEW_AT = new Set([390, 820, 1280]);
// Mirrors DRAFT_DEBOUNCE in src/components/strand/Composer.tsx.
const DRAFT_DEBOUNCE_MS = 800;
const THEMES = ["light", "dark"];
const UID = "00000000-0000-4000-8000-0000000000e1";
const KENTE = fs.readFileSync(path.join(__dirname, "../public/strand/patterns/kente-pattern.svg"));

function b64url(o) {
  return Buffer.from(JSON.stringify(o))
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}
const JWT =
  b64url({ alg: "HS256", typ: "JWT" }) +
  "." +
  b64url({
    sub: UID,
    role: "authenticated",
    aud: "authenticated",
    exp: Math.floor(Date.now() / 1000) + 3600 * 24,
    email: "member@test.invalid",
  }) +
  ".sig";
const USER = {
  id: UID,
  aud: "authenticated",
  role: "authenticated",
  email: "member@test.invalid",
  user_metadata: { full_name: "Amara Osei" },
  app_metadata: { provider: "email" },
  created_at: new Date().toISOString(),
};
const SESSION = {
  access_token: JWT,
  token_type: "bearer",
  expires_in: 86400,
  expires_at: Math.floor(Date.now() / 1000) + 86400,
  refresh_token: "r",
  user: USER,
};

const SAMPLES = {
  convene:
    "We are hosting a Diaspora Builders Dinner in Nairobi on Thu 16 Oct at 19:00. Doors at 18:30. Free for members, bring one person who should be in the room.",
  connect:
    "Can someone introduce me to Kwame Mensah at the Accra fintech hub? I am building a savings product for market traders and he has done this before.",
  collaborate:
    "Starting a Space for diaspora health workers who want to run short clinics back home. Looking for two coordinators and one person who knows Kenyan licensing.",
  contribute:
    "We need a volunteer accountant to review the cooperative books before the audit by 30 Nov. Two evenings, remote is fine.",
  convey:
    "Three intros that changed a harvest. I wrote down how a cassava cooperative in Oyo found its first buyer through two members in Houston.",
  untyped:
    "Back in Nairobi after three weeks in Houston. The jet lag is winning and the mangoes are not.",
};
const INFER = {
  // Convene Pass 1 (SPEC 1): DIA may fill the title, when as words, the venue name and doors;
  // never the city, never the format. src/lib/dia.ts namespaces these as convene.* (664).
  convene: {
    verb: "convene",
    confidence: 0.95,
    fields: {
      title: "Diaspora Builders Dinner",
      when: "Thu 16 Oct at 19:00",
      place_name: "Front Room",
      doors: "18:30",
    },
    latency_ms: 900,
  },
  connect: {
    verb: "connect",
    confidence: 0.94,
    fields: {
      who: "Kwame Mensah at the Accra fintech hub",
      why: "I am building a savings product for market traders and he has done this before",
    },
    latency_ms: 900,
  },
  collaborate: {
    verb: "collaborate",
    confidence: 0.92,
    fields: {
      title: "Space for diaspora health workers",
      category: "Health",
      roles: "two coordinators and one person who knows Kenyan licensing",
    },
    latency_ms: 900,
  },
  contribute: {
    verb: "contribute",
    confidence: 0.93,
    fields: {
      title: "Volunteer accountant",
      instrument: "Skills",
      need: "review the cooperative books before the audit",
      by: "30 Nov",
    },
    latency_ms: 900,
  },
  convey: {
    verb: "convey",
    confidence: 0.78,
    fields: { title: "Three intros that changed a harvest" },
    latency_ms: 900,
  },
};

// Brief 3 profile fixtures: the shape profile_view returns for the seeded persona thandiwe-dube,
// captured from the live projection so the mock answers the way the database does.
const OWNER_ID = "b3000000-0000-4000-8000-000000000001";
const PROFILE_MEMBER = {
  id: OWNER_ID,
  name: "Thandiwe Dube",
  tier: "attested",
  handle: "thandiwe-dube",
  pattern: "kente",
  stance: "returnee",
  // Ruling 187: profile_view resolves the label from public.member_stances.
  stance_label: "Returnee",
  headline: "Solar engineer, mini-grids for rural clinics",
  local_tz: "Africa/Johannesburg",
  cover_focus: "center 35%",
  current_place: "Johannesburg, SAST",
  current_country: "South Africa",
  origin_country: "South Africa",
  avatar_path: OWNER_ID + "/avatar/a.png",
  cover_path: OWNER_ID + "/cover/c.png",
};
const PROFILE_BADGES = [
  {
    c: "convene",
    items: [
      {
        role: "host",
        when: "2026-08-23T10:00:00+00:00",
        object: "Solar for Clinics, working session",
        attester: "Kwame Mensah",
      },
    ],
  },
  {
    c: "contribute",
    items: [
      {
        role: "Space lead",
        when: "2026-07-10T10:00:00+00:00",
        object: "Site survey, Thohoyandou clinic",
        attester: "Adaeze Nwosu",
      },
    ],
  },
];
const ABOUT_TEXT =
  "Engineer by training, electrician by temperament. I left Cape Town for Berlin in 2014 and came back in 2023 to put power where it changes outcomes: rural clinics. Most weeks I am on a site somewhere in Limpopo, arguing with a battery cabinet or a provincial procurement officer.";
const INTENT_NOTE = "Clinics that need a site survey, and members with battery storage experience.";
const LINKS = { website: "dubepower.co.za", linkedin: "thandiwedube", instagram: "dube.power" };
const SEGMENT_FIELDS = {
  needs:
    "A reliable transport partner for panels into Limpopo, and an accountant who knows SARS filings for a small engineering practice.",
  timeline: "Already back",
};
const EVERYONE_SECTIONS = {
  work: {
    focus: ["Healthcare & Wellness", "Infrastructure & Energy", "Environment & Climate"],
    regions: ["East Africa", "Southern Africa"],
    industries: ["Healthcare", "Energy"],
  },
  about: { about: ABOUT_TEXT },
  where: {
    local_tz: "Africa/Johannesburg",
    current_place: "Johannesburg, SAST",
    current_country: "South Africa",
  },
  origin: { pathway: "Already returned", heritage: "Continental", origin_country: "South Africa" },
  skills: { skills: ["Leadership", "Project Management", "Operations"] },
  convene: [
    {
      sub: "Attested by Kwame Mensah, host",
      when: "2026-08-23T10:00:00+00:00",
      title: "Solar for Clinics, working session",
    },
  ],
  stance: { fields: SEGMENT_FIELDS, stance: "returnee" },
  languages: { languages: ["English", "isiZulu", "Sesotho"] },
  contribute: [
    {
      sub: "Fulfilled a Need from Adaeze Nwosu",
      when: "2026-07-10T10:00:00+00:00",
      title: "Site survey, Thohoyandou clinic",
    },
  ],
  collaborate: [
    {
      sub: "Member since Sep 2026",
      when: "2026-09-08T07:22:24+00:00",
      title: "Diaspora health workers",
      completed: false,
    },
  ],
};
const VISIBILITY = {
  work: "everyone",
  about: "everyone",
  links: "connections",
  where: "everyone",
  badges: "everyone",
  convey: "everyone",
  intent: "anchored",
  origin: "everyone",
  skills: "everyone",
  convene: "everyone",
  stance: "everyone",
  languages: "everyone",
  contribute: "everyone",
  collaborate: "everyone",
};
const VOCAB = {
  focus: ["Healthcare & Wellness", "Infrastructure & Energy", "Environment & Climate", "Education"],
  industries: ["Healthcare", "Energy", "Agriculture", "Finance"],
  regions: ["East Africa", "Southern Africa", "West Africa", "North Africa"],
  skills: ["Leadership", "Project Management", "Operations", "Engineering", "Fundraising"],
  languages: ["English", "isiZulu", "Sesotho", "Swahili", "Twi"],
  intent: ["Find collaborators", "Host and convene", "Contribute skills", "Learn"],
  interests: ["Energy", "Health", "Farming"],
  countries: ["South Africa", "Ghana", "Nigeria", "Kenya"],
  world: ["Germany", "Ghana", "Kenya", "South Africa", "United Kingdom", "United States"],
  // Ruling 187: the stance chooser reads the vocabulary, not a map in the component.
  stances: [
    { value: "returnee", label: "Returnee" },
    { value: "kin", label: "Kin" },
    { value: "anchor", label: "Anchor" },
    { value: "ally", label: "Ally" },
    { value: "exploring", label: "Still exploring" },
  ],
  heritage: ["Continental", "First generation", "Second generation"],
  pathway: ["Already returned", "Planning to return", "Not returning"],
  timeline: ["Already back", "Within a year", "One to three years", "Someday"],
  // Ruling 193: contribute_instrument, value and derived label, as public.vocabularies() serves it.
  instrument: [
    { value: "time", label: "Time" },
    { value: "skills", label: "Skills" },
    { value: "in_kind", label: "In-kind" },
  ],
};
const ATTESTATIONS = {
  convene: [
    {
      c: "convene",
      role: null,
      when: "2026-08-23T10:00:00+00:00",
      handle: "thandiwe-dube",
      member: "Thandiwe Dube",
      object: "Solar for Clinics, working session",
      attester: "the host",
      object_id: "b3e00000-0000-4000-8000-000000000001",
      avatar_path: null,
      object_kind: "event",
    },
  ],
  contribute: [
    {
      c: "contribute",
      role: null,
      when: "2026-07-10T10:00:00+00:00",
      handle: "thandiwe-dube",
      member: "Thandiwe Dube",
      object: "Site survey, Thohoyandou clinic",
      attester: "a Space lead",
      object_id: "b3700000-0000-4000-8000-000000000001",
      avatar_path: null,
      object_kind: "opportunity",
    },
  ],
};

/**
 * What profile_view returns for the mock's persona. mode: owner | connected | anchor | stranger |
 * blocked (the viewer is blocked by this member, ruling 198) | blocker (the viewer blocked this
 * member, B4A section 7's Done Means 5).
 * A signed-out request (or p_as_public) gets the anonymous projection: null when Share is off,
 * otherwise core plus Everyone sections only. Section writes made through save_profile_section
 * are folded in so a refetch reflects them.
 */
function profileProjection(db, anon) {
  const pr = db.profile;
  const sw = pr.switches;
  const over = pr.overrides;
  const member = { ...PROFILE_MEMBER, ...(over.core || {}), ...(over.media || {}) };
  if (over.pattern) member.pattern = over.pattern.pattern;
  const sections = JSON.parse(JSON.stringify(EVERYONE_SECTIONS));
  if (over.about) sections.about = { about: over.about.about };
  if (over.where) sections.where = { ...sections.where, current_place: over.where.current_place };
  const vis = { ...VISIBILITY, ...pr.visibility };
  const base = {
    member,
    badges: PROFILE_BADGES,
    mutuals: [],
    shared_spaces: [],
    private: sw.private,
    // B4A section 4: the viewer's own block, and never the converse. False for a blocked viewer
    // exactly as it is for a stranger, which is what keeps the two indistinguishable (section 7).
    viewer_blocked: pr.mode === "blocker",
  };
  // Ruling 141: attesters who do not share publicly render as a role on a public projection.
  const publicBadges = () => {
    const ROLE = { host: "the host", "Space lead": "a Space lead" };
    sections.convene = sections.convene.map((r) => ({ ...r, sub: "Attested by " + ROLE.host }));
    sections.contribute = sections.contribute.map((r) => ({
      ...r,
      sub: "Fulfilled a Need from " + ROLE["Space lead"],
    }));
    return PROFILE_BADGES.map((b) => ({
      c: b.c,
      items: b.items.map((it) => ({ object: it.object, when: it.when, attester: ROLE[it.role] })),
    }));
  };
  if (anon) {
    if (!sw.shared) return null;
    return {
      ...base,
      viewer_blocked: false,
      badges: publicBadges(),
      viewer: "anon",
      anchored: false,
      sections,
    };
  }
  // Ruling 198: a blocked viewer is signed in and gets the public projection, whatever the prior
  // relationship and whether or not the profile is shared. No relationship object at all, so the
  // surface renders no Connect action and no Follow, and no mutual name or DIA line reaches them.
  if (pr.mode === "blocked")
    return { ...base, badges: publicBadges(), viewer: "member", anchored: false, sections };
  // B4A sections 6 and 7 (Done Means 5): the blocker's own view of the member they blocked. Their
  // scope is not dropped, so Anchored sections stay (ruling 220) and the mutuals, shared Spaces and
  // DIA line stay with them; the connection edge is revoked, so Connections sections are gone; and
  // the relationship object is absent, so the row holds the overflow and nothing else.
  if (pr.mode === "blocker") {
    sections.intent = { note: INTENT_NOTE, intent: ["Find collaborators", "Host and convene"] };
    return {
      ...base,
      viewer: "member",
      anchored: true,
      sections,
      mutuals: [{ name: "Lerato Khumalo", handle: "lerato-khumalo" }],
      shared_spaces: ["Diaspora health workers"],
      dia_line: "Thandiwe fulfilled a Need in the Space you lead.",
    };
  }
  if (pr.mode === "owner") {
    sections.links = LINKS;
    sections.intent = { note: INTENT_NOTE, intent: ["Find collaborators", "Host and convene"] };
    sections.convey = [];
    sections.stance.variants = { returnee: SEGMENT_FIELDS, exploring: { interests: [] } };
    return { ...base, viewer: "owner", anchored: false, sections, switches: sw, visibility: vis };
  }
  const anchored = pr.mode === "connected" || pr.mode === "anchor";
  const connected = pr.rel === "connected";
  if (vis.links === "everyone" || (vis.links === "connections" && connected))
    sections.links = LINKS;
  if (
    vis.intent === "everyone" ||
    (vis.intent === "connections" && connected) ||
    (vis.intent === "anchored" && (anchored || connected))
  )
    sections.intent = { note: INTENT_NOTE, intent: ["Find collaborators", "Host and convene"] };
  const out = {
    ...base,
    viewer: "member",
    anchored,
    sections,
    relationship: { state: pr.rel, following: pr.following },
  };
  if (pr.mode === "connected") {
    out.mutuals = [{ name: "Lerato Khumalo", handle: "lerato-khumalo" }];
    out.dia_line = "Thandiwe was at Solar for Clinics, working session, which you hosted.";
  }
  if (pr.mode === "anchor") {
    out.shared_spaces = ["Diaspora health workers"];
    out.dia_line = "Thandiwe fulfilled a Need in the Space you lead.";
  }
  return out;
}

// Brief 4 Connect fixtures: the card shape connect_cards returns, one member per relationship state
// (including the sender-side window, ruling 168), a Suggested set with DIA's reason already written
// (connect-suggest), eight demo countries above the floor, and the ten filter option lists.
const CONNECT_MEMBERS = [
  {
    id: "c4000000-0000-4000-8000-000000000001",
    handle: "adaeze-nwosu",
    name: "Adaeze Nwosu",
    identified: true,
    headline: "Clinic coordinator, Enugu and Manchester",
    stance_label: "Returnee",
    place: "Manchester, United Kingdom",
    origin: "Nigeria",
    heritage: "Second generation",
    chips: ["Healthcare & Wellness", "Project Management", "West Africa"],
    badges: [],
    mutuals: [
      { name: "Lerato Khumalo", avatar_path: null },
      { name: "Kwame Mensah", avatar_path: null },
    ],
    rel: "none",
    following: false,
    _stance: "returnee",
    _location: "United Kingdom",
    _focus: "Healthcare & Wellness",
  },
  {
    id: "c4000000-0000-4000-8000-000000000002",
    handle: "yusuf-diallo",
    name: "Yusuf Diallo",
    identified: false,
    headline: "Solar engineer between Dakar and Lyon",
    stance_label: "Anchor",
    place: "Dakar, Senegal",
    origin: "Senegal",
    heritage: "Continental",
    chips: ["Infrastructure & Energy", "Operations"],
    badges: [],
    mutuals: [{ name: "Lerato Khumalo", avatar_path: null }],
    rel: "sent",
    following: true,
    _stance: "anchor",
    _location: "Senegal",
    _focus: "Infrastructure & Energy",
  },
  {
    id: "c4000000-0000-4000-8000-000000000003",
    handle: "kwame-mensah",
    name: "Kwame Mensah",
    identified: true,
    headline: "Fintech founder, Accra",
    stance_label: "Anchor",
    place: "Accra, Ghana",
    origin: "Ghana",
    heritage: "Continental",
    chips: ["Finance & Investment", "Strategy"],
    badges: [],
    mutuals: [],
    rel: "received",
    following: false,
    message:
      "Hello Amara. I saw your note on savings products for market traders. I have done two of these in Accra and would like to compare notes.",
    _stance: "anchor",
    _location: "Ghana",
    _focus: "Finance & Investment",
  },
  {
    id: "c4000000-0000-4000-8000-000000000004",
    handle: "lerato-khumalo",
    name: "Lerato Khumalo",
    identified: false,
    headline: "Community organiser, Soweto",
    stance_label: "Ally",
    place: "Johannesburg, South Africa",
    origin: "South Africa",
    heritage: "Continental",
    chips: ["Education & Training"],
    badges: [
      {
        c: "convene",
        items: [
          {
            object: "Solar for Clinics, working session",
            attester: "Thandiwe Dube",
            role: "host",
            when: "2026-08-22T18:00:00Z",
          },
        ],
      },
    ],
    mutuals: [],
    rel: "connected",
    following: true,
    _stance: "ally",
    _location: "South Africa",
    _focus: "Education & Training",
  },
  {
    id: "c4000000-0000-4000-8000-000000000005",
    handle: "thandiwe-dube",
    name: "Thandiwe Dube",
    identified: true,
    headline: "Building clinics between Johannesburg and Houston",
    stance_label: "Returnee",
    place: "Houston, United States",
    origin: "South Africa",
    heritage: "First generation",
    chips: ["Healthcare & Wellness", "Leadership"],
    badges: [],
    mutuals: [{ name: "Lerato Khumalo", avatar_path: null }],
    // Ruling 214: this member declined inside the window. private.relationship_display maps that
    // to sent before the projection returns, so the fixture carries what the wire carries and the
    // card is compared against a genuinely pending one below.
    rel: "sent",
    following: false,
    _stance: "returnee",
    _location: "United States",
    _focus: "Healthcare & Wellness",
  },
  {
    id: "c4000000-0000-4000-8000-000000000006",
    handle: "ngozi-okafor",
    name: "Ngozi Okafor",
    identified: false,
    headline: "Agritech, Lagos",
    stance_label: "Still exploring",
    place: "Lagos, Nigeria",
    origin: "Nigeria",
    heritage: "Continental",
    chips: ["Agriculture & Food Systems", "Data Analysis"],
    badges: [],
    mutuals: [],
    rel: "none",
    following: false,
    _stance: "exploring",
    _location: "Nigeria",
    _focus: "Agriculture & Food Systems",
  },
];
const CONNECT_SUGGESTED = [
  {
    ...CONNECT_MEMBERS[0],
    reason:
      "You were both at Solar for Clinics, working session, and Lerato and Kwame are connections you share.",
  },
  {
    ...CONNECT_MEMBERS[5],
    reason: "You share Agriculture & Food Systems as a focus area.",
  },
];
const CONNECT_WHERE = {
  continent: ["Ghana", "Kenya", "Nigeria", "South Africa"],
  diaspora: ["Canada", "France", "United Kingdom", "United States"],
};
const CONNECT_OPTIONS = {
  stances: [
    { value: "returnee", label: "Returnee" },
    { value: "kin", label: "Kin" },
    { value: "anchor", label: "Anchor" },
    { value: "ally", label: "Ally" },
    { value: "exploring", label: "Still exploring" },
  ],
  locations: [
    "Canada",
    "France",
    "Ghana",
    "Kenya",
    "Nigeria",
    "Senegal",
    "South Africa",
    "United Kingdom",
    "United States",
  ],
  origins: ["Ghana", "Nigeria", "Senegal", "South Africa"],
  heritage: ["First generation", "Second generation", "Third generation or later", "Continental"],
  pathway: [
    "Already returned",
    "Planning a return",
    "Circular, both places",
    "Not planning a return",
  ],
  // Ruling 436: the corridor row of ruling 243 exists on the live project, so the mock carries it
  // and the Corridor axis renders (ruling 154). The label is as connect_filter_options builds it.
  corridors: [{ id: "los-angeles-accra-agriculture", label: "Los Angeles to Accra" }],
  focus: [
    "Agriculture & Food Systems",
    "Technology & Innovation",
    "Healthcare & Wellness",
    "Education & Training",
    "Finance & Investment",
    "Arts & Culture",
    "Policy & Governance",
    "Infrastructure & Energy",
    "Trade & Commerce",
    "Environment & Climate",
  ],
  industries: ["Agriculture", "Technology", "Healthcare", "Education", "Finance"],
  skills: ["Leadership", "Project Management", "Software Development", "Marketing", "Sales"],
  regions: [
    "West Africa",
    "East Africa",
    "Southern Africa",
    "Central Africa",
    "North Africa",
    "African Diaspora",
  ],
};

/** A card as connect_cards emits it: the private fixture keys (_stance, _location, _focus) never leave the mock. */
function connectCard(m, overrides) {
  const out = {};
  for (const k of Object.keys(m)) if (!k.startsWith("_")) out[k] = m[k];
  const st = overrides[m.id] || {};
  if (st.rel) out.rel = st.rel;
  if (typeof st.following === "boolean") out.following = st.following;
  return out;
}

function makeMockDb() {
  const db = {
    posts: [],
    events: [],
    // Convene Pass 1: one row per delivery endpoint (521), the member's homes (633) and the
    // place-resolve calls the form made, with their proximity.
    event_delivery: [],
    homes: [
      {
        id: "h1",
        position: 0,
        place_id: "dXJuOm1ieHBsYzpBY2NyYQ",
        place_name: "Accra",
        city: "Accra",
        country: "Ghana",
        lng: -0.187,
        lat: 5.6037,
        timezone: "Africa/Accra",
      },
      {
        id: "h2",
        position: 1,
        place_id: "dXJuOm1ieHBsYzpOYWlyb2Jp",
        place_name: "Nairobi",
        city: "Nairobi",
        country: "Kenya",
        lng: 36.8219,
        lat: -1.2921,
        timezone: "Africa/Nairobi",
      },
    ],
    placeCalls: [],
    // Set to make publish_post refuse with this message (ruling 665's failed state).
    publishFail: null,
    spaces: [
      {
        id: "s1",
        title: "Nairobi chapter",
        owner_member_id: UID,
        category: null,
        description: null,
        roles_sought: [],
        status: "active",
        created_at: new Date().toISOString(),
      },
    ],
    opportunities: [],
    connection_requests: [],
    stories: [],
    post_media: [],
    post_links: [],
    notifications: [],
    saves: [],
    reactions: [],
    drafts: new Map(),
    rpcPayloads: [],
    inferCalls: 0,
    // Rulings 193, 194: set to fail the one vocabulary read, so a flow can check that the controls
    // reading it render empty rather than falling back to a literal that no longer exists.
    failVocab: false,
    // Ruling 287: publish_post answers instantly by default, so the composer unmounts before an
    // autosave timer in flight can fire and React clears it. Set this to hold the response open
    // past DRAFT_DEBOUNCE, after the draft has been cleared, and the timer fires with the composer
    // still mounted and the publish still in flight, which is the live shape of the defect.
    publishDelayMs: 0,
    reads: [],
    // Brief 3: which persona is signed in relative to thandiwe-dube, and the owner's switches.
    profile: {
      mode: "owner",
      rel: "none",
      following: false,
      switches: { shared: true, private: false },
      visibility: {},
      overrides: {},
      failSection: null,
      attempts: [],
      saves: [],
      follows: [],
      requests: [],
      blocks: [],
    },
    // Brief 5: what onboarding_state() answers and what the onboarding function was sent. Every
    // existing flow signs in as a member who has onboarded (next null), so the gate in the root
    // route holds nothing; the onboarding arm sets next itself.
    onboarding: {
      state: {
        next: null,
        who: {
          name: "Amara Osei",
          username: "amara-osei",
          suggestion: "amara-osei",
          avatar_path: null,
          completed: true,
        },
        where: { city: "Nairobi", country: "Kenya", completed: true },
        relationship: {
          stance: "exploring",
          stance_label: "Still exploring",
          declared: false,
          completed: true,
        },
        onboarded_at: "2026-09-01T00:00:00+00:00",
      },
      writes: [],
      explainerOpens: 0,
      taken: false,
      failScreen: null,
      delayMs: 0,
      // Ruling 345: what the last media-upload actually carried, so an arm can prove the client
      // normalised the file (converted to JPEG, downscaled) before it left the browser.
      lastUpload: null,
    },
    // Brief 5: media-upload refusals, so the photo's two alerts can be exercised.
    mediaTooLarge: false,
    mediaFail: false,
    // Brief 4: Connect's projection state and the writes the surface made.
    connect: {
      overrides: {},
      dismissed: [],
      writes: [],
      whereEmpty: false,
      membersEmpty: false,
      suggestFail: false,
      corridors: [{ id: "los-angeles-accra-agriculture", label: "Los Angeles to Accra" }],
    },
  };
  return db;
}

const LONG =
  "Back in Nairobi after three weeks in Houston. The jet lag is winning and the mangoes are not. " +
  "Three intros changed the trip: a cooperative in Oyo found its first buyer through two members, " +
  "a clinic coordinator agreed to run a weekend session in Kisumu, and a fintech founder in Accra " +
  "opened his books to a savings product for market traders. Writing the long version tonight, " +
  "because the short version does not do the people justice.\n\nMore soon, with names once they agree.";

/** Seed n published untyped posts, newest first, alternating authors so Mine and My Network differ. */
function seedPosts(db, n) {
  for (let i = 0; i < n; i++) {
    const mineRow = i % 2 === 0;
    db.posts.push({
      id: "seed-" + i,
      author_kind: "member",
      author_id: mineRow ? UID : "00000000-0000-4000-8000-0000000000f2",
      created_by: mineRow ? UID : "00000000-0000-4000-8000-0000000000f2",
      c_category: "convey",
      body: i + 1 + ". " + LONG,
      anchor_kind: null,
      anchor_id: null,
      created_object_kind: null,
      created_object_id: null,
      audience: "everyone",
      status: "published",
      published_at: new Date(Date.now() - i * 3600e3).toISOString(),
      created_at: new Date(Date.now() - i * 3600e3).toISOString(),
    });
  }
}

async function mockSupabase(page, db, opts = {}) {
  // Google Fonts are not reachable from this sandbox; abort so the check for page errors stays meaningful.
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.route(`**/${SB}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const p = url.pathname;
    const method = req.method();
    const json = (body, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        headers: { "access-control-allow-origin": "*" },
        body: JSON.stringify(body),
      });
    if (method === "OPTIONS")
      return route.fulfill({
        status: 200,
        headers: {
          "access-control-allow-origin": "*",
          "access-control-allow-headers": "*",
          "access-control-allow-methods": "*",
        },
      });
    if (p.startsWith("/auth/v1/token")) return json(SESSION);
    if (p === "/auth/v1/user") return json(USER);
    if (p === "/auth/v1/logout") return json({}, 204);
    if (p === "/functions/v1/dia-compose-read") {
      db.inferCalls++;
      const body = req.postDataJSON();
      await new Promise((r) => setTimeout(r, opts.inferDelay ?? 900));
      if (opts.silent) return json(null);
      const key = Object.keys(SAMPLES).find(
        (k) => k !== "untyped" && body.text.startsWith(SAMPLES[k].slice(0, 30)),
      );
      return json(key ? INFER[key] : null);
    }
    if (p === "/functions/v1/place-resolve") {
      // Convene Pass 1, PR 2: four typed states. Session 24 (783): every suggest carries the
      // host's country and the mock answers inside it only: zero hits is none, one is one, two
      // or more is several. A suggest with no country_name is the function's own `unavailable`
      // (never the Edge node's IP); a proximity narrows and never widens. Session 23: a query
      // naming an outage is answered 503 from the gateway, which the client reads as
      // `unavailable`.
      const body = req.postDataJSON() || {};
      db.placeCalls.push(body);
      await new Promise((r) => setTimeout(r, 120));
      const FRONT = {
        place_id: "dXJuOm1ieHBvaTpmcm9udC1yb29t",
        place_name: "Front Room",
        area: "Osu",
        city: "Accra",
        country: "Ghana",
        lng: -0.1747,
        lat: 5.5559,
        timezone: "Africa/Accra",
        label: "Front Room, Osu, Accra",
        kind: "venue",
      };
      // Session 23, change 2: an area. Search Box holds no POI for Ghana; "Labadi beach" near
      // Accra answers the locality it sits in, and the form keeps the words beside it.
      const OSU = {
        place_id: "dXJuOm1ieHBsYzpPc3U",
        place_name: "Osu",
        area: null,
        city: "Accra",
        country: "Ghana",
        lng: -0.1794,
        lat: 5.5557,
        timezone: "Africa/Accra",
        label: "Osu, Accra",
        kind: "area",
      };
      // Ruling 807: Mapbox names the same thing twice often enough to matter. This Ghana area's
      // `place_name` and `area` are one string, which is what printed `Labadi Villas, Labadi
      // Villas, Accra` on the founder's preview on 17 September.
      const VILLAS = {
        place_id: "dXJuOm1ieHBsYzpMYWJhZGlWaWxsYXM",
        place_name: "Labadi Villas",
        area: "Labadi Villas",
        city: "Accra",
        country: "Ghana",
        lng: -0.1553,
        lat: 5.5606,
        timezone: "Africa/Accra",
        label: "Labadi Villas, Accra",
        kind: "area",
      };
      const AF = [
        {
          place_id: "af-accra",
          place_name: "Alliance Française Accra",
          area: "Airport Residential",
          city: "Accra",
          country: "Ghana",
          lng: -0.18,
          lat: 5.61,
          timezone: "Africa/Accra",
          label: "Alliance Française Accra, Airport Residential, Accra",
          kind: "venue",
        },
        {
          place_id: "af-kumasi",
          place_name: "Alliance Française Kumasi",
          area: "Nhyiaeso",
          city: "Kumasi",
          country: "Ghana",
          lng: -1.62,
          lat: 6.67,
          timezone: "Africa/Accra",
          label: "Alliance Française Kumasi, Nhyiaeso, Kumasi",
          kind: "venue",
        },
        {
          place_id: "af-nairobi",
          place_name: "Alliance Française Nairobi",
          area: "Loresho",
          city: "Nairobi",
          country: "Kenya",
          lng: 36.79,
          lat: -1.26,
          timezone: "Africa/Nairobi",
          label: "Alliance Française Nairobi, Loresho, Nairobi",
          kind: "venue",
        },
      ];
      // What the stand-in knows, by the words that find it.
      const CATALOGUE = [
        { match: "front room", place: FRONT },
        { match: "labadi", place: OSU },
        { match: "villas", place: VILLAS },
        ...AF.map((place) => ({ match: "alliance", place })),
      ];
      if (body.action === "retrieve") {
        const hit = CATALOGUE.find((c) => c.place.place_id === body.mapbox_id);
        return hit ? json({ state: "one", place: hit.place }) : json({ state: "none" });
      }
      // Rulings 813, 817: the dry run answers the country's alpha-2 code and its IANA zones from
      // the function's own runtime ICU, with no Mapbox call. One zone is the 168-country case the
      // form takes silently; more than one is the case it asks about (821); null is a runtime that
      // could not say, which leaves the form's previous behaviour standing.
      if (body.action === "anchor") {
        const ANCHORS = {
          Ghana: { country: "GH", zones: ["Africa/Accra"] },
          Kenya: { country: "KE", zones: ["Africa/Nairobi"] },
          "United Kingdom": { country: "GB", zones: ["Europe/London"] },
          "South Africa": { country: "ZA", zones: ["Africa/Johannesburg"] },
          "United States": {
            country: "US",
            zones: [
              "America/Chicago",
              "America/Denver",
              "America/Los_Angeles",
              "America/New_York",
              "Pacific/Honolulu",
            ],
          },
        };
        const hit = ANCHORS[body.country_name];
        if (!hit) return json({ state: "unavailable" });
        return json({ ...hit, state: "anchored", zones_via: "timeZones" });
      }
      const q = String(body.q || "").toLowerCase();
      if (q.length < 3) return json({ state: "none" });
      if (q.includes("outage")) return json({ message: "upstream unavailable" }, 503);
      if (!body.country_name) return json({ state: "unavailable" });
      const hits = CATALOGUE.filter(
        (c) => q.includes(c.match) && c.place.country === body.country_name,
      ).map((c) => c.place);
      if (hits.length === 0) return json({ state: "none" });
      if (hits.length === 1) return json({ state: "one", place: hits[0] });
      return json({
        state: "several",
        places: hits.map(({ lng, lat, timezone, ...rest }) => rest),
      });
    }
    if (p === "/functions/v1/link-unfurl") {
      await new Promise((r) => setTimeout(r, 400));
      return json({
        url: req.postDataJSON().url,
        title: "Nairobi to host continental builders summit",
        description: null,
        image_url: null,
      });
    }
    if (p === "/functions/v1/media-upload") {
      // Ruling 345: record what left the browser. The multipart headers for the file part name its
      // filename and Content-Type; the body length stands in for the uploaded byte count.
      const buf = req.postDataBuffer && req.postDataBuffer();
      const head = buf ? buf.slice(0, 4096).toString("latin1") : "";
      // A JPEG's EXIF segment carries the marker "Exif\0\0" near the file start; a canvas re-encode
      // carries none, which is how ruling 347's client-side strip is proven.
      const sep = head.indexOf("\r\n\r\n");
      const fileHead = sep >= 0 ? head.slice(sep + 4) : head;
      db.onboarding.lastUpload = {
        bytes: buf ? buf.length : 0,
        jpeg: /content-type:\s*image\/jpeg/i.test(head) || /filename="[^"]*\.jpe?g"/i.test(head),
        exif: fileHead.includes("Exif\u0000\u0000"),
      };
      await new Promise((r) => setTimeout(r, 300));
      if (db.mediaTooLarge) return json({ error: "too_large" }, 413);
      if (db.mediaFail) return json({ error: "upload_failed" }, 500);
      return json({
        storage_path: `${UID}/p1/${db.post_media.length + 1}.png`,
        width: 1200,
        height: 800,
      });
    }
    if (p.startsWith("/storage/v1/object/sign/") && method === "POST") {
      // Batch signing (createSignedUrls): a bucket path with {paths} in the body.
      const b = req.postDataJSON() || {};
      if (Array.isArray(b.paths))
        return json(
          b.paths.map((x) => ({
            error: null,
            path: x,
            signedURL: "/object/sign/profile-media/" + x + "?token=t",
          })),
        );
      return json({ signedURL: "/object/sign/" + p.split("/object/sign/")[1] + "?token=t" });
    }
    if (p === "/rest/v1/rpc/onboarding_state") return json(db.onboarding.state);
    if (p === "/functions/v1/onboarding") {
      const ob = db.onboarding;
      const body = req.postDataJSON() || {};
      if (ob.delayMs) await new Promise((r) => setTimeout(r, ob.delayMs));
      if (body.event === "explainer_opened") {
        ob.explainerOpens++;
        return json({ ok: true });
      }
      ob.writes.push(body);
      if (ob.failScreen === body.screen)
        return json({ ok: false, error: { code: "P0001", message: "That did not save." } }, 400);
      const st = ob.state;
      if (body.screen === "who") {
        if (ob.taken)
          return json({ ok: true, result: { status: "taken", suggestion: st.who.suggestion } });
        st.who = {
          ...st.who,
          name: body.name,
          username: body.username,
          avatar_path: body.avatar_path,
          completed: true,
        };
        st.next = st.where.completed ? (st.onboarded_at ? null : "relationship") : "where";
        return json({
          ok: true,
          result: {
            status: "ok",
            name: body.name,
            username: body.username,
            avatar_path: body.avatar_path,
            suggestion: st.who.suggestion,
            username_changes: body.username === st.who.suggestion ? 0 : 1,
          },
        });
      }
      if (body.screen === "where") {
        st.where = { city: body.city, country: body.country, completed: true };
        st.next = "relationship";
        return json({ ok: true, result: { status: "ok", city: body.city, country: body.country } });
      }
      if (body.screen === "relationship") {
        const now = new Date().toISOString();
        if (body.touched)
          st.relationship = { ...st.relationship, stance: body.stance, declared: true };
        st.relationship.completed = true;
        st.onboarded_at = now;
        st.next = null;
        return json({
          ok: true,
          result: {
            status: "ok",
            stance: st.relationship.stance,
            stance_declared_at: body.touched ? now : null,
            onboarded_at: now,
          },
        });
      }
      return json({ ok: false, error: { code: "bad_screen" } }, 400);
    }
    if (p === "/functions/v1/connect-suggest") {
      await new Promise((r) => setTimeout(r, 150));
      if (db.connect.suggestFail) return json({ items: [] });
      return json({
        items: CONNECT_SUGGESTED.filter((c) => !db.connect.dismissed.includes(c.id)).map((c) =>
          connectCard(c, db.connect.overrides),
        ),
      });
    }
    if (
      p.startsWith("/rest/v1/rpc/") &&
      /^\/rest\/v1\/rpc\/(connect_cards|connect_where|connect_filter_options|connection_request_intros|send_introduction|respond_to_request|withdraw_request|set_follow|dismiss_suggestion)$/.test(
        p,
      )
    ) {
      const fn = p.slice("/rest/v1/rpc/".length);
      const body = req.postDataJSON() || {};
      const cx = db.connect;
      await new Promise((r) => setTimeout(r, 120));
      if (fn === "connect_filter_options")
        return json({ ...CONNECT_OPTIONS, corridors: cx.corridors });
      if (fn === "connection_request_intros") return json([]);
      if (fn === "connect_where")
        return json(cx.whereEmpty ? { continent: [], diaspora: [] } : CONNECT_WHERE);
      if (fn === "connect_cards") {
        const f = body.p_filters || {};
        if (body.p_lens === "members") {
          let rows = cx.membersEmpty ? [] : CONNECT_MEMBERS.slice();
          if (f.stance) rows = rows.filter((m) => m._stance === f.stance);
          if (f.location) rows = rows.filter((m) => m._location === f.location);
          if (f.focus) rows = rows.filter((m) => m._focus === f.focus);
          if (f.origin) rows = rows.filter((m) => m.origin === f.origin);
          if (f.heritage) rows = rows.filter((m) => m.heritage === f.heritage);
          for (const k of ["industry", "skill", "region"])
            if (f[k]) rows = rows.filter((m) => m.chips.includes(f[k]));
          // No fixture carries a pathway or a corridor: those axes filter to nothing.
          if (f.pathway || f.corridor) rows = [];
          return json({ items: rows.map((m) => connectCard(m, cx.overrides)), next_cursor: null });
        }
        if (body.p_lens === "suggested")
          return json({
            items: CONNECT_SUGGESTED.filter((c) => !cx.dismissed.includes(c.id)).map((c) =>
              connectCard(c, cx.overrides),
            ),
          });
        if (body.p_lens === "network") {
          const cards = CONNECT_MEMBERS.map((m) => connectCard(m, cx.overrides));
          return json({
            requests: cards.filter((c) => c.rel === "received"),
            sent: cards
              .filter((c) => c.rel === "sent" || (cx.overrides[c.id] || {}).sentPending)
              .map((c) => ({ ...c, rel: "sent" })),
            connections: cards.filter((c) => c.rel === "connected"),
            following: cards.filter((c) => c.following),
          });
        }
        return json({ code: "22023", message: "unknown lens" }, 400);
      }
      cx.writes.push(fn + ":" + JSON.stringify(body));
      const over = (id, o) => (cx.overrides[id] = { ...(cx.overrides[id] || {}), ...o });
      if (fn === "send_introduction") {
        if (!body.p_message || !String(body.p_message).trim())
          return json(
            { code: "22023", message: "An introduction needs a message of up to 300 characters." },
            400,
          );
        over(body.p_recipient, { rel: "sent" });
        db.profile.rel = "sent";
        return json("cr-new");
      }
      if (fn === "respond_to_request") {
        over(body.p_sender, { rel: body.p_accept ? "connected" : "none" });
        db.profile.requests.push("PATCH");
        db.profile.rel = body.p_accept ? "connected" : "none";
        return json(null, 204);
      }
      if (fn === "withdraw_request") {
        over(body.p_recipient, { rel: "none" });
        db.profile.requests.push("PATCH");
        db.profile.rel = "none";
        return json(null, 204);
      }
      if (fn === "set_follow") {
        over(body.p_target, { following: !!body.p_on });
        db.profile.following = !!body.p_on;
        db.profile.follows.push(body.p_on ? "on" : "off");
        return json(null, 204);
      }
      if (fn === "dismiss_suggestion") {
        cx.dismissed.push(body.p_target);
        return json(null, 204);
      }
    }
    if (p.startsWith("/storage/v1/object/sign") || p.includes("/object/sign/"))
      return route.fulfill({ status: 200, contentType: "image/svg+xml", body: KENTE });
    if (p === "/rest/v1/rpc/publish_post") {
      const payload = req.postDataJSON().payload;
      db.rpcPayloads.push(payload);
      // A refusal (ruling 665's failed state) writes nothing and answers in the RPC's own shape.
      if (db.publishFail)
        return json({ code: "22023", message: db.publishFail, details: null, hint: null }, 400);
      const id = payload.id;
      let kind = null,
        oid = null;
      const f = payload.fields || {};
      const title = f.title || payload.body.split("\n")[0].slice(0, 80) || "Untitled";
      if (payload.verb === "convene") {
        // Convene Pass 1: the namespaced keys publish_post reads (20260916120200), mirrored here.
        oid = "e" + id;
        kind = "event";
        const c = (k) => f["convene." + k];
        const format = c("format") || "in_person";
        const mode = format === "online" ? "virtual" : format;
        const starts = c("starts_at") || null;
        const windowed = !starts && !!c("when_window");
        db.events.push({
          id: oid,
          host_member_id: UID,
          title: c("title") || title,
          starts_at: starts,
          ends_at: c("ends_at") || null,
          doors_at: c("doors_at") || null,
          when_text: c("when") || c("when_window") || "",
          mode,
          ticket_kind: c("price_nature") || "free",
          space_id: c("space_id") || (payload.anchor?.kind === "space" ? payload.anchor.id : null),
          status: "published",
          timezone: c("timezone") || null,
          time_confirmed: !!starts,
          date_confirmed: !!starts,
          expected_window_start: windowed ? c("expected_window_start") || null : null,
          expected_window_end: windowed ? c("expected_window_end") || null : null,
          window_basis: windowed ? c("when_window") : null,
          delivery_intent: c("delivery_intent") || "",
          cancelled_at: null,
          cancelled_reason: null,
          attachments: [],
          created_at: new Date().toISOString(),
        });
        if (format === "in_person" || format === "hybrid")
          db.event_delivery.push({
            id: "d" + id + "p",
            event_id: oid,
            kind: "physical",
            position: 0,
            place_id: c("place_id") || null,
            place_name: c("place_name") || null,
            place_text: c("place_id") ? null : c("place_text") || null,
            city: c("city") || null,
            country: c("country") || null,
          });
        if (format === "online" || format === "hybrid")
          db.event_delivery.push({
            id: "d" + id + "l",
            event_id: oid,
            kind: c("link") ? "meeting_link" : "to_be_announced",
            position: format === "hybrid" ? 1 : 0,
            url: c("link") || null,
          });
      }
      if (payload.verb === "collaborate") {
        oid = "sp" + id;
        kind = "space";
        db.spaces.push({
          id: oid,
          title,
          owner_member_id: UID,
          category: f.category || null,
          description: payload.body,
          roles_sought: (f.roles || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean),
          status: "active",
          created_at: new Date().toISOString(),
        });
      }
      if (payload.verb === "contribute") {
        oid = "o" + id;
        kind = "opportunity";
        db.opportunities.push({
          id: oid,
          receiver_member_id: UID,
          title,
          instrument: { Skills: "skills", "In-kind": "in_kind" }[f.instrument] || "time",
          need: f.need || payload.body,
          by_date: payload.by_date,
          by_text: f.by || "",
          space_id: null,
          event_id: null,
          created_at: new Date().toISOString(),
        });
      }
      if (payload.verb === "connect") {
        oid = "c" + id;
        kind = "connection_request";
        db.connection_requests.push({
          id: oid,
          from_member_id: UID,
          to_member_id: null,
          to_name: f.who || "",
          why: f.why || payload.body,
          status: "pending",
          created_at: new Date().toISOString(),
        });
      }
      if (payload.verb === "convey") {
        oid = "st" + id;
        kind = "story";
        db.stories.push({
          id: oid,
          author_member_id: UID,
          title,
          body: payload.body,
          origin_kind: null,
          origin_id: null,
          created_at: new Date().toISOString(),
        });
      }
      db.posts.unshift({
        id,
        author_kind: payload.author_kind,
        author_id: payload.author_id,
        created_by: UID,
        c_category: payload.verb || "convey",
        body: payload.body,
        anchor_kind: payload.anchor?.kind ?? null,
        anchor_id: payload.anchor?.id ?? null,
        created_object_kind: kind,
        created_object_id: oid,
        audience: payload.audience,
        status: "published",
        published_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
      (payload.media || []).forEach((m, i) =>
        db.post_media.push({
          id: "m" + i + id,
          post_id: id,
          storage_path: m.storage_path,
          width: m.width,
          height: m.height,
          position: m.position,
          created_at: new Date().toISOString(),
        }),
      );
      if (payload.link)
        db.post_links.push({
          id: "l" + id,
          post_id: id,
          url: payload.link.url,
          title: payload.link.title,
          description: payload.link.description,
          image_url: payload.link.image_url,
          fetched_at: null,
          created_at: new Date().toISOString(),
        });
      db.drafts.clear();
      // Ruling 287: the draft is deleted inside the publish transaction, and the response is what
      // the client is still waiting on. Holding it here, after the clear, is the live ordering:
      // on the founder's account the resurrected draft row landed 132ms after the transaction that
      // deleted it, with the composer still mounted and the publish still in flight.
      if (db.publishDelayMs) await new Promise((r) => setTimeout(r, db.publishDelayMs));
      return json(id);
    }
    if (p === "/rest/v1/rpc/profile_view") {
      const body = req.postDataJSON() || {};
      const auth = req.headers()["authorization"] || "";
      const anon = !auth.includes(JWT) || body.p_as_public === true;
      await new Promise((r) => setTimeout(r, 120));
      return json(profileProjection(db, anon));
    }
    // Ruling 193: one vocabulary path, read by Profile, the Composer and the Feed. FAIL_VOCAB
    // forces the read to fail, which is how the empty-control behaviour of ruling 194 is checked.
    if (p === "/rest/v1/rpc/vocabularies")
      return db.failVocab
        ? json(
            { code: "PGRST", message: "forced vocabulary failure", details: null, hint: null },
            500,
          )
        : json(VOCAB);
    if (p === "/rest/v1/rpc/public_attestations") return json(ATTESTATIONS);
    if (p === "/rest/v1/rpc/save_profile_section") {
      const body = req.postDataJSON() || {};
      const pr = db.profile;
      await new Promise((r) => setTimeout(r, 200));
      // Every attempt, answered or refused, so a flow can wait on the round trip.
      pr.attempts.push(body.section);
      if (pr.failSection && body.section === pr.failSection)
        return json(
          { code: "P0001", message: "That did not save.", details: null, hint: null },
          400,
        );
      pr.saves.push(body.section);
      if (body.section === "switches") {
        if (typeof body.payload.private === "boolean") pr.switches.private = body.payload.private;
        if (typeof body.payload.shared === "boolean") pr.switches.shared = body.payload.shared;
      } else if (body.section === "visibility")
        pr.visibility[body.payload.section] = body.payload.audience;
      else pr.overrides[body.section] = body.payload;
      return json(null, 204);
    }
    if (p.startsWith("/rest/v1/")) {
      const table = p.slice("/rest/v1/".length);
      const inIds = (param) => {
        const v = url.searchParams.get(param);
        if (!v) return null;
        const m = v.match(/^in\.\((.*)\)$/);
        return m ? m[1].split(",").map((s) => s.replace(/^"|"$/g, "")) : null;
      };
      if (table === "post_drafts") {
        (db.log = db.log || []).push(
          method + " " + p + url.search + " accept=" + (req.headers()["accept"] || ""),
        );
        if (method === "GET") {
          const d = db.drafts.get(url.searchParams.get("host_context")?.replace("eq.", ""));
          const single = (req.headers()["accept"] || "").includes("object");
          if (single)
            return d
              ? json({ payload: d })
              : json({ code: "PGRST116", details: "0 rows", hint: null, message: "no rows" }, 406);
          return json(d ? [{ payload: d }] : []);
        }
        if (method === "POST") {
          const b = req.postDataJSON();
          const row = Array.isArray(b) ? b[0] : b;
          db.drafts.set(row.host_context, row.payload);
          return json([row], 201);
        }
        if (method === "DELETE") {
          db.drafts.delete(url.searchParams.get("host_context")?.replace("eq.", ""));
          return json([], 200);
        }
      }
      const eqOf = (param) => url.searchParams.get(param)?.replace(/^eq\./, "") ?? null;
      const single = (req.headers()["accept"] || "").includes("object");
      const one = (rows) =>
        rows[0]
          ? json(rows[0])
          : json({ code: "PGRST116", details: "0 rows", hint: null, message: "no rows" }, 406);
      if (table === "feed") {
        let rows = db.posts.filter((p) => p.status === "published");
        const ids = inIds("id");
        if (ids) rows = rows.filter((p) => ids.includes(p.id));
        const id = eqOf("id");
        if (id) rows = rows.filter((p) => p.id === id);
        const or = url.searchParams.get("or") || "";
        if (or.includes("created_by")) rows = rows.filter((p) => p.author_id === UID);
        else if (or.includes("author_kind"))
          rows = rows.filter((p) => or.includes('"' + p.author_id + '"'));
        return single ? one(rows) : json(rows);
      }
      if (table === "post_saves" || table === "post_reactions") {
        const list = table === "post_saves" ? db.saves : db.reactions;
        if (method === "POST") {
          const b = req.postDataJSON();
          const row = Array.isArray(b) ? b[0] : b;
          list.push({ ...row, created_at: new Date().toISOString() });
          return json([row], 201);
        }
        if (method === "DELETE") {
          const pid = eqOf("post_id");
          const keep = list.filter((r) => r.post_id !== pid);
          list.length = 0;
          list.push(...keep);
          return json([], 200);
        }
        const ids = inIds("post_id");
        return json(list.filter((r) => !ids || ids.includes(r.post_id)));
      }
      if (table === "notifications") {
        if (method === "PATCH") {
          const id = eqOf("id");
          db.reads.push(id);
          db.notifications.forEach((n) => {
            if (n.id === id) n.read_at = new Date().toISOString();
          });
          return json([], 204);
        }
        let rows = db.notifications.slice();
        if (url.searchParams.get("read_at") === "is.null") rows = rows.filter((n) => !n.read_at);
        return json(rows);
      }
      if (table === "members") {
        const row = { handle: "amara-osei", name: "Amara Osei" };
        return single ? json(row) : json([row]);
      }
      // Brief 4A: block and unblock are a plain insert and delete on member_blocks under the
      // blocker's own RLS (src/lib/blocks.ts). The live trigger revokes the relationship; here the
      // projection mode carries the same consequence, so the surface re-reads the state it will
      // read live.
      if (table === "member_blocks") {
        if (method === "POST") {
          db.profile.blocks.push("block");
          db.profile.mode = "blocker";
          db.profile.rel = "none";
          return json([], 201);
        }
        if (method === "DELETE") {
          db.profile.blocks.push("unblock");
          // Ruling 211: unblocking restores nothing. The pair comes back as strangers.
          db.profile.mode = "stranger";
          db.profile.rel = "none";
          db.profile.following = false;
          return json([], 200);
        }
        return json([]);
      }
      if (table === "member_follows") {
        if (method === "POST") {
          db.profile.following = true;
          db.profile.follows.push("on");
          return json([], 201);
        }
        if (method === "DELETE") {
          db.profile.following = false;
          db.profile.follows.push("off");
          return json([], 200);
        }
        return json([]);
      }
      if (
        table === "connection_requests" &&
        method === "GET" &&
        url.searchParams.has("from_member_id")
      ) {
        const pending = db.profile.rel === "sent" || db.profile.rel === "received";
        return single
          ? pending
            ? json({ id: "cr1" })
            : json(null)
          : json(pending ? [{ id: "cr1" }] : []);
      }
      if (table === "connection_requests" && method !== "GET") {
        db.profile.requests.push(method);
        if (method === "POST") db.profile.rel = "sent";
        if (method === "DELETE") db.profile.rel = "none";
        if (method === "PATCH") {
          const b = req.postDataJSON() || {};
          db.profile.rel = b.status === "accepted" ? "connected" : "none";
        }
        return json([], method === "POST" ? 201 : 200);
      }
      if (table === "member_homes") return json(db.homes);
      if (table === "event_delivery") {
        const ids = inIds("event_id");
        // The meeting_link row is host-only under RLS; the mock member is the host of what they
        // publish and a viewer of the seeded rows, so seeded meeting links stay out.
        return json(
          db.event_delivery.filter(
            (d) => (!ids || ids.includes(d.event_id)) && (d.kind !== "meeting_link" || d.mine),
          ),
        );
      }
      if (table === "member_connections") return json([]);
      if (table === "space_roles") return json([{ space_id: "s1" }]);
      if (table === "spaces") {
        const ids = inIds("id");
        return json(ids ? db.spaces.filter((s) => ids.includes(s.id)) : db.spaces);
      }
      if (table === "posts") return json(db.posts);
      if (table === "post_media") {
        const ids = inIds("post_id");
        return json(db.post_media.filter((m) => !ids || ids.includes(m.post_id)));
      }
      if (table === "post_links") {
        const ids = inIds("post_id");
        return json(db.post_links.filter((m) => !ids || ids.includes(m.post_id)));
      }
      for (const t of ["events", "opportunities", "connection_requests", "stories"])
        if (table === t) {
          const ids = inIds("id");
          if (!ids && url.searchParams.has("starts_at")) return json([]);
          if (!ids && t === "connection_requests") return json([]);
          return json(db[t].filter((r) => !ids || ids.includes(r.id)));
        }
      return json([]);
    }
    return json(null, 404);
  });
}

// CHROME_PATH points Chromium at a preinstalled binary (sandboxes without a Playwright download).
//
// RULING200_PROBE is a diagnostic switch for ruling 200, off unless set, and it changes no pass
// criterion: it injects one stylesheet into every context the run opens so a dispatched matrix run
// can be compared against an identical run without it. `appearance` takes every form control off
// the engine's native form-control paint path, which is the surviving suspect in docs/GAPS.md G5;
// `color-scheme` forces the light branch of that path. Anything else is ignored.
const PROBE_CSS = {
  appearance:
    "select, input, textarea, button, ::-webkit-inner-spin-button, ::-webkit-search-decoration" +
    " { appearance: none !important; -webkit-appearance: none !important; }",
  "color-scheme": "*, *::before, *::after { color-scheme: light !important; }",
};

async function launch(browserType) {
  const opts =
    browserType === chromium && process.env.CHROME_PATH
      ? { executablePath: process.env.CHROME_PATH }
      : {};
  // `compositing` is not a stylesheet: the core from run 17 (34322686504) is a SIGSEGV in the
  // WPEWebProcess thread named ThreadedCompositor, so the probe that matches the evidence turns
  // accelerated compositing off in the engine rather than restyling the page.
  if (process.env.RULING200_PROBE === "compositing")
    opts.env = { ...process.env, WEBKIT_DISABLE_COMPOSITING_MODE: "1" };
  const browser = await browserType.launch(opts);
  const css = PROBE_CSS[process.env.RULING200_PROBE];
  if (css) {
    const probeContext = browser.newContext.bind(browser);
    browser.newContext = async (o) => {
      const ctx = await probeContext(o);
      await ctx.addInitScript((text) => {
        const add = () => {
          const s = document.createElement("style");
          s.setAttribute("data-ruling-200-probe", "");
          s.textContent = text;
          document.documentElement.appendChild(s);
        };
        if (document.documentElement) add();
        else document.addEventListener("readystatechange", add, { once: true });
      }, css);
      return ctx;
    };
  }
  // Ruling 316. Wrapped last, so it also covers the context the probe hands back. Every page in
  // every flow is created on a context from here, so the listener cannot be forgotten by a flow
  // that exists now or one written later, which is the gap the ruling names.
  const outerContext = browser.newContext.bind(browser);
  browser.newContext = async (o) => {
    const ctx = await outerContext(o);
    ctx.on("page", (page) => watchCrash(page, browser));
    return ctx;
  };
  // Ruling 830. `page.on("crash")` fires for a lost web process and says nothing about the browser
  // process, and Playwright's own error cannot tell them apart either: it reads "Target page,
  // context or browser has been closed" whichever went. Ruling 828's census could not answer which
  // died on any of its seventeen sightings, because nothing ever asked.
  //
  // Measured against Chromium at `chrome://crash` before this was written, because a listener whose
  // behaviour is assumed is the thing ruling 828 spent a day undoing: on a lost web process `crash`
  // fires with `isConnected()` still true, and `disconnected` does not fire at all. So the two
  // together separate the cases that Playwright's one error message conflates. The same probe is why
  // `closing` exists: `disconnected` fires on every ordinary `browser.close()` too, which without
  // the flag would print this line once per arm, two hundred times a job, each one reading as an
  // event when it is a teardown. A signal that fires on the ordinary path is not a signal.
  let closing = false;
  const outerClose = browser.close.bind(browser);
  browser.close = async (...args) => {
    closing = true;
    return outerClose(...args);
  };
  browser.on("disconnected", () => {
    if (closing) return;
    console.log("BROWSER DISCONNECTED |", openArm ? openArm.arm : "(no arm open)");
  });
  return browser;
}

// ---------------------------------------------------------------------------
// Arms, the crash flag (ruling 316) and the declared count (ruling 317).
//
// An arm is one flow at one engine, viewport and theme: the unit ruling 317 says is comparable
// between runs, and the unit ruling 316's flag has to be attached to. Flows run strictly one after
// another, so one module-level cursor is the whole bookkeeping. `armStart(tag)` opens an arm and
// closes the one before it; every check `record()` emits until the next `armStart` belongs to it.
//
// The crash listener is registered in `launch()` rather than two lines into each flow, because the
// defect ruling 316 names is a flow that never registered one. Every page every flow opens comes
// from `launch()`, so no flow can forget and a flow written later inherits it.
// ---------------------------------------------------------------------------
const results = [];
const armLog = [];
const crashSightings = [];
let openArm = null;
/** Ruling 830: the zero the per-arm progress line counts from. */
const runStart = Date.now();

/** The tier ruling 61's matrix is read in. Widths are the app's own breakpoints. */
function tierOf(name) {
  const m = /(\d+)x(\d+)/.exec(name || "");
  if (!m) return "unsized";
  const w = Number(m[1]);
  return w < 640 ? "compact" : w > 1024 ? "expanded" : "medium";
}

function armStart(tag) {
  armClose();
  openArm = { arm: tag, from: results.length, crashed: false, pages: new Set() };
  // Ruling 830: `record()` prints nothing for a passing check, so a job's log held no timeline at
  // all and ruling 828's census had to place each crash by step timestamps and infer how far the
  // run had got. One line per arm makes that readable: the checks emitted so far, the seconds since
  // the run began, and the arm about to run. Two hundred lines a job, against a log of thousands.
  const at = Math.round((Date.now() - runStart) / 1000);
  console.log(`ARM ${String(results.length).padStart(5)} +${at}s ${tag}`);
  return tag;
}

function armClose() {
  if (!openArm) return;
  armLog.push({
    arm: openArm.arm,
    tier: tierOf(openArm.arm),
    emitted: results.length - openArm.from,
    crashed: openArm.crashed,
  });
  openArm = null;
}

/**
 * Ruling 316. Registered on every page `launch()` produces. The flag is sticky for the rest of the
 * arm: once the web process is gone every check behind it fails for that reason and no other, which
 * is exactly the distinction the suite could not previously draw.
 */
function watchCrash(page, browser) {
  // Pinned here rather than read when the event fires: the page belongs to the arm that opened it,
  // and a crash reported during teardown must not be charged to whichever arm opened next.
  const owner = openArm;
  if (owner) owner.pages.add(page);
  page.on("crash", () => {
    const on = owner || openArm;
    const arm = on ? on.arm : "(no arm open)";
    if (on) on.crashed = true;
    // Ruling 830. Read here and not later: by the time a flow's catch runs, teardown has closed the
    // context and the answer is gone. `null` where no browser was handed in, never a guess.
    const alive = browser ? browser.isConnected() : null;
    crashSightings.push({
      arm,
      tier: tierOf(arm),
      at: new Date().toISOString(),
      secondsIn: Math.round((Date.now() - runStart) / 1000),
      browserConnected: alive,
    });
    console.log(
      "WEB PROCESS CRASHED |",
      arm,
      "| browser",
      alive === null ? "unknown" : alive ? "still connected" : "gone with it",
    );
  });
  return page;
}

/** Whether the arm currently open has lost a web process. */
function armCrashed() {
  return !!(openArm && openArm.crashed);
}

function record(name, ok, detail = "", crashed = armCrashed(), arm = openArm ? openArm.arm : null) {
  // `arm` is explicit only for ruling 292's own per-arm accounting, which runs after the last arm
  // has closed and so has no open arm to read. Ruling 832 needs those records attributed, because a
  // crashed arm's accounting failure is the crashed arm's and not a failure elsewhere in the job.
  results.push({ name, ok, detail, arm, crashed });
  // Ruling 316: every failure carries the flag or its absence, in the line a reader sees first.
  if (!ok) console.log("FAIL", crashed ? "[CRASH]" : "[no crash]", name, detail);
  // Ruling 292 asks for a changed count to be explained by name, and EXPECT=write only ever gives
  // the number. DUMP_LABELS=1 prints every check as it is emitted, so two arms can be diffed
  // label by label and the delta named rather than guessed at.
  if (process.env.DUMP_LABELS) console.log("LABEL", openArm ? openArm.arm : "-", "::", name);
}
// ---------------------------------------------------------------------------
// Ruling 317: the suite declares what each arm emits, or the count is not evidence.
//
// tests/expected-counts.json is that declaration, generated by EXPECT=write and committed. Nothing
// infers it at run time: a number derived from the run it is checking cannot detect that run being
// short. Enforcement is per arm and never per run, because a crashed flow abandons the checks
// behind it, and an arm that emitted fewer is reported as incomplete rather than quietly reducing
// a total (rulings 228 and 317).
// ---------------------------------------------------------------------------
const EXPECTED_PATH = path.join(__dirname, "expected-counts.json");

function loadExpected() {
  try {
    return JSON.parse(fs.readFileSync(EXPECTED_PATH, "utf8"));
  } catch {
    return null;
  }
}

function sortedObject(pairs) {
  return Object.fromEntries([...pairs].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}

function accountForArms({ full, engines }) {
  armClose();
  const seen = new Map();
  for (const a of armLog) seen.set(a.arm, (seen.get(a.arm) || 0) + a.emitted);
  fs.writeFileSync(path.join(OUT, "arm-counts.json"), JSON.stringify(sortedObject(seen), null, 2));

  if (process.env.EXPECT === "write") {
    // Calibration. Merges upward against what is already declared: an arm that lost a web process
    // during calibration emitted fewer checks than it owes, and taking the lower number would bake
    // the crash in as the expectation. A declared number only ever falls by a deliberate edit.
    const prior = loadExpected() || {};
    const next = new Map(Object.entries(prior));
    for (const [arm, n] of seen) {
      // Ruling 831's other end. Merging upward already refuses to take a crashed arm's short count.
      // It used to take an inflated one: an arm that threw emits one check MORE than it declares,
      // because every flow's catch records `${tag} flow` on the error path and that check is in no
      // declaration, so a calibration run with one late failure would raise the declaration by one
      // for good and every clean run after it would read INCOMPLETE. An arm that crashed or failed
      // is not calibration material in either direction; the declaration keeps what it had.
      if (
        armLog.some((a) => a.arm === arm && a.crashed) ||
        results.some((r) => r.arm === arm && !r.ok)
      ) {
        console.log(
          `EXPECT=write: ${arm} crashed or failed; its declaration is left at ${prior[arm] ?? "unset"}`,
        );
        continue;
      }
      next.set(arm, Math.max(prior[arm] || 0, n));
    }
    const body = JSON.stringify(sortedObject(next), null, 2) + "\n";
    fs.writeFileSync(EXPECTED_PATH, body);
    // Also into the artifact and the job log, so a calibration run on a runner can be read back
    // without a checkout of the runner's own workspace.
    fs.writeFileSync(path.join(OUT, "expected-counts.json"), body);
    console.log(
      `EXPECT=write: ${next.size} arms declared\n--- BEGIN expected-counts.json ---\n` +
        body +
        "--- END expected-counts.json ---",
    );
    return;
  }

  const expected = loadExpected();
  if (!expected) {
    record(
      "ruling 292: an expected count per arm is declared",
      false,
      `${EXPECTED_PATH} is missing or unreadable; regenerate it with EXPECT=write`,
    );
    return;
  }

  for (const [arm, n] of seen) {
    const want = expected[arm];
    const crashed = armLog.some((a) => a.arm === arm && a.crashed);
    // Ruling 831. An arm that threw late emits one check MORE than it declares: every flow's catch
    // records `${tag} flow` on the error path, and that check is in no declaration. Read as DRIFT
    // it told the reader the declaration was stale and to regenerate a file that was correct, which
    // is what run 254 attempt 1's crashed arm reported (39 against a declared 38) and what attempt
    // 2 reported on a plain fifteen-second timeout with no crash anywhere in the job. So the cause
    // is the catch-all and not the crash handler, and the discriminator is a failing check inside
    // the arm: a declaration that is genuinely stale drifts upward with every check still passing.
    const threw = results.some((r) => r.arm === arm && !r.ok);
    const label = `ruling 292 | ${arm}: emitted every check it declares`;
    if (want === undefined) {
      record(
        `ruling 292 | ${arm}: the arm is declared`,
        false,
        `UNDECLARED: emitted ${n} checks and is absent from expected-counts.json; regenerate with EXPECT=write`,
        crashed,
        arm,
      );
    } else if (n < want) {
      record(
        label,
        false,
        `UNPROVEN (228): emitted ${n} of ${want}; the ${want - n} checks behind the failure never ran`,
        crashed,
        arm,
      );
    } else if (n > want && (crashed || threw)) {
      record(
        label,
        false,
        `UNPROVEN (228): emitted ${n} against a declared ${want}, and the arm ${crashed ? "lost a web process" : "threw"}; ` +
          `the extra check is the flow catch-all on the error path, so the declaration is sound and must not be regenerated from this run`,
        crashed,
        arm,
      );
    } else if (n > want) {
      record(
        label,
        false,
        `DRIFT: emitted ${n} against a declared ${want} with every check passing; the declaration is stale, regenerate with EXPECT=write`,
        crashed,
        arm,
      );
    } else if (crashed) {
      // Rulings 228 and 832. An arm can lose its web process after its last check has passed: the
      // listener charges the crash to the arm that opened the page, and a crash during teardown
      // arrives when the arm is over. Left as a pass, that arm emitted its declared number, failed
      // nothing, and the job went green with a dead web process in it and no failing check anywhere
      // to classify. So the count matching is not enough: an arm that lost a web process is
      // unproven whatever it emitted, and this is the check that says so.
      record(
        label,
        false,
        `UNPROVEN (228): emitted its declared ${want}, but the arm lost a web process, so what it emitted proves nothing`,
        crashed,
        arm,
      );
    } else {
      record(label, true, "", crashed, arm);
    }
  }

  if (!full) {
    console.log(
      "ruling 292: SPECIAL, ONLY or THEME is set, so this is a subset run and arms that did not " +
        "run are not swept for. The missing-arm sweep is a full-run check.",
    );
    return;
  }
  // Ruling 228's case, and the one a total conceals: an arm that stopped running entirely emits
  // nothing, so it appears nowhere in what was observed and can only be found in what was declared.
  const inScope = (arm) => engines.some((e) => arm.startsWith(e + "-") || arm.startsWith(e + " "));
  for (const arm of Object.keys(expected)) {
    if (seen.has(arm) || !inScope(arm)) continue;
    record(
      `ruling 292 | ${arm}: the arm ran`,
      false,
      `MISSING: declares ${expected[arm]} checks and emitted none`,
    );
  }
}

/**
 * Ruling 357: the classes a failure is already known to fall into, in the order the tail prints
 * them. The first is ruling 274's crash flag. The second is a WebKit-only aborted fetch on the
 * mocked REST origin, worded by the engine as an access-control denial ("… due to access control
 * checks."): not a crash, and not the app, since every request to that origin is fulfilled
 * in-process. tests/connect.cjs and tests/profile.cjs filter it out of their own page-error checks;
 * this names it anywhere else it surfaces. Add a class here when a sighting is understood, never
 * to make a tail read cleaner.
 */
const ABORTED_MOCK_FETCH = new RegExp(
  `${SB.replace(/\./g, "\\.")}\\S*\\s+due to access control checks`,
);
const KNOWN_CLASSES = [
  { id: "behind a web-process crash (G5)", test: (f) => f.crashed },
  {
    id: "an aborted fetch on mocked REST (WebKit, ruling 357)",
    test: (f) => !f.crashed && ABORTED_MOCK_FETCH.test(f.detail || ""),
  },
];

/**
 * The closing summary. Ruling 317: arms are what is comparable between runs, so the arms lead and
 * the check count is printed as a count and never as a score. Ruling 316: every failure is printed
 * with the crash flag or its absence, so a G5 sighting and a different symptom are told apart in
 * the line a reader sees first.
 */
function finish({ full = false, engines = [] } = {}) {
  accountForArms({ full, engines });
  const fails = results.filter((r) => !r.ok);
  fs.writeFileSync(path.join(OUT, "results.json"), JSON.stringify(results, null, 2));
  fs.writeFileSync(
    path.join(OUT, "arms.json"),
    JSON.stringify({ armLog, crashSightings }, null, 2),
  );

  const byTier = new Map();
  for (const a of armLog) {
    const t = byTier.get(a.tier) || { arms: 0, crashed: 0, failed: new Set() };
    t.arms += 1;
    if (a.crashed) t.crashed += 1;
    byTier.set(a.tier, t);
  }
  for (const f of fails) {
    const t = f.arm && byTier.get(tierOf(f.arm));
    if (t) t.failed.add(f.arm);
  }

  console.log("\n=== arms by tier (ruling 61's matrix; ruling 292: arms, not a total) ===");
  for (const tier of ["compact", "medium", "expanded", "unsized"]) {
    const t = byTier.get(tier);
    if (!t) continue;
    console.log(
      `${tier}: ${t.arms} arms | ${t.arms - t.failed.size} with no failing check | ` +
        `${t.failed.size} with at least one | ${t.crashed} that lost a web process`,
    );
  }

  // Ruling 357: name the class, so the ruling 199 line written from this tail names it too. A
  // failure that matches no known class is printed as unclassified, which is the one worth reading.
  const classified = KNOWN_CLASSES.map((k) => [k.id, fails.filter((f) => k.test(f)).length]);
  const unclassified = fails.filter((f) => !KNOWN_CLASSES.some((k) => k.test(f))).length;
  console.log(
    `\n=== failures classified (rulings 274, 357) ===\n` +
      classified.map(([id, n]) => `${n} ${id}`).join(" | ") +
      ` | ${unclassified} unclassified`,
  );
  if (crashSightings.length)
    console.log("arms that lost a web process: " + crashSightings.map((c) => c.arm).join(", "));

  // Ruling 832, adopted narrowly. G5 is an engine defect, reported and not fixed under ruling 200,
  // and ruling 828 measured it at about one crashed arm per four to five WebKit passes across
  // seventeen sightings: a rate no branch owns and no push can move. One crashed arm therefore no
  // longer fails the job, on three conditions, all of them ruling 228's. It is reported unproven
  // rather than passing. Its checks are excluded from the passing count rather than folded into it,
  // so the count never claims the arm as green. And a second crashed arm in one job still fails,
  // because two is not the priced rate; so does any failure outside the crashed arm, which is the
  // whole point of the exemption being one arm wide rather than a class-based pass.
  // Every arm that lost a web process is unproven and comes out of the count, however many there
  // are: that part is ruling 228 and is not the exemption. What ruling 832 grants is narrower than
  // that and sits in `standDown` alone, one arm wide.
  const unproven = [...new Set(armLog.filter((a) => a.crashed).map((a) => a.arm))];
  const counted = results.filter((r) => !unproven.includes(r.arm));
  const countedFails = counted.filter((r) => !r.ok);
  const standDown = unproven.length === 1 && countedFails.length === 0;
  const declared = loadExpected() || {};

  console.log(
    `\n${counted.length - countedFails.length} of ${counted.length} checks passed` +
      (unproven.length
        ? `; ${unproven.length} arm${unproven.length > 1 ? "s" : ""} UNPROVEN and excluded from that ` +
          `count (228): ` +
          unproven
            .map((a) => `${a} (declares ${declared[a] ?? "an undeclared number of"})`)
            .join(", ")
        : ""),
  );
  fails.forEach((f) => console.log("FAIL", f.crashed ? "[CRASH]" : "[no crash]", f.name, f.detail));
  if (standDown) {
    console.log(
      "\n=== ruling 832: STOOD DOWN ON ONE CRASHED ARM. THIS IS NOT A CLEAN RUN. ===\n" +
        `${unproven[0]} lost a web process (G5, ruling 200; the rate is ruling 828's) and is UNPROVEN, never passed.\n` +
        "Every other arm in this job is green, so the job exits 0 rather than charging an engine defect to this branch.\n" +
        "A second crashed arm in one job still fails, and so does any failure outside the crashed arm.\n" +
        "Do not read this green as the arm above having run.",
    );
  }
  if (unproven.length > 1)
    console.log(
      `\n=== ruling 832 does NOT cover this run: ${unproven.length} arms lost a web process ===\n` +
        "The exemption is one arm wide, because one is the rate ruling 828 measured and two is not.",
    );
  process.exit(standDown ? 0 : fails.length || unproven.length ? 1 : 0);
}

/**
 * Ruling 344. The shell clips its root at the viewport (overflow hidden on the 100dvh column), so
 * documentElement.scrollWidth never exceeds innerWidth and the check this replaces could not fail
 * on the very tier it existed for. This one finds the element. Three measures, any of which fails:
 * the document is wider than the viewport; some rendered element's right edge lies past it; or a
 * vertical scroll container's content is wider than its box, which is the shape a clipped overflow
 * takes on the compact tier. Skipped: descendants of a designed horizontal scroller (an inline
 * overflow-x of auto or scroll, which is how every strip in Strand declares itself) and of an
 * aria-hidden ancestor (a parked affordance, a closed sheet). The detail names the offender and
 * its edges, so a failing tier says what to fix.
 */
async function measureWidth(page) {
  return page.evaluate(() => {
    const iw = window.innerWidth;
    const describe = (el) => {
      const parts = [];
      for (let e = el; e && e !== document.body && parts.length < 6; e = e.parentElement) {
        const attrs = [...e.attributes]
          .filter((a) =>
            /^(data-testid|data-scroller|data-sheet-scrim|data-fab|role|aria-label)$/.test(a.name),
          )
          .map((a) => `${a.name}=${a.value.slice(0, 24)}`)
          .join(",");
        parts.unshift(e.tagName.toLowerCase() + (attrs ? `{${attrs}}` : ""));
      }
      return parts.join(" > ");
    };
    const isStrip = (e) =>
      !!e.style && (e.style.overflowX === "auto" || e.style.overflowX === "scroll");
    const skipped = (el) => {
      for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        if (p.getAttribute("aria-hidden") === "true") return true;
        if (isStrip(p)) return true;
      }
      return false;
    };
    let widest = null;
    let panning = null;
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      if (r.right > iw + 0.5 && !skipped(el) && (!widest || r.right > widest.right))
        widest = { right: Math.round(r.right), left: Math.round(r.left), path: describe(el) };
      if (!panning && !isStrip(el) && el.scrollWidth > el.clientWidth + 1) {
        const cs = getComputedStyle(el);
        if ((cs.overflowY === "auto" || cs.overflowY === "scroll") && !skipped(el))
          panning = { sw: el.scrollWidth, cw: el.clientWidth, path: describe(el) };
      }
    }
    const docSW = document.documentElement.scrollWidth;
    const ok = docSW <= iw && !widest && !panning;
    const detail = ok
      ? ""
      : [
          docSW > iw ? `document ${docSW} wider than viewport ${iw}` : "",
          widest ? `element ends at ${widest.right} past viewport ${iw}: ${widest.path}` : "",
          panning ? `scroller pans ${panning.sw} in a ${panning.cw} box: ${panning.path}` : "",
        ]
          .filter(Boolean)
          .join(" | ");
    return { ok, iw, docSW, widest, panning, detail };
  });
}

async function noOverflow(page, label) {
  const m = await measureWidth(page);
  record(label + " no horizontal overflow", m.ok, m.detail);
}

/** Ruling 492's geometry can only be measured once the slide has finished, and a fixed sleep is a
 *  race rather than a wait. The Sheet's resting transform is `none` and its in-flight transform is
 *  an interpolated matrix, so poll for the resting value. A 500ms sleep against the 300ms slide
 *  held on Chromium and lost on WebKit, which starts the transform a frame later and runs it slower
 *  under CI load: the composer's publish row measured 189px below the viewport on a panel that was
 *  still moving. */
async function sheetSettled(page, selector) {
  await page.waitForFunction(
    (sel) => {
      const el = document.querySelector(sel);
      return !!el && getComputedStyle(el).transform === "none";
    },
    selector,
    { timeout: 10000, polling: "raf" },
  );
}

/** DIA's line is the composer's slowest signal and the one a whole arm hangs off, so when it does
 *  not arrive the arm should say which limb failed rather than time out mutely. The app's own worst
 *  case is INFER_DEBOUNCE + THINK_BUDGET; past that `infer` is aborted and the line settles at
 *  nothing permanently, so a bare timeout cannot tell "the fetch was slow" from "the text never
 *  reached React". Report what the textarea actually holds and what the line actually shows. */
async function diaSettled(page, dialog, tag) {
  try {
    await dialog.locator('[data-dia="done"]').waitFor({ timeout: 5000 });
  } catch (e) {
    const state = await page
      .evaluate(() => {
        const ta = document.querySelector('textarea[aria-label="What is going on with you"]');
        const line = document.querySelector("[data-dia]");
        return {
          textarea: ta ? ta.value : "(no textarea)",
          dia: line ? line.getAttribute("data-dia") : "(no line)",
        };
      })
      .catch(() => null);
    record(
      tag + " DIA resolved on the filled text",
      false,
      JSON.stringify(state) + " " + String(e).slice(0, 120),
    );
    throw e;
  }
}

async function shot(page, name) {
  await page.screenshot({ path: path.join(OUT, name + ".png"), fullPage: false });
}

async function signIn(page) {
  await page.goto(BASE + "/sign-in", { waitUntil: "networkidle" });
  await page.fill('input[type="email"]', "member@test.invalid");
  await page.fill('input[type="password"]', "x");
  await page.click('button[type="submit"]');
  await page.waitForURL("**/feed", { timeout: 15000 });
  await page.waitForSelector('[data-testid="compose"]');
}

async function runViewport(browserType, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}`;
  armStart(tag);
  const isTouch = w < 1024 || w === 1024;
  const browser = await launch(browserType);
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    hasTouch: isTouch,
    isMobile: w < 1024,
    deviceScaleFactor: 1,
    colorScheme: theme,
  });
  const page = await ctx.newPage();
  const db = makeMockDb();
  seedPosts(db, 3);
  await page.addInitScript(
    ({ theme }) => {
      try {
        localStorage.setItem("dna.theme", theme);
      } catch {}
    },
    { theme },
  );
  if (process.env.HIDE)
    await page.addInitScript((css) => {
      const st = document.createElement("style");
      st.textContent = css;
      document.addEventListener("DOMContentLoaded", () => document.head.appendChild(st));
    }, process.env.HIDE);
  await mockSupabase(page, db);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (
      m.type() === "error" &&
      !/fonts\.g|ERR_CONNECTION_RESET|ERR_NAME_NOT_RESOLVED|ERR_FAILED/.test(m.text())
    )
      errors.push(m.text());
  });
  try {
    await signIn(page);
    record(tag + " theme attribute", (await page.getAttribute("html", "data-theme")) === theme);
    await shot(page, `${tag}-00-feed`);
    await noOverflow(page, tag + " feed");
    if (process.env.DEBUG)
      console.log(
        "DEBUG nav:",
        JSON.stringify(
          await page.evaluate(() =>
            [...document.querySelectorAll('nav[aria-label="Pulse"]')].map((n) => ({
              h: n.style.height,
              w: n.getBoundingClientRect().width,
              sw: n.scrollWidth,
              items: [...n.children].map((c) => Math.round(c.getBoundingClientRect().width)),
              parentW: n.parentElement.getBoundingClientRect().width,
              parentSW: n.parentElement.scrollWidth,
            })),
          ),
        ),
      );
    if (process.env.DEBUG)
      console.log(
        "DEBUG wide:",
        JSON.stringify(
          await page.evaluate(() => {
            const out = { innerWidth: window.innerWidth, wide: [] };
            for (const el of document.querySelectorAll("body *")) {
              const r = el.getBoundingClientRect();
              if (r.right > 821)
                out.wide.push([
                  el.tagName,
                  Math.round(r.width),
                  Math.round(r.right),
                  (el.getAttribute("aria-label") || el.textContent || "").slice(0, 25),
                ]);
            }
            return out;
          }),
        ),
      );

    record(
      tag + " shell: one header, one Pulse nav, five slots",
      (await page.locator("[data-app-header]").count()) === 1 &&
        (await page.locator('nav[aria-label="Pulse"]').count()) === 1 &&
        (await page.locator('nav[aria-label="Pulse"] button').count()) === 5,
    );
    const navPos = await page.evaluate(
      () => getComputedStyle(document.querySelector('nav[aria-label="Pulse"]')).position,
    );
    const headBox = await page.locator("[data-app-header]").boundingBox();
    record(
      tag +
        (w > 1024
          ? " expanded: one-row header with the five Cs inline and the Home icon (rulings 99, 106)"
          : " compact/medium: bottom dock, no Home icon, logo is Home"),
      w > 1024
        ? (await page.locator('[data-app-header] nav[data-pulse="inline"]').count()) === 1 &&
            (await page.locator('[data-app-header] [data-testid="home-item"]').count()) === 1 &&
            headBox.height <= 66
        : navPos === "fixed" &&
            (await page.locator('[data-testid="home-item"]').count()) === 0 &&
            (await page.locator('[data-testid="home"]').getAttribute("href")) === "/feed",
      `nav ${navPos} header height ${headBox && headBox.height}`,
    );
    record(
      tag +
        (w > 1024
          ? " header: logo, bell, avatar; composer entry in the Feed column"
          : " header: logo Home, composer entry, bell, avatar; no theme or sign-out controls"),
      (await page.locator('[data-app-header] img[alt="DNA"]').count()) === 1 &&
        (await page.locator('[data-testid="compose"]').count()) === 1 &&
        (await page.locator('[data-testid="compose"]').textContent()).includes(
          "What is going on with you?",
        ) &&
        (await page
          .locator((w > 1024 ? "[data-feed] " : "[data-app-header] ") + '[data-testid="compose"]')
          .count()) === 1 &&
        (await page.locator('[data-app-header] [data-testid="bell"]').count()) === 1 &&
        (await page.locator('[data-app-header] [aria-label="Your profile"]').count()) === 1 &&
        (await page.locator('[data-app-header] [aria-label="Sign out"]').count()) === 0,
    );
    record(
      tag + " lens bar with five lenses, All selected",
      (await page.locator('[role="tablist"][aria-label="Lens"] [role="tab"]').count()) === 5 &&
        (await page
          .locator('[role="tablist"][aria-label="Lens"] [role="tab"][aria-selected="true"]')
          .getAttribute("data-lens")) === "all",
    );
    record(
      tag + " feed cards in feed mode: react, respond, save, share, no counts",
      (await page.locator("main article[data-c]").count()) === 3 &&
        (await page.locator('main article [data-testid="react"]').count()) === 3 &&
        (await page.locator('main article [data-testid="respond"]').count()) === 3 &&
        (await page.locator('main article [data-testid="save"]').count()) === 3 &&
        (await page.locator('main article [data-testid="share"]').count()) === 3 &&
        !/\b\d+ (likes|reactions|saves)\b/i.test(await page.locator("main").textContent()),
    );
    if (w > 1024) {
      const rails = await page.locator("[data-rail-widget]").count();
      record(
        tag + (w >= 1440 ? " three regions, both rails grounded-or-empty" : " left rail only"),
        w >= 1440 ? rails === 4 : rails === 3,
        "rail widgets " + rails,
      );
    } else {
      record(
        tag + " no rails below 1024",
        (await page.locator("[data-rail-widget]").count()) === 0,
      );
    }
    // Open from the header pill: empty state.
    await page.click('[data-testid="compose"]');
    const dialog = page.locator('section[role="dialog"][aria-label="Compose"]');
    await dialog.waitFor({ timeout: 10000 });
    await sheetSettled(page, 'section[role="dialog"][aria-label="Compose"]');
    record(tag + " composer opens from the header pill", true);
    if (process.env.DEBUG)
      console.log(
        "DEBUG wide2:",
        JSON.stringify(
          await page.evaluate(() => {
            const out = { innerWidth: window.innerWidth, wide: [] };
            for (const el of document.querySelectorAll("body *")) {
              const r = el.getBoundingClientRect();
              if (r.right > window.innerWidth + 1)
                out.wide.push([
                  el.tagName,
                  Math.round(r.width),
                  Math.round(r.right),
                  (el.getAttribute("aria-label") || el.textContent || "").slice(0, 25),
                ]);
            }
            return out;
          }),
        ),
      );
    // Rulings 400, 417, 458, 498: four chips in C order, above the text area, visible before
    // anything is typed, and no Connect chip. Connect has left the composer; making an intro is the
    // request sheet's job (401).
    record(
      tag + " four verb chips in C order above the text area, and no Connect chip",
      (await dialog
        .locator('[role="radiogroup"][aria-label="What kind of post"] [role="radio"]')
        .count()) === 4 &&
        (await dialog.locator('[role="radio"][aria-label^="Make an Intro"]').count()) === 0 &&
        (await dialog
          .locator('[role="radiogroup"][aria-label="What kind of post"] [role="radio"]')
          .first()
          .getAttribute("aria-label")) === "Host an Event (Convene)" &&
        (await dialog.evaluate(() => {
          const row = document.querySelector("[data-verb-row]");
          const ta = document.querySelector('[aria-label="What is going on with you"]');
          return (
            !!row && !!ta && !!(row.compareDocumentPosition(ta) & Node.DOCUMENT_POSITION_FOLLOWING)
          );
        })),
    );
    // Ruling 493: the chip row is one horizontal scroller at every tier, never a stack of four.
    record(
      tag + " the chip row is one horizontal scroller, never a stack",
      await dialog.evaluate(() => {
        const row = document.querySelector("[data-verb-row]");
        if (!row) return false;
        const cs = getComputedStyle(row);
        const tops = new Set(
          [...row.children].map((c) => Math.round(c.getBoundingClientRect().top)),
        );
        return cs.overflowX === "auto" && cs.flexWrap !== "wrap" && tops.size === 1;
      }),
    );
    record(
      tag + " empty: no DiaLine, no preview, publish disabled",
      (await dialog.locator("[data-dia]").count()) === 0 &&
        (await dialog.locator("article[aria-label='Preview of your post']").count()) === 0 &&
        (await dialog.getByRole("button", { name: "Publish" }).isDisabled()),
    );
    // Ruling 492, superseding ruling 106's geometry: no sheet is full screen. A bottom sheet is 80
    // percent tall on compact; a side sheet is 40 percent wide on medium and expanded, and the
    // composer alone takes 50 percent for its stacked preview.
    const box = await dialog.boundingBox();
    record(
      tag + (w >= 640 ? " composer: 50% side sheet" : " compact: 80% bottom sheet"),
      w >= 640
        ? Math.abs(box.width - 0.5 * w) < 2 && Math.abs(box.x + box.width - w) < 2
        : Math.abs(box.width - w) < 2 && Math.abs(box.height - 0.8 * h) < 2,
      `box ${JSON.stringify(box)}`,
    );
    const pub = dialog.getByRole("button", { name: "Publish" });
    const pb = await pub.boundingBox();
    const geo = await page.evaluate(() => {
      const s = document.querySelector('section[role="dialog"][aria-label="Compose"]');
      const r = s.getBoundingClientRect();
      const scrim = s.parentElement.getBoundingClientRect();
      return {
        innerHeight: window.innerHeight,
        innerWidth: window.innerWidth,
        sectionBottom: r.bottom,
        sectionTop: r.top,
        scrimBottom: scrim.bottom,
        vv: window.visualViewport && window.visualViewport.height,
      };
    });
    record(
      tag + " publish within viewport",
      pb && pb.y + pb.height <= geo.innerHeight + 1,
      JSON.stringify({ pb, geo }),
    );
    await shot(page, `${tag}-01-empty`);
    await noOverflow(page, tag + " empty");

    // Thinking then proposed (Contribute sample: a verb whose fields VERB_SCHEMA still carries, so
    // DIA's tags have labels to sit on. Convene's fields are its own form's from Pass 1, and the
    // publish arm below drives that verb.)
    const ta = dialog.locator('textarea[aria-label="What is going on with you"]');
    await ta.fill(SAMPLES.contribute);
    await dialog.locator('[data-dia="thinking"]').waitFor({ timeout: 3000 });
    record(tag + " thinking state after 700ms debounce", true);
    await shot(page, `${tag}-02-thinking`);
    await dialog.locator('[data-dia="done"]').waitFor({ timeout: 5000 });
    // Rulings 635, 667, 668 (Convene Pass 1 rebind): DIA proposes and selects nothing. The DiaLine
    // carries the read, the proposed verb's fields mount with DIA's fills tagged, no chip carries
    // aria-checked from the read alone, and Publish stays off until the member taps a chip.
    record(
      tag + " proposed: DIA line, no chip checked by the read, Publish off (667, 668)",
      (await dialog
        .locator(
          '[role="radiogroup"][aria-label="What kind of post"] [role="radio"][aria-checked="true"]',
        )
        .count()) === 0 &&
        (await dialog.locator('[data-dia="done"]').textContent()).includes(
          "DIA read this as a Need.",
        ) &&
        (await pub.isDisabled()),
    );
    record(
      tag + " proposed: DIA tags on filled fields",
      (await dialog.locator("label", { hasText: "DIA" }).count()) >= 3,
    );
    const preview = dialog.locator("article[aria-label='Preview of your post']");
    record(
      tag + " proposed: preview card assembled as contribute",
      (await preview.getAttribute("data-c")) === "contribute" &&
        (await preview.textContent()).includes("Volunteer accountant"),
    );
    await shot(page, `${tag}-03-populated`);
    await noOverflow(page, tag + " populated");

    // Member edits a DIA field: tag disappears; re-inference must not overwrite it.
    const titleInput = dialog.locator("label", { hasText: "Title" }).locator("..").locator("input");
    await titleInput.fill("Accountant for the cooperative books");
    record(
      tag + " member edit removes DIA tag on that field",
      (await dialog
        .locator("label", { hasText: "Title" })
        .locator("span", { hasText: "DIA" })
        .count()) === 0,
    );
    record(
      tag + " member-written field shows in the preview title",
      (await preview.locator("h3").textContent()).includes("Accountant for the cooperative books"),
    );

    // Not this? clears the proposal and DIA's fields, keeps member ones, returns to untyped Convey.
    await dialog.getByRole("button", { name: "Not this?" }).click();
    record(
      tag + " Not this? -> untyped convey, no DiaLine",
      (await dialog.locator("[data-dia]").count()) === 0 &&
        (await preview.getAttribute("data-c")) === "convey" &&
        (await preview.locator("h3").count()) === 0,
    );
    record(
      tag + " publish enabled with content once nothing is proposed",
      !(await pub.isDisabled()),
    );
    // Previews via the four chips (rulings 400, 417): four, not five. Connect left the composer
    // with the Intro verb.
    for (const v of ["convene", "collaborate", "contribute", "convey"]) {
      if (!FULL_PREVIEW_AT.has(w) && v !== "contribute") continue;
      await ta.fill(SAMPLES[v]);
      const act = {
        convene: "Host an Event",
        collaborate: "Start a Space",
        contribute: "Post a Need",
        convey: "Share a Story",
      }[v];
      await dialog.locator(`[role="radio"][aria-label^="${act}"]`).click();
      record(
        tag + ` chip override -> ${v} preview, no DiaLine`,
        (await preview.getAttribute("data-c")) === v &&
          (await dialog.locator("[data-dia]").count()) === 0,
      );
      await page.waitForTimeout(150);
      await shot(page, `${tag}-04-preview-${v}`);
      await noOverflow(page, tag + " preview " + v);
    }
    await dialog.locator('[role="radio"][aria-label^="Post a Need"]').click();
    // Audience pills.
    await dialog
      .locator('[role="radiogroup"][aria-label="Who sees this"] [role="radio"]', {
        hasText: "My connections",
      })
      .click();
    record(
      tag + " audience pill -> preview meta",
      (await preview.textContent()).includes("My connections"),
    );
    // Close keeps draft (Esc), reopen restores.
    await page.keyboard.press("Escape");
    await page.waitForSelector('section[role="dialog"][aria-label="Compose"]', {
      state: "detached",
    });
    record(tag + " Esc closes; draft persisted server-side", db.drafts.size === 1);
    await page.keyboard.press("c");
    await dialog.waitFor({ timeout: 10000 });
    if (process.env.DEBUG)
      console.log(
        "DEBUG restore:",
        JSON.stringify({
          value: (await ta.inputValue()).slice(0, 40),
          drafted: await dialog.getByText("Draft saved").count(),
          drafts: [...db.drafts.entries()].map(([k, v]) => [
            k,
            typeof v,
            v && v.text && v.text.slice(0, 30),
          ]),
          log: db.log,
        }),
      );
    // Ruling 497: the composer opens empty and offers "Continue your draft" with a discard. The
    // draft itself, the autosave and the "Draft saved" trace are unchanged; what changed is that a
    // half-finished draft no longer arrives unasked.
    record(
      tag + " c keypress opens the composer empty, with the draft offered",
      (await ta.inputValue()) === "" &&
        (await dialog.locator('[data-testid="continue-draft"]').count()) === 1 &&
        (await dialog.locator('[data-testid="discard-draft"]').count()) === 1,
    );
    await dialog.locator('[data-testid="continue-draft"]').click();
    // G34: this waited a fixed 300 ms and read the pre-restore state whenever WebKit took longer,
    // which is four sightings across four heads and four widths, none with a defect behind it. The
    // wait is now on the two signals the restore itself produces, so it cannot resolve early; the
    // assertions and the arm's declared count are unchanged.
    await dialog
      .locator('[data-testid="continue-draft"]')
      .waitFor({ state: "detached", timeout: 10000 });
    await ta.evaluate(
      (el) =>
        new Promise((resolve, reject) => {
          const done = () => /^(Three intros|We need a volunteer)/.test(el.value);
          if (done()) return resolve();
          const t = setInterval(() => {
            if (!done()) return;
            clearInterval(t);
            clearTimeout(bail);
            resolve();
          }, 50);
          const bail = setTimeout(() => {
            clearInterval(t);
            reject(new Error("the draft's words never reached the textarea"));
          }, 10000);
        }),
    );
    record(
      tag + " Continue your draft restores it, and Draft saved is still the only trace",
      /^(Three intros|We need a volunteer)/.test(await ta.inputValue()) &&
        (await dialog.locator('[data-testid="continue-draft"]').count()) === 0 &&
        (await dialog.getByText("Draft saved").count()) === 1,
    );
    await page.keyboard.press("Escape");
    await page.waitForSelector('section[role="dialog"][aria-label="Compose"]', {
      state: "detached",
    });
    // Empty-state action opens the same composer (Mine lens has no posts by this member? it has; use a member-less lens).
    db.posts.length = 0;
    await page.click('[role="tablist"][aria-label="Lens"] [data-lens="mine"]');
    await page.waitForURL("**/feed?lens=mine");
    await page.locator('[data-testid="feed-empty"][data-lens="mine"]').waitFor({ timeout: 10000 });
    await shot(page, `${tag}-05-empty-mine`);
    await page.locator('[data-testid="feed-empty"] button', { hasText: "Share a Story" }).click();
    await dialog.waitFor({ timeout: 10000 });
    record(tag + " empty-state action opens the composer", true);
    await page.keyboard.press("Escape");
    await page.waitForSelector('section[role="dialog"][aria-label="Compose"]', {
      state: "detached",
    });
    db.drafts.clear();
  } catch (e) {
    record(tag + " flow", false, String(e).slice(0, 300));
    await shot(page, `${tag}-ERROR`).catch(() => {});
  }
  record(
    tag + " no page errors",
    errors.length === 0,
    errors.slice(0, 3).join(" | ").slice(0, 300),
  );
  await browser.close();
}

// Convene Pass 1 (P1-SPEC section 6, the composer and the card). One arm per tier and theme it is
// declared for: the form on Strand's Composer (664 to 673), place resolution in its three states
// (PR 2's mock), the moment parsed and windowed (520, 634), the door by format (521, 621), publish
// in flight and failed (665, 666), the published card and a seeded cancelled card (SPEC 2).
function seedEvent(db, kind) {
  const id = "seed-event-" + kind;
  const oid = "e-" + kind;
  const past = kind === "past";
  const starts = new Date(Date.now() + (past ? -3 : 20) * 86400e3);
  starts.setUTCHours(19, 0, 0, 0);
  db.posts.unshift({
    id,
    author_kind: "member",
    author_id: "00000000-0000-4000-8000-0000000000f2",
    created_by: "00000000-0000-4000-8000-0000000000f2",
    author_name: "Kwame Mensah",
    author_handle: "kwame-mensah",
    author_avatar_path: null,
    c_category: "convene",
    body: "A long table for members in the Accra to Los Angeles agriculture corridor. Growers, buyers, cold chain people and the ones financing them. One conversation, no panel.",
    anchor_kind: null,
    anchor_id: null,
    created_object_kind: "event",
    created_object_id: oid,
    audience: "everyone",
    status: "published",
    published_at: new Date(Date.now() - 7200e3).toISOString(),
    created_at: new Date(Date.now() - 7200e3).toISOString(),
  });
  db.events.push({
    id: oid,
    host_member_id: "00000000-0000-4000-8000-0000000000f2",
    title: "Corridor Suppers: Accra",
    starts_at: starts.toISOString(),
    ends_at: null,
    doors_at: null,
    when_text: "15 October at 19:00",
    mode: "in_person",
    ticket_kind: "free",
    space_id: "s1",
    status: kind === "cancelled" ? "cancelled" : "published",
    timezone: "Africa/Accra",
    time_confirmed: true,
    date_confirmed: true,
    expected_window_start: null,
    expected_window_end: null,
    window_basis: null,
    delivery_intent: "In person at Front Room, Accra.",
    cancelled_at: kind === "cancelled" ? new Date(Date.now() - 3600e3).toISOString() : null,
    cancelled_reason:
      kind === "cancelled"
        ? "The market association moved its own event onto our evening and the supper would have been in the way. We will find another Thursday."
        : null,
    attachments: [],
    created_at: new Date().toISOString(),
  });
  db.event_delivery.push({
    id: "d-" + kind,
    event_id: oid,
    kind: "physical",
    position: 0,
    place_id: "dXJuOm1ieHBvaTpmcm9udC1yb29t",
    place_name: "Front Room",
    place_text: null,
    city: "Accra",
    country: "Ghana",
  });
  db.event_delivery.push({
    id: "d-" + kind + "-link",
    event_id: oid,
    kind: "meeting_link",
    position: 1,
    url: "https://meet.example/" + kind,
  });
  db.post_media.push({
    id: "m-" + kind,
    post_id: id,
    storage_path: "seed/" + kind + ".jpg",
    width: 1200,
    height: 800,
    position: 0,
  });
  return id;
}

async function runConvene(browserType, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-convene`;
  armStart(tag);
  const browser = await launch(browserType);
  const touch = w < 1024;
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    hasTouch: touch,
    isMobile: touch,
    colorScheme: theme,
  });
  const page = await ctx.newPage();
  // P4-SPEC section 5's two input-mode states. `src/lib/tier.ts`'s `useMode` reads exactly this
  // query, so asking the page for it proves the mapping — the words follow the input mode — rather
  // than proving that a given engine's mobile emulation flips the query, which is not this suite's
  // subject and differs between Chromium and WebKit.
  const coarse = await page.evaluate(() => matchMedia("(pointer: coarse)").matches);
  const db = makeMockDb();
  seedPosts(db, 2);
  const cancelledId = seedEvent(db, "cancelled");
  await page.addInitScript(
    ({ theme }) => {
      try {
        localStorage.setItem("dna.theme", theme);
      } catch {}
    },
    { theme },
  );
  await mockSupabase(page, db);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const dialog = page.locator('section[role="dialog"][aria-label="Compose"]');
  const pub = () => dialog.getByRole("button", { name: /^Publish/ });
  const fmt = (label) =>
    dialog.locator('[role="radiogroup"][aria-label="Format"] [role="radio"]', { hasText: label });
  const field = (key) => dialog.locator(`input[data-convene="${key}"]`);
  try {
    await signIn(page);

    // The seeded cancelled card, before anything is composed (SPEC 2: the full treatment).
    const cancelled = page.locator(`[data-post-id="${cancelledId}"] article`);
    await cancelled.waitFor({ timeout: 10000 });
    const cText = await cancelled.textContent();
    record(
      tag + " cancelled card: kicker Event cancelled, struck title, past-tense meta, the reason",
      cText.includes("Event cancelled") &&
        (await cancelled.locator("[data-cancelled-title]").count()) === 1 &&
        // 898 on the cancelled card: the stored instant reads through `localLine`, so the zone
        // is the event's own identifier and never an abbreviation. The year term is optional
        // because 835 renders it only outside the year being read in, and the seed is 20 days out.
        /Was set for \w{3} \d{1,2} \w{3}(?: \d{4})?, \d{2}:\d{2} Africa\/Accra/.test(cText) &&
        cText.includes("This event will not happen.") &&
        cText.includes("The host wrote:") &&
        cText.includes("told by email"),
      cText.slice(0, 200),
    );
    record(
      tag + " cancelled card: no img, no hook rows, no Read more, four icon actions, no RSVP",
      (await cancelled.locator("img").count()) === 0 &&
        (await cancelled.locator("[data-hook]").count()) === 0 &&
        (await cancelled.locator("[data-read-more]").count()) === 0 &&
        (await cancelled.locator("footer [data-testid]").count()) === 4 &&
        !cText.includes("Get a ticket") &&
        (await cancelled.locator('[data-testid="respond"]').getAttribute("aria-label")) ===
          "Ask the host",
    );
    await shot(page, `${tag}-00-cancelled`);

    // Step 1 and 2: the words, the proposal, nothing selected (635, 667, 668).
    await page.click('[data-testid="compose"]');
    await dialog.waitFor();
    await sheetSettled(page, 'section[role="dialog"][aria-label="Compose"]');
    const ta = dialog.locator('textarea[aria-label="What is going on with you"]');
    await ta.fill(SAMPLES.convene);
    await diaSettled(page, dialog, tag);
    const proposedFields = (db.rpcPayloads[0] && db.rpcPayloads[0].dia) || null;
    record(
      tag +
        " proposal: no chip carries aria-checked from the read, Publish off, form mounted with DIA's tags",
      (await dialog
        .locator(
          '[role="radiogroup"][aria-label="What kind of post"] [role="radio"][aria-checked="true"]',
        )
        .count()) === 0 &&
        (await pub().isDisabled()) &&
        (await dialog.locator("[data-convene-form]").count()) === 1 &&
        (await dialog.locator("label", { hasText: "DIA" }).count()) >= 3,
      String(proposedFields),
    );
    record(
      tag + " the door renders no place or link control before a format is chosen (621)",
      (await dialog
        .locator('[data-convene="place-block"], [data-convene="link-block"]')
        .count()) === 0 && (await fmt("In person").count()) === 1,
    );
    // Written as `A === false || !B` it could not fail once `GMT` renders nowhere, which is a
    // check that proves nothing (485, 539). Read positively instead: the label carries the moment
    // and nothing follows the time, neither an abbreviation nor an identifier.
    const preFormatMeta = await dialog
      .locator("article[aria-label='Preview of your post']")
      .textContent();
    record(
      tag + " preview meta carries no time zone before a format is chosen (671)",
      preFormatMeta.includes("Presented by Amara Osei · Fri 16 Oct, 19:00") &&
        !/Fri 16 Oct, 19:00 [A-Za-z]/.test(preFormatMeta),
      preFormatMeta.slice(0, 160),
    );
    await shot(page, `${tag}-01-proposal`);
    await noOverflow(page, tag + " proposal");

    // Accept (668): the tap keeps DIA's fills; the form still gates Publish (664).
    await dialog.locator('[role="radio"][aria-label^="Host an Event"]').click();
    record(
      tag + " tap accepts the proposal and keeps DIA's fills; Publish still gated by the form",
      (await dialog
        .locator('[role="radio"][aria-label^="Host an Event"][aria-checked="true"]')
        .count()) === 1 &&
        (await field("title").inputValue()) === "Diaspora Builders Dinner" &&
        (await field("when").inputValue()) === "Thu 16 Oct at 19:00" &&
        (await field("doors").inputValue()) === "18:30" &&
        (await pub().isDisabled()),
    );

    // The door: In person. Session 24 (783, 786, 796, 797): Country is the first control of the
    // place block and reads the vocabulary; nothing is selected on a fresh form, the member's
    // stated country (South Africa in the fixture) is listed first; Place is not in the DOM until
    // a country is chosen; no lookup runs; DIA's venue words wait in the store.
    await fmt("In person").click();
    await page.waitForTimeout(150);
    const countrySelect = dialog.locator('select[data-convene="country"]');
    const options = await countrySelect.locator("option").allTextContents();
    record(
      tag +
        " in person, no country: Choose a country with nothing selected, the stated country first, no Place in the DOM, no lookup, Publish off (786, 783)",
      (await countrySelect.count()) === 1 &&
        (await countrySelect.inputValue()) === "" &&
        options[0] === "Choose a country" &&
        options[1] === "South Africa" &&
        options.length === 1 + VOCAB.world.length &&
        (await field("place_query").count()) === 0 &&
        db.placeCalls.length === 0 &&
        (await dialog.locator('[data-convene="intent"]').count()) === 0 &&
        // P4-SPEC section 8: 821's gate has been in force since `e3392e5`, but the surface only
        // disabled Publish and left the reason to be inferred. The door now says which.
        (await dialog.locator('[data-convene="door-line"]').textContent()) ===
          "Choose the country first." &&
        (await pub().isDisabled()),
      JSON.stringify(options).slice(0, 120) + " calls " + db.placeCalls.length,
    );
    await shot(page, `${tag}-02-no-country`);

    // The wrong country as a visible state (798): United States chosen, DIA's Front Room finds
    // nothing there, and the hint names what was searched; the words stand. Since ruling 821 the
    // door also waits on a zone here, because the United States carries more than one and nothing
    // may be guessed for the host: the check asserts the gate, then opens it the way a host would.
    // The zone behaviour itself is the -convene-zone arm's, which drives it from a Pacific browser.
    await countrySelect.selectOption("United States");
    await dialog
      .getByText(
        "The map has no venue records in United States. Your words are kept, and you can place the pin yourself.",
      )
      .waitFor({ timeout: 5000 });
    const usCall = db.placeCalls[db.placeCalls.length - 1];
    record(
      tag +
        " wrong country: Front Room in United States finds nothing, the hint names United States, words stand, publishable (798)",
      (await field("place_query").inputValue()) === "Front Room" &&
        (await field("place_query").getAttribute("placeholder")) === "A venue or an area" &&
        !!usCall &&
        usCall.country_name === "United States" &&
        usCall.proximity == null &&
        (await dialog.locator('[data-convene="place-resolved"]').count()) === 0 &&
        (await dialog.locator('[data-convene="intent"]').textContent()) ===
          "In person at Front Room, United States." &&
        (await pub().isDisabled()) &&
        // P4-SPEC section 8, the other gate: the United States carries more than one zone and
        // nothing may be guessed, so the door says what it is waiting on.
        (await dialog.locator('[data-convene="door-line"]').textContent()) ===
          "Choose the time zone first." &&
        (await dialog.locator('select[data-convene="country-tz"]').count()) === 1,
      JSON.stringify(usCall && [usCall.q, usCall.country_name, usCall.proximity]),
    );
    await dialog
      .locator('select[data-convene="country-tz"]')
      .selectOption("America/New_York", { timeout: 5000 });
    // G34's seventh sighting: the sixth's twin, in the arm the fix did not reach. `selectOption`'s
    // `{ timeout: 5000 }` bounds how long it waits for the control, not how long React takes to
    // re-render the line and re-evaluate the door, so the two signals below were read on the next
    // tick with no wait at all. Seen red at `webkit-1280x800-dark-convene` on run 265, on a
    // doc-and-comment-only head that reaches no surface. The wait is the sixth sighting's, moved:
    // the same in-page poll on the same two signals, its own bail and its own sentence. The
    // assertion and the arm's declared count are unchanged (ruling 292).
    await dialog.evaluate(
      (root) =>
        new Promise((resolve, reject) => {
          const want = "Time zone America/New_York, from the country.";
          const done = () => {
            const line = root.querySelector('[data-convene="country-tz-line"]');
            const publish = [...root.querySelectorAll("button")].find((b) =>
              /^Publish/.test(b.textContent || ""),
            );
            return !!line && line.textContent === want && !!publish && !publish.disabled;
          };
          if (done()) return resolve();
          const t = setInterval(() => {
            if (!done()) return;
            clearInterval(t);
            clearTimeout(bail);
            resolve();
          }, 50);
          const bail = setTimeout(() => {
            clearInterval(t);
            reject(new Error("the zone line and the door never settled on the chosen zone"));
          }, 10000);
        }),
    );
    record(
      tag + " and the zone the host chooses opens the door and reads from the country (821)",
      (await dialog.locator('[data-convene="country-tz-line"]').textContent()) ===
        "Time zone America/New_York, from the country." && !(await pub().isDisabled()),
    );
    await shot(page, `${tag}-02-wrong-country`);

    // Ghana chosen: the same words resolve inside Ghana with the zone from the place; the row
    // carries the country in the quiet ink and replaces both controls (800).
    await countrySelect.selectOption("Ghana");
    await dialog.locator('[data-convene="place-resolved"]').waitFor({ timeout: 5000 });
    const resolved = await dialog.locator('[data-convene="place-resolved"]').textContent();
    const anchored = db.placeCalls[db.placeCalls.length - 1];
    record(
      tag +
        " Ghana chosen: the venue resolves inside Ghana, the row reads the place then Ghana, zone from the place, the country control not rendered",
      resolved.includes("Front Room, Osu, Accra") &&
        resolved.includes(", Ghana") &&
        resolved.includes("Time zone Africa/Accra, from the place.") &&
        (await dialog
          .locator('[data-convene="place-resolved"]')
          .getAttribute("data-place-kind")) === "venue" &&
        (await countrySelect.count()) === 0 &&
        // P4-SPEC sections 1 and 2 in one read: the read-back names no zone, the sentence
        // beneath it does and names where it came from, and `, the time at the place` is gone
        // along with the string G40 was opened about.
        (await dialog.locator('[data-convene="when-line"]').textContent()) ===
          "Fri 16 Oct, 19:00. Time zone Africa/Accra, from the place." &&
        (await dialog.locator('[data-convene="intent"]').textContent()) ===
          "In person at Front Room, Osu, Accra." &&
        // P4-SPEC section 6, the fourth reading: a point the host did not place reads as the
        // map's, in the ink treatment and never in the copper ring, and the door returns to its
        // resting line.
        (await dialog.locator('[data-convene="pin-chip"]').textContent()) ===
          "From the map's records" &&
        (await dialog.locator('[data-convene="pin-chip"]').getAttribute("data-pin-source")) ===
          "map" &&
        (await dialog.locator('[data-convene="plate-grid"] [data-pin-kind="map"]').count()) === 1 &&
        (await dialog.locator('[data-convene="plate-grid"] [data-pin-kind="host"]').count()) ===
          0 &&
        (await dialog.locator('[data-convene="pin-instruction"]').textContent()) ===
          "This point is the map's. If it is not your venue, place your own." &&
        (await dialog.locator('[data-convene="pin-act"]').textContent()) === "Place it yourself" &&
        (await dialog.locator('[data-convene="door-line"]').textContent()) ===
          "Posting publishes this event. It goes to the Feed and to Convene." &&
        !!anchored &&
        anchored.country_name === "Ghana" &&
        anchored.proximity == null,
      resolved.slice(0, 160) + " " + JSON.stringify(anchored && anchored.country_name),
    );
    const previewText = await dialog
      .locator("article[aria-label='Preview of your post']")
      .textContent();
    record(
      tag + " preview reads convene.title and convene.meta with the fixed footer (671)",
      previewText.includes("Diaspora Builders Dinner") &&
        previewText.includes(
          "Presented by Amara Osei · Fri 16 Oct, 19:00 Africa/Accra · Front Room, Osu, Accra",
        ) &&
        !previewText.includes("Get a ticket") &&
        !(await pub().isDisabled()),
      previewText.slice(0, 200),
    );
    await shot(page, `${tag}-02-in-person`);
    await noOverflow(page, tag + " in person");

    // Change (785, Session 23 change 4): both controls return, the country still selected and the
    // words in place, and nothing is looked up again until the text changes.
    const callsBeforeChange = db.placeCalls.length;
    await dialog.getByRole("button", { name: "Change" }).click();
    await page.waitForTimeout(700);
    record(
      tag +
        " Change reopens both controls with Ghana still selected and the words in place, and does not re-resolve them (785)",
      (await dialog.locator('[data-convene="place-resolved"]').count()) === 0 &&
        (await countrySelect.inputValue()) === "Ghana" &&
        (await field("place_query").inputValue()) === "Front Room" &&
        db.placeCalls.length === callsBeforeChange &&
        (await dialog.getByText(/^The map has no venue records in/).count()) === 0,
      "calls " + callsBeforeChange + " -> " + db.placeCalls.length,
    );

    // A home chip (633, 690, Session 24): with the words cleared the chips render; a tap sets the
    // country and the city words together, and the lookup runs inside that country narrowed to
    // the home's point.
    await field("place_query").fill("");
    await page.waitForTimeout(150);
    record(
      tag + " empty place: Near one of your homes with the member's homes as chips (633, 690)",
      (await dialog.locator('[data-convene="homes"]').count()) === 1 &&
        (await dialog.locator('[data-convene="homes"] button', { hasText: "Accra" }).count()) ===
          1 &&
        (await dialog.locator('[data-convene="homes"] button', { hasText: "Nairobi" }).count()) ===
          1,
    );
    await dialog.locator('[data-convene="homes"] button', { hasText: "Nairobi" }).click();
    await dialog
      .getByText(
        "The map has no venue records in Kenya. Your words are kept, and you can place the pin yourself.",
      )
      .waitFor({ timeout: 5000 });
    const homeCall = db.placeCalls[db.placeCalls.length - 1];
    record(
      tag +
        " a home chip sets the country and the city words together and narrows inside that country (633, Session 24)",
      (await countrySelect.inputValue()) === "Kenya" &&
        (await field("place_query").inputValue()) === "Nairobi" &&
        !!homeCall &&
        homeCall.country_name === "Kenya" &&
        !!homeCall.proximity &&
        Math.round(homeCall.proximity.lng) === 37 &&
        (await dialog.locator('[data-convene="homes"]').count()) === 0,
      JSON.stringify(homeCall && [homeCall.q, homeCall.country_name, homeCall.proximity]),
    );

    // The country filters: Alliance in Kenya is one place, the Nairobi one, and it resolves.
    await field("place_query").fill("Alliance");
    await dialog.locator('[data-convene="place-resolved"]').waitFor({ timeout: 5000 });
    record(
      tag + " the country filters: Alliance in Kenya is one place, the Nairobi one (783)",
      (await dialog.locator('[data-convene="place-resolved"]').textContent()).includes(
        "Alliance Française Nairobi, Loresho, Nairobi, Kenya",
      ),
    );

    // Changing the country from the open state clears any resolution and keeps the words: after
    // Change, Ghana chosen with Alliance still in the field finds two places, the home no longer
    // narrows, and nothing is chosen for the member.
    await dialog.getByRole("button", { name: "Change" }).click();
    await countrySelect.selectOption("Ghana");
    await dialog.getByRole("listbox", { name: "Places that match" }).waitFor({ timeout: 5000 });
    const last = db.placeCalls[db.placeCalls.length - 1];
    record(
      tag +
        " changing the country keeps the words and re-runs the lookup inside the new country: several, nothing chosen, the home no longer narrows",
      (await field("place_query").inputValue()) === "Alliance" &&
        (await dialog
          .getByText("Several places match. Pick one, or leave it as you wrote it.")
          .count()) === 1 &&
        (await dialog
          .getByRole("listbox", { name: "Places that match" })
          .getByRole("option")
          .count()) === 2 &&
        (await dialog.locator('[data-convene="place-resolved"]').count()) === 0 &&
        // P4-SPEC section 5, `Map shown, pin unplaced`: the plate is up, no point stands behind
        // it, and this is one of the two states where input mode changes the words.
        (await dialog.locator('[data-convene="pin-instruction"]').textContent()) ===
          (coarse
            ? "Press the map where the venue is, then drag to adjust."
            : "Click the map where the venue is, or drag the pin.") &&
        !!last &&
        last.country_name === "Ghana" &&
        last.proximity == null &&
        !(await pub().isDisabled()),
      JSON.stringify(last && [last.q, last.country_name, last.proximity]),
    );
    await dialog
      .getByRole("listbox", { name: "Places that match" })
      .getByRole("option")
      .first()
      .click();
    await dialog.locator('[data-convene="place-resolved"]').waitFor({ timeout: 5000 });
    record(
      tag + " picking one of several retrieves it and settles the row",
      (await dialog.locator('[data-convene="place-resolved"]').textContent()).includes(
        "Alliance Française Accra, Airport Residential, Accra, Ghana",
      ),
    );

    // Session 23, change 2: an area. The words stand beside the resolved area, the country after
    // it (784, 800), the zone comes from the area's point, and the payload carries the words in
    // place_text with no place_id.
    await dialog.getByRole("button", { name: "Change" }).click();
    await field("place_query").fill("Labadi beach");
    await dialog
      .locator('[data-convene="place-resolved"][data-place-kind="area"]')
      .waitFor({ timeout: 5000 });
    const areaRow = await dialog.locator('[data-convene="place-resolved"]').textContent();
    record(
      tag +
        " an area resolves with the words beside it and the country after, zone from the area, publishable (784, 800)",
      areaRow.includes("Labadi beach") &&
        areaRow.includes(", Osu, Accra, Ghana") &&
        areaRow.includes("Time zone Africa/Accra, from the place.") &&
        (await dialog.locator('[data-convene="intent"]').textContent()) ===
          "In person at Labadi beach, Osu, Accra." &&
        !(await pub().isDisabled()),
      areaRow.slice(0, 160),
    );
    await shot(page, `${tag}-03a-place-area`);

    // Ruling 807: one dedupe for the row, the intent line and the card's where line. This area's
    // place_name and area are the same string, so a join that does not dedupe prints it twice.
    await dialog.getByRole("button", { name: "Change" }).click();
    await field("place_query").fill("The villas");
    await dialog
      .locator('[data-convene="place-resolved"][data-place-kind="area"]')
      .waitFor({ timeout: 5000 });
    // The row, not the block: 898 put an identifier under it that contains a place name
    // (`Africa/Accra`), and 807 is about the parts of the place line rendering once each.
    const dupRow = (await dialog.locator('[data-convene="place-row"]').textContent()) || "";
    const dupIntent = (await dialog.locator('[data-convene="intent"]').textContent()) || "";
    const twice = (s, part) => s.split(part).length - 1;
    record(
      tag +
        " a place whose place_name equals its area renders each part once, row and intent alike (807)",
      dupRow.includes("The villas, Labadi Villas, Accra, Ghana") &&
        twice(dupRow, "Labadi Villas") === 1 &&
        twice(dupRow, "Accra") === 1 &&
        dupIntent === "In person at The villas, Labadi Villas, Accra." &&
        !(await pub().isDisabled()),
      dupRow.slice(0, 160) + " | " + dupIntent,
    );

    // None: the words stand in place_text, the hint names the country searched, the intent and
    // the card compose the country at read (798, 799), and the event is still publishable.
    await dialog.getByRole("button", { name: "Change" }).click();
    await field("place_query").fill("Kwame's rooftop");
    await dialog
      .getByText(
        "The map has no venue records in Ghana. Your words are kept, and you can place the pin yourself.",
      )
      .waitFor({ timeout: 5000 });
    record(
      tag +
        " none: the hint names Ghana, the words stand in place_text, the intent composes the country, publishable (798, 799)",
      !(await pub().isDisabled()) &&
        (await dialog.locator('[data-convene="intent"]').textContent()) ===
          "In person at Kwame's rooftop, Ghana.",
    );
    record(
      tag +
        " a request never carries the member's residence; every lookup carried a chosen country (783)",
      db.placeCalls.length > 0 &&
        // A retrieve resolves a chosen row by its id and carries no anchor; every suggest does.
        db.placeCalls.every(
          (c) =>
            c.action === "retrieve" ||
            (!!c.country_name && c.country_name !== "South Africa" && !("residence" in c)),
        ),
      JSON.stringify([...new Set(db.placeCalls.map((c) => c.country_name))]),
    );
    await shot(page, `${tag}-03-place-none`);

    // ---- Convene Pass 4 (P4-SPEC sections 3 to 7) ----------------------------------------------
    // The nothing-found state is where the place section is at its fullest, and it is also the
    // only state in which the info control has grounds. P4-SPEC section 3 draws the control in
    // `Country chosen, place empty` and says the panel's claim renders only where it is true;
    // nothing in this tree knows which countries the map holds venues for, so the surface waits
    // until this country has answered with nothing, which is the map's own zero and the only true
    // thing it can say. Clearing the field then puts the form in the drawn state, grounded.
    await field("place_query").fill("");
    await dialog.locator('[data-convene="venue-info"]').waitFor({ timeout: 5000 });
    await dialog.locator('[data-convene="venue-info"]').click();
    await dialog.locator('[data-convene="venue-info-panel"]').waitFor({ timeout: 5000 });
    const venuePanel =
      (await dialog.locator('[data-convene="venue-info-panel"]').textContent()) || "";
    record(
      tag +
        " Pass 4: `Why is my venue not here?` opens a Sheet carrying the three ratified lines, and no plate stands behind it (814, 901)",
      (await dialog.locator('[data-convene="venue-info"]').textContent()) ===
        "Why is my venue not here?" &&
        venuePanel.includes("Venues in Ghana") &&
        venuePanel.includes(
          "The map holds no venue records for Ghana, so searching will not find your venue. This is the map\u2019s gap, not a mistake in what you typed.",
        ) &&
        venuePanel.includes(
          "Type the venue as you say it, then place the pin where it is. Both travel with the event.",
        ) &&
        (await dialog.locator('[data-convene="map-plate"]').count()) === 0,
      venuePanel.slice(0, 200),
    );
    // Escape on the topmost `dialog` fires `cancel`, which the Sheet turns into a close. This is
    // the one place in the suite where two modal dialogs are open at once, and no engine's handling
    // of that has been exercised here before, so a second press backs the first up. The assertion
    // above is unchanged and the arm's declared count with it; if one press is enough, as it is on
    // Chromium, the catch never runs.
    await page.keyboard.press("Escape");
    await dialog
      .locator('[data-convene="venue-info-panel"]')
      .waitFor({ state: "detached", timeout: 5000 })
      .catch(async () => {
        await page.keyboard.press("Escape");
        await dialog
          .locator('[data-convene="venue-info-panel"]')
          .waitFor({ state: "detached", timeout: 5000 });
      });

    // The plate, unplaced. It is a drawn plate and says so in its own words; it renders no tile and
    // no invented geography, so there is nothing on it to read as a street (P4-SPEC guardrail 3).
    await field("place_query").fill("Kwame's rooftop");
    await dialog
      .getByText(
        "The map has no venue records in Ghana. Your words are kept, and you can place the pin yourself.",
      )
      .waitFor({ timeout: 5000 });
    await dialog.locator('[data-convene="map-plate"]').waitFor({ timeout: 5000 });
    record(
      tag +
        " Pass 4: the plate is drawn and unplaced, its own line says where tiles come from, and the act is Place the pin (790, 792)",
      (await dialog.locator('[data-convene="map-plate"]').getAttribute("data-pin-state")) ===
        "unplaced" &&
        (await dialog.locator('[data-convene="plate-line"]').textContent()) ===
          "No point yet. Map tiles come from the provider in the built surface." &&
        (await dialog.locator('[data-convene="pin-instruction"]').textContent()) ===
          "The map has no record here, so the point is yours to place." &&
        (await dialog.locator('[data-convene="pin-act"]').textContent()) === "Place the pin" &&
        (await dialog.locator('[data-convene="pin-chip"]').count()) === 0 &&
        (await dialog.locator('[data-convene="plate-grid"] [data-pin-kind]').count()) === 0 &&
        (await dialog.locator('[data-convene="plate-grid"] img').count()) === 0,
    );

    // The host places it, by pressing the plate where the venue is. That opens the drag, which is
    // section 5's other input-mode state and the chip's second reading.
    // Into view first: at 390 the plate sits below the fold of the composer's own scroller, and a
    // press at a point outside the viewport reaches nothing.
    await dialog.locator('[data-convene="plate-grid"]').scrollIntoViewIfNeeded();
    const grid = await dialog.locator('[data-convene="plate-grid"]').boundingBox();
    await page.mouse.move(grid.x + grid.width * 0.4, grid.y + grid.height * 0.6);
    await page.mouse.down();
    await dialog
      .locator('[data-convene="map-plate"][data-pin-state="dragging"]')
      .waitFor({ timeout: 5000 });
    record(
      tag +
        " Pass 4: a point being moved says so, and the drag's words follow the input mode (790, 792, section 6)",
      (await dialog.locator('[data-convene="pin-chip"]').textContent()) === "Moving your point" &&
        (await dialog.locator('[data-convene="pin-instruction"]').textContent()) ===
          (coarse ? "Keep dragging. Lift your finger to place it." : "Release to place it."),
      "coarse " + coarse,
    );
    await page.mouse.up();
    await dialog
      .locator('[data-convene="map-plate"][data-pin-state="placed"]')
      .waitFor({ timeout: 5000 });
    // The act is activated rather than only read. A control named `Move the pin` that moves nothing
    // reads correct in a label assertion and is useless, and this branch shipped exactly that for
    // three commits: the act wrote the same fraction back and the plate had no keyboard path at
    // all. So the act is pressed, focus is followed onto the plate, and an arrow has to move the
    // point — which is the whole of what a keyboard or AT host can do here.
    const hostX = () => dialog.locator('[data-convene="host-point"]').getAttribute("data-pin-x");
    const beforeKeys = await hostX();
    await dialog.locator('[data-convene="pin-act"]').click();
    const focusedOnPlate = await page.evaluate(
      () => document.activeElement && document.activeElement.getAttribute("data-convene"),
    );
    await page.keyboard.press("ArrowRight");
    await dialog
      .locator(`[data-convene="host-point"]:not([data-pin-x="${beforeKeys}"])`)
      .waitFor({ timeout: 5000 });
    const afterKeys = await hostX();
    record(
      tag +
        " Pass 4: the host's own point reads as the host's, the chip says so, the act becomes Move the pin, and pressing it hands the keyboard the plate (790, 792, section 6)",
      focusedOnPlate === "plate-grid" &&
        Number(afterKeys) > Number(beforeKeys) &&
        (await dialog.locator('[data-convene="pin-chip"]').textContent()) === "Placed by you" &&
        (await dialog.locator('[data-convene="pin-chip"]').getAttribute("data-pin-source")) ===
          "host" &&
        (await dialog.locator('[data-convene="plate-grid"] [data-pin-kind="host"]').count()) ===
          1 &&
        (await dialog.locator('[data-convene="plate-grid"] [data-pin-kind="map"]').count()) === 0 &&
        (await dialog.locator('[data-convene="pin-instruction"]').textContent()) ===
          "You placed this point. People see it as your own, not as the map's." &&
        (await dialog.locator('[data-convene="pin-act"]').textContent()) === "Move the pin" &&
        (await dialog.locator('[data-convene="plate-line"]').count()) === 0,
    );

    // The map link (815, 816). The promise the hint makes is that DNA keeps it as a link and never
    // reads it, and the check that proves it is the one that counts lookups: the link goes in and
    // nothing is sent anywhere, because nothing parses it, geocodes it or plots it.
    const callsBeforeLink = db.placeCalls.length;
    await field("map_link").fill("https://maps.app.goo.gl/frontroom-osu");
    // A wait on an absence, and the one place in this file where a fixed wait is the right shape:
    // there is no signal to wait on when the assertion is that nothing happens. It has to outlast
    // what it is proving nothing fires after — every lookup this form issues goes through one
    // debounced effect at `LOOKUP_PAUSE_MS`, 400 ms — or the obvious regression, routing the link
    // through `resolvePlace` on that same pause, would fire at 400 ms and be read at 150. The
    // counter is live rather than stuck: `callsBeforeLink` is already above zero by this point and
    // the checks after this one drive it higher.
    await page.waitForTimeout(700);
    record(
      tag +
        " Pass 4: the map link is kept as the host typed it, with its hint, and no lookup of any kind follows it (815, 816)",
      (await field("map_link").inputValue()) === "https://maps.app.goo.gl/frontroom-osu" &&
        (await field("map_link").getAttribute("placeholder")) === "Paste a link to a map" &&
        (await dialog
          .getByText(
            "Optional. It opens in the app you took it from. DNA keeps it as a link and never reads it.",
          )
          .count()) === 1 &&
        db.placeCalls.length === callsBeforeLink &&
        !(await pub().isDisabled()),
      "lookups before " + callsBeforeLink + ", after " + db.placeCalls.length,
    );
    await shot(page, `${tag}-03c-plate-and-link`);

    // Session 23, the unavailable state: a lookup that did not run (here a 503 from the gateway)
    // is its own hint, never "No place found"; the words stand and Publish stays open.
    await field("place_query").fill("The outage bar");
    await dialog
      .getByText("Place search is unavailable right now. Your words are kept, and you can publish.")
      .waitFor({ timeout: 5000 });
    record(
      tag + " unavailable: its own hint, not No place found; words kept, still publishable",
      (await dialog.getByText(/^The map has no venue records in/).count()) === 0 &&
        !(await pub().isDisabled()) &&
        (await dialog.locator('[data-convene="intent"]').textContent()) ===
          "In person at The outage bar, Ghana.",
    );
    await shot(page, `${tag}-03b-place-unavailable`);
    await field("place_query").fill("Kwame's rooftop");
    await dialog
      .getByText(
        "The map has no venue records in Ghana. Your words are kept, and you can place the pin yourself.",
      )
      .waitFor({ timeout: 5000 });

    // The moment: a failed parse mounts the pickers; a window is words (520, 634).
    await field("when").fill("next Thursday evening");
    await page.waitForTimeout(100);
    record(
      tag + " failed parse: the hint and a date and time picker, Publish off",
      (await dialog.getByText("That did not read as a date and time. Pick them below.").count()) ===
        1 &&
        (await field("when_date").count()) === 1 &&
        (await field("when_time").count()) === 1 &&
        (await pub().isDisabled()),
    );
    await field("when_time").fill("19:30");
    await page.waitForTimeout(100);
    record(
      tag + " the picker completes the moment and Publish returns",
      !(await pub().isDisabled()) &&
        /19:30/.test(await dialog.locator('[data-convene="when-line"]').textContent()),
    );
    await dialog.locator('[data-convene="give-window"]').click();
    await field("when_window").fill("November");
    await page.waitForTimeout(100);
    record(
      tag + " window: the card will say November, date to be confirmed; no end invented",
      (await dialog.getByText("The card will say: November, date to be confirmed.").count()) ===
        1 &&
        (await dialog.locator('[data-convene="when-line"]').textContent()) ===
          "November, date to be confirmed" &&
        (await dialog.locator('[data-convene="ends"]').count()) === 0 &&
        !(await pub().isDisabled()),
    );
    await shot(page, `${tag}-04-window`);
    await dialog.locator('[data-convene="have-date"]').click();
    // P4-SPEC section 9 (836), in the words the frame draws: 16 September falls on a Thursday in
    // 2027, which is the year `forwardDate` reaches from here. The host's words are kept exactly
    // as typed, the disagreement is stated, and the instant that will be stored is named.
    await field("when").fill("Wed 16 september, 7pm");
    await dialog.locator('[data-convene="weekday-contradiction"]').waitFor({ timeout: 5000 });
    record(
      tag +
        " Pass 4: a weekday that disagrees with the date is stated, and the host's words are not rewritten (836)",
      (await dialog.locator('[data-convene="weekday-contradiction"]').textContent()) ===
        "You wrote Wed. The date you wrote falls on a Thursday in 2027. Your words are kept; the event will be stored for Thu 16 Sep 2027." &&
        (await field("when").inputValue()) === "Wed 16 september, 7pm" &&
        // 835's year, on the surface that has to carry it: outside this year the label says which.
        /^Thu 16 Sep 2027, 19:00\./.test(
          await dialog.locator('[data-convene="when-line"]').textContent(),
        ),
      await dialog.locator('[data-convene="when-line"]').textContent(),
    );
    await field("when").fill("Thu 16 Oct at 19:00");

    // Online and hybrid (521): the link or a promise of one; hybrid is two rows and one sentence.
    await fmt("Online").click();
    await page.waitForTimeout(100);
    record(
      tag + " online: the link control, no place control, zone your home time zone",
      (await dialog.locator('[data-convene="link-block"]').count()) === 1 &&
        (await dialog
          .locator('[data-convene="place-block"], [data-convene="place-resolved"]')
          .count()) === 0 &&
        // 824, and the fourth of section 1's ratified cases. The arm sets no timezoneId, so the
        // zone named is the runner's own and only the tail can be asserted literally; the
        // -convene-zone arm drives the same case from a Pacific browser.
        /\. Time zone \S+, from your device\. An online event has no country to take it from\.$/.test(
          await dialog.locator('[data-convene="when-line"]').textContent(),
        ) &&
        (await pub().isDisabled()),
    );
    await dialog.locator('[data-convene="announce-later"]').click();
    await page.waitForTimeout(150);
    record(
      tag + " announce later: Link to be announced, publishable, Online in the meta",
      (await dialog.locator('[data-convene="link-tba"]').textContent()).includes(
        "Link to be announced",
      ) &&
        (await dialog.locator('[data-convene="intent"]').textContent()) ===
          "Online, link to be announced." &&
        !(await pub().isDisabled()) &&
        (await dialog.locator("article[aria-label='Preview of your post']").textContent()).includes(
          " · Online",
        ),
    );
    await fmt("Hybrid").click();
    await page.waitForTimeout(150);
    // The words the member wrote for the place stand across a format change (the store keeps its
    // values), so hybrid is publishable at once and its sentence joins both endpoints.
    record(
      tag + " hybrid: two delivery rows and one sentence; the typed words still stand",
      (await dialog.locator('[data-convene="place-block"]').count()) === 1 &&
        (await dialog.locator('[data-convene="link-tba"]').count()) === 1 &&
        (await dialog.locator('[data-convene="intent"]').textContent()) ===
          "In person at Kwame's rooftop, Ghana and Online, link to be announced." &&
        !(await pub().isDisabled()),
    );
    await field("place_query").fill("Front Room");
    await dialog.locator('[data-convene="place-resolved"]').waitFor({ timeout: 5000 });
    record(
      tag + " hybrid resolved: one sentence for both endpoints, where is city and online",
      (await dialog.locator('[data-convene="intent"]').textContent()) ===
        "In person at Front Room, Osu, Accra and Online, link to be announced." &&
        (await dialog.locator("article[aria-label='Preview of your post']").textContent()).includes(
          "Accra and online",
        ) &&
        !(await pub().isDisabled()),
    );
    await shot(page, `${tag}-05-hybrid`);
    await noOverflow(page, tag + " hybrid");

    // Publish failed (665): the caller's message in the error slot, every value intact.
    db.publishFail = "Publishing did not go through. Your draft is here. Try again.";
    await pub().click();
    await dialog.locator("[data-sheet-error]").waitFor({ timeout: 5000 });
    record(
      tag + " failed publish: the message in Sheet's error slot, the draft intact, Publish back",
      (await dialog.locator("[data-sheet-error]").textContent()) ===
        "Publishing did not go through. Your draft is here. Try again." &&
        (await field("title").inputValue()) === "Diaspora Builders Dinner" &&
        (await field("when").inputValue()) === "Thu 16 Oct at 19:00" &&
        (await dialog.locator('[data-convene="place-resolved"]').count()) === 1 &&
        (await pub().textContent()).trim() === "Publish" &&
        !(await pub().isDisabled()),
    );
    await shot(page, `${tag}-06-failed`);
    db.publishFail = null;

    // Publish in flight (665): fieldset disabled and aria-busy, Publish reads Publishing.
    db.publishDelayMs = 1500;
    const before = db.rpcPayloads.length;
    await pub().click();
    await page.waitForTimeout(300);
    record(
      tag + " publish in flight: fieldset disabled and aria-busy, Publish reads Publishing",
      (await dialog.locator("fieldset[disabled][aria-busy='true']").count()) === 1 &&
        (await pub().textContent()).trim() === "Publishing" &&
        (await field("title").count()) === 1,
    );
    await page.waitForSelector('section[role="dialog"][aria-label="Compose"]', {
      state: "detached",
      timeout: 15000,
    });
    db.publishDelayMs = 0;
    const payload = db.rpcPayloads[before];
    record(
      tag +
        " payload: the namespaced convene keys, hybrid, one place, to be announced, no city from DIA",
      !!payload &&
        payload.verb === "convene" &&
        payload.fields["convene.format"] === "hybrid" &&
        payload.fields["convene.place_id"] === "dXJuOm1ieHBvaTpmcm9udC1yb29t" &&
        payload.fields["convene.link_tba"] === true &&
        typeof payload.fields["convene.starts_at"] === "string" &&
        payload.fields["convene.timezone"] === "Africa/Accra" &&
        // SPEC Revision 5's exit check (799): event_delivery.country is the chosen country on every
        // published in-person event, and place_text never contains it.
        payload.fields["convene.country"] === "Ghana" &&
        !String(payload.fields["convene.place_text"] || "").includes("Ghana") &&
        payload.fields["convene.delivery_intent"] ===
          "In person at Front Room, Osu, Accra and Online, link to be announced." &&
        payload.dia &&
        payload.dia.accepted === true &&
        !Object.keys(payload.dia.proposed_fields || {}).some((k) => /city|format/.test(k)),
      payload ? JSON.stringify(payload.fields).slice(0, 300) : "no payload",
    );
    await page.getByText("Published. It is in the Feed and on Convene.").waitFor({ timeout: 4000 });
    const card = page.locator("main article[data-c='convene']").first();
    await card.waitFor({ timeout: 10000 });
    const cardText = await card.textContent();
    record(
      tag +
        " the published card first: kicker Event, meta line, four icon actions, no RSVP, no count",
      cardText.includes("Event") &&
        cardText.includes("Diaspora Builders Dinner") &&
        cardText.includes("Presented by Amara Osei") &&
        // 16 October 2026 is a Friday: the parser trusts the day the member wrote, and the
        // weekday comes from the calendar (P1-EXTRACTION item 9).
        cardText.includes("Fri 16 Oct") &&
        // 898 on the published card. `whenLine` reads the viewer's zone first, and this arm sets
        // no timezoneId, so the identifier is whatever the runner is in: what is asserted is that
        // it is an identifier at all and that no abbreviation renders anywhere on the card.
        /Fri 16 Oct, 19:00 (?:UTC|[A-Za-z_]+\/[A-Za-z_+-]+)/.test(cardText) &&
        !/\b(?:GMT|BST|EDT|EST|CDT|CST|PDT|PST|CET|CEST|WAT|EAT|SAST)\b/.test(cardText) &&
        cardText.includes("Accra and online") &&
        (await card.locator("footer [data-testid]").count()) === 4 &&
        !cardText.includes("Get a ticket") &&
        (await card.locator('[data-testid="respond"]').getAttribute("aria-label")) ===
          "Ask the host" &&
        !/\b\d+\s+(going|members|people)\b/i.test(cardText),
      cardText.slice(0, 220),
    );
    await shot(page, `${tag}-07-published`);
    await noOverflow(page, tag + " published");
  } catch (e) {
    record(tag + " flow", false, String(e).slice(0, 300));
    await shot(page, `${tag}-ERROR`).catch(() => {});
  }
  record(
    tag + " no page errors",
    errors.length === 0,
    errors.slice(0, 3).join(" | ").slice(0, 300),
  );
  await browser.close();
}

// Rulings 813, 817, 821: the zone a words-only event carries. Driven from a browser in
// America/Los_Angeles, which is where the founder composes, against a Ghana event, which is where
// the corridor is: the whole defect was that the two were the same value. A separate arm because
// the context's timezoneId is what makes the difference visible at all — under the runner's own UTC,
// Accra and the browser agree and every assertion here would pass vacuously.
async function runConveneZone(browserType, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-convene-zone`;
  armStart(tag);
  const browser = await launch(browserType);
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    hasTouch: w < 1024,
    isMobile: w < 1024,
    colorScheme: theme,
    timezoneId: "America/Los_Angeles",
  });
  const page = await ctx.newPage();
  const db = makeMockDb();
  await page.addInitScript(
    ({ theme }) => {
      try {
        localStorage.setItem("dna.theme", theme);
      } catch {}
    },
    { theme },
  );
  await mockSupabase(page, db);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const dialog = page.locator('section[role="dialog"][aria-label="Compose"]');
  const pub = () => dialog.getByRole("button", { name: /^Publish/ });
  const fmt = (label) =>
    dialog.locator('[role="radiogroup"][aria-label="Format"] [role="radio"]', { hasText: label });
  const field = (key) => dialog.locator(`input[data-convene="${key}"]`);
  const country = () => dialog.locator('select[data-convene="country"]');
  const zone = () => dialog.locator('select[data-convene="country-tz"]');
  try {
    await signIn(page);
    await page.click('[data-testid="compose"]');
    await dialog.waitFor({ timeout: 10000 });
    await sheetSettled(page, 'section[role="dialog"][aria-label="Compose"]');
    const ta = dialog.locator('textarea[aria-label="What is going on with you"]');
    await ta.fill(SAMPLES.convene);
    await diaSettled(page, dialog, tag);
    await dialog.locator('[role="radio"][aria-label^="Host an Event"]').click();
    await fmt("In person").click();

    // The corridor case: one zone, taken silently. No control, no line, no question (168 countries).
    await country().selectOption("Ghana");
    await field("place_query").fill("Kwame's rooftop");
    await dialog
      .getByText(
        "The map has no venue records in Ghana. Your words are kept, and you can place the pin yourself.",
      )
      .waitFor({ timeout: 5000 });
    record(
      tag + " Ghana with words only: no zone control, no zone line, publishable (813, 821)",
      (await zone().count()) === 0 &&
        (await dialog.locator('[data-convene="country-tz-line"]').count()) === 0 &&
        !(await pub().isDisabled()),
    );
    await shot(page, `${tag}-00-single-zone`);

    // The instant, which is the whole of 813: the typed 19:00 is 19:00 in Accra, not 19:00 Pacific.
    // Before the fix this stored 02:00 the next day and every viewer read the wrong hour.
    const before = db.rpcPayloads.length;
    await pub().click();
    await page.waitForSelector('section[role="dialog"][aria-label="Compose"]', {
      state: "detached",
      timeout: 15000,
    });
    const paid = db.rpcPayloads[before];
    record(
      tag + " Ghana with words only stores Africa/Accra and the typed 19:00 as 19:00 Accra (813)",
      !!paid &&
        paid.fields["convene.timezone"] === "Africa/Accra" &&
        /T19:00/.test(String(paid.fields["convene.starts_at"])) &&
        paid.fields["convene.country"] === "Ghana",
      paid
        ? String(paid.fields["convene.starts_at"]) + " " + paid.fields["convene.timezone"]
        : "no payload",
    );

    // A country with more than one zone: the control is present, the door is shut until the host
    // chooses, the browser's own zone is offered first, and nothing is selected for them (821).
    await page.click('[data-testid="compose"]');
    await dialog.waitFor({ timeout: 10000 });
    await sheetSettled(page, 'section[role="dialog"][aria-label="Compose"]');
    await ta.fill(SAMPLES.convene);
    await diaSettled(page, dialog, tag);
    await dialog.locator('[role="radio"][aria-label^="Host an Event"]').click();
    await fmt("In person").click();
    await country().selectOption("United States");
    await field("place_query").fill("Kwame's rooftop");
    await zone().waitFor({ timeout: 5000 });
    const options = await zone().locator("option").allTextContents();
    record(
      tag +
        " a country with several zones asks, offers the browser's zone first and selects nothing, and the door stays shut (821)",
      options[0] === "Choose a time zone" &&
        options[1] === "America/Los_Angeles" &&
        options.length === 6 &&
        (await zone().inputValue()) === "" &&
        (await pub().isDisabled()),
      options.join(", "),
    );
    await zone().selectOption("America/New_York");
    // G34's family, and the sighting that earned the entry's own "until one of them earns it".
    // `selectOption` resolves when the change event is dispatched, not when React has re-rendered
    // the line and re-evaluated the door, so this read was a race: won on every fast run, lost on
    // run 261's second attempt at `webkit-1280x800-dark`. The app was not wrong there, and the
    // proof is in the same run: the next check passed, so the payload did carry America/New_York
    // and the door did open. The wait is now on the two signals this assertion needs, in the shape
    // the draft-restore fix above uses; the assertions and the arm's declared count are unchanged.
    await dialog.evaluate(
      (root) =>
        new Promise((resolve, reject) => {
          const want = "Time zone America/New_York, from the country.";
          const done = () => {
            const line = root.querySelector('[data-convene="country-tz-line"]');
            const publish = [...root.querySelectorAll("button")].find((b) =>
              /^Publish/.test(b.textContent || ""),
            );
            return !!line && line.textContent === want && !!publish && !publish.disabled;
          };
          if (done()) return resolve();
          const t = setInterval(() => {
            if (!done()) return;
            clearInterval(t);
            clearTimeout(bail);
            resolve();
          }, 50);
          const bail = setTimeout(() => {
            clearInterval(t);
            reject(new Error("the zone line and the door never settled on the chosen zone"));
          }, 10000);
        }),
    );
    record(
      tag + " choosing a zone opens the door and the line reads it, from the country (821)",
      (await dialog.locator('[data-convene="country-tz-line"]').textContent()) ===
        "Time zone America/New_York, from the country." && !(await pub().isDisabled()),
    );
    await shot(page, `${tag}-01-several-zones`);
    const before2 = db.rpcPayloads.length;
    await pub().click();
    await page.waitForSelector('section[role="dialog"][aria-label="Compose"]', {
      state: "detached",
      timeout: 15000,
    });
    const paid2 = db.rpcPayloads[before2];
    record(
      tag + " the chosen zone is what the event stores, not the browser's (821)",
      !!paid2 && paid2.fields["convene.timezone"] === "America/New_York",
      paid2 ? String(paid2.fields["convene.timezone"]) : "no payload",
    );

    // A resolved place still wins over the country, unchanged; and changing the country after a
    // zone was chosen recomputes rather than keeping the old answer.
    await page.click('[data-testid="compose"]');
    await dialog.waitFor({ timeout: 10000 });
    await sheetSettled(page, 'section[role="dialog"][aria-label="Compose"]');
    await ta.fill(SAMPLES.convene);
    await diaSettled(page, dialog, tag);
    await dialog.locator('[role="radio"][aria-label^="Host an Event"]').click();
    await fmt("In person").click();
    await country().selectOption("United States");
    await field("place_query").fill("Kwame's rooftop");
    await zone().waitFor({ timeout: 5000 });
    await zone().selectOption("America/Denver");
    await country().selectOption("Ghana");
    record(
      tag + " changing the country recomputes: the control goes, Ghana's one zone stands (813)",
      (await zone().count()) === 0 &&
        (await dialog.locator('[data-convene="country-tz-line"]').count()) === 0 &&
        !(await pub().isDisabled()),
    );
    await field("place_query").fill("Front Room");
    await dialog.locator('[data-convene="place-resolved"]').waitFor({ timeout: 5000 });
    const resolvedRow = await dialog.locator('[data-convene="place-resolved"]').textContent();
    record(
      tag + " a resolved place still wins over the country's zone (813, unchanged)",
      resolvedRow.includes("Time zone Africa/Accra, from the place.") &&
        (await zone().count()) === 0,
      resolvedRow.slice(0, 120),
    );
    await shot(page, `${tag}-02-place-wins`);
  } catch (e) {
    record(tag + " flow", false, String(e).slice(0, 300));
    await shot(page, `${tag}-ERROR`).catch(() => {});
  }
  record(
    tag + " no page errors",
    errors.length === 0,
    errors.slice(0, 3).join(" | ").slice(0, 300),
  );
  await browser.close();
}

// End-to-end publish (once per tier) including link unfurl, image attach, and the feed card via the router.
async function runPublish(browserType, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-publish`;
  armStart(tag);
  const browser = await launch(browserType);
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    hasTouch: w < 1024,
    isMobile: w < 1024,
    colorScheme: theme,
  });
  const page = await ctx.newPage();
  const db = makeMockDb();
  await page.addInitScript(
    ({ theme }) => {
      try {
        localStorage.setItem("dna.theme", theme);
      } catch {}
    },
    { theme },
  );
  await mockSupabase(page, db);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  try {
    await signIn(page);
    await page.click('[data-testid="compose"]');
    const dialog = page.locator('section[role="dialog"][aria-label="Compose"]');
    await dialog.waitFor();
    await sheetSettled(page, 'section[role="dialog"][aria-label="Compose"]');
    await dialog.locator('textarea[aria-label="What is going on with you"]').fill(SAMPLES.convene);
    await diaSettled(page, dialog, tag);
    // Ruling 668: the read is a proposal; the tap on the proposed chip is the acceptance and keeps
    // DIA's fills, and it is what enables Publish (664, 667).
    record(
      tag + " Publish is off while the proposal stands without a tap (668)",
      await dialog.getByRole("button", { name: "Publish" }).isDisabled(),
    );
    await dialog.locator('[role="radio"][aria-label^="Host an Event"]').click();
    record(
      tag + " tapping the proposed chip accepts it: chip checked, DiaLine gone, DIA's fills kept",
      (await dialog
        .locator('[role="radio"][aria-label^="Host an Event"][aria-checked="true"]')
        .count()) === 1 &&
        (await dialog.locator("[data-dia]").count()) === 0 &&
        (await dialog.locator('input[data-convene="title"]').inputValue()) ===
          "Diaspora Builders Dinner",
    );
    // Convene Pass 1 (664): the form gates Publish. With the title, when and venue filled by DIA
    // and no format chosen, Publish is still off; In person lets the venue resolve (PR 2's one
    // state) and the form reports true.
    record(
      tag + " Publish stays off until the Convene form reports true (664)",
      await dialog.getByRole("button", { name: "Publish" }).isDisabled(),
    );
    await dialog
      .locator('[role="radiogroup"][aria-label="Format"] [role="radio"]', { hasText: "In person" })
      .click();
    // Session 24 (783, 786): Place is not in the DOM until a country is chosen, so the arm chooses
    // Ghana the way a member does and DIA's venue words then resolve inside it. The Convene arm
    // asserts the no-country state itself.
    await dialog.locator('select[data-convene="country"]').selectOption("Ghana");
    await dialog.locator('[data-convene="place-resolved"]').waitFor({ timeout: 5000 });
    record(
      tag + " In person with Ghana chosen: the venue resolves to one place and Publish is on",
      (await dialog.locator('[data-convene="place-resolved"]').textContent()).includes(
        "Front Room, Osu, Accra",
      ) && !(await dialog.getByRole("button", { name: "Publish" }).isDisabled()),
    );
    // Link.
    await dialog.getByRole("button", { name: "Add a link" }).click();
    await dialog.locator('input[placeholder="https://"]').fill("https://nation.africa/summit");
    await page.keyboard.press("Enter");
    record(
      tag + " link shows domain immediately",
      (await dialog.textContent()).includes("nation.africa"),
    );
    await dialog
      .getByText("Nairobi to host continental builders summit")
      .first()
      .waitFor({ timeout: 3000 });
    record(
      tag + " link unfurls into card",
      (await dialog.locator("article[aria-label='Preview of your post']").textContent()).includes(
        "Nairobi to host continental builders summit",
      ),
    );
    // Images (picker path on touch, direct input on pointer): set files on the hidden input.
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      "base64",
    );
    const fileInput = dialog.locator('input[type="file"]:not([capture])');
    await fileInput.setInputFiles([
      { name: "a.png", mimeType: "image/png", buffer: png },
      { name: "b.png", mimeType: "image/png", buffer: png },
    ]);
    await page.waitForTimeout(600);
    record(
      tag + " two thumbnails after attach",
      (await dialog.getByRole("button", { name: "Remove image" }).count()) === 2,
    );
    record(
      tag + " gallery in preview",
      (await dialog.locator("article[aria-label='Preview of your post'] img").count()) >= 2,
    );
    await fileInput.setInputFiles([
      { name: "c.png", mimeType: "image/png", buffer: png },
      { name: "d.png", mimeType: "image/png", buffer: png },
      { name: "e.png", mimeType: "image/png", buffer: png },
    ]);
    await page.waitForTimeout(600);
    record(
      tag + " fifth image truncated to cap of four",
      (await dialog.getByRole("button", { name: "Remove image" }).count()) === 4 &&
        (await dialog.getByRole("button", { name: "Add an image" }).isDisabled()),
    );
    await page.screenshot({ path: path.join(OUT, `${tag}-05-attached.png`) });
    // Publish.
    await dialog.getByRole("button", { name: "Publish" }).click();
    await page.waitForSelector('section[role="dialog"][aria-label="Compose"]', {
      state: "detached",
      timeout: 10000,
    });
    record(tag + " composer closes on publish, no navigation", page.url().endsWith("/feed"));
    const payload = db.rpcPayloads[0];
    record(
      tag + " RPC payload: one c_category via verb, media x4, link, dia record",
      payload &&
        payload.verb === "convene" &&
        payload.media.length === 4 &&
        payload.link.url.includes("nation.africa") &&
        payload.dia &&
        payload.dia.verb === "convene" &&
        payload.dia.accepted === true &&
        // Ruling 681: the instants travel inside `fields` as convene.* from the Convene form;
        // the chassis stand-in that parsed date and time here is retired, so this is null.
        payload.starts_at === null &&
        typeof payload.fields["convene.starts_at"] === "string" &&
        payload.fields["convene.format"] === "in_person" &&
        payload.fields["convene.place_id"] === "dXJuOm1ieHBvaTpmcm9udC1yb29t",
      JSON.stringify(payload).slice(0, 300),
    );
    // Convene Pass 1: an event's toast names Convene too (P1-EXTRACTION, confirmed content).
    await page.getByText("Published. It is in the Feed and on Convene.").waitFor({ timeout: 3000 });
    const card = page.locator("main article[data-c='convene']").first();
    await card.waitFor({ timeout: 10000 });
    // Rulings 579, 671: the card's action row is the fixed vocabulary; no RSVP, so no "Get a
    // ticket" anywhere in the card.
    record(
      tag +
        " feed card rendered by the router with kicker Event, title, fixed icon actions, no RSVP",
      (await card.textContent()).includes("Event") &&
        (await card.textContent()).includes("Diaspora Builders Dinner") &&
        (await card.textContent()).includes("Presented by Amara Osei") &&
        (await card.textContent()).includes("Front Room, Accra") &&
        !(await card.textContent()).includes("Get a ticket") &&
        (await card.locator('[data-testid="react"]').count()) === 1 &&
        (await card.locator('[data-testid="respond"]').count()) === 1 &&
        (await card.locator('[data-testid="save"]').count()) === 1 &&
        (await card.locator('[data-testid="share"]').count()) === 1,
    );
    record(
      tag + " feed card carries media and link",
      (await card.locator("img").count()) >= 4 &&
        (await card.textContent()).includes("nation.africa"),
    );
    await page.screenshot({ path: path.join(OUT, `${tag}-06-published.png`) });
    // Untyped publish. The published sheet slides out over 300ms; wait for it to leave so the
    // locator below binds to the new composer.
    await page.waitForSelector('section[role="dialog"][aria-label="Compose"]', {
      state: "detached",
      timeout: 10000,
    });
    await page.keyboard.press("c");
    await dialog.waitFor();
    await dialog.locator('textarea[aria-label="What is going on with you"]').fill(SAMPLES.untyped);
    await page.waitForTimeout(1900);
    if (process.env.DEBUG) {
      await page.screenshot({ path: path.join(OUT, `${tag}-DEBUG-untyped.png`) });
      console.log(
        "DEBUG untyped:",
        JSON.stringify({
          dia: await dialog.locator("[data-dia]").count(),
          preview: await dialog.locator("article[aria-label='Preview of your post']").count(),
          c: await dialog
            .locator("article[aria-label='Preview of your post']")
            .getAttribute("data-c")
            .catch(() => "none"),
          disabled: await dialog.getByRole("button", { name: "Publish" }).isDisabled(),
          text: (
            await dialog.locator('textarea[aria-label="What is going on with you"]').inputValue()
          ).slice(0, 30),
          drafts: db.drafts.size,
          infer: db.inferCalls,
        }),
      );
    }
    // W54, ruling 546: a chipless post resolves to Convey and the card carries Convey's kicker, so
    // it reads as labelled rather than sitting in a generic bucket. The preview is the same card, so
    // what the member sees before publishing is what they get after.
    const untypedPreview = dialog.locator("article[aria-label='Preview of your post']");
    record(
      tag + " silence: untyped text -> no DiaLine, convey preview carrying the Story kicker (546)",
      (await dialog.locator("[data-dia]").count()) === 0 &&
        (await untypedPreview.getAttribute("data-c")) === "convey" &&
        (await untypedPreview.locator("[data-kicker]").count()) === 1 &&
        (await untypedPreview.locator("[data-kicker]").textContent()).trim() === "Story",
      (await untypedPreview.locator("[data-kicker]").count()) === 1
        ? (await untypedPreview.locator("[data-kicker]").textContent()).trim()
        : "no kicker element",
    );
    await dialog.getByRole("button", { name: "Publish" }).click();
    await page.waitForSelector('section[role="dialog"][aria-label="Compose"]', {
      state: "detached",
      timeout: 10000,
    });
    const p2 = db.rpcPayloads[1];
    record(
      tag + " untyped publish: verb null (convey, no object)",
      p2 &&
        p2.verb === null &&
        db.posts[0].c_category === "convey" &&
        db.posts[0].created_object_kind === null,
    );
    const untypedCard = page.locator("main article[data-c='convey']").first();
    await untypedCard.waitFor({ timeout: 10000 });
    // W54 on the Feed card itself, which is where the finding was seen. The kicker is there and the
    // act is not: there is no story object behind an untyped post, so "Read the story" would lead
    // nowhere and ruling 68's no-title, no-action half still stands.
    record(
      tag + " W54: the published chipless card carries the Story kicker and no act (546, 68)",
      (await untypedCard.locator("[data-kicker]").count()) === 1 &&
        (await untypedCard.locator("[data-kicker]").textContent()).trim() === "Story" &&
        (await untypedCard.getByRole("button", { name: "Read the story" }).count()) === 0,
      (await untypedCard.locator("[data-kicker]").count()) === 1
        ? (await untypedCard.locator("[data-kicker]").textContent()).trim()
        : "no kicker element",
    );
  } catch (e) {
    record(tag + " flow", false, String(e).slice(0, 300));
    await page.screenshot({ path: path.join(OUT, `${tag}-ERROR.png`) }).catch(() => {});
  }
  record(tag + " no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await browser.close();
}

// Ruling 287: the draft autosave never writes after a publish has been initiated.
//
// The live shape of the defect: DRAFT_DEBOUNCE is 800ms, so a member who edits and presses Publish
// inside that window leaves a timer armed. publish_post takes long enough that the timer fires while
// the composer is still mounted and the RPC still in flight, and the callback upserts the draft back
// into post_drafts carrying the post id the RPC has just consumed. On the founder's account the
// draft row landed 132ms after the transaction that deleted it. The reopen then restored that draft,
// the next publish reused the consumed id, and every retry collided on posts_pkey.
//
// publishDelayMs is what makes it reproducible here: with an instant RPC the composer unmounts
// before the timer can fire and React clears it, so the defect is invisible. Two arms follow the
// chain: no draft survives the publish, and the reopen therefore comes up empty and mints an id that
// is not already a post.
async function runPublishGuards(browserType, bname, [w, h], theme) {
  const tag = `${bname}-${w}x${h}-${theme}-guards`;
  armStart(tag);
  const browser = await launch(browserType);
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    hasTouch: w < 1024,
    isMobile: w < 1024,
    colorScheme: theme,
  });
  const page = await ctx.newPage();
  const db = makeMockDb();
  // Long enough that a timer armed just before Publish fires mid-RPC, with the composer mounted.
  db.publishDelayMs = 900;
  await page.addInitScript(
    ({ theme }) => {
      try {
        localStorage.setItem("dna.theme", theme);
      } catch {}
    },
    { theme },
  );
  await mockSupabase(page, db);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const dialog = page.locator('section[role="dialog"][aria-label="Compose"]');
  const textarea = () => dialog.locator('textarea[aria-label="What is going on with you"]');
  try {
    await signIn(page);

    await page.click('[data-testid="compose"]');
    await dialog.waitFor();
    await sheetSettled(page, 'section[role="dialog"][aria-label="Compose"]');
    await textarea().fill("A draft with an autosave timer still in flight.");
    // Inside DRAFT_DEBOUNCE: the timer is armed and has not fired, so nothing is saved yet.
    await page.waitForTimeout(DRAFT_DEBOUNCE_MS - 200);
    record(tag + " autosave has not fired when Publish is pressed", db.drafts.size === 0);
    await dialog.getByRole("button", { name: "Publish" }).click();
    await page.waitForSelector('section[role="dialog"][aria-label="Compose"]', {
      state: "detached",
      timeout: 15000,
    });
    // Past the debounce, the held-open RPC and anything the unmount flush could still run.
    await page.waitForTimeout(DRAFT_DEBOUNCE_MS + 1500);
    record(
      tag + " no draft survives a publish with a timer in flight",
      db.drafts.size === 0,
      `drafts=${db.drafts.size} payload=${JSON.stringify([...db.drafts.values()][0] || null).slice(0, 160)}`,
    );
    const firstId = db.rpcPayloads[0] && db.rpcPayloads[0].id;
    record(tag + " the first publish carried a post id", !!firstId, String(firstId));

    // The consequence of the resurrection: the reopen restored the dead draft and the next publish
    // reused the consumed id. With no draft to restore, the composer opens empty and mints a fresh
    // one. ComposerShell also clears postId on publish, so nothing stale is left in memory either.
    const idsBefore = db.posts.map((r) => r.id);
    await page.click('[data-testid="compose"]');
    await dialog.waitFor();
    record(
      tag + " the composer reopens empty after a publish",
      (await textarea().inputValue()) === "",
      (await textarea().inputValue()).slice(0, 80),
    );
    await textarea().fill("A second post from the same session.");
    await page.waitForTimeout(DRAFT_DEBOUNCE_MS + 400);
    await dialog.getByRole("button", { name: "Publish" }).click();
    await page.waitForSelector('section[role="dialog"][aria-label="Compose"]', {
      state: "detached",
      timeout: 15000,
    });
    const secondId = db.rpcPayloads[1] && db.rpcPayloads[1].id;
    record(
      tag + " reopening after a publish mints a fresh post id",
      !!secondId && secondId !== firstId,
      `${firstId} -> ${secondId}`,
    );
    record(
      tag + " the minted id was not already a published post",
      !!secondId && !idsBefore.includes(secondId),
      String(secondId),
    );
    await page.waitForTimeout(DRAFT_DEBOUNCE_MS + 1500);
    record(
      tag + " no draft survives the second publish either",
      db.drafts.size === 0,
      `drafts=${db.drafts.size}`,
    );
  } catch (e) {
    record(tag + " flow", false, String(e).slice(0, 300));
    await page.screenshot({ path: path.join(OUT, `${tag}-ERROR.png`) }).catch(() => {});
  }
  record(tag + " no page errors", errors.length === 0, errors.slice(0, 3).join(" | "));
  await browser.close();
}

// Shell, Feed lenses, quick-look overlay, notifications: one run per viewport, light theme.
async function runShell(browserType, bname, [w, h]) {
  const tag = `${bname}-${w}x${h}-shell`;
  armStart(tag);
  const browser = await launch(browserType);
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    hasTouch: w < 1024,
    isMobile: w < 1024,
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  const db = makeMockDb();
  seedPosts(db, 8);
  await mockSupabase(page, db);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  try {
    await signIn(page);
    const stamp = await page.getAttribute("html", "data-shell");
    record(tag + " shell mount stamp set", !!stamp);
    // Session 23: the lens bar's labels-fit answer is checked against the layout it produced, after
    // the document's fonts have settled, because the founder's iPhone rendered labels over their
    // neighbours' icons at 390 while both engines here read the bar as fitting (G36). When the bar
    // shows labels, no tab's content may exceed its box; when it shows icons first, the labels did
    // not fit and the bar said so.
    const lensFit = await page.evaluate(async () => {
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const bar = document.querySelector('[role="tablist"][aria-label="Lens"]');
      if (!bar) return null;
      const tabs = Array.from(bar.querySelectorAll('[role="tab"]'));
      return {
        mode: bar.getAttribute("data-lensbar"),
        track: bar.clientWidth,
        overflowing: tabs
          .filter((t) => t.scrollWidth > t.clientWidth + 1)
          .map((t) => t.getAttribute("data-lens") + ":" + t.scrollWidth + ">" + t.clientWidth),
        barOverflow: bar.scrollWidth > bar.clientWidth + 1,
        // What the bar measured: its probe's labels, as active and as inactive tabs.
        probe: Array.from(
          (bar.parentElement && bar.parentElement.querySelectorAll("[data-probe]")) || [],
        ).map((e) => e.getAttribute("data-probe")[0] + Math.round(e.getBoundingClientRect().width)),
      };
    });
    record(
      tag +
        " lens bar: with fonts settled, no tab's label exceeds its box and the track does not scroll",
      !!lensFit && lensFit.overflowing.length === 0 && !lensFit.barOverflow,
      JSON.stringify(lensFit),
    );
    // Lens in the URL, back-button safe.
    await page.click('[role="tablist"][aria-label="Lens"] [data-lens="saved"]');
    await page.waitForURL("**/feed?lens=saved");
    await page.locator('[data-testid="feed-empty"][data-lens="saved"]').waitFor({ timeout: 10000 });
    record(
      tag + " Saved lens: ?lens=saved, honest empty state, scope line",
      (await page.locator("[data-lens-scope]").textContent()).includes("saved"),
    );
    await page.reload({ waitUntil: "networkidle" });
    await page.locator('[data-testid="feed-empty"][data-lens="saved"]').waitFor({ timeout: 15000 });
    record(tag + " lens survives refresh", page.url().includes("lens=saved"));
    const stamp2 = await page.getAttribute("html", "data-shell");
    await page.click('[role="tablist"][aria-label="Lens"] [data-lens="mine"]');
    await page.waitForURL("**/feed?lens=mine");
    await page.locator("[data-feed] article[data-c]").first().waitFor({ timeout: 10000 });
    record(
      tag + " Mine lens: only this member's posts",
      (await page.locator("[data-feed] article[data-c]").count()) === 4,
    );
    await page.goBack();
    await page.waitForURL("**/feed?lens=saved");
    await page.goBack();
    await page.waitForURL((u) => u.pathname === "/feed" && !u.search);
    await page.locator("[data-feed] article[data-c]").first().waitFor({ timeout: 10000 });
    record(
      tag + " back button restores All (no ?lens) with all posts",
      (await page.locator("[data-feed] article[data-c]").count()) === 8 &&
        (await page
          .locator('[role="tablist"][aria-label="Lens"] [role="tab"][aria-selected="true"]')
          .getAttribute("data-lens")) === "all",
    );
    record(
      tag + " shell did not remount across lens changes",
      (await page.getAttribute("html", "data-shell")) === stamp2,
    );
    // For You renders identically to All.
    await page.click('[role="tablist"][aria-label="Lens"] [data-lens="for-you"]');
    await page.waitForURL("**/feed?lens=for-you");
    await page.waitForTimeout(300);
    record(
      tag + " For You identical to All",
      (await page.locator("[data-feed] article[data-c]").count()) === 8,
    );
    await page.click('[role="tablist"][aria-label="Lens"] [data-lens="all"]');
    await page.waitForURL((u) => u.pathname === "/feed" && !u.search);
    await page.waitForTimeout(300);
    // Save and React: existence toggles, no counts.
    const first = page.locator("[data-feed] article[data-c]").nth(0);
    await first.locator('[data-testid="save"]').click();
    await page.waitForTimeout(400);
    await first.locator('[data-testid="react"]').click();
    await page.waitForTimeout(400);
    record(
      tag + " Save and React toggle own rows (aria-pressed), no count rendered",
      db.saves.length === 1 &&
        db.reactions.length === 1 &&
        (await first.locator('[data-testid="save"]').getAttribute("aria-pressed")) === "true" &&
        (await first.locator('[data-testid="react"]').getAttribute("aria-pressed")) === "true",
    );
    // Read more expands the same card in place at /posts/:id; the Feed column's scroll is untouched.
    const scrollTop = () =>
      page.evaluate(() => document.querySelector('[data-scroller="feed"]').scrollTop);
    const third = page.locator("[data-feed] article[data-c]").nth(5);
    await third.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const before = await scrollTop();
    record(tag + " scrolled before opening", before > 0, "scrollTop " + before);
    const readMore = third.locator("[data-read-more]");
    record(tag + " long body clamped with Read more", (await readMore.count()) === 1);
    await readMore.click();
    await page.waitForURL("**/posts/seed-5");
    await third.locator("[data-show-less]").waitFor({ timeout: 10000 });
    await page.waitForTimeout(300);
    const during = await scrollTop();
    record(
      tag + " expanded in place: same card, real route, no dialog, scroll unchanged",
      (await page.locator("[data-feed] article[data-c]").count()) === 8 &&
        (await third.getAttribute("data-expanded")) === "1" &&
        (await third.locator("[data-read-more]").count()) === 0 &&
        (await page.locator('[role="dialog"]').count()) === 0 &&
        (await page.locator("[data-feed] article[data-expanded='1']").count()) === 1 &&
        Math.abs(during - before) <= 1,
      `before ${before} during ${during}`,
    );
    record(
      tag + " expansion: shell not remounted",
      (await page.getAttribute("html", "data-shell")) === stamp2,
    );
    await shot(page, `${tag}-expanded`);
    await noOverflow(page, tag + " expanded");
    await page.goBack();
    await page.waitForURL((u) => u.pathname === "/feed");
    await third.locator("[data-read-more]").waitFor({ timeout: 10000 });
    await page.waitForTimeout(300);
    const after = await scrollTop();
    record(
      tag + " back button collapses; scroll identical",
      (await third.getAttribute("data-expanded")) === "0" && Math.abs(after - before) <= 1,
      `before ${before} after ${after}`,
    );
    // Respond expands too; Show less collapses and pops the URL.
    const respond = third.locator('[data-testid="respond"]');
    await respond.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const before2 = await scrollTop();
    await respond.click();
    await page.waitForURL("**/posts/seed-5");
    await third.locator("[data-show-less]").waitFor({ timeout: 10000 });
    await third.locator("[data-show-less]").click();
    await page.waitForURL((u) => u.pathname === "/feed");
    await page.waitForTimeout(300);
    const after2 = await scrollTop();
    record(
      tag + " Respond expands; Show less collapses and returns the URL; scroll identical",
      (await third.getAttribute("data-expanded")) === "0" && Math.abs(after2 - before2) <= 1,
      `before ${before2} after ${after2}`,
    );
    // Direct load of /posts/:id renders the expanded card as page content with Back to Feed.
    await page.goto(BASE + "/posts/seed-1", { waitUntil: "networkidle" });
    const direct = page.locator('[data-direct-post="seed-1"]');
    await direct.locator("article[data-c]").waitFor({ timeout: 15000 });
    record(
      tag + " direct /posts/:id: shell, expanded card as page content, Back to Feed, no dialog",
      (await page.locator("[data-app-header]").count()) === 1 &&
        (await direct.locator("article[data-c]").count()) === 1 &&
        (await direct.locator("[data-read-more]").count()) === 0 &&
        (await direct.locator("[data-show-less]").count()) === 0 &&
        (await page.locator('[data-testid="back-to-feed"]').count()) === 1 &&
        (await page.locator('[role="dialog"]').count()) === 0 &&
        (await page.locator("[data-sheet-scrim]").count()) === 0,
    );
    await shot(page, `${tag}-direct`);
    await page.click('[data-testid="back-to-feed"]');
    await page.waitForURL((u) => u.pathname === "/feed");
    await page.locator("[data-feed] article[data-c]").first().waitFor({ timeout: 10000 });
    record(tag + " Back to Feed from the direct view lands on Feed", true);
    // The four remaining C stubs render inside the same shell (Connect is a real surface since
    // Brief 4, covered by tests/connect.cjs); Home returns to Feed; no remount.
    const stampBefore = await page.getAttribute("html", "data-shell");
    await page.locator('nav[aria-label="Pulse"] button', { hasText: "Convene" }).click();
    await page.waitForURL("**/convene");
    await page.locator('[data-testid="c-stub"][data-c="convene"]').waitFor({ timeout: 10000 });
    record(
      tag + " /convene: stub inside the shell, Convene active, no remount",
      (await page.locator('[data-testid="c-stub"]').textContent()).includes("Convene is next") &&
        (
          await page.locator('nav[aria-label="Pulse"] [aria-current="page"]').textContent()
        ).includes("Convene") &&
        (await page.getAttribute("html", "data-shell")) === stampBefore &&
        (await page.locator("[data-app-header]").count()) === 1,
    );
    await shot(page, `${tag}-stub`);
    await noOverflow(page, tag + " stub");
    await page.click('[data-testid="to-feed"]');
    await page.waitForURL((u) => u.pathname === "/feed");
    record(
      tag + " stub's Feed link returns Home without remount",
      (await page.getAttribute("html", "data-shell")) === stampBefore,
    );
    // Notifications: no dot without rows, empty list; dot with a real unread row; opening marks read.
    record(
      tag + " bell: no dot without a real unread row",
      (await page.locator('[data-testid="bell-dot"]').count()) === 0,
    );
    await page.click('[data-testid="bell"]');
    const list = page.locator('[role="dialog"][aria-label="Notifications"]');
    await list.waitFor({ timeout: 10000 });
    await list.locator('[data-testid="notifications-empty"]').waitFor({ timeout: 10000 });
    record(tag + " bell opens the list with an honest empty state", true);
    await page.waitForTimeout(300);
    await shot(page, `${tag}-notifications-empty`);
    await page.keyboard.press("Escape");
    await page.waitForSelector('[role="dialog"][aria-label="Notifications"]', {
      state: "detached",
    });
    // Ruling 547: a kind whose destination has no surface is suppressed from the registry, and a row
    // of that kind renders nothing and raises no dot. space_role_approved is one of G19's three: it
    // is a real notification_kind in the database, so the row is as real as any other, and the point
    // is that a member is never sent to a list with nothing in it.
    db.notifications.push({
      id: "n0",
      recipient_member_id: UID,
      kind: "space_role_approved",
      c_category: "collaborate",
      actor_kind: null,
      actor_id: null,
      object_kind: "space",
      object_id: null,
      read_at: null,
      created_at: new Date(Date.now() - 9 * 60e3).toISOString(),
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.waitForTimeout(900);
    record(
      tag + " a destination-less kind raises no dot (ruling 547)",
      (await page.locator('[data-testid="bell-dot"]').count()) === 0,
    );
    await page.click('[data-testid="bell"]');
    await list.waitFor({ timeout: 10000 });
    await list.locator('[data-testid="notifications-empty"]').waitFor({ timeout: 10000 });
    record(
      tag + " a destination-less kind renders no row (ruling 547, grounded-or-empty)",
      (await list.locator("button[data-kind]").count()) === 0,
    );
    await page.keyboard.press("Escape");
    await page.waitForSelector('[role="dialog"][aria-label="Notifications"]', {
      state: "detached",
    });
    db.notifications.length = 0;
    db.notifications.push({
      id: "n1",
      recipient_member_id: UID,
      kind: "connection_accepted",
      c_category: "connect",
      actor_kind: null,
      actor_id: null,
      object_kind: null,
      object_id: null,
      read_at: null,
      created_at: new Date(Date.now() - 5 * 60e3).toISOString(),
    });
    await page.reload({ waitUntil: "networkidle" });
    await page.locator('[data-testid="bell-dot"]').waitFor({ timeout: 15000 });
    record(
      tag + " bell: a dot, never a numeral, once an unread row exists",
      (await page.locator('[data-testid="bell"]').textContent()).trim() === "" &&
        (await page.locator('[data-testid="bell-dot"]').count()) === 1,
    );
    await page.click('[data-testid="bell"]');
    await list.waitFor({ timeout: 10000 });
    const row = list.locator('button[data-kind="connection_accepted"]');
    await row.waitFor({ timeout: 10000 });
    // Design pass 01, B17: ruling 461 retitled the row now that making an intro has left the
    // composer (417), and ruling 490 puts the destination in words on every row. Ruling 480 puts a
    // hidden Unread label in a 24 hit area, so the dot is named rather than only coloured.
    record(
      tag + " list shows the real row with the Connect glyph, spec copy, and unread state",
      (await row.getAttribute("data-unread")) === "1" &&
        (await row.locator('[role="img"][aria-label="Connect"]').count()) === 1 &&
        (await row.textContent()).includes("accepted your connection request."),
    );
    record(
      tag + " the row names its destination in words (ruling 490)",
      (await row.getAttribute("data-destination")) === "Opens their profile" &&
        (await row.locator("[data-destination-line]").innerText()) === "Opens their profile",
    );
    record(
      tag + " the unread dot carries a hidden label in a 24 hit area (ruling 480)",
      (await row.locator('[data-unread-dot][role="img"][aria-label="Unread"]').count()) === 1 &&
        (await row.locator("[data-unread-dot]").evaluate((el) => {
          const r = el.getBoundingClientRect();
          return Math.round(r.width) >= 24 && Math.round(r.height) >= 24;
        })),
    );
    await page.waitForTimeout(300);
    await shot(page, `${tag}-notifications`);
    await row.click();
    await page.waitForTimeout(600);
    record(
      tag + " opening a row marks it read (read_at only) and the dot goes",
      db.reads.length === 1 &&
        db.reads[0] === "n1" &&
        (await page.locator('[data-testid="bell-dot"]').count()) === 0 &&
        (await row.getAttribute("data-unread")) === null,
    );
    await page.keyboard.press("Escape");
    // c keypress opens the composer from the shell.
    await page.waitForSelector('[role="dialog"][aria-label="Notifications"]', {
      state: "detached",
    });
    await page.keyboard.press("c");
    await page.locator('section[role="dialog"][aria-label="Compose"]').waitFor({ timeout: 10000 });
    record(tag + " c keypress opens the one composer from the shell", true);
    await page.keyboard.press("Escape");
  } catch (e) {
    record(tag + " flow", false, String(e).slice(0, 300));
    await shot(page, `${tag}-ERROR`).catch(() => {});
  }
  record(
    tag + " no page errors",
    errors.length === 0,
    errors.slice(0, 3).join(" | ").slice(0, 300),
  );
  await browser.close();
}

// The ten targeted checks of the B2.1 refinement handoff, per tier. Touch scroll capture and the
// drag-armed state are driven with synthetic events (a real finger or file drag cannot be scripted),
// so each asserts the event-level outcome: defaultPrevented on touchmove, the armed DOM before drop.
async function runTargeted(browserType, bname, [w, h]) {
  const tier = w < 640 ? "compact" : w > 1024 ? "expanded" : "medium";
  const tag = `${bname}-${w}x${h}-targeted`;
  armStart(tag);
  const browser = await launch(browserType);
  // Pointer context: check 2 needs a file drag, which only the pointer mode arms; every other
  // check reads the same on either input mode.
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    hasTouch: false,
    isMobile: false,
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  const db = makeMockDb();
  seedPosts(db, 10);
  await mockSupabase(page, db);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  const feedTop = () =>
    page.evaluate(() => document.querySelector('[data-scroller="feed"]').scrollTop);
  const setFeedTop = (y) =>
    page.evaluate((y) => {
      document.querySelector('[data-scroller="feed"]').scrollTop = y;
    }, y);
  const centre = () => page.locator("[data-app-header]").getAttribute("data-centre");
  const dialog = page.locator('section[role="dialog"][aria-label="Compose"]');
  const closeComposer = async () => {
    await page.keyboard.press("Escape");
    await page.waitForSelector('section[role="dialog"][aria-label="Compose"]', {
      state: "detached",
    });
  };
  try {
    await signIn(page);
    await page.locator("[data-feed] article[data-c]").nth(9).waitFor({ timeout: 15000 });

    // 1. Scroll capture: wheel and touchmove inside the open composer never move the Feed.
    await setFeedTop(160);
    await page.waitForTimeout(100);
    const feedBefore = await feedTop();
    if (tier === "expanded") await page.click("[data-feed] [data-testid='compose']");
    else
      await page.click(
        '[data-testid="compose-floating"], [data-app-header] [data-testid="compose"]',
      );
    await dialog.waitFor({ timeout: 10000 });
    await page.waitForTimeout(400);
    const ta = dialog.locator('textarea[aria-label="What is going on with you"]');
    await ta.fill(
      Array.from({ length: 40 }, (_, i) => `Line ${i + 1} of a long draft.`).join("\n"),
    );
    await page.waitForTimeout(100);
    const taBox = await ta.boundingBox();
    await page.mouse.move(taBox.x + taBox.width / 2, taBox.y + taBox.height / 2);
    for (let i = 0; i < 12; i++) await page.mouse.wheel(0, 400);
    await page.waitForTimeout(200);
    for (let i = 0; i < 6; i++) await page.mouse.wheel(0, -400);
    await page.waitForTimeout(200);
    const scrimBox = await page.locator("[data-sheet-scrim]").boundingBox();
    await page.mouse.move(scrimBox.x + 8, scrimBox.y + 8);
    for (let i = 0; i < 4; i++) await page.mouse.wheel(0, 300);
    await page.waitForTimeout(200);
    // Ruling 493 narrows the scroll lock: the scrim is cancelled, a vertical scroller inside is
    // consumed at its edges as before, a horizontal scroller keeps its wheel, and touch is left to
    // the browser. With showModal() the background is inert as well, so the page cannot move at all
    // rather than being held still by a cancelled event; the outcome is what is asserted.
    const lock = await page.evaluate(() => {
      const dlg = document.querySelector('section[role="dialog"]');
      const row = dlg.querySelector("[data-verb-row]");
      const fire = (target, dx, dy) => {
        const e = new WheelEvent("wheel", {
          bubbles: true,
          cancelable: true,
          deltaX: dx,
          deltaY: dy,
        });
        target.dispatchEvent(e);
        return e.defaultPrevented;
      };
      const touch = (target) => {
        const e = new Event("touchmove", { bubbles: true, cancelable: true });
        target.dispatchEvent(e);
        return e.defaultPrevented;
      };
      const scrim = document.querySelector("[data-sheet-scrim]");
      return {
        // The scrim is the one thing the lock still cancels.
        scrim: fire(scrim, 0, 300),
        // The chip row keeps its wheel: the Sheet's lock leaves a horizontal scroller alone, and
        // the row itself takes the vertical wheel sideways (ruling 493). The proof is the outcome,
        // not the flag: a lock that swallowed the event would leave scrollLeft where it was.
        chipRowMoved: row
          ? (() => {
              if (row.scrollWidth <= row.clientWidth) return true;
              row.scrollLeft = 0;
              fire(row, 0, 300);
              return row.scrollLeft > 0;
            })()
          : true,
        // Touch is the browser's.
        touchInside: touch(dlg),
      };
    });
    const feedAfterWheel = await feedTop();
    record(
      tag +
        " 1. composer open: the page cannot move behind it, the scrim is cancelled, the chip row keeps its wheel and touch is the browser's (ruling 493)",
      feedAfterWheel === feedBefore &&
        lock.scrim &&
        lock.chipRowMoved &&
        lock.touchInside === false,
      `feed ${feedBefore} -> ${feedAfterWheel} lock ${JSON.stringify(lock)}`,
    );

    // 2. Armed drop state before the drop lands; drop adds; leaving clears.
    if (tier !== "medium") {
      await ta.fill("");
      const armedSteps = await page.evaluate(async () => {
        const col = document.querySelector("[data-drop-target]");
        const dt = new DataTransfer();
        dt.items.add(new File([new Uint8Array([137, 80, 78, 71])], "a.png", { type: "image/png" }));
        const fire = (type) =>
          col.dispatchEvent(
            new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer: dt }),
          );
        const tick = () => new Promise((r) => setTimeout(r, 60));
        fire("dragenter");
        fire("dragover");
        await tick();
        const armedText = (document.querySelector("[data-drop-armed]") || {}).textContent || "";
        const armedAttr = col.getAttribute("data-armed");
        fire("dragleave");
        await tick();
        const afterLeave = col.getAttribute("data-armed");
        fire("dragenter");
        fire("dragover");
        await tick();
        const reArmed = col.getAttribute("data-armed");
        fire("drop");
        await tick();
        const afterDrop = col.getAttribute("data-armed");
        return { armedText, armedAttr, afterLeave, reArmed, afterDrop };
      });
      await page.waitForTimeout(600);
      const thumbs = await dialog.locator("img[alt='']").count();
      record(
        tag +
          " 2. drag over the fields arms (dashed C frame, tint, copy) before release; leaving clears; drop adds the image",
        armedSteps.armedAttr === "1" &&
          /Drop to add up to 4 images/.test(armedSteps.armedText) &&
          armedSteps.afterLeave === "0" &&
          armedSteps.reArmed === "1" &&
          armedSteps.afterDrop === "0" &&
          thumbs >= 1,
        JSON.stringify({ ...armedSteps, thumbs }),
      );
    }
    await closeComposer();

    if (tier !== "expanded") {
      // 3. Header swap at 72px, both directions, and a fast double crossing.
      await setFeedTop(0);
      await page.waitForTimeout(150);
      const atTop = await centre();
      const bellTop = await page.locator('[data-app-header] [data-testid="bell"]').count();
      await setFeedTop(120);
      await page.waitForTimeout(150);
      const past = await centre();
      const bellPast = await page.locator('[data-app-header] [data-testid="bell"]').count();
      const inFlowHidden = await page.evaluate(
        () => getComputedStyle(document.querySelector("[data-feed] [data-lens-anchor]")).visibility,
      );
      await setFeedTop(0);
      await page.waitForTimeout(150);
      const backTop = await centre();
      const bellBack = await page.locator('[data-app-header] [data-testid="bell"]').count();
      // Fast flick: cross the threshold twice inside one frame, ending above it.
      await page.evaluate(() => {
        const sc = document.querySelector('[data-scroller="feed"]');
        sc.scrollTop = 300;
        sc.scrollTop = 20;
        sc.scrollTop = 400;
        sc.scrollTop = 0;
      });
      await page.waitForTimeout(250);
      const flick1 = await centre();
      await page.evaluate(() => {
        const sc = document.querySelector('[data-scroller="feed"]');
        sc.scrollTop = 10;
        sc.scrollTop = 500;
        sc.scrollTop = 30;
        sc.scrollTop = 260;
      });
      await page.waitForTimeout(250);
      const flick2 = await centre();
      const headerH = (await page.locator("[data-app-header]").boundingBox()).height;
      record(
        tag +
          " 3. past 72px the header pill swaps to LensBar" +
          (tier === "compact" ? " and the bell leaves" : ", bell stays") +
          "; back above they return; fast flick settles on the final side; header stays one row",
        atTop === "compose" &&
          bellTop === 1 &&
          past === "lens" &&
          bellPast === (tier === "compact" ? 0 : 1) &&
          inFlowHidden === "hidden" &&
          backTop === "compose" &&
          bellBack === 1 &&
          flick1 === "compose" &&
          flick2 === "lens" &&
          headerH <= 58,
        JSON.stringify({ atTop, past, bellPast, inFlowHidden, backTop, flick1, flick2, headerH }),
      );

      // 4. Floating composer entry: shows while scrolling, hides 2.5s after, opens the composer.
      await setFeedTop(0);
      await page.waitForTimeout(150);
      const fab = page.locator("[data-fab]");
      const fabAtTop = await fab.getAttribute("data-shown");
      await setFeedTop(200);
      await page.waitForTimeout(350);
      const fabMoving = await fab.getAttribute("data-shown");
      const fabKind = await fab.getAttribute("data-fab");
      await page.waitForTimeout(2900);
      const fabIdle = await fab.getAttribute("data-shown");
      await setFeedTop(260);
      await page.waitForTimeout(350);
      const fabAgain = await fab.getAttribute("data-shown");
      await page.click('[data-testid="compose-floating"]');
      await dialog.waitFor({ timeout: 10000 });
      await page.waitForTimeout(350);
      const fabWhileOpen = await fab.count();
      await closeComposer();
      record(
        tag +
          " 4. floating entry (" +
          fabKind +
          ") appears while scrolling, hides ~2.5s after, reappears on the next scroll, opens the composer, absent while it is open",
        fabAtTop === "0" &&
          fabMoving === "1" &&
          fabKind === (tier === "compact" ? "handle" : "tab") &&
          fabIdle === "0" &&
          fabAgain === "1" &&
          fabWhileOpen === 0,
        JSON.stringify({ fabAtTop, fabMoving, fabKind, fabIdle, fabAgain, fabWhileOpen }),
      );
    } else {
      // 5. Independent column scroll.
      await setFeedTop(0);
      await page.waitForTimeout(100);
      const railTops = () =>
        page.evaluate(() =>
          [...document.querySelectorAll("[data-scroller]")].map((el) => [
            el.getAttribute("data-scroller"),
            el.scrollTop,
          ]),
        );
      const mainBox = await page.locator('[data-scroller="feed"]').boundingBox();
      await page.mouse.move(mainBox.x + mainBox.width / 2, mainBox.y + mainBox.height / 2);
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(300);
      const afterFeedWheel = await railTops();
      const leftBox = await page.locator('[data-scroller="left"]').boundingBox();
      await page.mouse.move(leftBox.x + leftBox.width / 2, leftBox.y + leftBox.height / 2);
      await page.mouse.wheel(0, 500);
      await page.waitForTimeout(300);
      const afterRailWheel = await railTops();
      const feedMoved = afterFeedWheel.find((r) => r[0] === "feed")[1];
      const feedAfterRail = afterRailWheel.find((r) => r[0] === "feed")[1];
      const railsStill = afterFeedWheel.filter((r) => r[0] !== "feed").every((r) => r[1] === 0);
      const scrollers = afterFeedWheel.length;
      record(
        tag +
          " 5. wheel over the Feed moves only the Feed; wheel over a rail leaves the Feed put (" +
          scrollers +
          " scroll containers)",
        feedMoved > 0 &&
          railsStill &&
          feedAfterRail === feedMoved &&
          scrollers === (w >= 1440 ? 3 : 2),
        JSON.stringify({ afterFeedWheel, afterRailWheel }),
      );

      // 6. Sticky block: control and LensBar pin together once the greeting has left; nothing paints over them.
      await setFeedTop(0);
      await page.waitForTimeout(150);
      const geo0 = await page.evaluate(() => {
        const g = document.querySelector("[data-greeting]").getBoundingClientRect();
        const sc = document.querySelector('[data-scroller="feed"]').getBoundingClientRect();
        return {
          greetBottom: g.bottom - sc.top,
          stuck: document.querySelector("[data-compose-wrap]").getAttribute("data-stuck"),
        };
      });
      await setFeedTop(Math.ceil(geo0.greetBottom) + 8);
      await page.waitForTimeout(250);
      const probe = () =>
        page.evaluate(() => {
          const sc = document.querySelector('[data-scroller="feed"]').getBoundingClientRect();
          const wrap = document.querySelector("[data-compose-wrap]");
          const wb = wrap.getBoundingClientRect();
          const lens = document.querySelector("[data-feed] [data-lens-anchor]");
          const lb = lens.getBoundingClientRect();
          const hits = [];
          for (const y of [
            wb.top + 2,
            wb.top + 30,
            wb.bottom - 2,
            lb.top + 2,
            lb.top + 20,
            lb.bottom - 2,
          ]) {
            const el = document.elementFromPoint(sc.left + sc.width / 2, y);
            hits.push(!!el && (wrap.contains(el) || lens.contains(el)));
          }
          return {
            stuck: wrap.getAttribute("data-stuck"),
            wrapTop: Math.round(wb.top - sc.top),
            wrapH: Math.round(wb.height),
            lensTop: Math.round(lb.top - sc.top),
            hits,
            articleAbove: [...document.querySelectorAll("[data-feed] article")].some(
              (a) =>
                a.getBoundingClientRect().top < lb.bottom - 1 &&
                a.getBoundingClientRect().bottom > sc.top &&
                getComputedStyle(a).zIndex !== "auto",
            ),
          };
        });
      const g1 = await probe();
      await setFeedTop((await feedTop()) + 700);
      await page.waitForTimeout(250);
      const g2 = await probe();
      await setFeedTop((await feedTop()) + 900);
      await page.waitForTimeout(250);
      const g3 = await probe();
      const pinned = (g) =>
        g.stuck === "1" &&
        g.wrapTop === 0 &&
        g.lensTop === g.wrapH &&
        g.hits.every(Boolean) &&
        !g.articleAbove;
      record(
        tag +
          " 6. once the greeting leaves, control and LensBar pin as one block at the column top; no post paints above or through it while scrolling",
        geo0.stuck === "0" && pinned(g1) && pinned(g2) && pinned(g3),
        JSON.stringify({ geo0, g1, g2, g3 }),
      );

      // 13. Ruling 589: the greeting owns the clearance beneath it. The anchor's own ground begins
      // 12px above its border box, because `boxShadow: 0 -12px 0 0 var(--bg)` paints that band, and
      // the anchor's zIndex puts it over the static greeting. Its `margin: -12px 0` does not add to
      // that: it cancels the column's own `gap: 12` exactly, so the border box begins on the
      // greeting's bottom edge rather than 12px above it. The greeting's bottom padding therefore
      // has to clear the shadow's band, and the assertion is on the date's line box rather than on
      // its glyphs, so it does not depend on the display font's metrics. Read at scroll 0 and
      // mid-scroll, because the anchor is sticky in both states.
      const clearance = async () =>
        page.evaluate(() => {
          const gr = document.querySelector("[data-greeting]");
          const a = document.querySelector("[data-feed] [data-lens-anchor]");
          if (!gr || !a) return null;
          const date = gr.lastElementChild.getBoundingClientRect();
          // The band is read off the shadow rather than hardcoded, so the arm follows the anchor if
          // the offset ever changes. rgb(...) carries no px, so the four px values are the
          // shadow's own offsets and blur; index 1 is the y offset, -12.
          const shadow = getComputedStyle(a).boxShadow;
          const px = (shadow.match(/-?\d+(?:\.\d+)?px/g) || []).map(parseFloat);
          const band = Math.abs(px[1] || 0);
          return {
            clearance: Math.round(a.getBoundingClientRect().top - band - date.bottom),
            padBottom: getComputedStyle(gr).paddingBottom,
            gapToAnchor: Math.round(
              a.getBoundingClientRect().top - gr.getBoundingClientRect().bottom,
            ),
            band,
          };
        });
      await setFeedTop(0);
      await page.waitForTimeout(200);
      const c0 = await clearance();
      await setFeedTop(40);
      await page.waitForTimeout(200);
      const c1 = await clearance();
      record(
        tag +
          " 13. the greeting's date renders whole: its line box clears the lens anchor's painted ground at scroll 0 and mid-scroll (589)",
        !!c0 && !!c1 && c0.clearance >= 0 && c1.clearance >= 0,
        JSON.stringify({ c0, c1 }),
      );
      await setFeedTop(0);
      await page.waitForTimeout(150);
    }

    // 7. Read more expands in place; Show less and browser back collapse; scroll unchanged.
    await setFeedTop(0);
    await page.waitForTimeout(150);
    const card = page.locator("[data-feed] article[data-c]").nth(3);
    await card.scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    const t0 = await feedTop();
    await card.locator("[data-read-more]").click();
    await page.waitForURL("**/posts/seed-3");
    await card.locator("[data-show-less]").waitFor({ timeout: 10000 });
    await page.waitForTimeout(250);
    const t1 = await feedTop();
    const expandedCount = await page.locator("[data-feed] article[data-expanded='1']").count();
    await card.locator("[data-show-less]").click();
    await page.waitForURL((u) => u.pathname === "/feed");
    await card.locator("[data-read-more]").waitFor({ timeout: 10000 });
    await page.waitForTimeout(250);
    const t2 = await feedTop();
    await card.locator("[data-read-more]").click();
    await page.waitForURL("**/posts/seed-3");
    await card.locator("[data-show-less]").waitFor({ timeout: 10000 });
    await page.goBack();
    await page.waitForURL((u) => u.pathname === "/feed");
    await card.locator("[data-read-more]").waitFor({ timeout: 10000 });
    await page.waitForTimeout(250);
    const t3 = await feedTop();
    record(
      tag +
        " 7. Read more expands the same card in place at /posts/:id with scroll unchanged; Show less and browser back collapse it and return the URL",
      expandedCount === 1 && t1 === t0 && t2 === t0 && t3 === t0 && page.url().endsWith("/feed"),
      JSON.stringify({ t0, t1, t2, t3, expandedCount, url: page.url() }),
    );

    // 8. Fresh tab on /posts/:id: expanded card as page content, Back to Feed, no modal, no scrim.
    const fresh = await ctx.newPage();
    await mockSupabase(fresh, db);
    await fresh.goto(BASE + "/posts/seed-2", { waitUntil: "networkidle" });
    const direct = fresh.locator('[data-direct-post="seed-2"]');
    await direct.locator("article[data-c]").waitFor({ timeout: 15000 });
    const bodyClamped = await direct.locator("article[data-c] [data-read-more]").count();
    record(
      tag +
        " 8. fresh tab on /posts/:id renders the expanded card as page content with Back to Feed; no dialog, no scrim",
      (await direct.locator("article[data-c]").count()) === 1 &&
        bodyClamped === 0 &&
        (await fresh.locator('[data-testid="back-to-feed"]').count()) === 1 &&
        (await fresh.locator('[role="dialog"]').count()) === 0 &&
        (await fresh.locator("[data-sheet-scrim]").count()) === 0 &&
        (await fresh.locator("[data-feed] [data-lens-anchor]").count()) === 0,
    );
    await shot(fresh, `${tag}-direct`);
    await fresh.close();

    // 9. Active lens tap toggles the descriptor; switching lenses never moves the bar.
    await setFeedTop(0);
    await page.waitForTimeout(150);
    const bar = page.locator('[data-feed] [role="tablist"][aria-label="Lens"]');
    const scope0 = await page.locator("[data-feed] [data-lens-scope]").getAttribute("data-open");
    await bar.locator('[data-lens="all"]').click();
    await page.waitForTimeout(250);
    const scope1 = await page.locator("[data-feed] [data-lens-scope]").getAttribute("data-open");
    await bar.locator('[data-lens="all"]').click();
    await page.waitForTimeout(250);
    const scope2 = await page.locator("[data-feed] [data-lens-scope]").getAttribute("data-open");
    const y0 = (await bar.boundingBox()).y;
    await bar.locator('[data-lens="mine"]').click();
    await page.waitForURL("**/feed?lens=mine");
    await page.locator("[data-feed] article[data-c]").first().waitFor({ timeout: 10000 });
    await page.waitForTimeout(300);
    const y1 = (await bar.boundingBox()).y;
    await bar.locator('[data-lens="saved"]').click();
    await page.waitForURL("**/feed?lens=saved");
    await page.locator('[data-testid="feed-empty"][data-lens="saved"]').waitFor({ timeout: 10000 });
    await page.waitForTimeout(300);
    const y2 = (await bar.boundingBox()).y;
    let pinnedLens = { ok: true };
    if (tier === "expanded") {
      // From the pinned bar too: the bar stays where it is and the header/column do not jump.
      await bar.locator('[data-lens="all"]').click();
      await page.waitForURL((u) => u.pathname === "/feed" && !u.search);
      await page.locator("[data-feed] article[data-c]").nth(9).waitFor({ timeout: 10000 });
      await setFeedTop(600);
      await page.waitForTimeout(300);
      const py0 = (await bar.boundingBox()).y;
      await bar.locator('[data-lens="mine"]').click();
      await page.waitForURL("**/feed?lens=mine");
      await page.locator("[data-feed] article[data-c]").first().waitFor({ timeout: 10000 });
      await page.waitForTimeout(400);
      const py1 = (await bar.boundingBox()).y;
      const stuckAfter = await page.locator("[data-compose-wrap]").getAttribute("data-stuck");
      pinnedLens = { ok: Math.abs(py1 - py0) <= 1 && stuckAfter === "1", py0, py1, stuckAfter };
    } else {
      // From the header slot: the header stays in lens mode and the bar does not move.
      await bar.locator('[data-lens="all"]').click();
      await page.waitForURL((u) => u.pathname === "/feed" && !u.search);
      await page.locator("[data-feed] article[data-c]").nth(9).waitFor({ timeout: 10000 });
      await setFeedTop(400);
      await page.waitForTimeout(300);
      const hb = page.locator('[data-app-header] [role="tablist"][aria-label="Lens"]');
      const py0 = (await hb.boundingBox()).y;
      await hb.locator('[data-lens="mine"]').click();
      await page.waitForURL("**/feed?lens=mine");
      await page.locator("[data-feed] article[data-c]").first().waitFor({ timeout: 10000 });
      await page.waitForTimeout(400);
      const py1 = (await hb.boundingBox()).y;
      const still = await centre();
      pinnedLens = { ok: Math.abs(py1 - py0) <= 1 && still === "lens", py0, py1, still };
    }
    record(
      tag +
        " 9. tapping the active lens toggles the descriptor; switching lenses (in flow and from the pinned or header bar) never moves the bar",
      scope1 !== scope0 && scope2 === scope0 && y0 === y1 && y1 === y2 && pinnedLens.ok,
      JSON.stringify({ scope0, scope1, scope2, y0, y1, y2, pinnedLens }),
    );

    // 11. Ruling 109: a lens change while pinned lands the first item of the new list exactly
    // beneath the pinned block; the block does not move and stays pinned.
    if (tier === "expanded") {
      await bar.locator('[data-lens="all"]').click();
      await page.waitForURL((u) => u.pathname === "/feed" && !u.search);
      await page.locator("[data-feed] article[data-c]").nth(9).waitFor({ timeout: 10000 });
      await setFeedTop(700);
      await page.waitForTimeout(300);
      const seam = () =>
        page.evaluate(() => {
          const sc = document.querySelector('[data-scroller="feed"]').getBoundingClientRect();
          const wrap = document.querySelector("[data-compose-wrap]");
          const lens = document.querySelector("[data-feed] [data-lens-anchor]");
          const lb = lens.getBoundingClientRect();
          const first = document.querySelector(
            "[data-feed] article[data-c], [data-feed] [data-testid='feed-empty']",
          );
          const fb = first ? first.getBoundingClientRect() : null;
          const probe = fb ? document.elementFromPoint(sc.left + sc.width / 2, fb.top + 2) : null;
          return {
            stuck: wrap.getAttribute("data-stuck"),
            wrapTop: Math.round(wrap.getBoundingClientRect().top - sc.top),
            blockBottom: Math.round(lb.bottom - sc.top),
            firstTop: fb ? Math.round(fb.top - sc.top) : null,
            firstTopVisible: !!probe && !!first && first.contains(probe),
            barY: Math.round(lb.top),
          };
        });
      const s0 = await seam();
      await bar.locator('[data-lens="mine"]').click();
      await page.waitForURL("**/feed?lens=mine");
      await page.locator("[data-feed] article[data-c]").first().waitFor({ timeout: 10000 });
      await page.waitForTimeout(400);
      const s1 = await seam();
      await bar.locator('[data-lens="saved"]').click();
      await page.waitForURL("**/feed?lens=saved");
      await page
        .locator('[data-testid="feed-empty"][data-lens="saved"]')
        .waitFor({ timeout: 10000 });
      await page.waitForTimeout(400);
      const s2 = await seam();
      const landed = (s) =>
        s.stuck === "1" &&
        s.wrapTop === 0 &&
        s.firstTop != null &&
        s.firstTop - s.blockBottom >= 0 &&
        s.firstTop - s.blockBottom <= 1 &&
        s.firstTopVisible &&
        s.barY === s0.barY;
      record(
        tag +
          " 11. lens change while pinned: first item of the new list sits exactly beneath the pinned block, none of its top hidden, block unmoved and still pinned",
        s0.stuck === "1" && landed(s1) && landed(s2),
        JSON.stringify({ s0, s1, s2 }),
      );
      await shot(page, `${tag}-11-pinned-lens`);
    }

    // 10. Header row per tier.
    const head = await page.evaluate(() => {
      const h = document.querySelector("[data-app-header]");
      const slots = [...h.querySelectorAll('nav[data-pulse="inline"] button')].map((b) =>
        b.getBoundingClientRect(),
      );
      const gaps = slots.slice(1).map((r, i) => Math.round(r.left - slots[i].right));
      return {
        height: h.getBoundingClientRect().height,
        slots: slots.length,
        gaps,
        even: gaps.length === 4 && Math.max(...gaps) - Math.min(...gaps) <= 2,
        home: !!h.querySelector('[data-testid="home-item"]'),
        homeIsIcon: !!h.querySelector('[data-testid="home-item"] span[style*="house.svg"]'),
        logoHref: h.querySelector('[data-testid="home"]').getAttribute("href"),
        rows: [...h.querySelectorAll("nav")].length,
      };
    });
    record(
      tag +
        (tier === "expanded"
          ? " 10. expanded header is one row: logo, five Cs spread evenly, Home icon, bell, avatar"
          : " 10. " + tier + " header has no Home icon; the logo goes Home"),
      tier === "expanded"
        ? head.height <= 66 &&
            head.slots === 5 &&
            head.even &&
            head.home &&
            head.homeIsIcon &&
            head.rows === 1
        : !head.home && head.logoHref === "/feed" && head.slots === 0,
      JSON.stringify(head),
    );

    // 12. Ruling 588: the fade is measured from the card's bottom edge. At expanded the bar is the
    // column's own sticky anchor, which is sticky in both of its states, so the selector carries no
    // [data-stuck] qualifier; below 1024 the header holds the lens bar past 72px and is the edge.
    //
    // Back to All first: items 9 and 11 leave the column on Saved, which is empty by design, and a
    // fade arm with nothing to fade would pass by having nothing to look at.
    await page.goto(BASE + "/feed", { waitUntil: "networkidle" });
    await page.locator("[data-feed] article[data-c]").first().waitFor({ timeout: 15000 });
    await setFeedTop(0);
    await page.waitForTimeout(250);
    const fade = await fadeProbe(
      page,
      tier === "expanded" ? "[data-lens-anchor]" : "[data-app-header]",
    );
    record(
      tag +
        " 12. no card is invisible while any part of it is below the bar, none fades before the bar" +
        " is within reach, and the outgoing tail overlaps the next card's arrival (588)",
      fade.ok,
      JSON.stringify(fade.detail),
    );
  } catch (e) {
    record(tag + " flow", false, String(e).slice(0, 400));
    await shot(page, `${tag}-ERROR`).catch(() => {});
  }
  record(
    tag + " no page errors",
    errors.length === 0,
    errors.slice(0, 3).join(" | ").slice(0, 300),
  );
  await browser.close();
}

const TARGETED_VIEWPORTS = [
  [390, 844],
  [820, 1180],
  [1280, 800],
  [1536, 960],
];

// Silence when DIA times out or errors: identical to no DIA.
// ---------------------------------------------------------------------------
// Ruling 588: the fade's measured edge, asserted from geometry rather than from a fixed scroll.
//
// The rule is one sentence: a card holds opacity 1 until its BOTTOM edge is within
// FADE_UNDER_DISTANCE of the sticky bar's bottom edge, and reaches 0 only once that edge has
// passed under it. Measuring the top edge, as CardFade did until 588, took a tall card to 0 while
// most of it was still on screen holding its full layout box, which is the blank region between
// the bar and the first legible card that this arm exists to catch.
//
// The scroll target is derived from the live geometry (put the first card's bottom `under` px
// below the bar) rather than hardcoded, because one number cannot be inside the fade window at
// 390 and at 1536 alike. A column too short to scroll that far reports reachable: false and is
// judged on the invariant alone: nothing has reached the bar, so nothing may be faded. That is the
// real state at 744 and 820 with the seeded fixture, where the whole list fits the viewport.
// ---------------------------------------------------------------------------
const FADE_UNDER_DISTANCE = 96;

async function fadeProbe(page, barSelector, under = 48) {
  const raw = await page.evaluate(
    async ({ sel, under }) => {
      const twoFrames = () =>
        new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      const sc = document.querySelector('[data-scroller="feed"]');
      const barBottom = () => {
        const el = document.querySelector(sel);
        return el ? el.getBoundingClientRect().bottom : null;
      };
      const read = () =>
        [...document.querySelectorAll("[data-card-fade]")].map((el) => {
          const r = el.getBoundingClientRect();
          return {
            top: Math.round(r.top),
            bottom: Math.round(r.bottom),
            h: Math.round(r.height),
            op: Number(getComputedStyle(el).opacity),
          };
        });
      if (!sc) return { err: "no [data-scroller=feed]" };
      if (barBottom() === null) return { err: "the bar selector did not resolve: " + sel };
      if (read().length === 0) return { err: "no [data-card-fade] on the surface" };
      // Converged rather than solved in one step: the bar itself moves as the column scrolls. At
      // expanded the anchor starts in flow below the composer and the greeting and only then
      // becomes sticky at the column top, so a target computed from where the bar was is wrong by
      // however far the bar has since travelled. Four steps settle it at every tier; a column too
      // short to reach the target clamps and is reported as not reachable.
      const max = sc.scrollHeight - sc.clientHeight;
      let needed = sc.scrollTop;
      for (let i = 0; i < 4; i++) {
        needed = sc.scrollTop + (read()[0].bottom - barBottom()) - under;
        sc.scrollTop = Math.min(max, Math.max(0, needed));
        await twoFrames();
        if (Math.abs(read()[0].bottom - barBottom() - under) <= 2) break;
      }
      await twoFrames();
      const scr = sc.getBoundingClientRect();
      return {
        reachable: needed >= -2 && needed <= max + 2,
        scrollTop: Math.round(sc.scrollTop),
        max: Math.round(max),
        bar: Math.round(barBottom()),
        scTop: Math.round(scr.top),
        scBottom: Math.round(scr.bottom),
        cards: read(),
      };
    },
    { sel: barSelector, under },
  );
  if (raw.err) return { ok: false, detail: raw };
  const vis = raw.cards.filter((c) => c.bottom > raw.scTop && c.top < raw.scBottom);
  // Invisible while any part of it is still below the bar: the 588 defect itself, and with it the
  // blank region, since the card that painted nothing is the one that held the gap.
  const invisibleWhileBelow = vis.find((c) => c.bottom > raw.bar + 1 && c.op <= 0.001) || null;
  // Wholly clear of the fade window, so 489's curve has not started.
  const fadedTooEarly =
    vis.find((c) => c.bottom - raw.bar >= FADE_UNDER_DISTANCE + 1 && c.op < 0.999) || null;
  const first = raw.cards[0];
  const next = raw.cards[1];
  const midFade = !!first && first.op > 0.002 && first.op < 0.998;
  // The overlap 588 asks for: the outgoing card's tail is still painting while the next card is
  // fully opaque, rather than one going before the other arrives.
  const overlaps = !raw.reachable || (midFade && !!next && next.op > 0.998);
  return {
    ok:
      !invisibleWhileBelow &&
      !fadedTooEarly &&
      (!raw.reachable || midFade) &&
      overlaps &&
      (raw.reachable || raw.cards.every((c) => c.op > 0.998)),
    detail: {
      reachable: raw.reachable,
      scrollTop: raw.scrollTop,
      max: raw.max,
      bar: raw.bar,
      cards: raw.cards.map((c) => ({ ...c, op: Number(c.op.toFixed(3)) })),
      invisibleWhileBelow,
      fadedTooEarly,
    },
  };
}

// ---------------------------------------------------------------------------
// Ruling 344: the width arm. One arm per engine and viewport, light theme (width does not depend
// on the palette), walking every surface the suites open in the states that change its layout:
// the public profile signed out, the three onboarding screens, the feed with the composer, the
// notification and account panels open, Connect's list and mosaic, the owner's profile, change
// password, sign-in and reset. Each
// stop is one check that fails when the document is wider than the viewport at that tier, with
// the offending element named (measureWidth above).
// ---------------------------------------------------------------------------
const WIDTH_STOPS = [
  ["/connect", "connect members"],
  ["/connect?lens=where", "connect where"],
  ["/m/thandiwe-dube", "profile"],
  ["/password", "change password"],
];

async function runWidth(browserType, bname, [w, h]) {
  const tag = `${bname}-${w}x${h}-width`;
  armStart(tag);
  const browser = await launch(browserType);
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    hasTouch: w <= 1024,
    isMobile: w < 1024,
    deviceScaleFactor: 1,
    colorScheme: "light",
  });
  const page = await ctx.newPage();
  const db = makeMockDb();
  seedPosts(db, 3);
  // Ruling 469: nothing is prefilled before the Who screen is written.
  const who = {
    name: "",
    username: null,
    suggestion: null,
    avatar_path: null,
    completed: false,
  };
  const where = { city: null, country: null, completed: false };
  const relationship = {
    stance: "exploring",
    stance_label: "Still exploring",
    declared: false,
    completed: false,
  };
  db.onboarding.state = { next: "who", who, where, relationship, onboarded_at: null };
  await mockSupabase(page, db);
  const stop = async (label) => {
    await page.waitForTimeout(600);
    await noOverflow(page, `${tag} ${label}`);
  };
  const visit = async (path, glob, label) => {
    await page.goto(BASE + path, { waitUntil: "networkidle" }).catch(() => undefined);
    if (glob) await page.waitForURL(glob, { timeout: 15000 });
    await stop(label);
  };
  try {
    // Signed out first: the public profile is the surface the element ruling 344 names sat on.
    await visit("/m/thandiwe-dube", null, "public profile");
    await visit("/reset", null, "reset request");
    await visit("/sign-in", null, "sign-in");
    await page.fill('input[type="email"]', "member@test.invalid");
    await page.fill('input[type="password"]', "x");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/welcome", { timeout: 15000 });
    await page.waitForSelector('[data-testid="onboarding-who"]', { timeout: 15000 });
    await stop("onboarding who");
    db.onboarding.state.next = "where";
    db.onboarding.state.who = { ...who, username: "amara-osei", completed: true };
    await visit("/where", "**/where", "onboarding where");
    db.onboarding.state.next = "relationship";
    db.onboarding.state.where = { city: "Nairobi", country: "Kenya", completed: true };
    await visit("/relationship", "**/relationship", "onboarding relationship");
    db.onboarding.state.next = null;
    db.onboarding.state.onboarded_at = new Date().toISOString();
    await visit("/feed", "**/feed", "feed");
    await page.waitForSelector('[data-testid="compose"]');
    await page.click('[data-testid="compose"]');
    await stop("composer open");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    await page.click('[data-testid="bell"]');
    await stop("notifications open");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);
    await page.click('[data-testid="avatar"]');
    await stop("account panel open");
    await page.keyboard.press("Escape");
    for (const [path, label] of WIDTH_STOPS) await visit(path, null, label);
  } catch (e) {
    record(tag + " completed", false, String(e).slice(0, 400));
  } finally {
    await shot(page, `${tag}-last`).catch(() => undefined);
    await browser.close();
  }
}

async function runSilence(browserType, bname) {
  const tag = `${bname}-390x844-light-silence`;
  armStart(tag);
  const browser = await launch(browserType);
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await ctx.newPage();
  const db = makeMockDb();
  await mockSupabase(page, db, { inferDelay: 5000 });
  try {
    await signIn(page);
    await page.click('[data-testid="compose"]');
    const dialog = page.locator('section[role="dialog"][aria-label="Compose"]');
    await dialog.waitFor();
    await dialog.locator('textarea[aria-label="What is going on with you"]').fill(SAMPLES.convene);
    await dialog.locator('[data-dia="thinking"]').waitFor({ timeout: 3000 });
    await page.waitForTimeout(3800); // budget is 3.5 s (ruling 74)
    record(
      tag + " timeout past 3.5s -> silence, untyped convey, no chip",
      (await dialog.locator("[data-dia]").count()) === 0 &&
        (await dialog.locator('[role="radio"][aria-checked="true"]').count()) ===
          1 /* audience pill only */ &&
        (await dialog
          .locator("article[aria-label='Preview of your post']")
          .getAttribute("data-c")) === "convey",
    );
    await page.screenshot({ path: path.join(OUT, `${tag}.png`) });
    // Short text: no inference at all.
    db.inferCalls = 0;
    await dialog.locator('textarea[aria-label="What is going on with you"]').fill("Hi all");
    await page.waitForTimeout(1200);
    record(tag + " under 8 characters: no inference call", db.inferCalls === 0);
  } catch (e) {
    record(tag + " flow", false, String(e).slice(0, 300));
  }
  await browser.close();
}

// iOS keyboard surrogate: shrink visualViewport and check data-kb and Publish placement.
async function runKeyboard(browserType, bname) {
  const tag = `${bname}-390x844-keyboard`;
  armStart(tag);
  const browser = await launch(browserType);
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    const target = new EventTarget();
    const fake = {
      height: window.innerHeight,
      width: window.innerWidth,
      offsetTop: 0,
      offsetLeft: 0,
      pageTop: 0,
      pageLeft: 0,
      scale: 1,
      addEventListener: (...a) => target.addEventListener(...a),
      removeEventListener: (...a) => target.removeEventListener(...a),
      dispatchEvent: (e) => target.dispatchEvent(e),
    };
    Object.defineProperty(window, "visualViewport", { value: fake, configurable: true });
    window.__setKeyboard = (kb) => {
      fake.height = window.innerHeight - kb;
      target.dispatchEvent(new Event("resize"));
    };
  });
  const db = makeMockDb();
  await mockSupabase(page, db);
  try {
    await signIn(page);
    await page.click('[data-testid="compose"]');
    const dialog = page.locator('section[role="dialog"][aria-label="Compose"]');
    await dialog.waitFor();
    await page.waitForTimeout(500); // the 300ms slide must finish before geometry is measured
    record(tag + " no data-kb before keyboard", (await dialog.getAttribute("data-kb")) === null);
    await dialog.locator('textarea[aria-label="What is going on with you"]').focus();
    await page.evaluate(() => window.__setKeyboard(336));
    await page.waitForTimeout(100);
    record(
      tag + " data-kb=1 while keyboard tracking active",
      (await dialog.getAttribute("data-kb")) === "1",
    );
    const pb = await dialog.getByRole("button", { name: "Publish" }).boundingBox();
    record(
      tag + " Publish stays above the keyboard",
      pb && pb.y + pb.height <= 844 - 336 + 1,
      JSON.stringify(pb),
    );
    await page.screenshot({ path: path.join(OUT, `${tag}.png`) });
    await page.evaluate(() => window.__setKeyboard(0));
    await page.waitForTimeout(100);
    record(tag + " restores on keyboard dismiss", (await dialog.getAttribute("data-kb")) === null);
  } catch (e) {
    record(tag + " flow", false, String(e).slice(0, 300));
  }
  await browser.close();
}

module.exports = {
  launch,
  makeMockDb,
  seedPosts,
  mockSupabase,
  signIn,
  record,
  results,
  armStart,
  armCrashed,
  watchCrash,
  shot,
  noOverflow,
  measureWidth,
  fadeProbe,
  FADE_UNDER_DISTANCE,
  BASE,
  OUT,
  VIEWPORTS,
  THEMES,
  FULL_PREVIEW_AT,
  JWT,
  UID,
  SB,
  CONNECT_MEMBERS,
  CONNECT_SUGGESTED,
  CONNECT_WHERE,
};

/**
 * Ruling 283: the job is split by engine, so a run names the engine it drives and its arms are
 * comparable against the arms of the same engine and no other. ENGINE=chromium or ENGINE=webkit
 * runs one; unset keeps the old shape, where WEBKIT=1 adds WebKit alongside Chromium.
 */
function selectEngines() {
  const all = { chromium, webkit };
  const pick = (process.env.ENGINE || "").trim();
  if (!pick) {
    const engines = [["chromium", chromium]];
    if (process.env.WEBKIT === "1") engines.push(["webkit", webkit]);
    return engines;
  }
  const names = pick
    .split(",")
    .map((n) => n.trim())
    .filter(Boolean);
  const unknown = names.filter((n) => !all[n]);
  // Loud rather than empty: an ENGINE typo that silently ran nothing would report a green run of
  // no arms at all, which is the shape of false all-clear this PR exists to remove.
  if (unknown.length || !names.length)
    throw new Error(`ENGINE=${pick} names no engine this suite drives (chromium, webkit)`);
  return names.map((n) => [n, all[n]]);
}

if (require.main === module)
  (async () => {
    const only = process.env.ONLY ? JSON.parse(process.env.ONLY) : null;
    if (process.env.SPECIAL) {
      const specialEngines = selectEngines();
      for (const [bname, bt] of specialEngines) {
        if (process.env.SPECIAL.includes("publish"))
          await runPublish(bt, bname, [390, 844], "light");
        if (process.env.SPECIAL.includes("guards")) {
          await runPublishGuards(bt, bname, [390, 844], "light");
          await runPublishGuards(bt, bname, [1280, 800], "dark");
        }
        if (process.env.SPECIAL.includes("keyboard")) await runKeyboard(bt, bname);
        if (process.env.SPECIAL.includes("convene")) {
          await runConvene(bt, bname, [390, 844], "light");
          await runConvene(bt, bname, [1280, 800], "dark");
          await runConveneZone(bt, bname, [390, 844], "light");
          await runConveneZone(bt, bname, [1280, 800], "dark");
        }
        if (process.env.SPECIAL.includes("silence")) await runSilence(bt, bname);
        if (process.env.SPECIAL.includes("shell"))
          for (const vp of process.env.ONLY ? [JSON.parse(process.env.ONLY)] : VIEWPORTS)
            await runShell(bt, bname, vp);
        // Ruling 344: the width arm, every viewport.
        if (process.env.SPECIAL.includes("width"))
          for (const vp of process.env.ONLY ? [JSON.parse(process.env.ONLY)] : VIEWPORTS)
            await runWidth(bt, bname, vp);
        if (process.env.SPECIAL.includes("targeted"))
          for (const vp of process.env.ONLY ? [JSON.parse(process.env.ONLY)] : TARGETED_VIEWPORTS)
            await runTargeted(bt, bname, vp);
        if (process.env.SPECIAL.includes("profile")) {
          const { runProfile } = require("./profile.cjs");
          for (const vp of process.env.ONLY ? [JSON.parse(process.env.ONLY)] : VIEWPORTS)
            for (const theme of process.env.THEME ? [process.env.THEME] : THEMES)
              await runProfile(bt, bname, vp, theme);
        }
        // Rulings 193, 194: the vocabulary read served, then forced to fail, on both layouts.
        if (process.env.SPECIAL.includes("vocab")) {
          const { runVocabulary } = require("./vocabulary.cjs");
          for (const vp of process.env.ONLY
            ? [JSON.parse(process.env.ONLY)]
            : [
                [390, 844],
                [1280, 800],
              ])
            for (const theme of process.env.THEME ? [process.env.THEME] : THEMES)
              for (const fail of [false, true]) await runVocabulary(bt, bname, vp, theme, fail);
        }
        // Ruling 198 and Brief 4A: both parties' views, the control end to end, and its focus.
        if (process.env.SPECIAL.includes("block")) {
          const { runBlock, runBlocker, runBlockFlow, runBlockFocus } = require("./block.cjs");
          for (const vp of process.env.ONLY
            ? [JSON.parse(process.env.ONLY)]
            : [
                [390, 844],
                [1280, 800],
              ])
            for (const theme of process.env.THEME ? [process.env.THEME] : THEMES) {
              await runBlock(bt, bname, vp, theme);
              await runBlocker(bt, bname, vp, theme);
              await runBlockFlow(bt, bname, vp, theme);
              await runBlockFocus(bt, bname, vp, theme);
            }
        }
        // Brief 5 (ruling 279): the three screens at every viewport and both themes, then the
        // state proofs on the two representative layouts.
        if (process.env.SPECIAL.includes("onboarding")) {
          const {
            runOnboardingLayout,
            runOnboardingFlows,
            runOnboardingPhotoFormats,
          } = require("./onboarding.cjs");
          for (const vp of process.env.ONLY ? [JSON.parse(process.env.ONLY)] : VIEWPORTS)
            for (const theme of process.env.THEME ? [process.env.THEME] : THEMES)
              await runOnboardingLayout(bt, bname, vp, theme);
          for (const vp of process.env.ONLY
            ? [JSON.parse(process.env.ONLY)]
            : [
                [390, 844],
                [1280, 800],
              ])
            for (const theme of process.env.THEME ? [process.env.THEME] : THEMES)
              await runOnboardingFlows(bt, bname, vp, theme);
          // Ruling 345: the HEIC and oversized-JPEG arm runs once per engine, at the compact tier.
          await runOnboardingPhotoFormats(bt, bname, [390, 844], process.env.THEME || "light");
        }
        if (process.env.SPECIAL.includes("connect")) {
          const { runConnect } = require("./connect.cjs");
          for (const vp of process.env.ONLY ? [JSON.parse(process.env.ONLY)] : VIEWPORTS)
            for (const theme of process.env.THEME ? [process.env.THEME] : THEMES)
              await runConnect(bt, bname, vp, theme);
        }
        // Brief 4B (rulings 230 to 236, 240): sign-in's additions, the two reset routes and the
        // signed-in change-password path. The layout pass runs everywhere; the state flows run on
        // the two representative layouts, as vocab and block do.
        if (process.env.SPECIAL.includes("auth")) {
          const { runAuthLayout, runAuthFlows } = require("./auth.cjs");
          for (const vp of process.env.ONLY ? [JSON.parse(process.env.ONLY)] : VIEWPORTS)
            for (const theme of process.env.THEME ? [process.env.THEME] : THEMES)
              await runAuthLayout(bt, bname, vp, theme);
          for (const vp of process.env.ONLY
            ? [JSON.parse(process.env.ONLY)]
            : [
                [390, 844],
                [1280, 800],
              ])
            for (const theme of process.env.THEME ? [process.env.THEME] : THEMES)
              await runAuthFlows(bt, bname, vp, theme);
        }
      }
      finish({ full: false, engines: specialEngines.map(([n]) => n) });
    }
    const engines = selectEngines();
    for (const [bname, bt] of engines) {
      for (const vp of only ? [only] : VIEWPORTS) {
        for (const theme of only ? [process.env.THEME || "light"] : THEMES)
          await runViewport(bt, bname, vp, theme);
        await runShell(bt, bname, vp);
        await runWidth(bt, bname, vp);
      }
      if (only) {
        finish({ full: false, engines: engines.map(([n]) => n) });
      }
      await runPublish(bt, bname, [390, 844], "light");
      await runPublish(bt, bname, [1280, 800], "dark");
      await runPublishGuards(bt, bname, [390, 844], "light");
      await runPublishGuards(bt, bname, [1280, 800], "dark");
      await runSilence(bt, bname);
      await runKeyboard(bt, bname);
      // Convene Pass 1 (P1-SPEC section 6): the composer's Convene mode and the card.
      await runConvene(bt, bname, [390, 844], "light");
      await runConvene(bt, bname, [1280, 800], "dark");
      await runConveneZone(bt, bname, [390, 844], "light");
      await runConveneZone(bt, bname, [1280, 800], "dark");
      for (const vp of TARGETED_VIEWPORTS) await runTargeted(bt, bname, vp);
      // Brief 3: the profile in its three views plus editing mode, every viewport, both themes.
      const { runProfile } = require("./profile.cjs");
      for (const vp of VIEWPORTS)
        for (const theme of THEMES) await runProfile(bt, bname, vp, theme);
      // Brief 4: Connect's four lenses, sheets and rails, every viewport, both themes.
      const { runConnect } = require("./connect.cjs");
      for (const vp of VIEWPORTS)
        for (const theme of THEMES) await runConnect(bt, bname, vp, theme);
      // Rulings 193, 194: the vocabulary read served and then failing, on both layouts.
      const { runVocabulary } = require("./vocabulary.cjs");
      for (const vp of [
        [390, 844],
        [1280, 800],
      ])
        for (const theme of THEMES)
          for (const fail of [false, true]) await runVocabulary(bt, bname, vp, theme, fail);
      // Brief 4B: every auth surface rendered at every viewport and both themes, then the state
      // flows on the two representative layouts.
      const { runAuthLayout, runAuthFlows } = require("./auth.cjs");
      for (const vp of VIEWPORTS)
        for (const theme of THEMES) await runAuthLayout(bt, bname, vp, theme);
      for (const vp of [
        [390, 844],
        [1280, 800],
      ])
        for (const theme of THEMES) await runAuthFlows(bt, bname, vp, theme);
      // Ruling 198 and Brief 4A: the blocked party's view, the blocker's own view, the control end
      // to end and its focus management, on both layouts and both themes.
      const { runBlock, runBlocker, runBlockFlow, runBlockFocus } = require("./block.cjs");
      for (const vp of [
        [390, 844],
        [1280, 800],
      ])
        for (const theme of THEMES) {
          await runBlock(bt, bname, vp, theme);
          await runBlocker(bt, bname, vp, theme);
          await runBlockFlow(bt, bname, vp, theme);
          await runBlockFocus(bt, bname, vp, theme);
        }
      // Brief 5 (ruling 279): the three onboarding screens everywhere, the state flows on the
      // two representative layouts.
      const {
        runOnboardingLayout,
        runOnboardingFlows,
        runOnboardingPhotoFormats,
      } = require("./onboarding.cjs");
      for (const vp of VIEWPORTS)
        for (const theme of THEMES) await runOnboardingLayout(bt, bname, vp, theme);
      for (const vp of [
        [390, 844],
        [1280, 800],
      ])
        for (const theme of THEMES) await runOnboardingFlows(bt, bname, vp, theme);
      // Ruling 345: the HEIC and oversized-JPEG arm runs once per engine, at the compact tier.
      await runOnboardingPhotoFormats(bt, bname, [390, 844], "light");
    }
    finish({ full: true, engines: engines.map(([n]) => n) });
  })().catch((e) => {
    // Ruling 228: a run that dies mid-flow still owes a report. The arm that was open is short of
    // its declared count and is named as incomplete, rather than the whole run vanishing.
    record("the matrix run completed without throwing", false, String(e).slice(0, 1200));
    try {
      finish({ full: false, engines: [] });
    } catch {
      process.exit(1);
    }
  });
