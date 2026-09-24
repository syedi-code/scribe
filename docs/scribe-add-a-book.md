# Add a book

Scope for the second tab. `add/AddPanel.tsx` is a drop zone with nothing behind
it and copy that says so — `held — no ingestion behind this yet`. This is what
"behind it" means for this sprint.

Read `docs/INGESTING-PDFS.md` in alexandria first. It is the manual path, and
this automates it rather than replacing it: the CLI stays, as the backstop.

## Decisions taken

| Question                    | Answer                                                                        |
| --------------------------- | ----------------------------------------------------------------------------- |
| Metadata proposal agents    | **Out.** A form with what the PDF declares, and an admin who types the rest   |
| Cloudflare-native AV        | **There isn't one that is cheap.** Structural validation instead; see below   |
| Admin review of submissions | **In.** A queue in the Add tab, with the submitted file drawn in the app      |
| Admin's own uploads         | **Bypass review, not validation**                                             |
| Extraction on upload        | **In, on Workers Paid**, with the cron as the fallback for what won't fit     |
| Cloudflare Access           | **Stays on.** It is what makes the rest of this sprint small                  |
| Copyright and takedown      | **Out of this sprint.** Noted at the end; it gates nothing while Access is on |

## The unlock is $5 a month

Every hard constraint in the first draft of this plan is a Workers **Free**
constraint, and all of them go away on Workers Paid:

| Limit                  | Free              | Paid                             | What it decides here                                    |
| ---------------------- | ----------------- | -------------------------------- | ------------------------------------------------------- |
| CPU per invocation     | 10 ms             | 30 s default, 5 min configurable | Whether extraction can run in a worker at all           |
| D1 rows written        | 100,000 / **day** | 50,000,000 / **month** included  | Whether an upload can cost what it costs                |
| Subrequests            | 50                | 10,000                           | Whether a book's pages can be written in one invocation |
| Queues                 | —                 | included                         | Whether ingestion can be a proper job                   |
| Containers             | —                 | included, 375 vCPU-min/mo        | Whether ClamAV is ever an option                        |
| **Memory per isolate** | **128 MB**        | **128 MB**                       | The one limit money does not move                       |

At ~2,400 rows a book, 50M rows/month is about 20,000 books. The row budget
stops being a design constraint and becomes a number nobody thinks about.

**Recommendation: take the paid plan before building any of this.** Everything
below assumes it. On the free plan this feature is a queue of files waiting for
someone to open a terminal, which is what it is today.

## Where 2,400 rows a book comes from

A 400-page book: `estimateTextLayerRows` charges `pages × 4 + 8` = 1,608, and
`estimatePageIndexRows` charges `pages × 2 + 2` = 802. Both constants carry a
comment saying production bills **double** what the same statements report
locally. Breaking the 4 down:

| Write                                               | Per page | Status                                              |
| --------------------------------------------------- | -------- | --------------------------------------------------- |
| the `pages` row itself                              | 1        | irreducible                                         |
| its `PRIMARY KEY (transcription_id, page_no)` index | 1        | **removable** — D1 bills index writes as rows       |
| the unexplained production doubling                 | ×2       | **measure before touching**                         |
| FTS5 in the SEARCH database                         | ~2       | **reducible** — it stores a second copy of the text |

So it is partly a bug, partly a design choice, and partly unexplained. In the
order I would do them:

**1. Measure the 2×, first, because it is free.** One document, read
`meta.rows_written` off the D1 response against what the same statements report
locally. Cloudflare's own documentation accounts for the index write — one row
to the table, one to the index — and that is the factor of 2 we can already
name. It does not account for a second one. Do not optimise a number nobody has
explained.

**2. Stop writing rows for pages that hold nothing.** A 400-page scan has no
text layer, so it writes 400 rows saying so, at a cost of ~1,600, and yields
nothing searchable. Skip the insert where `text` and `image_key` are both null
and have `works/pages.ts` read a missing row as a blank page. Biggest single
win, and it is the worst case that it fixes.

**3. Make the FTS index contentless.** `page_search` is declared with
`document_id` and `page_no` UNINDEXED, which means FTS5 stores a complete second
copy of every page of the library in its `_content` shadow table. With
`content=''` it stores none of it — the text already lives in `pages`, one
database away — at the cost of keeping a `rowid → (document_id, page_no)` map,
which `indexed_documents` is already the shape of. Cuts the index writes and
halves the library's storage.

**4. `pages` as `WITHOUT ROWID`.** The primary key becomes the table, so there
is no separate index to write. One line in a migration, and a table copy — which
itself costs budget, so it is a job for after the plan change, not before.

Doing 2 and 3 takes a 400-page scan from ~2,400 rows to near zero and a 400-page
text book from ~2,400 to something like 1,200. Do them because they are right,
not because the budget needs them; after the plan change it does not.

## Virus scanning

**There is no cheap Cloudflare-native hook for this.** The two things that look
like one, are not:

- **WAF Content Scanning** (malicious uploads detection) does exactly what you
  would want — inspects uploaded files inline, hands them to the same AV engine
  Zero Trust uses — and is **Enterprise plan with a paid add-on**. It is also
  detection-only: it sets a signal and you write a rule to act on it.
- **Zero Trust Gateway AV scanning** scans traffic flowing _through_ the Gateway
  — WARP clients, proxied egress. An upload from a browser to your origin is not
  that traffic. Access does not route it through Gateway.

The nearest native option is **ClamAV in a Cloudflare Container**, called from
the queue consumer. It is included in the paid plan's 375 vCPU-minutes a month
and would cost nothing at this volume. What it costs instead is a ~2 GB
signature database, a cold start measured in tens of seconds, and a second
runtime to keep updated — for a handful of uploads a day from people who are
behind Access.

**So: don't scan first, validate first.** For PDFs specifically, the structural
check catches more of the realistic threat than ClamAV does, runs in
milliseconds in the worker, and needs no infrastructure:

1. **Sniff the bytes.** `%PDF-` and a page tree that parses. `POST /upload/pdf`
   today checks `file.type.includes('pdf')` — a string the client chose — and
   that is the actual hole in the current surface, whoever is uploading.
2. **Refuse active content.** `/JavaScript`, `/JS`, `/OpenAction`, `/AA`,
   `/Launch`, `/EmbeddedFile`. This matters here more than in most apps because
   the drawer keeps "the whole file is one tap away, as a link" — pdf.js in the
   app is sandboxed and runs no scripts, but the reader's own Preview or Acrobat
   is not and does.
3. **Cap the shape.** Bytes, page count, and the ratio between them. A one-page
   400 MB file is not a book.
4. **Quarantine until accepted.** The object lands under `quarantine/`, and
   `platform/file-tokens.ts` must refuse to mint or honour a token over that
   prefix, **with a test that fails first**. That path shipped once checking
   that a token was _present_ rather than valid and served the whole bucket; it
   is the one place in either repo with a demonstrated appetite for this
   mistake.
5. **Serve as an attachment.** `Content-Disposition: attachment`, never a type
   the browser will render as a document.

Then ClamAV in a container, later, if the door ever opens wider than Access. The
state machine below has a `scanning` state from day one so that adding it is a
state transition rather than a redesign.

## Access stays, and that is the right call

Keeping it is not a compromise — it is what makes this sprint small. With Access
on, every visitor is an invited, authenticated, named human, which means:

- the chat endpoint is not an open tap on the model bill, and per-user quotas
  have a subject;
- an abusive upload is attributable to an email, and revocable in one click;
- AV is defence in depth rather than the first line, which is why the section
  above can recommend what it recommends.

The cost is not safety. It is reach and money: **Zero Trust is free to 50 users,
then
$7 per user per month.** So "public" currently means "up to 50
people I have invited", and user 51 is a $7/month
decision while user 200 is a $1,400/month one. Past about fifty, the answer is
an app-level account system, not more Access seats — and that is the point at
which the copyright section stops being deferrable too. Until then, nothing here
is blocked.

## The pipeline

A new `ingestions` table in alexandria, one row per submitted file. `documents`
and `transcriptions` are untouched until `accepted`, so a rejected submission
leaves no work row behind and no UUID to keep alive for ever.

```text
received     bytes are in R2 under quarantine/, and nothing may serve them
checked      sniffed, active content refused, caps applied, deduped
scanning     reserved for ClamAV; today a no-op transition
reviewing    an admin has to say yes         ← member submissions stop here
accepted     work + document rows written, file promoted out of quarantine
extracting   the worker has it, or the cron does
indexed      citable — and only now does the panel say so
```

Plus `rejected` and `failed`, each carrying a reason in the reader's own terms.
A failure that disappears is the fault `ScanView` exists to avoid: _no file_, _a
file that could not be read_ and _here is the page_ are three facts, and
collapsing them lies about two.

**An admin's upload skips `reviewing` and nothing else.** Same sniff, same caps,
same dedupe, same quarantine-then-promote. Bypassing review is a statement about
trust in the person; it is not a statement about the file, and the file is the
thing that might be malformed.

**Duplicates are the expensive failure.** The same book in twice means citations
split across two `work_id`s, two shelves in one margin, and an author's ink on
two rows. Check SHA-256 for an exact re-upload and title+creator against the
catalogue for a near one. A duplicate is `rejected` naming the work it is
already in, not a silent second row.

## Extraction on upload

Feasible on Paid, with one real limit. CPU is 30 s by default and configurable
to 5 minutes; a 400-page text layer through `unpdf` is seconds. Subrequests are
10,000, so the page inserts batch comfortably. **Memory is 128 MB per isolate
and no plan raises it**, which is the binding constraint: `unpdf` holds the
whole file plus the parsed objects, so a large PDF will run out.

The shape that handles this without a dead end:

- The upload request validates, stores and replies. It does not extract —
  holding a request open for a minute to do work is how the reader ends up
  watching a spinner for something that is not their problem.
- A **queue consumer** does the extraction. It attempts the worker path, and on
  out-of-memory or timeout marks the row `extracting` with `oversize`, which the
  cron picks up and runs through the existing CLI. The worker is the fast path;
  the CLI is the one that always works.
- Note that the worst case for memory is the best case for skipping: a big file
  is usually a scan, a scan has no text layer, and extracting it produces
  nothing but blank rows. Detect the empty text layer early, record `scan`,
  write no pages (see row fix 2), and stop.

So a normal book is citable in under a minute and a difficult one is citable
after the next cron. Both say which, on the row, while it happens.

## What scribe shows

House rules, all of which bind here:

- **One status map.** `add/stages.ts`, built like `citations/status.ts`: the
  word, the mark, the colour, in one place. `styles/theme.test.ts` should learn
  to fail on an inline colour here too.
- **All copy in `copy.ts`.** The wording is the honesty. `indexed` is _citable_;
  nothing before it is _added_, because before it the book cannot be cited and
  citation is the entire promise.
- **Tokens, not values.** No hex, no z-index literal.
- **No mobile fork.** Container queries. The drop zone is a file input on a
  phone and must not require drag events to exist.
- **A root composes and nothing else.** `AddPanel` says what is on screen;
  `add/useIngestions.ts` polls, `add/Dropzone.tsx` takes the file,
  `add/Submission.tsx` is one row, `add/Details.tsx` is the metadata form,
  `add/Review.tsx` is the admin queue.

New work in this repo:

| What                                                                 | Why                                                                          |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `ui/tabs.ts` gains `'add'`; `COMING_SOON` loses it                   | It is struck through today, and the strike is the whole of the claim         |
| **Identity has to reach the app**                                    | `SessionGate` fetches `/me` and throws the user away. The tab is role-shaped |
| Upload with progress and a cancel                                    | A 60 MB file on a phone is a minute of held attention                        |
| Polling, with the panel rebuilt from the server on reload            | Today's queue is a `useState` that dies on refresh. A job outlives a render  |
| The review queue                                                     | Below                                                                        |
| Tests: the state map, and that nothing says _added_ before `indexed` | Every reported bug has a test; have this one before it is reported           |

**The review queue reuses the scan viewer.** `page/ScanView.tsx` already draws
an arbitrary PDF page with pdf.js, in the app, on a phone. Pointed at a
submission's first few pages it lets an admin read the title page and the
copyright page — which is where the title, the creator, the translator and the
year actually are — and fill the form from what is in front of them, without
downloading anything and without the file ever leaving quarantine. That is the
cheapest possible version of "make sure the metadata is ok", and it is one
component already written.

**The metadata form** is the PDF's declared title and author as defaults, and
`title`, `creator`, `originally_published`, `kind`, `label` and `page_offset` as
fields. No proposals, no agents, this sprint.

One line about `page_offset`, because it is the field that fails quietly: it
decides the printed page number on every citation the reader ever sees, and a
wrong one is invisible in the interface. It defaults to 0, which is wrong for
most books. When the automated pass comes back on the agenda, this is the field
to start with — and the one field that can be genuinely _verified_ rather than
proposed, by pulling folios out of a few sampled pages and confirming
`printed = page_no − offset` holds. Fitting, for this app.

## What alexandria needs

Additive, as everything is:

```ts
POST   /ingestions            // multipart; admin's goes straight to accepted
GET    /ingestions            // mine; admin sees all
GET    /ingestions/:id        // state, reason, details
PATCH  /ingestions/:id        // edit the details before accepting
POST   /ingestions/:id/accept // admin: writes work + document, promotes the file
POST   /ingestions/:id/reject // admin: with a reason
DELETE /ingestions/:id        // the submitter's own, before it is accepted
GET    /ingestions/:id/page/:n // a page of a quarantined file, for review only
```

The only way to create a document today is `POST /books` — the Book facade,
which `works/book-facade.ts` says to add nothing to. This wants `POST /works`
with a document alongside it: the works-shaped surface scribe is supposed to ask
for rather than route around.

Transport: multipart through the Pages Function to start with. The Cloudflare
request body limit is 100 MB on Free and Pro, which covers most books and not
all scans. When it hurts, move to a presigned R2 `PUT` straight from the
browser. Flag now that this means an R2 bucket CORS policy — not a violation of
_do not add CORS handling_, which is about this app's API, but it will read like
one, so it needs a line in `SECURITY.md` when it lands.

## Order

1. **Take the paid plan.** Nothing else is worth building on the free one.
2. **Measure the 2×**, and do row fixes 2 and 3.
3. **`ingestions`, the routes, quarantine, the validation, admin bypass.**
4. **The panel**: drop zone, live rows, the form, polling.
5. **Queue consumer with the CLI as backstop.**
6. **The review queue**, and member submissions switched on.
7. Later, in no particular hurry: ClamAV in a container; the metadata pass, with
   `page_offset` verification first; a CSP on scribe.

## Deferred, deliberately

**Copyright, terms, and takedown.** Out of this sprint. It is genuinely deferred
rather than forgotten, and what defers it is Access: while every uploader is one
of at most fifty invited people, this is a private library with guests. The day
that changes it needs terms, a registered DMCA agent, and a takedown that
actually removes the R2 object, the `pages` rows and the index — while keeping
the work row, because `[[book:UUID]]` tokens sit inside essays in stylus and
remapping one corrupts an essay silently. Citations in saved conversations then
degrade to `unknown_handle` or `no_such_page`, which the status map already
renders honestly. Public-domain-only, enforced at review, is the version that
needs none of it.

**Metadata proposal and review agents.** Above.

**OCR.** A PDF with no text layer is stored, listed as `scan`, and cited
`unverifiable`. That is honest and it is already the behaviour.

## Deliberately not

**A progress bar.** Extraction happens elsewhere and takes as long as it takes.
A bar that does not know is worse than a state that does — `ask/Waiting.tsx`
made this argument already, showing a real clock read off a timestamp past eight
seconds rather than an animation that cannot tell two minutes from a hang.

**Saying _added_ at upload.** A book is added when it is indexed.

**Extraction in the browser.** pdf.js is already loaded and could read the text
layer client-side, free, instantly, with no memory limit. It would also mean the
text a citation is checked against was produced by the client and posted to the
server. The whole app exists to refuse that arrangement, and it would put two
different extractors in the corpus besides.

**A second status vocabulary.** Ingestion states get the same treatment as
citation statuses: one map, one set of words, one set of marks.

## Sources for the platform numbers

- [D1 pricing](https://developers.cloudflare.com/d1/platform/pricing/) — 100,000
  rows/day free, 50M/month included on paid, and index writes billed as rows
- [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) —
  10 ms vs 30 s CPU, 128 MB memory, 50 vs 10,000 subrequests, 100 MB body
- [Containers pricing](https://developers.cloudflare.com/containers/pricing/) —
  Workers Paid, 375 vCPU-minutes/month included
- [WAF malicious uploads detection](https://developers.cloudflare.com/waf/detections/malicious-uploads/get-started/)
  — Enterprise with a paid add-on, detection only
- [Gateway AV scanning](https://developers.cloudflare.com/cloudflare-one/traffic-policies/http-policies/antivirus-scanning/)
  — scans Gateway traffic, not uploads to an origin
- [Zero Trust plans](https://www.cloudflare.com/plans/zero-trust-services/) — 50
  users free, then $7/user/month
