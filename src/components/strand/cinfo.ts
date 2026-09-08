// Ported from profile/strand-patch/Profile.jsx (B3-Profile-v3, ruling 130). Copy for the five C
// sheets on the public close; follows the voice rules. No counts, no marketing numbers.
import type { C } from "./cmeta";

export type CInfo = {
  label: string;
  line: string;
  overview: string;
  can: string[];
  who: string;
  links: string;
};

export const C_INFO: Record<C, CInfo> = {
  connect: {
    label: "Connect",
    line: "Find the members who can move your work.",
    overview:
      "Connect is where members find each other: profiles, a directory by focus, heritage and place, and intros made by people who know both sides.",
    can: [
      "Search members by focus area, industry, region and language",
      "Ask for an intro through a shared connection",
      "Follow members whose work you want to keep close",
      "See what you have in common before you reach out",
    ],
    who: "Members looking for collaborators, mentors, clients or a familiar face in a new city.",
    links:
      "Connections carry into Convene (who is in the room), Collaborate (who joins a Space) and Contribute (who fulfils a Need).",
  },
  convene: {
    label: "Convene",
    line: "Gather the diaspora, online and on the ground.",
    overview:
      "Convene is the events layer: hosting, tickets and check-in, built for diaspora gatherings across every time zone the diaspora lives in.",
    can: [
      "Host free or ticketed events, online, in person or both",
      "Find gatherings by city, sector and Space",
      "Keep your ticket in your wallet and your email",
      "Have your hosting and attendance attested on your profile",
    ],
    who: "Organisers, chapter leads and members looking for the right room to walk into next.",
    links: "Events deepen Connect, seed Collaborate Spaces and become Stories in Convey.",
  },
  collaborate: {
    label: "Collaborate",
    line: "Turn ideas into Spaces with roles and outcomes.",
    overview:
      "Collaborate is where work happens: Spaces with named roles, milestones and a record of who did what, so recognition is never ambiguous.",
    can: [
      "Start a Space or ask to join one",
      "Hold a role with a clear scope and a completion date",
      "Post the Space's Needs into Contribute",
      "Carry completed roles on your profile as attested activity",
    ],
    who: "Founders, project leads and members who would rather build something together.",
    links:
      "Spaces draw teammates from Connect, meet through Convene and share wins through Convey.",
  },
  contribute: {
    label: "Contribute",
    line: "Give and receive more than money.",
    overview:
      "Contribute is the marketplace of Needs and Offers: time, skills, introductions, equipment and capital, matched and fulfilled in the open.",
    can: [
      "Post a Need or an Offer",
      "Fulfil a Need and have it attested by the person who posted it",
      "Match by sector, place and what you can actually give",
      "Build a record of contributions that travels with you",
    ],
    who: "Anyone with something to give, anyone with something they need, and the Spaces coordinating both.",
    links: "Needs come from Collaborate and Convene; fulfilled ones become Stories in Convey.",
  },
  convey: {
    label: "Convey",
    line: "Tell the story of the diaspora, in your voice.",
    overview:
      "Convey is storytelling and the daily Edition: Stories, photo essays and updates that reach members who care about the same places.",
    can: [
      "Share a Story with text, images, audio or a link",
      "Read the daily Edition curated from member Stories",
      "Follow authors and save what you want to return to",
      "Keep your authored Stories on your profile",
    ],
    who: "Writers, organisers and members whose lived experience is worth recording.",
    links:
      "Stories surface new connections, fill rooms in Convene and turn Contribute outcomes into proof.",
  },
};
