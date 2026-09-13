// Ported from profile/strand-patch/Profile.jsx (B3-Profile-v3, ruling 130). Copy for the five C
// sheets on the public close; follows the voice rules. No counts, no marketing numbers.
// Ruling 422: the copy below is the approved text of the Fix PR 02 handoff appendix, verbatim.
// It describes only what the register keeps: no money, no Offers, no audio, no Edition, no
// brokered intro, no milestones, no wallet (rulings 4, 49, 50, 55, 119).
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
      "Connect is where members find each other: profiles, a directory by focus, heritage and place, and introductions made by a member who knows both sides.",
    can: [
      "Search members by focus area, industry, region and language",
      "Send a connection request with a short note",
      "Ask a connection to introduce you to one of theirs",
      "Follow members whose work you want to keep close",
    ],
    who: "Members looking for collaborators, mentors, clients or a familiar face in a new city.",
    links:
      "Connections carry into Convene (who is in the room), Collaborate (who joins a Space) and Contribute (who meets a Need).",
  },
  convene: {
    label: "Convene",
    line: "Gather the diaspora, online and on the ground.",
    overview:
      "Convene is the events layer: hosting, tickets and check-in, built for diaspora gatherings across every time zone the diaspora lives in.",
    can: [
      "Host free or ticketed events, online, in person or both",
      "Find gatherings by city, sector and Space",
      "Check in on the day and have it recorded",
      "Have your hosting and attendance attested on your profile",
    ],
    who: "Organisers, chapter leads and members looking for the right room to walk into next.",
    links: "Events deepen Connect, seed Collaborate Spaces and become Stories in Convey.",
  },
  collaborate: {
    label: "Collaborate",
    line: "Turn ideas into Spaces with roles and outcomes.",
    overview:
      "Collaborate is where work happens: Spaces with named roles and a record of who did what, so recognition is never ambiguous.",
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
    line: "Give time, skills and things that are needed.",
    overview:
      "Contribute is where Needs are met: time, skills and in-kind support, matched and fulfilled in the open, and attested by the person who asked.",
    can: [
      "Post a Need for your Space or your event",
      "Meet a Need and have it attested by the person who posted it",
      "Match by sector, place and what you can actually give",
      "Build a record of contributions that travels with you",
    ],
    who: "Anyone with something to give, anyone with something they need, and the Spaces coordinating both.",
    links: "Needs come from Collaborate and Convene; met ones become Stories in Convey.",
  },
  convey: {
    label: "Convey",
    line: "Tell the story of the diaspora, in your voice.",
    overview:
      "Convey is storytelling: Stories, photo essays and updates that reach members who care about the same places.",
    can: [
      "Share a Story with text, images or a link",
      "Follow authors and save what you want to return to",
      "Keep your authored Stories on your profile",
      "Turn what happened in Convene, Collaborate and Contribute into a Story",
    ],
    who: "Writers, organisers and members whose lived experience is worth recording.",
    links:
      "Stories surface new connections, fill rooms in Convene and turn Contribute outcomes into proof.",
  },
};
