import React from 'react';
import { Icon } from '../core/Icon.jsx';

/** IdentityMark (ruling 1497, doctrine 123; the tree's part is src/components/dna/IdentityMark.tsx).
 *  One fact, drawn once: this member's identity was verified. It is not a score, a tier, a stance or a completion.
 *  So there is no ring, no arc, no percentage and no second degree — a member is identified or the mark is absent (grounded or empty).
 *  Ink on the card's own surface, which is why it reads on a photograph, on the initials tile and in both themes without a per-theme branch:
 *  the disc is --ink and the check is --surface, so the pair inverts with the theme on its own.
 *  The 1px --surface rim is separation, not a ring around a value: against a dark photograph an ink disc would otherwise dissolve.
 *  role="img" with a fixed accessible name, since the mark says one thing and takes no interaction. Where it sits is the caller's business:
 *  MemberCard places it on the portrait's corner, outside the portrait's aria-hidden panel, so a screen reader hears the name once and the mark once. */
export function IdentityMark({ size = 22, label = 'Identified', style }) {
  return <span role="img" aria-label={label} style={{ boxSizing:'border-box', width:size, height:size, borderRadius:'50%', background:'var(--ink)', color:'var(--surface)', border:'1px solid var(--surface)', display:'inline-flex', alignItems:'center', justifyContent:'center', flex:'none', ...style }}>
    <Icon name="check" size={typeof size === 'number' ? Math.round(size * 0.6) : 13} />
  </span>;
}
