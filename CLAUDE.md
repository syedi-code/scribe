# scribe

**scribe-lm**, the reading half: a chat that answers from the PDFs in Works, and
shows whether every quote in the answer is on the page it named. The decisions
behind it are in `docs/scribe-ui.md`, with the design prototype at
`docs/prototype/index.html`.

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
src/flags/       the feature flags, and what each falls back to
src/styles/      every design token as Tailwind @theme variables
src/copy.ts      every user-facing string
functions/api/   the proxy to alexandria, and the flags this app answers itself
```

## Things worth knowing

**A new feature arrives behind a flag.** `src/flags/flags.ts` names every one
and what it falls back to; `functions/api/flags.ts` answers `GET /api/flags`
out of the deployment's environment, and `FlagProvider` asks once a tab. A flag
is a `FLAG_…` variable in `wrangler.toml`, which is the source of truth a
deploy rebuilds the project's variables from — set one in the dashboard and the
next deploy clears it. So turning a feature on or off in production is flipping
a string there and deploying, and never a change to the code that reads it.

From here on, a feature that a reader can see is written behind a flag and
shipped off. That is what lets a half-finished thing sit on main, and a costly
one be turned on for an afternoon and off again without a revert. A flag falls
back to *off*, because an unset variable is a deployment that has never heard
of the feature. `isClaudeHaikuEnabled` is the first, and it decides whether
Claude Haiku 4.5 can be picked in the switcher — held back it is struck through
and unpickable, which is the shape every held-back thing here already had.

Dev serves the same route: the plugin in `vite.config.ts` reads `wrangler.toml`
first, so `npm run dev` gets what production is actually given, then `.dev.vars`
and the shell over it for a flag being tried out locally.

**A limit is told before it is hit, and never before that.** alexandria meters
turns and refuses one with a 402; this app's job is that no reader meets that
402 without warning. `state/allowance.ts` holds what is left — a store rather
than a provider because it has two writers and no owner: `GET /models` carries
it when the roster lands, and every finished answer carries a fresher copy on
its `finish`, with the turn just taken already counted.

It says nothing until two questions are left. A tally in the corner from the
first question makes a reading tool feel metered from the first minute, and a
library should not; but a reader whose first news of a limit is the turn that
was refused reads the nudge as a toll gate rather than as information. Two is
where those two costs cross. Spent, the composer closes and the notice becomes
the reason it closed, so nobody is left wondering why typing stopped working.

`limit: null` is the admin and means *no ceiling* — never zero, which is how
"4 of null" ships. Nothing is said until the allowance is known at all, because
the only thing worse than no counter is a counter that flashes a wrong number.

A later figure wins, except that within one month nothing may lower `used`
below what a finished answer reported — the roster is fetched once a tab and
goes stale behind it. That exception is scoped to the month by `resets_at`,
because unscoped it eats the rollover: on the first the server rightly says
nought used, which is lower, and the reader would be told they had none left
until they reloaded.

No colour. An allowance is not a verdict, and the three status inks here mean
*found*, *not found* and *unknown* about a quotation; a limit borrowing rubric
would be the first place a colour in this app meant two things.

Behind `isPlanLimitShown`, which gates the *explanation* and not the limit.
Held back, a refused turn still says why — it just says it for the first time
at the moment of refusal.

Inside a conversation it is also said once as a dialog — at two left and at
none, once a month each, only after an answer has finished and never over
another dialog (`plan/useLimitNudge.ts`). A line under the composer is easy to
read past while an answer is being read. The home screen gets no dialog: the
composer is the whole screen there, so it closes, names the day questions come
back, and the three suggested questions go, because each one asks on a press.

A 402 on the chat stream is caught in the transport's `fetch`
(`chat/refusal.ts`). Left to `DefaultChatTransport` the reader was shown the
response body — raw JSON under their question. The body carries the allowance,
so the refusal itself tells the counter the month is spent.

The reset is formatted in UTC. alexandria names midnight UTC on the first,
which is the thirtieth anywhere west of Greenwich, and a reader in New York was
told their questions came back a day early.

**Every offer of a paid plan goes to one place.** `seePlans()` in
`state/dialog.ts` opens `plan/PlansDialog.tsx` — from the composer's notice, the
limit dialog, the account menu, the account sheet — and checkout is reached from
there and nowhere else. Nobody is offered what they already have: a paid reader
and the admin see no offer anywhere.

What the plans say comes from `GET /plans`, which alexandria answers from the
same `TURNS_PER_MONTH` and model table it enforces, so the page that sells a
plan cannot promise a number or a model the server would refuse. A free
reader's roster only lists free models, which is why it is a route of its own.
A price is shown only once alexandria sends one; until then the card says so,
and never a made-up figure.

A card carries only what differs — the questions a month, set large because it
is the difference a reader feels, then the models — and what both plans share
is said once under them. The plan on offer is drawn forward and holds the only
filled button; the reader's own is named, not shaded, because shading it made
the plan they are on look like the better one. Narrow, Paid comes first, so its
button is in reach without scrolling. None of it leans on anyone: the price and
the billing terms sit beside the button rather than behind it, nothing counts
down, *Not now* is as plain as the offer, and Free is described as it is.

**Checkout is finished on this side.** `plan/CheckoutDialog.tsx` is the
review — what, how much, how billed, which account, where the card goes — and
its button calls `POST /billing/checkout` (`api/billing.ts`). alexandria answers
with a Stripe Checkout URL and the browser goes there; card details are typed
into Stripe's page, never this one. Until Stripe is set up alexandria answers
501 `CHECKOUT_NOT_OPEN`, and the reader is told in the footer, where the payment
page would have opened, that nothing was charged. Stripe sends a reader back to
`?checkout=done` (the welcome, `plan/UpgradedDialog.tsx`) or
`?checkout=cancelled` (the review again); the query is taken off so a reload
does not welcome anyone twice. The plan itself changes on Stripe's webhook, not
on the redirect, and the two race — so the welcome says what was bought rather
than reading it back, and says the delay out loud while the allowance still
names the old plan.

**There is no Plans tab.** Tabs are the places a reader reads, and a tab of
billing beside the library is the storefront a reading tool should not be; the
compact tab bar has no room for one either. What a tab would have bought — an
address — every modal has instead.

**One modal at a time, the store decides which, and each is a history
entry.** `state/dialog.ts` names the open one and pushes it as `#plans`,
`#account`, `#checkout`. On a phone the back gesture is how anything is put
away, and a sheet that ignored it navigated the reader out of the app. The
plans also need somewhere a link can point: a post, an email, Stripe's return.
Each entry carries its depth, so ✕ steps back over all of them at once rather
than reopening the one underneath, and ‹ in checkout steps back one. A modal
opened by the address itself has nothing of ours to step back over, so closing
it replaces the entry instead of leaving the app. The limit dialog is pushed
but never opened from an address.

`ui/Dialogs.tsx` mounts the open one inside the shell, so it answers the same
container queries, and `ui/Modal.tsx` draws it with a native `<dialog>` and
`showModal()` — focus trap, Escape and the top layer are the browser's, so no
`--z-*` layer is spent on it. Focus lands on the title, not the first button: a
dialog that opened with its ✕ ringed in verdigris was saying *found* about a
close button. Escape is taken through `cancel` and never left to the element: a
closing `<dialog>` fires `close` after the store has moved on, and the limit
dialog handing over to the plans shut the plans on its way out. jsdom has none
of the `<dialog>` methods; `test/setup.ts` stands in only as far as `open`.

Narrow, a modal is a sheet: it slides up (`--animate-sheet`), takes the width,
scrolls inside itself, pins its `footer` within a thumb's reach, and carries a
handle that puts it away when pulled down past 80px. The pull moves the sheet
with `translate`, not `transform`, because the entrance is a transform animation
that holds its last frame and would win over one set by hand.

**The account is the reader's corner of the header.** Behind `isAccountShown`:
a stamp — the initial reversed out of an ink disc, in the bold italic the
wordmark's *-lm* is cut in — and the plan's name beside it, because *what am I
on* is the question most often asked of that button and answering it on the
button saves the press. Narrow, the stamp alone. Ink and paper only: an avatar
hashed to a hue would be a third meaning for colour beside the verdicts and the
author inks. The menu opens on the stamp again, larger, the address and what is
left, before it offers anything — which is most often all a reader came to
check — then the account sheet, the plans, and sign out. The sheet is where the
month is shown in full, count and measure, though nothing else says so before
two are left: a reader who opens their account has asked. The admin is named as
the admin, never as *Free*: exempt by role, not by paying.

Signing out is two doors, in order. `DELETE /api/session` first, because
alexandria's `POST /session` answers with any session the cookie still names,
so leaving it would sign the next person on this browser in as the last one;
it is httpOnly, so only the server can clear it. Then Access's own
`/cdn-cgi/access/logout`.

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

**Markdown is rendered, not stripped** (except bold, below). Asking the model for plain prose was a
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

**A quotation is written once, inside `<cite>`.** The model cites by wrapping
the words it quotes — `<cite P7>the will to truth</cite>` — so the quotation,
the evidence and the words the server checks are one copy of one thing.
`citations/parse.ts` reads the tag and draws the citation where it was woven.

It was `[P7 "…"]`, which put the quoted words somewhere the reader could not
see them, so the model wrote them again in its prose and the answer said
everything twice. Three revisions of alexandria's instructions failed to stop
it, and `anchorsFor()` here tried to pair each citation with the prose
quotation it repeated, by shared words. Across production it paired 42 of 92
citations and missed the rest: a two-word quote is under any floor, an OCR
error in the page breaks the match (production's _A Critique of Politi?al
Economy_), and prose that quotes different words from the citation has nothing
to pair. The pairing is gone. What it was patching was not duplication but its
cause — the reader was shown one copy and the server checked the other, so
35 quotations in 14 of 18 production answers carried quotation marks and no
verdict at all.

`[P7 "…"]` and `"…" [P7]` are still parsed, on both sides, because every answer
saved before this is written in them.

**A model can leave the citation grammar altogether.** On 20 September a heavy
turn came back with no citations at all: the model had written every one in
OpenAI's own file-search notation — `【P5†Inorganic matter is the maternal
bosom】` — rather than in ours. Nothing parsed, so nothing was verified and the
reader was shown the brackets. The handles and the quoted words were right the
whole time; only the punctuation was foreign. It is load-dependent: on a light
turn the model writes `<cite>` every time; on the turn that read eight ranges
and the index it wrote the foreign shape in two runs out of two, once mixed in
with nine correct cites in the same answer.

`normaliseCitationShapes()` translates it into ours before anything reads it.
alexandria does the same before it verifies and before it saves; this side is
for the answers saved before that and for the one being streamed now. The
marker hangs off its word the way a footnote number does, so the space a
quotation needs and a footnote number does not is part of the translation —
without it the reader gets `inorganic matter“Inorganic matter is the
maternal bosom”`. A half-written `【` is held back exactly as a half-written
`<cite>` is.

It is deliberately **not** a widening of `CITATION`. There is one citation
grammar and the two repos have to agree on it forever; `FOREIGN_SHAPES` is a
table of foreign spellings in front of it, which the next shape can be added
to without touching the grammar.

**A quotation the model wrote twice is shown once.** Asking for it once was
never enough. Across production the model wrote the quotation in its prose and
then the same words again inside the citation, on 29 of 137 citations — and
that rate did not move when the citation syntax changed under it, because the
syntax was never what it was doing wrong. It is not reproducible on demand
either: the mode fires on about one answer in three, holds for a whole answer
once it starts, and did not fire once across twelve replays of the exact
context that produced it. So no revision of the instruction can be shown to
work, and `collapseQuotedDuplicates()` in `citations/parse.ts` takes it out
instead. alexandria does the same before it saves an answer, which is what
keeps it out of the history the next turn reads back; this side is for the
answers saved before that, and for the one being streamed now.

**What counts as the same quotation twice is the words, not the marks.** If the
prose immediately before a citation ends with the words that citation quotes,
that is one quotation written twice, however it was delimited and whatever
separates the copies. Every instance in production was a quoted run and a
single space — and pinning the rule to that shape was the first version of this
fix, which was wrong for one reason: the instructions themselves tell the model
never to put quotation marks around quoted words, so the day it keeps that half
of the rule and still writes the words twice, a rule looking for quotation
marks goes blind and this is a fifth attempt. It is the words that are
compared.

Only the run against the citation is collapsed. A quotation that appears again
elsewhere is the answer re-reading it and is left alone: pairing quotations to
distant citations by their shared words is exactly what `anchorsFor()` did, and
it paired 42 of 92. Nothing under five words is collapsed, because a short run
repeats innocently, and nothing starts mid-word, or `breathe` gives up a `the`.
Where one copy merely *contains* the other — the cite taking in a name the
prose kept outside the quotation — it is left, deliberately, until traffic says
what that costs. That is one citation in the 137.

It collapses before `trimHalfWrittenCitation`, and that order is the whole of
why nothing flickers: mid-stream the unfinished `<cite>` is being held back, so
the reader is looking at the prose copy, and when `</cite>` lands that copy is
replaced by an identical cited one. The doubling is never painted.

**One citation regex.** `citations/parse.ts` mirrors alexandria's
`conversations/citations.ts` and the two have to agree forever — on `<cite>`,
on the bracketed forms, on curly quotes. Nothing else in the app looks for a
citation, and `parse.test.ts` holds the awkward cases. When the server starts
sending `marker` offsets, `markersFor()` prefers them.

**The apparatus is tool calls, never narration.** A search and a read are facts
and stay on screen once they have happened; narration is the model talking to
itself, it rewrites itself as the model changes its mind, and it is not shown at
all. A failed call says so and says why, rather than disappearing.

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

**An italic is preloaded, or it arrives too late to be one.** A roman is
discovered in the markup; an italic only once the stylesheet has been parsed.
On a phone that gap is long enough to paint, and what painted was the prose in
GT Alpina Light with every book name beside it still in the fallback — Iowan
Old Style on iOS, a far darker face. A title two shades heavier than the
sentence it sits in does not read as an italic, it reads as bold, and that is
what it was reported as twice while the weight was blamed both times.
`index.html` preloads the two italics that are on screen before a reader does
anything — the title's cut and the wordmark's — and `styles/theme.test.ts`
fails if either stops being preloaded. Regular Italic is deliberately not
preloaded: only an italic inside a 500 run-in head reaches it, and a third
135kB face fetched up front costs the phone more than it saves. `work-title`
also sets `font-synthesis: none`, so a missing cut falls back to a real italic
rather than a roman sheared over and thickened.

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
grouped in the browser, and the search is done here so it never costs a second
fetch.

**The fullest shelf comes first.** The library is a hundred-odd works by
seventy-odd names, and most of those names have one work each; filed A to Z,
Foucault's ten sat among fifty single volumes, each costing a heading for one
line. `books/shelve.ts` orders names by how many works the library holds of
them, ties by surname, and gathers the one-work names on a single shelf at the
end with each name beside its title. A line of surnames under the search jumps
to each fuller shelf — wide only, since on a phone it wrapped to five rows and
the search does the same job — and each heading stays pinned while its shelf scrolls
under it. Where a name is filed is decided by what the library holds, never by
what the search left — `foucault order` is one work, still on Foucault's shelf.

**About is a page of the book, not a product page.** `about/AboutPanel.tsx`,
behind `isAboutShown`, its words in `COPY.about`. It says nothing about a
reader's data that is not already true of it; add a promise there only once the
code keeps it (30-day deletion, for one). The key to the three rules under a
quotation is drawn from `CITATION_STATUS`, so it cannot come to describe a
mark the answers no longer make.

**Narrow, the header is two rows.** The mark and the running model on the left
of the first with the account stamp opposite, and the tabs spread across the
whole of the second; on the home screen the mark folds away and the stamp keeps
its corner, so it never moves between screens and never sits in a row of words. One row ran past
a 360px phone once Sessions and About were both there, and tabs jammed against
the right edge of a screen with nothing on its left read as leftovers. The
struck-through `Add a book` is not shown narrow — a tab nobody can press is the
one a phone does without — and the row scrolls sideways before it ever clips.

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
was most of a phone screen of apparatus under every answer about four books. The
rows are tight — a 32px row, 2px apart, so four books cost 136px of a phone
rather than 176. A pip takes the gap above and below it to reach a 34px target,
which is the pitch and not the 44 a finger is usually promised: the trade that
buys the compactness. What a target may never do is overlap the row above or
below, which would open the wrong book, so its reach is exactly the gap — which
is why that gap is what `MarginNotes` sets and not a number chosen for looks. The name is set at
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
34px tall and only as wide as its rhythm needs.

**The home screen says what Scribe is, under the mark and not in it.**
`ask/Subtitle.tsx` settles in first after the mark finishes typing, ahead of
the running line, and it is not part of `Wordmark`, so it stays behind when
the mark travels to the header. A line of the prose — the reading face, light,
lower case like the mark, `--text-lede` wide and `--text-prose` narrow — set
close under the mark as one lockup, with the running line kept further off:
one says what Scribe is, the other what it is doing now. Not an italic, which
means a book, and not spaced capitals, which read as a label stuck on. One line
wide; narrow it breaks at its comma and nowhere else. Narrow the mark is set
larger (2.9rem) to take the room a phone's home screen had left empty.

**One family, one width.** Everything is GT Alpina Standard; `--font-app` is
the same family as `--font-read`, and the apparatus is told apart by size and
ink, not by width. Condensed is gone — it read as cramped beside the prose —
and nothing in the app is set in capitals or tracked.

**A section head is the words, a size up and a weight up.** `section-head` is
`--text-head` at 500 in the reading face, in ink, sentence case, used by the
answer's `##` and by About. It was tracked capitals in faint ink, which read as
a label rather than a head.

**Bold is removed, never set.** The model wraps phrases in `**` in about one
answer in four — a name, a page number, half a sentence, whatever it thought
mattered while writing — so setting it made answers shout at random. `bolden()`
in `citations/parse.ts` takes the marks out and leaves the words as prose,
including a mark still unclosed mid-stream, and a line that is nothing but bold
is a paragraph of its own rather than a heading (`citations/blocks.ts`).

**The wordmark travels.** Leaving the home screen, the big mark is flown into
the header's corner rather than vanishing and reappearing there. The home mark
records its box as it unmounts (`ui/departure.ts`); `ui/Travel` flies one copy
from that box onto the header's mark over the fold's 300ms, with the header's
own mark hidden until it lands, because the fold clips and fades and cannot
carry it. Wide, the rail rises into that corner on the home screen and steps
down out of the way as the mark arrives, so the corner is never an empty hole.
The header is transparent to the pointer where it holds nothing, since the
risen rail is under it. How far it rises is `--header-rest`, the header's
height with the mark folded away, and it is measured off the tabs plus the
row's padding, never off the row: the effect runs on the commit that starts the
fold, while the row is still open, so coming home from a conversation the rail
rose by the open height and took `Sessions` up off the top of the shell. On the
home screen `New question` is disabled — there is no conversation to leave, and
a click that did nothing at all was reported as a broken button. A file and a
component that differ only in case — this was `travel.ts` beside `Travel.tsx` —
do not compile on Windows.

**A scrollbar is a mark in the margin, not a control.** Set once, in the base
layer of `styles/theme.css`, for every scrolling region at once: thin, no track,
no arrows, a thumb in `--color-edge`. The platform's own was the one piece of
chrome in the app nobody drew. Both the standard properties and the
`::-webkit-` pseudo-elements are set, because Safari before 18.2 has only the
latter; a component that styles its own scrollbar is a bug.

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

**A model can be held back.** `heldBack()` in `models/ModelProvider.tsx`, shown
struck through and unpickable rather than hidden, so a reader can see what
Scribe could run. Haiku is held back on cost — five times Luna's input and four
times its output, for a lower score, and every step of the agent loop pays it
again — so it is behind `isClaudeHaikuEnabled` rather than a constant: a
decision about money changes more often than the code around it. The strike and
the disabled row say _held back_ on their own: a _coming soon_ beside them was the
same fact twice, and it is the one claim of the three that needs no words.
_no key set_ still does, because it is a different claim — that the deployment
is missing a key rather than that we chose this. `Add a book` is held back the
same way and always has been: the tab is struck through and disabled with no
label, and `add/AddPanel.tsx` waits for an ingestion to exist behind it.

**A model can be on a plan above the reader's, which is not a missing key.**
`GET /models` lists those under `locked`, and the switcher says _on Paid_ beside
them and opens the plans when one is pressed. Before it did, every paid model
told a free reader _no key set_, which read as a broken deployment. The admin's
own models — GPT-5.6 Sol, at twenty times Luna's price — are in no plan, are
not in `KNOWN`, and arrive only in the admin's roster, marked _yours alone_; no
one else is ever named a model they could never have. Gemini is off the roster
on both sides.

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
fallback for each, are in `docs/scribe-citations-api.md` and the README.

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
