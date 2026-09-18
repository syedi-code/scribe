# scribe

**scribe-lm** — ask the library a question, and see whether every quote in the
answer is on the page it names. Deployed to Cloudflare Pages at
`scribe.socialeating.studio`.

The backend is **alexandria**: Hono on Cloudflare Workers, one D1, one R2. It
answers from the PDFs in Works, and after the answer is written it looks for
every quote on the page the model cited and reports whether it was actually
there. This repo holds no data of its own; it reads that API like any other
client.

## What the interface is for

A model that cites is not the same as a model that is right, and an interface
that shows citations is not the same as one that shows whether they hold. Almost
every decision here is about refusing to let those come out looking alike.

**The evidence is the words, and the stamp says how they held up.** Quoted words
are set one weight heavier than the prose around them, with the quotation marks
dropped back to a faint grey. A small square follows the quote:

| Stamp              | Means                                                |
| ------------------ | ---------------------------------------------------- |
| filled square      | the words are on the page it named                   |
| open square        | they are not — or they matched and then diverged     |
| dotted open square | the page has no text layer; nothing could be checked |

The shape carries the verdict and the colour only reinforces it, so it survives
being printed, and a reader who cannot tell rubric from verdigris still reads it
correctly. Each stamp also carries a label naming the verdict and the page.

**Verification is an event, and the reader watches it happen.** Citations arrive
in a `data-citations` part _after_ the answer, so for a second or two the answer
exists unchecked. Stamps render pending and resolve one at a time down the page.
Nothing is ever optimistic, faked, or inferred on the client.

**Uncited prose is visible as uncited.** `Only what's cited` (under every
answer, or `c`) fades every sentence no citation supports. On a good answer it
changes little; on a bad one the paragraph nearly empties.

**The passage appears once.** A model asked to cite as `[P7 "…"]` writes the
passage out in its prose first and cites a few words of it after, so the
renderer folds the citation back into the quotation the model already wrote: the
reader sees it once, with the checked words set one weight heavier inside it.
The stamp still reports only what the server checked.

**What is not the answer.** An assistant message holds the text of _every_ step,
and models narrate between tool calls however firmly the instructions ask them
not to. The answer is the text after the final `step-start`; everything before
it is apparatus — one condensed line, live while the model works, collapsed once
the answer starts, expandable by anyone who wants to audit the search.

The full reasoning, and the prototype these decisions were made in, are in
`docs/` — `scribe-ui.md`, `scribe-citations-api.md`, and
`prototype/index.html`.

## Stack

React 19 · TypeScript 5.9 (strict) · Tailwind v4, CSS-first · Vite 7 · Vercel AI
SDK v7 (`useChat` + `DefaultChatTransport`) · Cloudflare Pages with one Pages
Function. No component library and no state library: the app is a chat and a
drawer, which `useChat` plus two small contexts covers. The one heavy
dependency is pdf.js, which draws the scan behind a citation and is not
imported until a reader asks for one.

```bash
npm install
npm run dev       # http://localhost:4572
npm test          # the citation parser's awkward cases
npm run lint
npm run build
npm run deploy:prod   # CI does this on push to main
```

Run alexandria alongside it (`npm run dev` in that repo) and vite's proxy finds
it on `:8787`. Point somewhere else with `VITE_API_TARGET`.

## Layout

```text
src/
  api/          alexandria's payloads, one fetch wrapper, a document cache
  citations/    the citation regex, the status map, the page formatter   ← the core
  chat/         useChat wiring, and how to read an assistant message
  models/       the roster and the selection
  ask/          the home screen, the conversation, the answer and its margin
  page/         the drawer behind a citation
  add/          Add a book
  ui/           the shell: header, rail, wordmark
  state/        the two things the whole app shares: the drawer, and the dim
  styles/       every design token, as Tailwind @theme variables
  copy.ts       every user-facing string
functions/api/  the Pages Function that proxies /api/* to alexandria
```

## How it talks to alexandria

The browser calls `/api/*` on this origin. `functions/api/[[catchall]].ts`
proxies those to the worker named in `WORKER_URL`, lifting the Access JWT out of
the `CF_Authorization` cookie into a `cf-access-jwt-assertion` header.
Same-origin by construction: no CORS, no cross-site cookies, no second API
client.

Endpoints used: `GET /models`, `GET|POST /conversations`,
`GET /conversations/:id`, `POST /conversations/:id/chat`, `GET /documents/:id`,
`GET /documents/:id/pages`, and `POST /files/sign` for the scan.

## What this is waiting on

`docs/scribe-citations-api.md` asks alexandria for four additive fields on a
citation: `page` (which book it is), `context` (the page's own words around the
match), `matched_prefix` (where a partial match stopped) and `marker` (where the
citation sits in the answer). Every one of them has a fallback here, so the
interface is honest with or without them:

| Field     | Without it                                                                |
| --------- | ------------------------------------------------------------------------- |
| `page`    | one `GET /documents/:id` per document, cached for the tab                 |
| `context` | the drawer fetches the page and shows it whole, saying that is what it is |
| `marker`  | `citations/parse.ts` finds the citation, by the server's own regex        |

The day they land, the fallbacks stop being used and nothing else changes.

## Deliberately not

**A tick or a cross.** The check means the words are on the page. It does not
mean they support the claim, and a tick would be read as endorsing the argument.

**A PDF handed to the browser.** The scan is drawn in the app, at the page
that was cited. A signed link into the browser's own viewer opens a new tab, is
blocked as a popup on iOS because it follows an `await`, and lands on page 1
of four hundred when it does open, since Safari ignores `#page=`. The whole
file is still one tap away from the scan, as a link.

**Client-side verification, or retrying a failed citation.** The check belongs
on the server, after the answer. A quote that came back not found stays not
found; the reader is offered the page instead, and can look.

**A mobile fork.** One component tree, container queries on the app shell. There
is no `isMobile` anywhere, which is what makes the phone frame (the ▯ in the
header) exercise the real mobile layout rather than a simulation of it.

**Any database in this repo, or components copied out of stylus.** alexandria
owns every row; sharing UI would anchor this app to Vue and to stylus's layout
assumptions, which is exactly what a second frontend exists to escape.

## Deployment

Pages project `scribe`, production only, at `scribe.socialeating.studio`.
Merging into `main` deploys it; the run fails unless `/api/session` comes back
from alexandria. `WORKER_URL` is declared in `wrangler.toml`, where a deploy
cannot wipe it.
