/**
 * Every user-facing string in the app.
 *
 * The honesty of this interface lives in its wording — *found on the page*,
 * never *verified*; *held*, never *uploaded* — and wording scattered across
 * components drifts. One module, so a decision about what a reader is told is
 * made once and stays made.
 */

const plural = (count: number, one: string, many: string) =>
	count === 1 ? one : many;

export const COPY = {
	/* ---- chrome ---- */
	tabs: { ask: 'Ask', add: 'Add a book' },
	sessions: 'Sessions',
	running: 'running',
	newQuestion: 'New question',
	naming: 'naming…',
	modelsEmpty: 'no models available',
	noKey: 'no key set',
	inUse: 'in use',
	modelNote:
		'Whichever providers have a key on the worker. Earlier answers keep the model that wrote them.',

	/* ---- home ----
	   Questions worth asking of this library in particular, and answerable
	   from it: every one names something the shelves actually hold. Two are
	   drawn at random each time the home screen is seen, so the same two do
	   not become the only two anyone asks. */
	/** The first is always offered; the second is drawn from the rest. */
	suggestions: [
		'Does Nietzsche think the will to truth is itself a kind of faith?',
		'What does Fanon say colonialism does to the mind of the colonised?',
		'How does Foucault get from the design of a prison to the shape of a soul?',
		'Is Said’s Orientalism a claim about scholarship, or about power?',
		'What does al-Ghazālī doubt, and what finally stops the doubting?',
		'Where does Iqbal part from Nietzsche on the self?',
		'Does Kuhn think a paradigm can be refuted, or only abandoned?',
		'What work does the general will do for Rousseau that consent cannot?',
		'How does Butler describe power turning inward?',
		'Why does Plato distrust writing in the Phaedrus?',
		'What does Marx mean by the fetishism of commodities?',
		'Is Wittgenstein saying that ethics cannot be spoken, or only that he cannot speak it?',
		'What does Arendt think philosophy owes politics?',
		'Does Baudrillard mean the map replaced the territory, or that there never was one?',
		'What does Hume allow us to know about tomorrow?',
		'How does Césaire answer the claim that colonialism civilised anyone?',
	],
	howManySuggestions: 2,
	library: (works: number) =>
		works === 1 ? 'with one work' : `with ${works} works`,
	home: 'Back to the home screen',

	/* ---- composer ---- */
	askPlaceholder: 'Ask about the library',
	ask: 'Ask',
	stop: 'Stop',
	hint: 'Every quote is checked against the page it names. / to write, c to dim everything uncited.',

	/* ---- the work behind an answer ----
	   Tool calls, not narration: a search and a read are facts and they stay
	   on screen once they have happened. What the model said to itself between
	   them is not shown at all. */
	thinking: 'looking for something to read',
	work: {
		searched: 'searched',
		read: 'read',
		looked: 'looked at',
		listed: 'listed',
		library: 'the library',
		page: (page: number) => `PDF p. ${page}`,
		pages: (from: number, to: number) => `PDF pp. ${from}–${to}`,
		hits: (hits: number, works: number) =>
			`${hits} ${plural(hits, 'page', 'pages')} in ${works} ${plural(works, 'work', 'works')}`,
		gotPages: (count: number) =>
			`${count} ${plural(count, 'page', 'pages')}`,
		works: (count: number) => `${count} ${plural(count, 'work', 'works')}`,
		nothing: 'nothing',
		scan: 'the scan',
		done: 'done',
		failed: 'came back empty',
	},
	workSummary: (searches: number, pages: number, works: number) =>
		[
			searches > 0 &&
				`searched ${searches === 1 ? 'once' : `${searches} times`}`,
			pages > 0 &&
				`read ${pages} ${plural(pages, 'page', 'pages')} in ${works} ${plural(works, 'work', 'works')}`,
		]
			.filter(Boolean)
			.join(', ') || 'answered without searching',
	showWork: 'what it did',

	/* ---- verdicts. The whole product is in these seven lines. ---- */
	verdict: {
		verified: 'found on the page',
		not_found: 'not on this page',
		partial_match: 'matches, then diverges',
		quote_too_short: 'too short to check',
		no_such_page: 'no such page',
		unknown_handle: 'a page it was never shown',
		no_text_layer: 'no text on this page to check against',
		pending: 'checking…',
	},
	stampLabel: (verdict: string, page: string) => `${verdict} — ${page}`,
	checkingLabel: (page: string) => `checking this quote against ${page}`,

	/* ---- under an answer ---- */
	checking: (count: number) =>
		`checking ${count} ${plural(count, 'quote', 'quotes')} against ${plural(count, 'its page', 'their pages')}…`,
	tally: (found: number, total: number) =>
		`${found} of ${total} ${plural(total, 'quote', 'quotes')} found on the page it named`,
	noCitations: 'nothing in this answer is cited to a page',
	onlyCited: "Only what's cited",
	onlyCitedHint: 'Fade every sentence no citation supports',

	/* ---- the page behind a citation ---- */
	pageView: {
		close: 'Close',
		lead: {
			verified: 'The page’s own words, with the quoted passage in place.',
			partial_match:
				'The quote begins here and then parts from the page — a scanning error, or a misquote. The page is what is shown; judge it yourself.',
			not_found:
				'These words are not on this page, in any reading of it. Either the page is not the one the model meant, or the quote is not the page’s.',
			quote_too_short:
				'Under five words, which matches too much text by accident to count as evidence. The page is here; read it yourself.',
			no_such_page:
				'The handle names a page this document does not have.',
			unknown_handle:
				'This handle was never given to a page in this conversation, so there is nothing to open.',
			no_text_layer:
				'This page has no text layer, so there is nothing to search. Scribe was shown it; the quote could not be checked either way.',
		},
		/** Shown when the server has not sent the matched window with the citation. */
		wholePage:
			'The whole page, as extracted. The match window is not in this answer’s payload, so the quote is not lit within it.',
		quoted: 'The words the answer relied on',
		matchedToHere: 'matched to here',
		spansBreak: 'the match runs onto the next page',
		loading: 'fetching the page…',
		noText: 'This page has no extracted text.',
		unreachable: 'The page could not be fetched just now.',
		seeScan: 'See the scan',
		around: (from: number, to: number) => `Read pp. ${from}–${to}`,
		noScan: 'This page has no scan to show.',
	},

	/* ---- failures, in the reader's terms ---- */
	signedOut: 'Your session has expired. Reload the page to sign in again.',
	notFound: 'That is not there any more.',
	serverDown: 'alexandria is not answering right now. Try again shortly.',
	offline: 'Scribe could not reach alexandria. Check your connection.',
	answerFailed: 'Scribe could not finish this answer.',
	retry: 'Ask again',

	/* ---- add a book ---- */
	add: {
		drop: 'Drop a PDF here',
		or: 'or',
		choose: 'choose a file',
		notPdf: 'not a PDF, so it was not taken',
		steps: [
			{
				lead: 'The file lands in Works',
				rest: ' as a Document — one edition, with its own pagination.',
			},
			{
				lead: 'Its text layer is extracted',
				rest: ' into pages, a few thousand rows a night.',
			},
			{
				lead: 'The pages are indexed',
				rest: ', and from then on Scribe can find them, read them, and be held to them.',
			},
		],
		/** Nothing is behind this yet, and the interface says so rather than implying success. */
		held: 'held — no ingestion behind this yet',
		queueTitle: 'Waiting on ingestion',
	},
} as const;
