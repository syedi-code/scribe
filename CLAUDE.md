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

**One status map.** Verdict wording, pip shape, the rule under a quotation,
margin rule colour and verdict colour all come from `CITATION_STATUS` in
`citations/status.ts`. A colour written inline in a component is a bug: the
next status would be added in four places and shown in three.

**A verdict is a rule under the words it is about.** `ask/Citation.tsx` draws
`CITATION_STATUS[…].underline` under exactly the span the server checked —
solid verdigris found, wavy rubric not found, dotted slate unknown, dotted
faint while the check is still out. It was a small square after the closing
quotation mark for a long time, on the reasoning that a rule under a twenty-
word quote pulls the eye off the sentence it supports. Two things were wrong
with it: a mark after the quote says nothing about _which_ words were checked,
and on a phone it was a 10px target. The style carries the verdict as well as
the colour, so it survives being printed and a reader who cannot separate
verdigris from rubric still reads it correctly; the square also said the
verdict in words to a screen reader, and that is kept as an `sr-only` span.
The pips on the shelf are still squares — that is what `stamp` is for.

**Markdown is rendered, not stripped.** Asking the model for plain prose was a
fight we lost every turn — production carried ten literal `**` and a `##` in one
answer — and stripping the marks left a wall, because an answer about five books
genuinely is a list. `citations/blocks.ts` parses a small, deliberate subset:
headings, lists, quotations, code, rules, prose. No dependency; the subset is
small and the citation constraint below rules out a general renderer.

**A block carries spans, never a copy of its text.** A citation is found by
character offset, so a parser that handed back cleaned strings would put every
offset in the answer out by the width of the marks it removed, and a quote would
render in the wrong place or not at all. `localise()` moves the answer's
citations onto a block by looking each old position up in a map of what was
kept. A blockquote is several spans because its `>` sits on every line. Every
citation keeps the index it has in the whole answer, so the stamp a reader
clicks is the one the server checked whatever block it landed in.

**Blocks are set the way a book sets them.** `section-head`, `run-in-head`,
`extract`, `list-hang`, `code-block`, `page-break` in `styles/theme.css`. What a
block may never borrow is a mark that means something else here: no coloured
rule, no square, no stamp. A blockquote's rule is `--color-paper-deep`, because a
coloured rule in this app is a verdict and an extract is not a verdict about
anything. A section break is a centred ornament, not a line across the page, for
the same reason. A list hangs its marker in the margin and numbers are
tabular, so 9 and 10 agree on where the point is.

**The model marks its own names, and the catalogue catches what it misses.**
`<title>` and `<author>` in the answer, parsed by `citations/tags.ts`. This used
to be forbidden here on the grounds that a model forgets and a forgotten tag
shows the reader markup. Both halves are true and neither is fatal: it forgets
sometimes, so `useLibraryNames` runs the whole catalogue behind it as a
fallback, and markup only reaches the reader if we print it, so a stray or
unclosed tag is swept, and one closed with a bare `>` — production has
`<author>Plato>’s` — is read as closed. It buys the one thing no rule of ours could — the model
knows Newton is a person and Sufism is not, and every heuristic for that is a
list of words to be wrong about.

The model's mark wins and is never reconsidered; the catalogue only ever runs on
what is left as plain text, so nothing is marked twice. A mark inside a
citation's quotation is stripped before the quote is used: a quote is matched
against its page character for character, and a tag inside one turns a faithful
citation into an unverified one.

**An italic means a book, not a book we hold.** A work the answer merely names
is set as a work. Tying the italic to a verified citation meant a title the
model marked up was never recognised as one at all.

**A citation that repeats the prose is moved onto it.** Models write the
passage out and _then_ cite it, which printed the same words twice and made
good answers read as gibberish. `anchorsFor()` in `citations/parse.ts` finds
the quotation in the prose that a citation repeats, draws the citation there
— the rule under the prose's own quotation, the checked words one weight
heavier inside it — and drops the copy. A quotation repeats a citation when
the two share five words, or when the whole of a quotation of three or more
words is inside the cited passage (`repeats()` in `citations/overlap.ts`):
production's most common case is _“Plato is boring” [P10 "Plato is
boring.-Ultimately my distrust…"]_, which no five-word floor can pair. It
looks back to the previous citation, not just at the nearest quotation,
because the nearest is often a different one and a clause of any length sits
between; and a pile of citations after a sentence shares the prose before the
pile, each finding its own quotation. A citation is never folded onto words it
does not contain — _“identity of life and death”_ against _[P20 "identity of
day and night"]_ is the same claim in different words, and a stamp on the
prose would say words were found that were never checked. The instruction that
asks the model not to do it is in alexandria's `conversations/instructions.ts`;
the client does not rely on it. `absorb.test.ts` holds the production cases.

**The apparatus is tool calls, never narration.** A search and a read are facts
and stay on screen once they have happened; narration is the model talking to
itself, it rewrites itself as the model changes its mind, and it is not shown at
all. A failed call says so and says why, rather than disappearing.

**One citation regex.** `citations/parse.ts` mirrors alexandria's
`conversations/citations.ts` and the two have to agree forever. Nothing else in
the app looks for a citation, and `parse.test.ts` holds the awkward cases. When
the server starts sending `marker` offsets, `markersFor()` prefers them.

**A book's name is set by the stylesheet.** `@utility work-title` in
`styles/theme.css`, used at every one of the six places a title is printed —
the prose, the margin, the shelves, the drawer, the badge group, the scan. A
component that writes `italic` for a title instead is a bug, and
`styles/theme.test.ts` fails on one.

It sets the face, the slant and the weight. `font-style: italic` alone asks for an
italic of whatever family is in force, and GT Alpina Condensed ships without
one — so the margin note, set in `--font-app`, got a browser-sheared
`GTAlpina-CondRegular` while the other four sites got the drawn
`GTAlpina-LtIt`. Standard has a true italic at 300, 400 and 700. Medium 500
has none, and a run-in head is set at 500, so a title inside one inherited a
synthesised medium that read as bold. `work-title` pins the weight — to
`--weight-text`, the same token the prose is set in. Pinning it at 400 while
the body stayed Light fixed the run-in head and made every title in the app
read as emphasised instead, since 400 is the step a checked quotation is set
in. A title is a slant, never a weight.

**One copy file.** `copy.ts`. The honesty of this interface lives in its wording
— _found on the page_, never a bare _verified_, never a tick — and wording
scattered across components drifts.

**Tokens, not values.** Every colour, face, size and width is a `@theme`
variable in `styles/theme.css`. No arbitrary hex in a component, ever.

**Colour on a mark is a verdict; colour on a word is a name.** That is the whole
of what colour means here. The three status inks land only on marks — the stamp,
the margin rule, the verdict line. The six author inks (`--author-c0…5`) land
only on a surname, in the prose and in every reference to it. Nothing else in
the app is coloured, with one exception that never reaches the reading surface:
a provider dot inside the model switcher.

The author inks are chosen against the prose rather than against the paper: L
0.34 in OKLCH, the band the text itself sits in, so a name reads as ink from
another inkwell and not as a highlight. Every hue is at least 25° clear of
verdigris, rubric and slate, and all six sit a whole lightness band below them —
that separation, not hue, is what keeps the two systems from being confused. A
surname hashes to its ink for ever (`citations/authors.ts`, FNV-1a over the
lowercased name with apostrophes normalised, because `Ibn 'Arabī` arrives three
ways). Collisions are expected and harmless: the ink links mentions, it never
claims to identify anyone.

Only whole words are inked — `Kantian` stays prose — and a surname inside a
work's title belongs to the title.

**An ink is a plain rule, not a `@utility`.** The class is built at run time,
`author-c${hash % 6}`, so Tailwind's scanner never sees the name and emitted no
rule for it at all. The tokens were in the stylesheet and the spans carried the
class, and every name rendered in plain ink from the day the feature shipped —
which is what "the inking still isn't working" turned out to mean, twice.
`styles/theme.test.ts` fails if one goes back to being a utility, and fails
again if an ink is as dark as the prose it has to be told apart from.

**What was checked is asked for, not read off the payload.** `citation.page` is
one of the four fields alexandria does not send yet, so a pass that read it got
an empty list and quietly did nothing: neither an inked surname nor a set title
has ever appeared in a production answer. Every component already fell back to
the document behind `ref` through `useCitedPage`; the prose now does the same
through `citations/useCitedWorks`. The fixture that hid this set `page`, which
is the API we are waiting for — `asProduction()` in the test harness strips it,
and is what a citation test should be written against.

**A model's maker is the one name not hashed.** `models/brand.ts` assigns
`Claude`, `GPT` and `Gemini` their makers' own colours, because `gpt` and
`gemini` hash to the same slot and those two sit two rows apart in one short
list, where a collision reads as a bug rather than the coincidence it is
between two authors. It replaces the provider dot: one mark, not two systems in
one row. None of it reaches the reading surface — the model does not talk about
itself — so a brand colour never lands beside an author's ink.

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

Under the compact breakpoint Sessions is a tab of its own, level with Ask and
Books, and takes the whole page; wide it is the rail beside the page and the
tab is not offered. `Workspace` renders both, and the container query decides
which one a narrow screen shows. A list of conversations is a destination, not
an overlay — it was a drawer over a screen one column wide.

There is one deliberate exception, and it is CSS that chooses it, not
JavaScript: under the fold the margin notes give way to `ask/Shelf`, one entry
per book with a badge per reference into it. Six citations into one work printed
its title six times, which on a phone was most of the screen. Both forms are in
the tree and `@max-fold` picks one, so there is still no component deciding
which layout it is.

**Every reported bug has a test.** `src/**/*.test.tsx` covers the parser and the
handful of behaviours that have broken in front of a reader: the drawer closing,
the switcher's stacking, the duplicated quotation, the drawer
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

**The scan is drawn here, not handed to the browser.** A signed link into the
browser's own PDF viewer is the one thing that cannot work on a phone: iOS
ignores `#page=`, so a citation to p. 147 opened page 1 of a four-hundred-page
book, and the tab was opened after an `await` on `/files/sign`, which Safari
blocks as a popup — so on an iPhone the button did nothing at all. `page/pdf.ts`
renders the cited page with pdf.js and `page/ScanView.tsx` shows it over the
drawer: the right page, in the app, back with one tap. pdf.js and its worker are
a megabyte and most readers never open a scan, so nothing is imported until one
does. The decoders, standard fonts, cmaps and colour profiles it needs beside
its code — a scanned page is JBIG2 or JPEG 2000 and a typeset one names fonts it
does not carry — are served from `/pdf` by the plugin in `vite.config.ts`;
without them a page draws blank. The page is drawn at the size it is shown and
redrawn when it is magnified, capped at 2×, so type is sharp and a 3× phone does
not pay for nine times the pixels. The whole file is still one tap away, as a
link rather than a window opened later. Escape puts away the scan before the
drawer.

**A scan that will not draw is not a book without a scan.** Three outcomes,
kept apart in `ScanView`: the document has no file, the file is there and could
not be drawn, or here is the page. Collapsing the middle into the first printed
_this page has no scan to show_ over a book whose scan is in the bucket — for
every citation, since every failure landed there. The drawer's footer had the
same fault one step earlier: whether a document has a scan is a round trip
away, and it answered before the round trip landed. It now says nothing until
it knows. When drawing does fail the reader gets the reason and keeps the link
to the file, which is the moment the link is worth most. The key in that link
is encoded a path segment at a time: six of the library's filenames carry a
space or a comma, and unencoded the path the browser sent was not the path the
token was minted over.

**The margin under the fold is one line per book.** `ask/Shelf.tsx`: the name,
and its pips ranged right on the same line — a ledger entry. Two lines per book
was most of a phone screen of apparatus under every answer about four books. A
pip is drawn 36px and reaches the 44 a finger wants by taking the 8px gap above
and below it, which is why that gap is what `MarginNotes` sets and not a number
chosen for looks: two rows' targets meet and never overlap. The name is set at
the size the margin sets its notes at, because this *is* the margin note,
folded, and it truncates before the pips give up any room — a shortened title is
still a title, a missing verdict is a missing fact.

**The drawer shows a passage, not a page.** `citation.context` is another field
the server does not send, so every citation fell through to the branch that
printed the entire page — several hundred words under three stacked
explanations of why. `citations/window.ts` finds the quote in the page text the
drawer has already fetched and shows a window around it, matched on a run of
words rather than characters because these pages are scanned and a faithfully
copied quote still misses by a letter. What is left is what earns its place: a
verified citation shows the passage and says nothing, since the verdict is
already in the header and the quote is already lit in place. The quote is
printed on its own only when it is nowhere to be found on the page.

**A page is reflowed before it is read.** A PDF's text layer breaks a line
wherever the typesetter did, and printing those breaks gave a column of ragged
half-lines in the drawer — worst on a phone, where the drawer is the screen.
`reflow()` in `citations/page.ts` joins them and changes no words: a blank line
is a paragraph, a single break is a space, and a line broken on a hyphen closes
up _without_ one, so the hyphen the typesetter put there is still the only thing
between the halves.

**Opening a conversation is a move to the reading surface.** `Rail` takes
`onNavigate`, and it switches the tab to Ask from wherever the reader was —
the shelves, or narrow, the Sessions tab itself. Wide, the rail never closes,
so anything short of a tab switch loaded the thread into a panel nobody was
looking at.

**Pending is not unknown.** A citation whose check has not come back has not
failed. The shelf under the fold used to print `a page it was never shown` as
the title of every entry while the answer was being written. The book is
known before the verdict is: the handle was given out by a search or a read
already in the conversation, and `chat/shown.ts` reads which page it was, so
the margin and the shelf name the book from the first render and group it
without re-shuffling when verification lands. Only a verdict of
`unknown_handle` may say the page was never shown.

**The shelf is a name and its pips, not a card.** A pip per reference, and
past five one pip and a count per verdict, never a single total: seven found
and one not is the fact, and a total would hide the one that failed. A pip is
44px tall and only as wide as its rhythm needs.

**The wordmark travels.** Leaving the home screen, the big mark is flown into
the header's corner rather than vanishing and reappearing there. The home mark
records its box as it unmounts (`ui/departure.ts`); `ui/Travel` flies one copy
from that box onto the header's mark over the fold's 300ms, with the header's
own mark hidden until it lands, because the fold clips and fades and cannot
carry it. Wide, the rail rises into that corner on the home screen and steps
down out of the way as the mark arrives, so the corner is never an empty hole.
The header is transparent to the pointer where it holds nothing, since the
risen rail is under it. A file and a component that differ only in case — this
was `travel.ts` beside `Travel.tsx` — do not compile on Windows.

**One press, everywhere.** `@utility press` in `styles/theme.css` is what a
pressable row does under a finger — a session name, a question on the home
screen, New question. A row that invents its own is a row that feels different
for no reason.

**The margin is stacked by a rule, not by a loop.** `ask/stack.ts` decides where
each note goes: level with its quote, never over the note above it, and a note
whose quote has not been measured yet still gets a place. Skipping it left `top`
unset, which put every unplaced note at the top of the margin on top of the
others.

**The leader turns a right angle.** It was a bezier and read as a stray wobble
in the gutter. Right angles are what the rest of this interface is made of.

**Transition `translate`, not `transform`.** Tailwind v4's translate utilities
set the `translate` longhand, so a transition on `transform` animates nothing —
which is how the mobile rail came to snap open instead of sliding. `ui/Travel`
flies the wordmark on the longhands for the same reason.

**A conversation read once is kept.** `chat/threads.ts` holds what it fetched
for the life of the tab, and the rail warms a conversation on `pointerenter`, so
the click that follows usually has nothing to wait for — 245ms to 14ms, measured
against a round trip. `forgetThread()` on every question asked, since that turn
makes what was held wrong. The list is keyed on which conversation it is, so the
switch reads as turning to one rather than a list rewritten in place.

**A name is one line of words.** The title model is asked for six words and
usually gives them; it has also returned a whole Markdown document — heading,
italic aside, numbered list — which went into the row verbatim and into the
reader's rail as one very long line. `asTitle()` in alexandria makes it one line
on the way in, and `chat/title.ts` does it again on the way out, for the rows
already written and for the next model that ignores the instruction in a way
nobody has thought of.

**An answer is signed by whoever wrote it.** `Turn` falls back to the model in
the switcher only while a turn is actually streaming. Falling back to it on a
saved turn re-signed every old answer in the conversation each time the reader
changed models.

**`naming…` is a claim about right now.** It is said only while `ChatProvider`
is actually polling for a title. A conversation that is still untitled after
that is `untitled` — promising a name that is not coming is how `naming…` came
to sit in the rail for ever.

**Two models are held back.** `COMING_SOON` in `models/ModelProvider.tsx`,
shown struck through and unpickable rather than hidden, so a reader can see
what Scribe could run. Gemini 3.8 Flash has never run here; Haiku has, and is
held back on cost — five times Luna's input and four times its output, for a
lower score, and every step of the agent loop pays it again. The strike and the
disabled row say _held back_ on their own: a _coming soon_ beside them was the
same fact twice, and it is the one claim of the three that needs no words.
_no key set_ still does, because it is a different claim — that the deployment
is missing a key rather than that we chose this. `Add a book` is held back the
same way and always has been: the tab is struck through and disabled with no
label, and `add/AddPanel.tsx` waits for an ingestion to exist behind it.

**The default model is slow on purpose.** GPT-5.6 Luna costs a fifth of Haiku's
input and a quarter of its output and scores higher, and pays for it in time:
minutes can pass before its first token, and every step of the agent loop pays
that again. So `ask/Waiting.tsx` is not decoration. Past eight seconds it shows
a running clock, because at two minutes an animation alone is indistinguishable
from a hung page, and `ask/useElapsed.ts` reads that clock off a timestamp
rather than counting its own ticks — a phone that locked and came back would
otherwise show how long its timers ran, not how long the reader waited.

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
need it — `tab` in `AppFrame`, and nothing else.

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
