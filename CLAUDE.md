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

**A citation that repeats the prose is folded into it.** Models write the
passage out and _then_ cite a few words of it, which printed the same sentence
twice and made good answers read as gibberish. `absorbQuotation()` in
`citations/parse.ts` drops the duplicate and sets only the checked words one
weight heavier inside the quotation the model wrote. The instruction that asks
the model not to do it in the first place is in alexandria's
`conversations/instructions.ts`; the client does not rely on it.

**The apparatus is tool calls, never narration.** A search and a read are facts
and stay on screen once they have happened; narration is the model talking to
itself, it rewrites itself as the model changes its mind, and it is not shown at
all. A failed call says so and says why, rather than disappearing.

**One citation regex.** `citations/parse.ts` mirrors alexandria's
`conversations/citations.ts` and the two have to agree forever. Nothing else in
the app looks for a citation, and `parse.test.ts` holds the awkward cases. When
the server starts sending `marker` offsets, `markersFor()` prefers them.

**A book's name is set by the stylesheet.** `@utility work-title` in
`styles/theme.css`, used at every one of the five places a title is printed —
the prose, the margin, the shelves, the drawer, the badge group. A component
that writes `italic` for a title instead is a bug, and `styles/theme.test.ts`
fails on one.

**One copy file.** `copy.ts`. The honesty of this interface lives in its wording
— _found on the page_, never a bare _verified_, never a tick — and wording
scattered across components drifts.

**Tokens, not values.** Every colour, face, size and width is a `@theme`
variable in `styles/theme.css`. No arbitrary hex in a component, ever. Three
status inks and nothing else is coloured, so colour always means the same thing
— with one deliberate exception, a provider dot inside the model switcher, which
never appears on the reading surface.

**One stacking order.** `--z-lifted`, `--z-rail`, `--z-drawer`, `--z-header`,
`--z-menu`, declared once in `styles/theme.css` and read as `z-(--z-rail)`. A
number written in a component is a bug and `styles/theme.test.ts` fails on one:
two things at `20` in two files is how the rail came up underneath the home
screen's subtitle. A layer is a whole subtree, so the model menu is `--z-menu`
above the header and no higher than `--z-lifted` when it hangs from the home
screen's model line. A scrim and the panel it dims share a layer and are ordered
by the DOM, scrim first.

**No mobile fork.** One component tree, container queries on the app shell.
Never `isMobile` inside a component. The one thing JavaScript asks the CSS is
whether the margin notes are positioned or stacked.

There is one deliberate exception, and it is CSS that chooses it, not
JavaScript: under the fold the margin notes give way to `ask/Shelf`, one entry
per book with a badge per reference into it. Six citations into one work printed
its title six times, which on a phone was most of the screen. Both forms are in
the tree and `@max-fold` picks one, so there is still no component deciding
which layout it is.

**Every reported bug has a test.** `src/**/*.test.tsx` covers the parser and the
handful of behaviours that have broken in front of a reader: the drawer closing,
the rail closing, the switcher's stacking, the duplicated quotation, the drawer
belonging to `main` rather than the shell, the body never taking the document
scroller away from a phone, the stacking order being read from the scale, and a
turn that never got to an answer saying so. CI runs them on every pull request,
and they are the reason the next change does not bring one of them back.

**Never re-check, retry or soften a citation.** Verification is the server's,
and it happens after the answer. Nothing renders as checked before
`data-citations` arrives.

**scribe holds no data.** Every row lives in alexandria. If you find yourself
adding a database here, stop. The shelves in `books/` are `GET /catalogue`
grouped in the browser — alexandria already returns it ordered by creator then
title, and the search is done here so it never costs a second fetch.

**An empty answer is a failed answer.** A turn that searched and read and then
wrote nothing says so and offers to ask again. It is not a hypothetical: the
server ran out of steps mid-tool-call in production and the reader was shown a
list of everything it had read with nothing underneath it.

**A page is reflowed before it is read.** A PDF's text layer breaks a line
wherever the typesetter did, and printing those breaks gave a column of ragged
half-lines in the drawer — worst on a phone, where the drawer is the screen.
`reflow()` in `citations/page.ts` joins them and changes no words: a blank line
is a paragraph, a single break is a space, and a line broken on a hyphen closes
up _without_ one, so the hyphen the typesetter put there is still the only thing
between the halves.

**Opening a conversation is a move to the reading surface.** `Rail` takes
`onClose` and `onNavigate` separately: wide, the rail never closes, so passing
one for the other loaded the thread into a panel nobody was looking at.

**`naming…` is a claim about right now.** It is said only while `ChatProvider`
is actually polling for a title. A conversation that is still untitled after
that is `untitled` — promising a name that is not coming is how `naming…` came
to sit in the rail for ever.

**Two models are held back.** `SUSPENDED` in `models/ModelProvider.tsx`, shown
struck through and _temporarily disabled_ rather than hidden, which is a
different claim from _no key set_. `Add a book` is held back the same way: the
tab is struck through and disabled, and `add/AddPanel.tsx` waits for an
ingestion to exist behind it.

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

**A root component composes and nothing else.** `App`, `Home` and `AppFrame` say
what is on the screen and in what order; they hold no helpers, no effects and no
markup beyond nesting. Opening the session is `ui/SessionGate`, the arrival
sequence is `ask/settle.ts`, the questions are `ask/Suggestions`, the keyboard
is `ui/useShortcuts`. State stays in a root only when two of its children both
need it — `tab` and `railOpen` in `AppFrame`, and nothing else.

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
