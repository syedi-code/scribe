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

vi.mock('./pdf', () => ({
	openScan: () =>
		Promise.resolve({
			pages: 300,
			draw: (page: number, _canvas: HTMLCanvasElement, width: number) => {
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
