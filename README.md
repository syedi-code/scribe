# scribe

The works half: the catalogue, the documents behind it, and eventually reading
and asking questions of them. Deployed to Cloudflare Pages at
`scribe.socialeating.studio`.

**This is scaffolding.** There is no catalogue UI yet and no design system yet.
What exists is the one thing that had to work before either is worth building: a
request that reaches **alexandria** already authenticated.

## What it does today

Opens, calls `POST /api/session` then `GET /api/me`, and prints who you are. If
that page shows your email and your role, every piece of the chain is working —
Cloudflare Access, the Pages Function proxy, the worker's JWT verification, and
the session cookie.

## How it talks to alexandria

The browser calls `/api/*` on this origin. `functions/api/[[catchall]].ts`
proxies those to the worker named in `WORKER_URL`, lifting the Access JWT out of
the `CF_Authorization` cookie into a `cf-access-jwt-assertion` header.

Same-origin by construction: no CORS, no cross-site cookies, no second API
client. In development, vite's proxy stands in for the Pages Function against a
worker on `localhost:8787`.

## Development

```bash
npm install
npm run dev       # http://localhost:4572
npm run build
npm run lint
npm run deploy:prod   # CI does this on push to main
```

Run alexandria alongside it (`npm run dev` in that repo) and the proxy finds it.
Point somewhere else with `VITE_API_TARGET`.

## What is deliberately absent

**A framework.** stylus is Vue, and scribe exists partly to not inherit stylus's
layout assumptions. Choosing before there is anything to render would be
choosing for the wrong reasons. `src/main.ts` is plain TypeScript and the whole
app is under 100 lines; replacing it costs nothing.

**A design system.** Same reason, more so. `src/style.css` is browser defaults
plus enough to read by.

**Any shared UI with stylus.** The two will both grow a catalogue admin, and
that duplication is accepted on purpose: sharing components would anchor scribe
to Vue and to stylus's layout, which is exactly what a second frontend exists to
escape. Share technical code, not business logic.

**Its own data.** alexandria owns every row. scribe reads the API like any other
client.

## What comes next

1. Pick a stack, once there is a screen worth designing.
2. Catalogue browse over `/api/books` — or a `/api/works` surface, if the
   reading UI wants kinds beyond books.
3. Catalogue admin, in scribe's own idiom rather than stylus's.
4. Drag-and-drop PDF ingestion, writing to `documents`.
5. The reading and citation half, once alexandria has transcriptions.

## Deployment

Pages project `scribe`, production only, at `scribe.socialeating.studio`.
Merging into `main` deploys it; the run fails unless `/api/session` comes back
from alexandria. `WORKER_URL` is set on the Pages project.
