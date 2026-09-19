# Contributing

## Setup

```bash
npm install
npm run dev     # http://localhost:4572
```

scribe reads [alexandria](https://github.com/syedi-code/alexandria) and holds no
data of its own, so it needs one running: `npm run dev` in that repository puts
it on `:8787`, which vite proxies to. There is no mock mode and no fixture set —
**the app is inert without a backend**, and that is deliberate, because a
fixture that drifts from the API is worse than no fixture.

Point elsewhere with `VITE_API_TARGET`.

Fonts are licensed and not in this repository. Without them the app runs in its
fallback stack and looks different; see [`FONTS.md`](FONTS.md).

## Before opening a pull request

```bash
npm run lint
npm test
npm run build
```

CI runs exactly these three on every pull request. Merging into `main` deploys
production, and the deploy re-runs the tests before it ships.

Prettier settles formatting, but run it over the files you touched rather than
the whole tree: a handful of files predate the config and reformatting them
would bury your diff.

## What matters here

**`src/citations/` is the core.** The parser, the status map and the page
formatter decide what a reader is told about whether a quote holds. A change
there that makes an unverified citation look verified is the worst bug this
codebase can have. Those files carry the most tests for that reason; add to them
rather than around them.

**Nothing is optimistic.** A stamp renders pending until the server's verdict
arrives, and no verdict is ever inferred, cached optimistically, or retried on
the client. If a change makes the interface guess, it is the wrong change —
`README.md` explains why at length.

**The shape carries the verdict; colour only reinforces it.** Every state must
survive being printed in greyscale and read by someone who cannot distinguish
the hues. Each stamp also carries a text label.

**One component tree.** There is no `isMobile` anywhere; the phone layout is
container queries on the app shell, which is what makes the phone frame in the
header exercise the real layout rather than a simulation of it. Keep it that
way.

**`src/copy.ts` holds every user-facing string.** New text goes there, not
inline.

## Style

Prettier decides formatting. Comments are for what the code cannot say; a
comment restating the line below it will be removed.
