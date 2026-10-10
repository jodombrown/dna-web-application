import React from 'react';
import { Icon } from '../core/Icon.jsx';
import { C_LABEL, C_GLYPH, C_ORDER, assetBase } from './cmeta.js';

/** BadgeRow (ruling 1497, doctrine 123; 1500 and 1540 by correction 56; the tree's part is src/components/dna/BadgeRow.tsx).
 *  One pill per C that a counterparty attested. The pill is not the attestation: it is the door to it, and it opens to the provenance —
 *  what was done, who attested it, the role they attested from, and when. So the claim is never made by the badge alone; the badge always shows its work.
 *  Two attestations are two lines, never "2" and never a count on the pill (guardrail 1). A C with four attestations opens to four lines.
 *  Guardrail 2: the pill takes the C colours of the attested activity, which doctrine 123 rules for this part and for no other C colour use.
 *  1540: the pill's glyph is its C's Adinkra mark, the glyph ruling 66 assigns (cmeta C_GLYPH), masked to the pill's C text rung in place of shield-check. All five Cs.
 *  1500: one pill is open at a time. In a grid of cards an independent toggle per pill can treble a card's height while its neighbours stand still,
 *  so opening a second closes the first and the card grows by one provenance block at most.
 *  The pills are ordered by C_ORDER, not by the order the data arrived, so the same member reads the same way on every surface.
 *  Grounded or empty: no attestations means no row at all, and the caller draws no heading and leaves no gap. */
const GLYPH = (c, size) => {
  const m = 'url(' + assetBase() + 'adinkra/' + C_GLYPH[c] + '.svg) center / contain no-repeat';
  return <span aria-hidden="true" style={{ width:size, height:size, background:'currentColor', WebkitMask:m, mask:m, flex:'none' }} />;
};
export function BadgeRow({ attestations = [], compact = false, style }) {
  const items = C_ORDER.map(c => attestations.find(a => a.c === c)).filter(a => a && a.items && a.items.length);
  const [open, setOpen] = React.useState(null);
  const shown = items.find(a => a.c === open);
  if (!items.length) return null;
  const fs = compact ? 'var(--text-xs)' : 'var(--text-s)';
  return <div data-field="attestations" style={{ display:'flex', flexDirection:'column', gap:'var(--space-2)', minWidth:0, ...style }}>
    <div style={{ display:'flex', flexWrap:'wrap', gap:'var(--space-1)', minWidth:0 }}>
      {items.map(a => {
        const live = a.c === open;
        return <button key={a.c} type="button" aria-expanded={live} onClick={() => setOpen(live ? null : a.c)}
          style={{ boxSizing:'border-box', display:'inline-flex', alignItems:'center', gap:'var(--space-1)', minHeight: compact ? 30 : 28, padding:'0 var(--space-2)', borderRadius:'var(--radius-s)', border:'var(--border-thin) solid ' + (live ? 'var(--c-' + a.c + ')' : 'transparent'), background:'var(--c-' + a.c + '-tint)', color:'var(--c-' + a.c + '-text)', fontFamily:'var(--font-sans)', fontSize:fs, lineHeight:1, fontWeight:'var(--weight-medium)', whiteSpace:'nowrap', cursor:'pointer', outlineOffset:'var(--focus-offset)' }}>
          {GLYPH(a.c, compact ? 13 : 14)}{C_LABEL[a.c]}
          <Icon name="chevron-down" size={12} style={{ opacity:0.7, transform: live ? 'rotate(180deg)' : 'none', transition:'transform var(--dur-default) var(--ease)' }} />
        </button>;
      })}
    </div>
    {shown ? <div style={{ display:'flex', flexDirection:'column', gap:'var(--space-2)', padding:'var(--space-2) var(--space-3)', background:'var(--bg-sunken)', borderRadius:'var(--radius-m)', borderLeft:'var(--c-stroke) solid var(--c-' + shown.c + ')' }}>
      {shown.items.map((it, i) => <span key={i} style={{ display:'flex', flexDirection:'column', gap:2, minWidth:0, fontSize:fs, lineHeight:'var(--text-s-lh)', textWrap:'pretty' }}>
        <span style={{ color:'var(--ink)' }}>{it.what}</span>
        <span style={{ color:'var(--ink-3)' }}>{it.who}{it.role ? ', ' + it.role : ''}{it.when ? '. ' + it.when : ''}</span>
      </span>)}
    </div> : null}
  </div>;
}
