# Strand exports

Compiled Strand artifacts, one directory per compile, kept here so the app Design project can be
bound to a named artifact instead of an attachment (rulings 888, 907).

## The rules this tree runs on

**One directory per compile, named by the compile id read from that compile's own bundle.** The id is
read from the artifact and then written down, never the other way round (873). `v1789720800167997`
is named that because the first line of its `_ds_bundle.js` reads
`/* @ds-compile-id: v1789720800167997 */` and the file assigns
`__DS_COMPILE_ID = "v1789720800167997"`. If a bundle and its directory ever disagree, the wrong
folder was extracted: stop and report it. Do not rename the directory and do not edit the bundle.

**A directory is never overwritten and never deleted.** Correction 18 lands beside correction 17, not
on top of it. Rulings 855 and 858 bind a ratification to a named artifact, and they are unenforceable
the moment that artifact can be changed underneath the ruling that names it.

**Links into this tree are pinned to a commit SHA, never to a branch.** A `refs/heads/main` link lets
the artifact change without a ruling, in a project whose every session opens by reading the bound
path's compile id (878). That is ruling 893's finding, applying here for a second time. The pinned
form:

```
https://raw.githubusercontent.com/jodombrown/dna-web-application/<commit-sha>/docs/strand/<compile-id>/_ds_bundle.js
```

**The archive-root bundle never travels (899).** A Strand export archive carries two files named
`_ds_bundle.js`. The root copy is the compiled bundle with no identification block: no
`@ds-compile-id` header and no `__DS_COMPILE_ID` assignment, because the compiler owns that file's
header and Strand's guardrails forbid the fresh compile it would take to write an id there. Only the
copy inside `export/_ds/` carries the id, so only that copy is committed. The two are otherwise
byte-for-byte identical.

**Nothing here is built into the app or served to visitors.** This tree sits outside `src/` and
outside `public/` deliberately. No module imports it, no route serves it, and no build step reads it.

## Keeping the bytes

`docs/strand/` is listed in `.prettierignore`. That line is load-bearing for two commands, not one:
`npm run format` is `prettier --write .`, and `npm run lint` is `eslint .`, which lints a `.js` file
by default and applies `prettier/prettier` to it through the unscoped
`eslint-plugin-prettier/recommended` entry at the foot of `eslint.config.js`. Measured on this
export, removing the line gives 7,105 `prettier/prettier` errors on `_ds_bundle.js` alone, every one
of them "fixable" by a tool that would destroy the artifact. The rule-bearing config block is scoped
to `**/*.{ts,tsx}` and does not reach a bundle; the prettier entry is what does.

An export is committed byte for byte. No reformatting, no re-encoding, no line-ending conversion, and
no `.gitattributes` rule that would introduce one.
