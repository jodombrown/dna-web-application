# Strand export — compile `v1791495246160097` (correction 56, ratified 1599)

Packed 10 October 2026 on request. Nothing in this folder was edited; each file is a byte-for-byte copy of the path named in the second column, read and hashed after the copy (995). **The three sources are stored here as `.jsx.txt`** so the project compiler does not treat the copies as a second set of components (duplicate `MemberCard`, `IdentityMark`, `BadgeRow` exports); drop the `.txt` after download. Content and hashes are those of the `.jsx` files.

**Static check for this id:** line 1 of `_ds_bundle.js` reads `/* @ds-compile-id: v1791495246160097 */`; runtime `window.__DS_COMPILE_ID === 'v1791495246160097'`.

**The three sources are the ones this compile carries:** the `@ds-bundle` header of `_ds_bundle.js` records a source hash per component (the first 12 hex of the file's SHA-256); for `MemberCard.jsx` (`9d31efc2b87c`), `IdentityMark.jsx` (`6ff679f39e86`) and `BadgeRow.jsx` (`ad314c8a4dca`) those match the SHA-256 prefixes below. None of the three changed in the two compiles since (44-W64 / 44-NAV at `v1791498120520487`, and the correction 56 addendum), whose source-hash differences against this compile are confined to `ConsoleShell`, `PulseDock`, `EventTime`, `LensBar` and `MessageBubble`.

| file | copied from | bytes | SHA-256 |
|---|---|---|---|
| `_ds_bundle.js` | `export/_ds/_ds_bundle.js` | 540,110 | `134e9f5d9a67ce03a8a9bdf058191f0a01290fdbf8611d40d76300e4ef930004` |
| `MemberCard.jsx.txt` | `components/dna/MemberCard.jsx` | 29,927 | `9d31efc2b87c70a2be14a3debf75311fcc3ae8cfc43779f7593f42ff022f100a` |
| `IdentityMark.jsx.txt` | `components/dna/IdentityMark.jsx` | 1,569 | `6ff679f39e86ef997f02ae3d56cc3818e6b8d480229fbf725abcf1ad51351c44` |
| `BadgeRow.jsx.txt` | `components/dna/BadgeRow.jsx` | 3,999 | `ad314c8a4dca16db4b589ff37defa1235173603f7688973bcc2ad3e394ae0908` |
| `MEMBERCARD-EXTRACTION.md` | `MEMBERCARD-EXTRACTION.md` | 15,434 | `d5f4b767f66060aaa34b68be020bb8a1fa7a8988f34237190cf35300fdf60f1b` |
| `MEMBERCARD-EXTRACTION-ADDENDUM.md` | `MEMBERCARD-EXTRACTION-ADDENDUM.md` | 11,037 | `59fb8e2b6292af710550fe9e39e4ce436e59158290dad79c5b72c002d0443ecc` |
| `STRAND-CORRECTION-56-EXTRACTION.md` | `STRAND-CORRECTION-56-EXTRACTION.md` | 22,023 | `e3f1ff919cd404e285425c00274b0941c31061cd4eb539f28c67085506287e67` |

The project `_ds_bundle.js` is at a later compile and is not in this package.
