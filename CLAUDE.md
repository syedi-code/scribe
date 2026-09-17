# scribe

**scribe-lm**, the reading half: a chat that answers from the PDFs in Works, and
shows whether every quote in the answer is on the page it named. The decisions
behind it are in `open_src/plans/scribe-ui.md`, with the design prototype at
`open_src/plans/prototype/index.html`.

## Stack

React 19 · TypeScript 5.9 (strict) · Tailwind v4, CSS-first · Vite 7 · Vercel AI
SDK v7 · Cloudflare Pages, with one Pages Function. No component library, no
state library.

## Commands

```bash
npm run dev      # vite, port 4572 (alexandria on :8787, or VITE_API_TARGET)
npm test         # vitest: the citation parser's awkward cases
npm run lint     # eslint
npm run build    # tsc -b && vite build
npm run deploy:prod   # CI does this on push to main
```

## Layout

```text
src/api/         alexandria's payloads, the fetch wrapper, the document cache
src/citations/   the regex, the status map, the page formatter — the core
src/chat/        useChat wiring, and how to read an assistant message
src/ask/         home, conversation, answer, margin, composer
src/page/        the drawer behind a citation
src/state/       the drawer and the dim, shared app-wide
src/styles/      every design token as Tailwind @theme variables
src/copy.ts      every user-facing string
functions/api/   the Pages Function that proxies /api/* to alexandria
```

## Things worth knowing

**The answer is the text after the final `step-start`.** Everything before it is
apparatus — narration and tool calls. Rendering every text part in sequence
shows the reader the model thinking out loud and calls it the answer. See
`chat/message.ts`.

**One status map.** Verdict wording, stamp shape, rule colour and verdict colour
all come from `CITATION_STATUS` in `citations/status.ts`. A colour written
inline in a component is a bug: the next status would be added in four places
and shown in three.

**One citation regex.** `citations/parse.ts` mirrors alexandria's
`conversations/citations.ts` and the two have to agree forever. Nothing else in
the app looks for a citation, and `parse.test.ts` holds the awkward cases. When
the server starts sending `marker` offsets, `markersFor()` prefers them.

**One copy file.** `copy.ts`. The honesty of this interface lives in its wording
— _found on the page_, never a bare _verified_, never a tick — and wording
scattered across components drifts.

**Tokens, not values.** Every colour, face, size and width is a `@theme`
variable in `styles/theme.css`. No arbitrary hex in a component, ever. Three
status inks and nothing else is coloured, so colour always means the same thing.

**No mobile fork.** One component tree, container queries on the app shell.
Never `isMobile` inside a component, and never a second layout component for
small screens. The one thing JavaScript asks the CSS is whether the margin notes
are positioned or stacked.

**Never re-check, retry or soften a citation.** Verification is the server's,
and it happens after the answer. Nothing renders as checked before
`data-citations` arrives.

**scribe holds no data.** Every row lives in alexandria. If you find yourself
adding a database here, stop.

**Do not copy components out of stylus.** The duplication between the two
frontends is deliberate: sharing UI would anchor scribe to Vue and to stylus's
layout assumptions, which is the thing a second frontend exists to escape. Share
technical code, not business logic.

**Do not add CORS handling.** The browser only ever talks to this origin; the
Pages Function does the crossing. If you are reaching for CORS, something else
is wrong.

**alexandria's API is additive-only.** Fields are never removed or retyped, so
code written against it now will keep working. In return, do not ask for a
breaking change casually. The four fields this app is waiting on, and its
fallback for each, are in `plans/scribe-citations-api.md` and the README.

**The catalogue speaks `Work`, not `Book`.** A Book is a Work whose kind is
`book`. `/books` is a compatibility facade for stylus; scribe should prefer
whatever works-shaped surface it needs, and ask alexandria to add it.

## Style

**Comments are brief, and only where the code is not immediately readable.** A
comment says why, or names a trap; it never narrates what the next line does. If
a comment is needed to explain what code does, rename or restructure the code
first.

<!-- MANUAL ADDITIONS START -->

## Git, Commit, and Merge Rules

- **Never commit, merge, or push unless the developer explicitly asks.** Stage
  nothing and open no PRs on your own initiative; finish the work and report it
  instead.
- **PR titles are prefixed by target:** `PROD: <summary>` for a PR into `main`,
  `STAGING: <summary>` for a PR into `staging`.
- **PR bodies stay empty.** The title carries the whole description.
- **Never merge `staging` into `main`.** The two are parallel deploy targets,
  not a promotion chain.
- **Always branch fresh off `main`** for each piece of work, then merge that one
  feature branch into **both** `staging` and `main` via separate PRs.

<!-- MANUAL ADDITIONS END -->
