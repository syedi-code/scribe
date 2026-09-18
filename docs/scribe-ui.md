# scribe-lm — the reading interface

The frontend half of Scribe: a chat that answers philosophy questions from the
PDFs in Works, and a place to add new ones. alexandria already streams the
answer and verifies every quote in it (`docs/SCRIBE.md`). This file decides what
a reader sees, and why.

The prototype these decisions were made in: `docs/prototype/index.html`. Serve
it, don't open it as a file — the fonts are woff2 and Chrome refuses them over
`file://`:

```bash
python -m http.server 4573   # from the repo root, then /docs/prototype/
```

Hash hooks, so any screen can be captured without driving it by hand:
`#skip-launch` goes past the opening, `run=0` or `run=1` plays a scripted
question, `cite=c2` opens a page, `dim` turns on `Only what's cited`, `tab=add`
opens the other tab, `phone` starts in the phone frame. They combine:
`#skip-launch&run=0&cite=c2`.

## What the interface is for

A model that cites is not the same as a model that is right, and an interface
that shows citations is not the same as one that shows whether they hold. The
backend already draws that line: every quote is looked for on the page it names
and comes back `verified`, `unverified` or `unverifiable`. Almost every product
decision here is about refusing to let those three look alike, and refusing to
let a sentence with no evidence at all look like one that has some.

Three rules follow, and they outrank everything aesthetic.

**1. The evidence is the words, and the stamp says how they held up.** Quoted
words are set one weight heavier than the prose around them, with the quotation
marks themselves dropped back to a faint grey — the source's words carry the
mark, not a rule under them. A small square stamp follows the quote:

| Stamp              | Means                                                |
| ------------------ | ---------------------------------------------------- |
| filled square      | the words are on the page it named                   |
| open square        | they are not — or they matched and then diverged     |
| dotted open square | the page has no text layer; nothing could be checked |

Filled means found. Empty means nothing was found there. Dotted means we could
not look. The form carries the meaning and the colour only reinforces it, so it
survives being printed, and a reader who cannot distinguish rubric from
verdigris still reads it correctly. Hovering a quote lights its note in the
margin and draws the hairline between them; clicking either opens the page.

**2. Verification is an event, and the reader watches it happen.** Citations
arrive in a `data-citations` part _after_ the answer is written, so for a second
or two the answer exists unchecked. That interval is not a loading state to
paper over — it is the most honest moment in the product. Stamps arrive pending
(an outline, pulsing) and resolve one at a time down the page.

**3. Uncited prose is visible as uncited.** `Only what's cited` (under the
answer, and `c`) fades every sentence that no citation supports. On a good
answer it changes little. On a bad one the paragraph nearly empties, and the
reader learns something the model would never volunteer.

## What is not the answer

alexandria's note that "an answer message holds the text of every step" is a UI
decision in disguise. Models narrate — _let me look at the fuller context_ —
however firmly the instructions ask them not to.

So the interface has two registers. The **answer** is the text after the final
`step-start`, set in the reading face at reading size. Everything before it —
the narration and the tool calls — is **apparatus**: condensed, smaller, one
line, collapsed once the answer starts, expandable by anyone who wants to audit
the search. While the model works, that line is live and specific
(`searching pages — "will to truth"`,
`reading Beyond Good and Evil, PDF pp. 19–23`), because watching a good search
is reassuring and watching a bad one is diagnostic.

## Layout

It is a chat, and it behaves like one: the question sits in a bubble on the
right, the answer runs full width on the left with no bubble around it, and the
composer is docked at the bottom. That is what ChatGPT, Claude and Gemini all
converged on, and departing from it would cost the reader something and buy
nothing.

What is not conventional is the margin. On a wide screen, citations sit in a
column beside the answer, each one level with the sentence it supports, tied to
it by a hairline that draws on hover. That hairline starts at the column's edge,
level with the quote — never at the quote's own right edge, or a citation that
ends mid-line drags the curve back across the prose. Under 1040px the column
folds into footnotes under the answer.

```text
┌──────────┬───────────────────────────────┬──────────────┐
│scribe-lm │                    Ask  Add ▯ │              │
│running…▾ │                               │              │
├──────────┼───────────────────────────────┴──────────────┤
│ New      │        ┌────────────────────────────┐        │
│ question │        │ Does Nietzsche think the…  │        │
│          │        └────────────────────────────┘        │
│ the will │  ▾ searched twice, read 9 pages              │
│ to truth │                                              │
│          │  Nietzsche does not treat the will   │ P7    │
│          │  to truth as an appetite for facts:  │ Beyond│
│          │  “the will to truth, which will      │ Good  │
│          │  still tempt us…” ■                  │ p. 9  │
│          │                                      │ found │
│          │  1 of 3 found   Only what's cited    │       │
├──────────┴──────────────────────────────────────────────┤
│          │ Ask about the library              Ask │     │
└──────────┴──────────────────────────────────────────────┘
```

**The home screen is one centred column and nothing else**: the wordmark, one
line saying which model is running, the composer directly beneath it, and two
questions to start from. No header chrome beside the tabs, no sidebar until
there is a conversation to list, no explanatory paragraph. It is the shape all
three reference apps use, and the reason is that the composer is the only thing
anyone came for.

**Mobile is not a fallback.** The layout responds to `#app`'s own width through
container queries rather than the viewport's, which means the phone frame (the ▯
button in the header) exercises the real mobile layout rather than a simulation
of it: the margin folds to footnotes, the rail goes, the header compresses, and
the page view takes the full width. Every change from here is checked in that
frame first.

## Type

**GT Alpina Standard** for everything a person reads, **GT Alpina Condensed**
for the apparatus. One family, two widths: the answer and the evidence about the
answer are visibly different kinds of writing, without a second voice entering
the page.

Sizes are set against what the reference apps actually use. Measured directly:
**Gemini 17px/24px** for both composer and response, 14px for sidebar and
chrome. Reported for **ChatGPT: 16px/24px** body. Claude's own numbers could not
be measured — chatgpt.com and claude.ai both sit behind a bot check, which is
not worth defeating for a type scale. A serif needs the larger of the two to
carry the same x-height, so prose is 17px, and every line-height here is tighter
than a document would take.

| Role                       | Face                        | Size      |
| -------------------------- | --------------------------- | --------- |
| Wordmark, home             | Standard Bold, `-lm` italic | 38–53px   |
| Wordmark, header           | Standard Bold               | 17px      |
| `running <model> ▾`        | Condensed Regular           | 17–22px   |
| Answer                     | Standard Light              | 17 / 1.5  |
| Quoted evidence inside it  | Standard Regular            | 17 / 1.5  |
| Question bubble            | Standard Regular            | 16 / 1.4  |
| Composer                   | Standard Light              | 16 / 1.45 |
| Tabs, rail, suggestions    | Standard Regular / Light    | 14        |
| Apparatus, notes, verdicts | Condensed Regular           | 13 / 1.35 |

## Colour

Cream, as asked. The rest is chosen to stay out of the way of three status inks.

| Token          | Hex       | What it is                                     |
| -------------- | --------- | ---------------------------------------------- |
| `--paper`      | `#F4EFE3` | the page                                       |
| `--paper-deep` | `#E8E0CD` | rules and edges                                |
| `--paper-lift` | `#FBF8F1` | the composer, the page view, menus             |
| `--bubble`     | `#EAE2D1` | the question bubble, and a lit citation        |
| `--ink`        | `#241F1A` | iron-gall brown-black; all reading text        |
| `--ink-soft`   | `#6E6358` | apparatus and secondary text                   |
| `--ink-faint`  | `#A0968A` | quotation marks, placeholders, inactive tabs   |
| `--verdigris`  | `#2F5D53` | verified                                       |
| `--rubric`     | `#9B2C21` | unverified                                     |
| `--slate`      | `#7C7789` | unverifiable — no text layer, nothing to check |

No accent colour exists outside those three status inks. Nothing on the page is
coloured for emphasis, so colour always means the same thing: this is how the
evidence came back.

## Motion

One orchestrated moment, at launch: the wordmark types itself in place at the
centre of the screen, a character at a time, and then the model line, composer
and suggestions fade up beneath it. It does not fly anywhere.

The typing is smooth because nothing reflows. Every glyph is laid out before the
animation starts and only its opacity changes, and the caret is positioned
absolutely and walks to the trailing edge of each character as it appears — so
it reads as typing while the line itself never moves. Character-by-character
insertion, the obvious implementation, jitters the whole line as it renders. The
same trick carries the answer: it arrives a word at a time, each word already in
place, fading up at ~32ms.

After that, motion only answers an action, with one exception: the verification
pass, staggered ~290ms per citation in the order they appear, so it reads as a
pass down the page rather than a flicker.

`prefers-reduced-motion` skips the typing, prints the answer whole, and resolves
every stamp at once.

## Models

The switcher lists what `GET /models` returns, which is only the models whose
provider key is set. It lives in the one line under the wordmark —
`running Claude Haiku 4.5 ▾` — on the home screen and in the header once a
conversation starts, so the model in use is never more than a glance away and
never occupies a corner of its own.

**Claude Haiku 4.5 is the default in the frontend**, not the backend's
`claude-sonnet-5` — cheapest model first while the interface is being built,
changed in one line when it is not.

Model identity is per message, not per conversation: `messageMetadata` already
carries `model_id`, so the answer says which model wrote it. Switching
mid-conversation leaves earlier answers labelled with the model that produced
them.

## The third tab

`Build notes` is prototype scaffolding and does not ship: the whole brief for
whoever implements this — feature inventory, component structure, how to read a
message, the citation pipeline, DRY rules, animation specs, and eighteen user
stories with acceptance criteria. It is written to be read cold by someone who
has never seen the project. When a decision here changes, change it there too;
it is the only copy an implementer will actually read.

## The second tab

`Add a book` is a drop zone for PDFs that will write to `documents` and kick off
extraction. Designed here only far enough to be a real place: the empty state
names what happens to a file after it lands — extract the text layer, index the
pages, then it is citable — because that sequence is the whole product promise.
Nothing behind it yet.

## Deliberately not

**A tick or a cross.** The check means the words are on the page. It does not
mean they support the claim, and a tick would be read as endorsing the argument.
A filled square says _found_; the margin says `found on the page`, which is all
that was checked.

**Underlining the quote.** It was the first treatment and it was too loud: a
twenty-word quote under a coloured rule pulls the eye off the sentence it is
supporting. Weight marks the words; the stamp carries the verdict.

**Retrying a failed citation.** A quote that came back `not_found` stays
`not_found`. The reader is offered the page instead, and can look.

**Streaming citations as they are written.** They would be unchecked, and an
unchecked citation on screen for ten seconds looks exactly like a checked one.

**Avatars, and a typing indicator of three dots.** The apparatus line says what
is actually happening, by name.

**Markdown headings inside answers.** The instructions ask for plain prose; the
renderer supports paragraphs, emphasis and citations, and nothing else. If an
answer genuinely has list shape, that is worth a decision, not a default.
