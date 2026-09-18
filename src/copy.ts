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
	tabs: { ask: 'Ask', books: 'Books', add: 'Add a book' },
	/** The tab is shown struck through rather than removed: it is coming back. */
	addLater: 'not yet — Scribe reads the library, it does not fill it',
	sessions: 'Sessions',
	/** The bare number is what is shown; this is what it is read out as. */
	sessionCount: (count: number) =>
		`${count} ${count === 1 ? 'session' : 'sessions'}`,
	running: 'running',
	newQuestion: 'New question',
	/** Only while the server is actually being asked what it called this one. */
	naming: 'naming…',
	unnamed: 'untitled',
	modelsEmpty: 'no models available',
	noKey: 'no key set',
	inUse: 'in use',

	/* ---- home ----
	   Questions worth asking of this library in particular, and answerable
	   from it: every one names a work the shelves actually hold, and says
	   which, so a reader can see what they are about to be answered from.
	   Three are dealt at a time and the hand turns over, so the library never
	   looks like it holds three books. */
	suggestions: [
		{
			question:
				'Does Nietzsche think the will to truth is itself a kind of faith?',
			work: 'Nietzsche · The Gay Science',
		},
		{
			question:
				'What does Fanon say colonialism does to the mind of the colonised?',
			work: 'Fanon · Black Skin, White Masks',
		},
		{
			question:
				'How does Foucault get from the design of a prison to the shape of a soul?',
			work: 'Foucault · Discipline and Punish',
		},
		{
			question:
				'Is Said’s Orientalism a claim about scholarship, or about power?',
			work: 'Said · Orientalism',
		},
		{
			question:
				'What does al-Ghazālī doubt, and what finally stops the doubting?',
			work: 'al-Ghazālī · Deliverance from Error',
		},
		{
			question: 'Where does Iqbal part from Nietzsche on the self?',
			work: 'Iqbal · The Secrets of the Self',
		},
		{
			question:
				'Does Kuhn think a paradigm can be refuted, or only abandoned?',
			work: 'Kuhn · The Structure of Scientific Revolutions',
		},
		{
			question:
				'What work does the general will do for Rousseau that consent cannot?',
			work: 'Rousseau · The Social Contract',
		},
		{
			question: 'How does Butler describe power turning inward?',
			work: 'Butler · The Psychic Life of Power',
		},
		{
			question: 'What does Marx mean by the fetishism of commodities?',
			work: 'Marx · Capital, Volume 1',
		},
		{
			question:
				'Is Wittgenstein saying that ethics cannot be spoken, or only that he cannot speak it?',
			work: 'Wittgenstein · Tractatus Logico-Philosophicus',
		},
		{
			question:
				'What does Arendt think loneliness has to do with terror?',
			work: 'Arendt · The Origins of Totalitarianism',
		},
		{
			question:
				'Does Baudrillard mean the map replaced the territory, or that there never was one?',
			work: 'Baudrillard · Simulacra and Simulation',
		},
		{
			question: 'What does Hume allow us to know about tomorrow?',
			work: 'Hume · An Enquiry Concerning Human Understanding',
		},
		{
			question:
				'How does Césaire answer the claim that colonialism civilised anyone?',
			work: 'Césaire · Discourse on Colonialism',
		},
		{
			question:
				'What does Angela Davis say the prison is for, if not for crime?',
			work: 'Davis · Are Prisons Obsolete?',
		},
		{
			question:
				'Why can a Hobbesian sovereign never be accused of breaking the covenant?',
			work: 'Hobbes · Leviathan',
		},
		{
			question:
				'Does Machiavelli advise cruelty, or only the appearance of it?',
			work: 'Machiavelli · The Prince',
		},
		{
			question: 'Why does Plato put the poets out of the city?',
			work: 'Plato · Republic',
		},
		{
			question:
				'On what grounds does Aristotle call some people slaves by nature?',
			work: 'Aristotle · Politics',
		},
		{
			question:
				'What did Darwin admit his own theory could not yet explain?',
			work: 'Darwin · On the Origin of Species',
		},
		{
			question:
				'How does enlightenment turn back into myth for Adorno and Horkheimer?',
			work: 'Adorno & Horkheimer · Dialectic of Enlightenment',
		},
		{
			question:
				'What survives Descartes’ doubt, and why does he think it must?',
			work: 'Descartes · Meditations on First Philosophy',
		},
		{
			question:
				'What does Hartman mean by calling emancipation a burdened freedom?',
			work: 'Hartman · Scenes of Subjection',
		},
		{
			question:
				'Where does King say the civil rights movement stopped being cheap?',
			work: 'King · Where Do We Go From Here',
		},
	],
	howManySuggestions: 3,
	/** Split, because the count is the claim and is set apart in the line. */
	library: (works: number) => ({
		before: 'with ',
		count: works === 1 ? 'one' : String(works),
		after: works === 1 ? ' work' : ' works',
	}),
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
	/** How long it has been looking. Shown only once the wait is long. */
	waiting: (seconds: number) =>
		`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`,
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
	/** One verdict's worth of references into a book, once there are too many to show singly. */
	tallyLabel: (count: number, verdict: string) =>
		`${count} ${plural(count, 'quote', 'quotes')}: ${verdict}`,

	/* ---- under an answer ---- */
	checking: (count: number) =>
		`checking ${count} ${plural(count, 'quote', 'quotes')} against ${plural(count, 'its page', 'their pages')}…`,
	tally: (found: number, total: number) =>
		`${found} of ${total} ${plural(total, 'quote', 'quotes')} found on the page it named`,
	noCitations: 'nothing in this answer is cited to a page',
	/** A turn that searched and read and then stopped without writing anything. */
	noAnswer: 'Scribe stopped before it wrote an answer.',
	onlyCited: "Only what's cited",
	onlyCitedHint: 'Fade every sentence no citation supports',

	/* ---- the page behind a citation ---- */
	pageView: {
		close: 'Close',
		/**
		 * Said only when something is wrong with the citation. A verified one
		 * shows the passage and says nothing: the page is the evidence, and a
		 * sentence explaining that it is was the drawer describing to the
		 * reader what they are already looking at.
		 */
		lead: {
			verified: '',
			partial_match:
				'The quote parts from the page here — a scanning error, or a misquote.',
			not_found: 'These words are not on this page. Read it and judge.',
			quote_too_short:
				'Under five words, which matches too much by accident to be evidence.',
			no_such_page: 'This document has no such page.',
			unknown_handle:
				'This handle was never given to a page here, so there is nothing to open.',
			no_text_layer:
				'No text layer on this page, so the quote could not be checked either way.',
		},
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

	/* ---- the scan itself ----
	   The page as it was printed, drawn here rather than handed to the
	   browser, because a PDF opened in a tab lands on page 1 on a phone. It
	   carries no verdict: it is the paper, not a check of anything. */
	scan: {
		back: 'Back to the passage',
		loading: 'drawing the page…',
		unreachable: 'The scan could not be drawn just now.',
		where: (page: number, of: number) => `PDF p. ${page} of ${of}`,
		previous: 'Previous page',
		next: 'Next page',
		/** Tapping the page magnifies it; the label says which way it will go. */
		magnify: 'Magnify the page',
		fit: 'Fit the page',
		download: 'Open the PDF',
	},

	/* ---- failures, in the reader's terms ---- */
	signedOut: 'Your session has expired. Reload the page to sign in again.',
	notFound: 'That is not there any more.',
	serverDown: 'alexandria is not answering right now. Try again shortly.',
	offline: 'Scribe could not reach alexandria. Check your connection.',
	answerFailed: 'Scribe could not finish this answer.',
	retry: 'Ask again',

	/* ---- the shelves ----
	   What the library holds, by whoever wrote it. No covers, no counts of
	   anything but works: a bibliography is a list, and this one is the list
	   the answers are drawn from. */
	books: {
		search: 'Search the shelves',
		/** What this tab is not: a way to get the books. */
		blurb: 'This is a list of the books Scribe can read from. It does not provide the PDFs. For access to the files, use the alexandria API.',
		clear: 'Clear',
		nothing: (term: string) => `Nothing on the shelves matches “${term}”.`,
		unreachable: 'The shelves could not be fetched just now.',
		loading: 'reading the shelves…',
		tally: (works: number, creators: number) =>
			`${works} ${plural(works, 'work', 'works')} · ${creators} ${plural(creators, 'name', 'names')}`,
		pages: (count: number) => `${count} ${plural(count, 'page', 'pages')}`,
		unsearchable: 'scan only',
	},

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
