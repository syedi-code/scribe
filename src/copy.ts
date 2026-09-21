/**
 * Every user-facing string in the app.
 *
 * The honesty of this interface lives in its wording — *found on the page*,
 * never *verified*; *held*, never *uploaded* — and wording scattered across
 * components drifts. One module, so a decision about what a reader is told is
 * made once and stays made.
 */

/**
 * The day a month resets, in the reader's locale but in UTC. The server names
 * midnight UTC on the first, which is still the last day of the old month
 * anywhere west of Greenwich — so without the zone a reader in New York was
 * told their questions came back on 30 September.
 */
const resetDay = (at: string) =>
	new Date(at).toLocaleDateString(undefined, {
		day: 'numeric',
		month: 'long',
		timeZone: 'UTC',
	});

const plural = (count: number, one: string, many: string) =>
	count === 1 ? one : many;

export const COPY = {
	/* ---- chrome ---- */
	tabs: { ask: 'Ask', books: 'Books', add: 'Add a book', about: 'About' },
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
	   The creator and the title are separate: the surname is inked and the
	   title is set as a work, which is the app's own way of writing both, and
	   a single string could be neither.
	   Three are dealt at a time and the hand turns over, so the library never
	   looks like it holds three books. */
	suggestions: [
		{
			question:
				'Does Nietzsche think the will to truth is itself a kind of faith?',
			creator: 'Nietzsche',
			title: 'The Gay Science',
		},
		{
			question:
				'What does Fanon say colonialism does to the mind of the colonised?',
			creator: 'Fanon',
			title: 'Black Skin, White Masks',
		},
		{
			question:
				'How does Foucault get from the design of a prison to the shape of a soul?',
			creator: 'Foucault',
			title: 'Discipline and Punish',
		},
		{
			question:
				'Is Said’s Orientalism a claim about scholarship, or about power?',
			creator: 'Said',
			title: 'Orientalism',
		},
		{
			question:
				'What does al-Ghazālī doubt, and what finally stops the doubting?',
			creator: 'al-Ghazālī',
			title: 'Deliverance from Error',
		},
		{
			question: 'Where does Iqbal part from Nietzsche on the self?',
			creator: 'Iqbal',
			title: 'The Secrets of the Self',
		},
		{
			question:
				'Does Kuhn think a paradigm can be refuted, or only abandoned?',
			creator: 'Kuhn',
			title: 'The Structure of Scientific Revolutions',
		},
		{
			question:
				'What work does the general will do for Rousseau that consent cannot?',
			creator: 'Rousseau',
			title: 'The Social Contract',
		},
		{
			question: 'How does Butler describe power turning inward?',
			creator: 'Butler',
			title: 'The Psychic Life of Power',
		},
		{
			question: 'What does Marx mean by the fetishism of commodities?',
			creator: 'Marx',
			title: 'Capital, Volume 1',
		},
		{
			question:
				'Is Wittgenstein saying that ethics cannot be spoken, or only that he cannot speak it?',
			creator: 'Wittgenstein',
			title: 'Tractatus Logico-Philosophicus',
		},
		{
			question:
				'What does Arendt think loneliness has to do with terror?',
			creator: 'Arendt',
			title: 'The Origins of Totalitarianism',
		},
		{
			question:
				'Does Baudrillard mean the map replaced the territory, or that there never was one?',
			creator: 'Baudrillard',
			title: 'Simulacra and Simulation',
		},
		{
			question: 'What does Hume allow us to know about tomorrow?',
			creator: 'Hume',
			title: 'An Enquiry Concerning Human Understanding',
		},
		{
			question:
				'How does Césaire answer the claim that colonialism civilised anyone?',
			creator: 'Césaire',
			title: 'Discourse on Colonialism',
		},
		{
			question:
				'What does Angela Davis say the prison is for, if not for crime?',
			creator: 'Davis',
			title: 'Are Prisons Obsolete?',
		},
		{
			question:
				'Why can a Hobbesian sovereign never be accused of breaking the covenant?',
			creator: 'Hobbes',
			title: 'Leviathan',
		},
		{
			question:
				'Does Machiavelli advise cruelty, or only the appearance of it?',
			creator: 'Machiavelli',
			title: 'The Prince',
		},
		{
			question: 'Why does Plato put the poets out of the city?',
			creator: 'Plato',
			title: 'Republic',
		},
		{
			question:
				'On what grounds does Aristotle call some people slaves by nature?',
			creator: 'Aristotle',
			title: 'Politics',
		},
		{
			question:
				'What did Darwin admit his own theory could not yet explain?',
			creator: 'Darwin',
			title: 'On the Origin of Species',
		},
		{
			question:
				'How does enlightenment turn back into myth for Adorno and Horkheimer?',
			creator: 'Adorno & Horkheimer',
			title: 'Dialectic of Enlightenment',
		},
		{
			question:
				'What survives Descartes’ doubt, and why does he think it must?',
			creator: 'Descartes',
			title: 'Meditations on First Philosophy',
		},
		{
			question:
				'What does Hartman mean by calling emancipation a burdened freedom?',
			creator: 'Hartman',
			title: 'Scenes of Subjection',
		},
		{
			question:
				'Where does King say the civil rights movement stopped being cheap?',
			creator: 'King',
			title: 'Where Do We Go From Here',
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

	/* ---- what is left of the month ----
	   A question asked and answered is a *question*, not a credit, a token or
	   a request: it is the unit a reader actually experiences, and the three
	   words the industry prefers all describe the bill rather than the thing
	   bought. Nothing here says *upgrade* either — a reader is not a version.

	   The counter only ever appears once it is nearly spent. A tally kept in
	   the corner from the first question makes a reading tool feel metered
	   from the first minute, which is the opposite of what a library is for. */
	plan: {
		/** Only ever shown at two or fewer left. */
		remaining: (left: number) =>
			`${left} ${plural(left, 'question', 'questions')} left this month`,
		spent: 'You have used this month’s questions.',
		/** The month, in the reader’s own locale: the reset is a date, not a countdown. */
		resets: (at: string) => `Resets ${resetDay(at)}.`,
		/** What a paid plan is, said as what it gives rather than what it costs. */
		offer: 'A paid plan gives you more questions each month, and the better models to ask them of.',
		see: 'See plans',
		/** The refused turn, when the composer was not disabled in time. */
		refused: 'That question was not asked — this month’s are used up.',
		/** Under a spent month, on the home screen: what is still open. */
		stillOpen:
			'Your sessions and the shelves are still here to read in the meantime.',
		/** The date alone, for a sentence that already says what comes back. */
		back: (at: string) => `New questions arrive ${resetDay(at)}.`,

		/* The dialog a conversation raises, once, as the month runs down. */
		nudge: {
			lastFew: (left: number) =>
				`${left} ${plural(left, 'question', 'questions')} left this month`,
			spent: 'No questions left this month',
			later: 'Not now',
		},

		/* Free beside Paid. A card says only what differs; what both share is
		   said once, under them. */
		plans: {
			title: 'Plans',
			current: 'Your plan',
			free: 'Free',
			paid: 'Paid',
			/** Not the plan's name again: what free actually means here. */
			freePrice: 'No card needed',
			/** Until there is a price. Never a made-up figure. */
			priceLater: 'Price set at launch',
			perMonth: (amount: string) => `${amount} a month`,
			questions: 'questions a month',
			models: 'Models',
			shared: 'On both plans, every quotation is checked against the page it cites, and questions reset on the 1st of each month.',
			choose: 'Continue to payment',
			/** Beside the button, not behind it. */
			terms: 'Billed monthly · cancel anytime',
			loading: 'reading the plans…',
			unreachable: 'The plans could not be fetched just now.',
		},
	},

	/* ---- the account ----
	   Who is signed in, what they are on, and the way out. Set as a settings
	   sheet: a label on the left, the fact on the right, a hairline between. */
	account: {
		open: 'Your account',
		title: 'Account',
		menu: 'Account',
		email: 'Email',
		plan: 'Plan',
		month: 'This month',
		signOut: 'Sign out',
		signOutNote: 'Signs you out of Scribe on this browser.',
		signingOut: 'Signing out…',
		admin: 'Admin',
		unlimited: 'No limit',
		used: (used: number, limit: number) =>
			`${used} of ${limit} ${plural(limit, 'question', 'questions')}`,
		/** On the menu's second line, where there is room for one short fact. */
		summary: (plan: string, left: number | null) =>
			left === null ? plan : `${plan} · ${left} left this month`,
	},

	/* ---- checkout ----
	   Everything about the purchase before the button, so nothing arrives as
	   a surprise on the page after it. */
	checkout: {
		title: 'Paid plan',
		questions: 'Questions',
		perMonth: (count: number) => `${count} a month`,
		models: 'Models',
		price: 'Price',
		billing: 'Billing',
		billingValue: 'Monthly, until you cancel',
		account: 'Account',
		cancel: 'You can cancel whenever you like, from your account. Questions you have already asked stay yours to read.',
		pay: 'Continue to secure payment',
		opening: 'Opening payment…',
		stripe: 'Card details are entered on Stripe’s page. Scribe never sees them.',
		/** Where the payment page would have opened. Nothing half-done. */
		notOpen:
			'Payments are not open yet, so nothing was charged. When they open, this button takes you straight to payment.',
	},

	/* ---- back from paying ---- */
	upgraded: {
		title: 'You’re on Paid',
		body: 'More questions each month, and every model in the switcher.',
		/** The webhook and the redirect race; say so rather than show Free. */
		pending: 'It can take a minute for your account to show it.',
		start: 'Start reading',
	},

	dialog: {
		close: 'Close',
		back: 'Back',
	},

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
		/** The line of surnames under the search, each a jump to its shelf. */
		index: 'Jump to a shelf',
		/** How much of one name the library holds, beside the name. */
		holds: (count: number) => `${count} ${plural(count, 'work', 'works')}`,
		names: (count: number) => `${count} ${plural(count, 'name', 'names')}`,
		/** The shelf of names the library holds one work by. */
		singles: 'One work each',
		singlesJump: 'one work each',
	},

	/* ---- about ----
	   What Scribe is, said once, plainly, for someone deciding whether to
	   trust it. Every claim here is one the code keeps: nothing promised about
	   the reader's data that is not already true of it. */
	about: {
		title: 'About Scribe',
		lead: (works: number | null, names: number | null) =>
			works && names
				? `Scribe answers questions from a library of ${works} works by ${names} authors, and from nothing else. When it quotes a book it names the page, and then the quote is checked against that page.`
				: 'Scribe answers questions from a library of philosophy and theory, and from nothing else. When it quotes a book it names the page, and then the quote is checked against that page.',
		sections: {
			made: {
				head: 'How an answer is made',
				body: [
					'Scribe does not answer from memory. It searches the library, reads the pages it finds, and writes from what it read, naming the page behind every quotation. The searching and reading are shown under your question as they happen, so you can see what it looked at.',
				],
			},
			checked: {
				head: 'Every quote is checked',
				body: [
					'Once the answer is written, each quotation in it is looked for, word for word, on the page it names. The check is made by Scribe’s server, not by the model that wrote the answer, and its result is drawn under the quoted words:',
				],
				after: [
					'Press a quotation to open the page it came from, and from there the scan of the printed page. Only what’s cited, under every answer, fades each sentence no quotation supports: on a good answer it changes little, and on a weak one it shows how little was holding it up.',
					'A quote found on the page proves the words are there. It does not prove the answer read them rightly. That part is still yours.',
				],
			},
			library: {
				head: 'The library',
				body: [
					'The library was put together by hand, a book at a time. Books lists everything Scribe can read from; it does not hand out the books themselves.',
					'Scribe cannot read what is not on the shelves. Asked about a book that is not there, it is told to say so rather than answer from what a model half-remembers.',
				],
			},
			privacy: {
				head: 'What happens to what you ask',
				body: [
					'Your question, and the pages read to answer it, are sent to the company whose model is answering: OpenAI, Anthropic or Google, whichever you have chosen. Your conversations are kept so that you can come back to them.',
					'So do not put anything private in here.',
				],
			},
			plans: {
				head: 'Plans',
				body: [
					'Scribe is free for a number of questions each month. A paid plan, with more questions and the better models, is not open yet.',
				],
			},
		},
		/** A quotation in each state, as it is drawn in an answer. */
		key: {
			verified: 'found on the page',
			not_found: 'not on the page it names, or not all of it',
			no_text_layer: 'the page has no text to check against',
		},
		sample: 'the words as quoted',
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
