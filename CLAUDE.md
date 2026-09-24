# scribe

**scribe-lm**, the reading half: a chat that answers from the PDFs in Works, and
shows whether every quote is on the page it named. Design decisions in
`docs/scribe-ui.md`; prototype at `docs/prototype/index.html`.

React 19 · TypeScript 5.9 strict · Tailwind v4 CSS-first · Vite 7 · AI SDK v7 ·
Cloudflare Pages + one Pages Function. No component library, no state library.

```bash
npm run dev      # vite :4572 (alexandria on :8787, or VITE_API_TARGET)
npm test         # vitest
npm run lint     # eslint
npm run build    # tsc -b && vite build
npm run deploy:prod
```

```text
src/api/         alexandria's payloads, fetch wrapper, document cache
src/citations/   the regex, status map, page formatter — the core
src/chat/        useChat wiring, reading an assistant message
src/ask/         home, conversation, answer, margin, composer
src/page/        the drawer behind a citation
src/state/       drawer and dim, shared app-wide
src/flags/       feature flags and fallbacks
src/styles/      design tokens as Tailwind @theme variables
src/copy.ts      every user-facing string
functions/api/   proxy to alexandria, and the flags this app answers itself
```

## Hard rules

- **scribe holds no data.** Every row is alexandria's. Adding a database here is
  wrong. Shelves are `GET /catalogue` grouped in the browser.
- **Tokens, not values.** Every colour, face, size, width is a `@theme` variable
  in `styles/theme.css`. No arbitrary hex in a component, ever.
- **One copy file** — `copy.ts`. Wording scattered across components drifts.
- **Never re-check, retry or soften a citation.** Verification is the server's.
  Nothing renders as checked before `data-citations` arrives.
- **No mobile fork.** Container queries on the shell; never `isMobile` in a
  component. JS asks CSS one thing: margin notes positioned or stacked.
- **Don't add CORS.** The Pages Function does the crossing.
- **Don't copy components out of stylus.** Share technical code, not business
  logic — sharing UI would anchor scribe to Vue.
- **alexandria's API is additive-only.** Never ask for a breaking change
  casually. Fields still awaited, and the fallback for each, in
  `docs/scribe-citations-api.md`.
- **The catalogue speaks `Work`, not `Book`.** `/books` is a stylus facade.
- **Every reported bug gets a test.** CI runs them on every PR.

## Flags

- A visible feature ships behind a flag, off. Unset falls back to *off*.
- A flag is a `FLAG_…` in `wrangler.toml` — the source of truth a deploy rebuilds
  project variables from. **Set one in the dashboard and the next deploy clears
  it.**
- `src/flags/flags.ts` names them; `functions/api/flags.ts` answers
  `GET /api/flags`; `FlagProvider` asks once a tab; `flags/load.ts` is one shared
  request.

## Citations

- **One citation regex** — `citations/parse.ts`, mirroring alexandria's
  `conversations/citations.ts`. The two must agree forever.
- **A quotation is written once, inside `<cite P7>…</cite>`.** `[P7 "…"]` and
  `"…" [P7]` are still parsed — old answers are written in them.
- **A block carries spans, never a copy of its text.** Citations are found by
  character offset; cleaned strings put every offset out. `localise()` remaps.
- **`normaliseCitationShapes()` translates foreign notations** (e.g. OpenAI's
  `【P5†…】`) before anything reads them. Load-dependent, so not hypothetical.
  `FOREIGN_SHAPES` is a table in front of the grammar — never widen `CITATION`.
- **`collapseQuotedDuplicates()` removes a quotation the model wrote twice.**
  Compare *words*, not quote marks. Only the run immediately against the cite;
  nothing under five words; never mid-word. Runs before
  `trimHalfWrittenCitation`, or the doubling paints.
- **The answer is the text after the final `step-start`** (`chat/message.ts`).
  Everything before is apparatus.
- **Apparatus is tool calls, never narration.** A failed call says why.
- **Pending is not unknown.** Only `unknown_handle` may say the page was never
  shown; `chat/shown.ts` names the book from the first render.
- **An empty answer is a failed answer** — say so, offer to ask again.
- **One status map** — `CITATION_STATUS` in `citations/status.ts`: wording, pip,
  underline, margin rule, colour. An inline colour in a component is a bug.
- **A verdict is a rule under the words it is about**, style *and* colour, plus
  an `sr-only` verdict in words.
- **Markdown is rendered, not stripped** (`citations/blocks.ts`) — a deliberate
  subset. **Bold is removed, never set** (`bolden()`).
- **The model marks `<title>`/`<author>`; the catalogue catches the rest.** The
  model's mark wins; a mark inside a cite's quotation is stripped before
  matching. **An italic means a book, not a book we hold.**
- **A page is reflowed before it is read** (`reflow()`), changing no words; a
  hyphen break closes up without one.
- **The drawer shows a passage, not a page** (`citations/window.ts`), matched on
  words — scanned pages miss by a letter.

## Colour and type

- **Colour on a mark is a verdict; colour on a word is a name.** Nothing else in
  the app is coloured.
- Three verdict inks; six author inks (`--author-c0…5`, hashed FNV-1a, for ever);
  three maker marks; two tier inks. Author inks sit a lightness band below the
  verdicts — that separation, not hue, keeps them apart.
- **Inks are plain rules, never `@utility`** — the class is built at run time, so
  Tailwind's scanner never sees it and emits nothing.
- **Tier inks: Alpha a green, Omega a lapis**, both ≥5.5:1 on the paper, greater
  tier the darker. Chrome only — a tier's ink never lands beside an author's.
- **`@utility work-title` sets every book name** (six sites); `@utility
  tier-mark` sets every tier name (four sites). Writing `italic` by hand is a
  bug. `styles/theme.test.ts` fails on both.
- **A title is a slant, never a weight.** `font-synthesis: none`.
- **Preload every italic that paints before interaction** (`index.html`), or it
  arrives as a synthesised bold. `theme.test.ts` fails if one stops.
- **One family, one width** — GT Alpina Standard. No capitals, no tracking.
- **One stacking order** — `--z-lifted|rail|drawer|header|menu`. A number in a
  component is a bug.
- **Transition `translate`, not `transform`** — Tailwind v4 sets the longhand.
- **A scrollbar is a mark, not a control.** Set once in the base layer; both
  standard and `::-webkit-` (Safari < 18.2).
- **One press** — `@utility press`.

## Plans, models, account

- **A reader chooses a tier, never a model.** `models/tiers.ts`: **Alpha** and
  **Omega**. A published model name pins cost of goods to a vendor's public price
  list. The wire keeps real model ids. `ModelProvider.test.tsx` fails if a maker
  or model name reaches the menu.
- **The plan is *Pro* to a reader; the wire and DB say `paid`.**
- **Every paid offer is the ledger** — the Plans tab, or `seePlans()` from
  anywhere else. Nobody is offered what they already have.
- `GET /plans` is the only source of what a plan gives. Never a made-up price.
- **A limit is told before it is hit, and never before that** — nothing until two
  left. `limit: null` is the admin: no ceiling, never zero. A later figure wins,
  except nothing may lower `used` within a week (`resets_at` scopes it, or the
  rollover is eaten). No colour.
- Resets are formatted **UTC, as a weekday** — Monday UTC is Sunday in New York.
- **A 402 on the stream is caught in the transport's `fetch`**
  (`chat/refusal.ts`), or the reader sees raw JSON.
- **A held-back model is struck and unpickable**; *requires Pro* differs from
  *no key set*; the admin's own models are marked *yours alone*.
- **A visitor is let in, not kept out.** Guest past Turnstile; if that fails they
  may still look, and any question opens sign-in. Guest allowance is for ever —
  `resets_at` is null, and every formatter checks.
- **Sign-in is ours, not Cloudflare's picker.** Draft kept across the trip;
  `functions/login/[[path]].ts` opens the session itself and redirects only to a
  path on this site (`lib/safeNext.ts`) — an open redirect otherwise.
- **Signing out is two doors, in order:** `DELETE /api/session`, then Access's
  `/cdn-cgi/access/logout`. Otherwise the next person is signed in as the last.
- **The webhook, not the redirect, changes the plan** — they race, so say the
  wait out loud (`usePlanArrival.ts`).
- **A reader holds the cited page, never the book.** Scans are Pro, one page
  either side; the whole file is the admin's.

## Layout

- **One modal at a time**, from `state/dialog.ts`, each a history entry — the
  back gesture must put a sheet away. Native `<dialog>` + `showModal()`; focus
  lands on the title; Escape via `cancel`.
- **Plans is a tab** (`plan/PlansPanel.tsx`) and a sheet (`seePlans()`), both
  drawing one ledger (`plan/PlansLedger.tsx`).
- **Narrow, the header is two rows** — except at home, where the mark has
  folded away and the tabs sit beside the account (five only above
  `--container-crowded`). `Add a book` is hidden narrow.
- **The switcher lives in the composer**, menu opening **upward**.
- **The margin is stacked by a rule** (`ask/stack.ts`) — every note gets a place,
  even unmeasured.
- **Under the fold, one line per book** (`ask/Shelf.tsx`); a pip's target is
  exactly the gap, never overlapping the row above.
- **The fullest shelf comes first** (`books/shelve.ts`), decided by what the
  library holds, never by what a search left.
- **The scan is drawn here** with pdf.js, never handed to the browser — iOS
  ignores `#page=` and Safari blocks the post-`await` popup. Assets from `/pdf`.
- **A scan that will not draw is not a book without a scan** — three outcomes,
  kept apart. Encode the key a path segment at a time.
- **A conversation read once is kept** (`chat/threads.ts`), warmed on
  `pointerenter`, forgotten on every question asked.
- **Every conversation has its own `Chat`** (`chat/chats.ts`). A stream writes
  into its own conversation, never the one on screen — one shared chat pulled
  the reader back to an answer still streaming.
- **An answer is signed by whoever wrote it** — fall back to the switcher only
  while streaming.
- **`naming…` only while actually polling**, else `untitled`.
- **A name is one line of words** (`chat/title.ts`).
- **About is a page of the book, not a product page.** Add a promise only once
  the code keeps it.

## Style

- **A root component composes and nothing else.** `App`, `Home`, `AppFrame` hold
  no helpers, effects or markup beyond nesting. State lives in a root only when
  two children need it.
- **Comments are brief, and only where the code is not readable.** A comment says
  why, or names a trap; never what the next line does.
- A file and a component differing only in case do not compile on Windows.

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
