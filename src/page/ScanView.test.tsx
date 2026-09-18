import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { renderApp, stubFetch, verified } from '../test/harness';
import { closePage, openPage } from '../state/reader';
import { PageView } from './PageView';
import type { AnswerCitation } from '../api/types';

/**
 * The scan behind a citation, on a phone.
 *
 * What this replaces: a signed link handed to the browser's own PDF viewer,
 * in a tab opened *after* an await — which iOS blocks as a popup, and which,
 * when it did open, landed on page 1 of a four-hundred-page book because
 * Safari ignores `#page=`. A citation to p. 21 has to open on p. 21.
 */

const drawn: { page: number; width: number }[] = [];
/** Set by a test that wants opening the file to fail the way production did. */
let refuse: string | null = null;

vi.mock('./pdf', () => ({
	openScan: () =>
		refuse
			? Promise.reject(new Error(refuse))
			: Promise.resolve({
					pages: 300,
					draw: (
						page: number,
						_canvas: HTMLCanvasElement,
						width: number
					) => {
						drawn.push({ page, width });
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

afterEach(() => {
	act(() => closePage());
	drawn.length = 0;
	refuse = null;
});

/** One book per test: a signed scan is fetched once and kept for the tab. */
const into = (documentId: string, pageNo: number): AnswerCitation => {
	const citation = verified('P1', 'the will to truth');
	return {
		...citation,
		ref: { document_id: documentId, page_no: pageNo },
		page: { ...citation.page!, document_id: documentId, page_no: pageNo },
	};
};

const SIGNED = { document: { file_key: 'works/nietzsche.pdf' }, token: 't0k' };
const HAS_FILE = {
	document: {
		document_id: 'doc-x',
		page_offset: 0,
		page_count: 232,
		text: 'searchable',
		has_file: true,
		work_id: 'w1',
		work_title: 'Beyond Good and Evil',
		creator: 'Friedrich Nietzsche',
		file_key: 'works/Kant, Immanuel - What is Enlightenment.pdf',
	},
	token: 't0k',
};

const openScanFor = async (citation: AnswerCitation) => {
	stubFetch(SIGNED);
	renderApp(<PageView />);
	act(() => openPage(citation));
	fireEvent.click(screen.getByRole('button', { name: 'See the scan' }));
	await screen.findByRole('button', { name: /Back to the passage/ });
};

describe('the scan', () => {
	it('opens on the page the citation named', async () => {
		await openScanFor(into('doc-opens', 21));

		expect(await screen.findByText('PDF p. 21 of 300')).toBeTruthy();
		await waitFor(() => expect(drawn).toHaveLength(1));
		expect(drawn[0].page).toBe(21);
	});

	it('turns to the next page and back', async () => {
		await openScanFor(into('doc-turns', 21));
		await screen.findByText('PDF p. 21 of 300');

		fireEvent.click(screen.getByRole('button', { name: 'Next page' }));
		expect(await screen.findByText('PDF p. 22 of 300')).toBeTruthy();

		fireEvent.click(screen.getByRole('button', { name: 'Previous page' }));
		expect(await screen.findByText('PDF p. 21 of 300')).toBeTruthy();
	});

	// The file is hundreds of megabytes and the reader is on a phone: the page
	// is drawn at the size it is shown, and magnifying it draws it again
	// rather than stretching what was already drawn.
	it('redraws the page when it is magnified, at the larger size', async () => {
		await openScanFor(into('doc-zoom', 21));
		await waitFor(() => expect(drawn).toHaveLength(1));
		const fitted = drawn[0].width;

		fireEvent.click(
			screen.getByRole('button', { name: 'Magnify the page' })
		);
		await waitFor(() => expect(drawn).toHaveLength(2));
		expect(drawn[1].width).toBeGreaterThan(fitted);
		expect(
			screen.getByRole('button', { name: 'Fit the page' })
		).toBeTruthy();
	});

	// A tab opened after an await is a popup, and a phone blocks it. The way
	// out to the file is a link the reader taps, so the tap is the navigation.
	it('offers the whole file as a link, not a window opened later', async () => {
		await openScanFor(into('doc-link', 21));

		const out = await screen.findByRole('link', { name: 'Open the PDF' });
		expect(out.getAttribute('href')).toBe(
			'/api/files/works/nietzsche.pdf?token=t0k#page=21'
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
		refuse = 'the file could not be read';
		await openScanFor(into('doc-refused', 21));

		expect(
			await screen.findByText('The scan could not be drawn just now.')
		).toBeTruthy();
		expect(screen.queryByText('This page has no scan to show.')).toBeNull();
	});

	it('keeps the file within reach, which is when it matters most', async () => {
		refuse = 'the file could not be read';
		await openScanFor(into('doc-refused-link', 21));

		await screen.findByText('The scan could not be drawn just now.');
		const out = screen.getByRole('link', { name: 'Open the PDF' });
		expect(out.getAttribute('href')).toContain('/api/files/');
	});

	it('shows what went wrong, so it can be reported', async () => {
		refuse = 'MissingPDFException: 404';
		await openScanFor(into('doc-refused-why', 21));

		expect(await screen.findByText(/MissingPDFException/)).toBeTruthy();
	});

	// The message is only true when the document really has no file.
	it('still says there is no scan when there is no file', async () => {
		stubFetch({ document: { file_key: null }, token: null });
		renderApp(<PageView />);
		act(() => openPage(into('doc-fileless', 21)));
		fireEvent.click(screen.getByRole('button', { name: 'See the scan' }));

		expect(
			await screen.findByText('This page has no scan to show.')
		).toBeTruthy();
	});
});

/**
 * Six of the library's keys carry a space or a comma. Unencoded, the path the
 * browser sent was not the path the token was minted over.
 */
describe('a file whose name has to be encoded', () => {
	it('is asked for a path segment at a time', async () => {
		stubFetch(HAS_FILE);
		renderApp(<PageView />);
		act(() => openPage(into('doc-spaced', 21)));
		fireEvent.click(screen.getByRole('button', { name: 'See the scan' }));

		const out = await screen.findByRole('link', { name: 'Open the PDF' });
		expect(out.getAttribute('href')).toBe(
			'/api/files/works/Kant%2C%20Immanuel%20-%20What%20is%20Enlightenment.pdf?token=t0k#page=21'
		);
	});
});
