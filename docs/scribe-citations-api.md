# What the reading interface needs from a citation

Building `docs/prototype/index.html` against alexandria's real shapes turned up
four things the frontend cannot render honestly with what `data-citations`
carries today. Each is additive, which is the only kind of change the API takes.

Today, from `packages/core/conversations/citations.ts`:

```ts
type AnswerCitation = { handle: string; quote: string; ref: PageRef | null } & (
	| { status: 'verified'; matched: PageRef[] }
	| {
			status: 'unverified';
			reason:
				| 'not_found'
				| 'partial_match'
				| 'quote_too_short'
				| 'no_such_page';
	  }
	| { status: 'unverifiable'; reason: 'no_text_layer' }
	| { status: 'unverified'; reason: 'unknown_handle' }
);
```

A `PageRef` is `{ document_id, page_no }`. So a citation names a page by two
opaque values and nothing a reader recognises.

## 1. A citation should say which book it is

**The problem.** To print `Beyond Good and Evil — Nietzsche — p. 9 (PDF p. 21)`
in the margin, the frontend has to `GET /documents/:id` for every distinct
document in the answer, after the stream has closed. Five citations across three
works is three round trips before the margin can be drawn — which means either a
margin that pops in late, or an answer held back until it is complete.

The backend already has all of it in hand: `verifyCitations` loads `PageText`
rows, which carry `work_title`, `creator` and `printed_page`, and
`describePage()` formats exactly this string for the model. The frontend is
being asked to re-fetch what the server discarded.

**The change.** Carry the page's identity on the citation:

```ts
interface CitedPage {
	work_id: string;
	work_title: string;
	creator: string;
	printed_page: string | null; // already derived from the document's offset
	document_id: string;
	page_no: number;
}
```

Add it as `page: CitedPage | null` — null only for `unknown_handle`, where there
is no page.

## 2. A verified quote should arrive with the sentence around it

**The problem.** The most valuable thing the interface can do is show the quote
_where it sits_ — the lines before and after it on the page, with the matched
words lit. That is the difference between "the model produced a string that is
findable on page 21" and "here is the passage, read it yourself". Today that
costs `GET /documents/:id/pages?from=&to=` per citation, and the response is the
whole page, which for a dense page is a wall the margin cannot hold.

**The change.** When a quote matches, return the window it matched in:

```ts
interface QuoteContext {
	before: string; // ~240 chars of page text preceding the match
	text: string; // the page's own words, not the model's quote
	after: string; // ~240 chars following
	spans_page_break: boolean; // the match ran onto the next page
}
```

`text` is the page's wording rather than the model's, which is what makes the
normalisation visible: a quote that matched across a line-break hyphen shows the
hyphen. For `partial_match`, return the same window around the prefix that _did_
match, and mark where it stopped:

```ts
{ status: 'unverified', reason: 'partial_match', context: QuoteContext, matched_prefix: string }
```

The interface prints `matched to here ⟩` at the end of `matched_prefix` and
keeps the rest of the model's quote in rubric. `6839c7e` already worked out
where the match stops; this asks for that offset to leave the server.

## 3. A citation should say where it is in the answer

**The problem.** To underline cited words in the prose, the frontend has to find
each citation in the answer text. Today it re-implements the `CITATION` regex
from `conversations/citations.ts` in the client, and the two have to agree
forever — including on curly quotes, `[P7: "…"]`, and quotes that contain
quotes. When they drift, the answer renders with a citation the reader can see
in the margin and cannot find in the text.

**The change.** The server already has the match offsets from `matchAll`. Send
them:

```ts
{
	marker: {
		start: number;
		end: number;
	}
}
```

Offsets into the concatenated answer text the server verified — which is
`steps.map(s => s.text).join('\n')`. That string is not what the client holds,
so this needs one of two things: either the offsets are relative to the final
step's text (what the interface actually renders as the answer), or the server
sends the answer text it verified. The first is smaller and is what to do.

## 4. A page should say whether it can be shown

**The problem.** `Open the page` should not be offered for a page that cannot be
rendered. `viewPage()` knows — it already returns a reason when a page is not
viewable — but that knowledge stays inside the chat tool.

**The change.** `page.viewable: boolean` on `CitedPage`.

## What this does not change

- **Verification stays server-side and stays after the answer.** Nothing here
  moves the check into the client or streams unchecked citations early.
- **No field is removed or retyped.** `handle`, `quote`, `ref`, `status` and
  `reason` keep their present shapes and meanings. A client written against
  today's payload keeps working; it just fetches more.
- **The `citations` table.** Nothing above needs a column. All four are derived
  at verification time from rows the query already loaded. Whether the enriched
  form is also persisted is a separate question, and the answer is probably no —
  a stored context window would go stale against a re-transcription.

## Cost

One extra page-text read per citation, in a query that already reads the page.
The context windows add a few KB to the end of a stream that has already carried
an answer. Against that: three to five HTTP round trips removed from the moment
the reader most wants the interface to be finished.
