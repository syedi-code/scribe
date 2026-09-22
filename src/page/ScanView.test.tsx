import {
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderApp, verified } from '../test/harness';
import { closePage, openPage } from '../state/reader';
import { readDialog, resetDialog } from '../state/dialog';
import { reportIdentity, resetIdentity } from '../state/identity';
import { PageView } from './PageView';
import type { AnswerCitation, Identity } from '../api/types';
import type { ScanFile } from '../api/documents';

/**
 * The scan behind a citation, one page at a time.
 *
 * What this replaces, twice over. First a signed link into the browser's own
 * PDF viewer, which on a phone opened page 1 of a four-hundred-page book. Then
 * the whole file, drawn here a page at a time — which handed every signed-in
 * reader the entire library, one `/files/sign` away. alexandria now cuts the
 * cited page out and sends that alone, on Paid, and nothing further from a
 * citation than the page either side of it.
 */

const drawn: { file: string; width: number }[] = [];
/** Set by a test that wants a page to fail to draw the way production did. */
let refuse: string | null = null;

vi.mock('./pdf', () => ({
	openScan: (file: ScanFile) =>
		refuse
			? Promise.reject(new Error(refuse))
			: Promise.resolve({
					pages: 1,
					draw: (
						_page: number,
						_canvas: HTMLCanvasElement,
						width: number
					) => {
						drawn.push({
							file: new TextDecoder().decode(file.bytes),
							width,
						});
						return { done: Promise.resolve(), cancel: () => {} };
					},
				}),
}));

/** jsdom lays nothing out, and the page is drawn to the width it is shown at. */
beforeAll(() => {
	Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
		configurable: true,
		value: 360,
	});
});

const reader = (over: Partial<Identity['user']>): Identity['user'] => ({
	id: 'u1',
	email: 'reader@example.test',
	name: null,
	role: 'member',
	plan: 'paid',
	...over,
});

const DOCUMENT = (
	id: string,
	fileKey: string | null = 'works/nietzsche.pdf'
) => ({
	document: {
		document_id: id,
		page_offset: 0,
		page_count: 232,
		text: 'searchable',
		has_file: fileKey !== null,
		work_id: 'w1',
		work_title: 'Beyond Good and Evil',
		creator: 'Friedrich Nietzsche',
		file_key: fileKey,
	},
});

/** How the scan route answers in a test: the page, or a refusal with its code. */
let scanAnswer: (page: number) => { status: number; code?: string } = () => ({
	status: 200,
});
let fileKey: string | null = 'works/nietzsche.pdf';
let asked: string[] = [];

function server() {
	asked = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (input: string, init?: RequestInit) => {
			const url = String(input);
			asked.push(`${init?.method ?? 'GET'} ${url}`);
			const scan = /\/cited\/([^/]+)\/pages\/(\d+)\/scan$/.exec(url);
			if (scan) {
				const answer = scanAnswer(Number(scan[2]));
				return {
					ok: answer.status === 200,
					status: answer.status,
					headers: new Headers({ 'content-type': 'application/pdf' }),
					arrayBuffer: async () =>
						new TextEncoder().encode(`page ${scan[2]}`).buffer,
					json: async () => ({ error: 'refused', code: answer.code }),
				};
			}
			const json = /\/documents\/([^/?]+)$/.exec(url)
				? DOCUMENT(/\/documents\/([^/?]+)$/.exec(url)![1], fileKey)
				: url.endsWith('/files/sign')
					? { token: 't0k' }
					: { pages: [] };
			return { ok: true, status: 200, json: async () => json };
		})
	);
}

beforeEach(() => {
	resetDialog();
	resetIdentity();
	reportIdentity(reader({}));
	scanAnswer = () => ({ status: 200 });
	fileKey = 'works/nietzsche.pdf';
	server();
});

afterEach(() => {
	act(() => closePage());
	drawn.length = 0;
	refuse = null;
});

/** One book per test: a page is fetched once and kept for the tab. */
const into = (documentId: string, pageNo: number): AnswerCitation => {
	const citation = verified('P1', 'the will to truth');
	return {
		...citation,
		ref: { document_id: documentId, page_no: pageNo },
		page: { ...citation.page!, document_id: documentId, page_no: pageNo },
	};
};

const openScanFor = async (citation: AnswerCitation) => {
	renderApp(<PageView />);
	act(() => openPage(citation));
	fireEvent.click(
		await screen.findByRole('button', { name: 'See the scan' })
	);
	await screen.findByRole('button', { name: /Back to the passage/ });
};

const press = (name: string) =>
	fireEvent.click(screen.getByRole('button', { name }));

describe('the scan, on Paid', () => {
	it('opens on the page the citation named, and asks for that page alone', async () => {
		await openScanFor(into('doc-opens', 21));

		expect(await screen.findByText('PDF p. 21')).toBeTruthy();
		await waitFor(() => expect(drawn).toHaveLength(1));
		expect(drawn[0].file).toBe('page 21');
		expect(asked).toContain('GET /api/cited/doc-opens/pages/21/scan');
	});

	it('turns one page either way, and no further', async () => {
		await openScanFor(into('doc-turns', 21));
		await screen.findByText('PDF p. 21');

		press('Next page');
		expect(await screen.findByText('PDF p. 22')).toBeTruthy();
		await waitFor(() => expect(drawn.at(-1)?.file).toBe('page 22'));
		expect(
			screen
				.getByRole('button', { name: 'Next page' })
				.hasAttribute('disabled')
		).toBe(true);

		press('Previous page');
		press('Previous page');
		expect(await screen.findByText('PDF p. 20')).toBeTruthy();
		await waitFor(() => expect(drawn.at(-1)?.file).toBe('page 20'));
		expect(
			screen
				.getByRole('button', { name: 'Previous page' })
				.hasAttribute('disabled')
		).toBe(true);
	});

	it('never asks for the whole file, and offers no link to it', async () => {
		await openScanFor(into('doc-whole', 21));
		await waitFor(() => expect(drawn).toHaveLength(1));

		expect(asked.some((call) => call.includes('/files/'))).toBe(false);
		expect(screen.queryByRole('link', { name: 'Open the PDF' })).toBeNull();
	});

	// The reader is on a phone: the page is drawn at the size it is shown, and
	// magnifying it draws it again rather than stretching what was drawn.
	it('redraws the page when it is magnified, at the larger size', async () => {
		await openScanFor(into('doc-zoom', 21));
		await waitFor(() => expect(drawn).toHaveLength(1));
		const fitted = drawn[0].width;

		press('Magnify the page');
		await waitFor(() => expect(drawn).toHaveLength(2));
		expect(drawn[1].width).toBeGreaterThan(fitted);
		expect(
			screen.getByRole('button', { name: 'Fit the page' })
		).toBeTruthy();
	});
});

describe('on Free', () => {
	it('shows where the scan would be, and what opens it', async () => {
		reportIdentity(reader({ plan: 'free' }));
		renderApp(<PageView />);
		act(() => openPage(into('doc-free', 21)));

		const offer = await screen.findByRole('button', {
			name: 'See the scan on Paid',
		});
		expect(
			screen.queryByRole('button', { name: 'See the scan' })
		).toBeNull();

		fireEvent.click(offer);
		expect(readDialog()).toBe('plans');
		expect(asked.some((call) => call.includes('/scan'))).toBe(false);
	});

	// A plan can lapse while a tab is open; the server is the one that knows.
	it('says the scan is part of Paid when the server says so', async () => {
		scanAnswer = () => ({ status: 403, code: 'SCAN_REQUIRES_PAID' });
		await openScanFor(into('doc-lapsed', 21));

		expect(
			await screen.findByText('The scan of a cited page is part of Paid.')
		).toBeTruthy();
		press('See plans');
		expect(readDialog()).toBe('plans');
	});
});

describe('the admin', () => {
	// A tab opened after an await is a popup, and a phone blocks it. The way
	// out to the file is a link the reader taps, so the tap is the navigation.
	it('keeps the whole file a link away, encoded a segment at a time', async () => {
		reportIdentity(reader({ role: 'admin', plan: undefined }));
		fileKey = 'works/Kant, Immanuel - What is Enlightenment.pdf';
		await openScanFor(into('doc-admin', 21));

		const out = await screen.findByRole('link', { name: 'Open the PDF' });
		expect(out.getAttribute('href')).toBe(
			'/api/files/works/Kant%2C%20Immanuel%20-%20What%20is%20Enlightenment.pdf?token=t0k#page=21'
		);
	});
});

describe('going back from the scan', () => {
	it('leaves the passage where it was', async () => {
		await openScanFor(into('doc-back', 21));

		fireEvent.click(
			screen.getByRole('button', { name: /Back to the passage/ })
		);
		expect(
			screen.queryByRole('button', { name: /Back to the passage/ })
		).toBeNull();
		// The drawer underneath was never closed.
		expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();
	});

	// Escape puts away the topmost thing. Closing the drawer out from under an
	// open scan loses the reader the answer they were reading.
	it('takes one Escape for the scan and another for the drawer', async () => {
		await openScanFor(into('doc-escape', 21));

		fireEvent.keyDown(document, { key: 'Escape' });
		expect(
			screen.queryByRole('button', { name: /Back to the passage/ })
		).toBeNull();
		expect(screen.getByRole('button', { name: 'Close' })).toBeTruthy();

		fireEvent.keyDown(document, { key: 'Escape' });
		expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
	});
});

/**
 * What a reader was told when the scan did not appear: *This page has no scan
 * to show* — about a book whose scan is in the bucket. Every failure between
 * the citation and the canvas came out as that one sentence, which is the
 * interface asserting a fact it had not established.
 */
describe('when the scan cannot be drawn', () => {
	it('says so, rather than saying the book has no scan', async () => {
		refuse = 'the page could not be read';
		await openScanFor(into('doc-refused', 21));

		expect(
			await screen.findByText('The scan could not be drawn just now.')
		).toBeTruthy();
		expect(screen.queryByText('This page has no scan to show.')).toBeNull();
	});

	it('shows what went wrong, so it can be reported', async () => {
		refuse = 'InvalidPDFException: bad XRef';
		await openScanFor(into('doc-refused-why', 21));

		expect(await screen.findByText(/InvalidPDFException/)).toBeTruthy();
	});

	// Only true when alexandria says there is no scan of this page to cut.
	it('says there is no scan when the server has none', async () => {
		scanAnswer = () => ({ status: 404, code: 'SCAN_UNAVAILABLE' });
		await openScanFor(into('doc-unavailable', 21));

		expect(
			await screen.findByText('This page has no scan to show.')
		).toBeTruthy();
	});
});
