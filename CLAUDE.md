# scribe

The works half of the system. Scaffolding — see README for what is
deliberately not here yet.

## Stack

TypeScript 5.9 · Vite 7 · Cloudflare Pages, with one Pages Function. No
framework yet, on purpose.

## Commands

```bash
npm run dev      # vite, port 4572
npm run build    # tsc -b && vite build
npm run lint     # eslint
npm run deploy   # build, then wrangler pages deploy
```

## Layout

```text
src/              the app; currently one file
functions/api/    the Pages Function that proxies /api/* to alexandria
```

## Things worth knowing

**scribe holds no data.** Every row lives in alexandria. If you find yourself
adding a database here, stop.

**Do not copy components out of stylus.** The duplication between the two
frontends is deliberate: sharing UI would anchor scribe to Vue and to stylus's
layout assumptions, which is the thing a second frontend exists to escape.
Share technical code, not business logic.

**Do not add CORS handling.** The browser only ever talks to this origin; the
Pages Function does the crossing. If you are reaching for CORS, something else
is wrong.

**alexandria's API is additive-only.** Fields are never removed or retyped, so
code written against it now will keep working. In return, do not ask for a
breaking change casually.

**The catalogue speaks `Work`, not `Book`.** A Book is a Work whose kind is
`book`. `/books` is a compatibility facade for stylus; scribe should prefer
whatever works-shaped surface it needs, and ask alexandria to add it.

## Style

Be extremely light on comments; only add one where the intent is not obvious
from reading the code itself.
