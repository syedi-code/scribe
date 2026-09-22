import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { asProduction, renderApp, stubFetch, verified } from '../test/harness';
import { closePage, openPage } from '../state/reader';
import { PageView } from './PageView';

/**
 * The drawer behind a citation.
 *
 * The regressions these exist for, all reported on a phone: it would not close
 * when tapped away from, opening a second citation threw focus back to the
 * first, and the pages-around state of one citation showed under another.
 */

afterEach(() => act(() => closePage()));

const citation = verified('P1', 'the will to truth');
const other = {
	...verified('P12', 'the spirit that would bear'),
	page: {
		...verified('P12', 'x').page!,
		work_title: 'Thus Spoke Zarathustra',
		page_no: 41,
	},
};

describe('the page view', () => {
	it('shows nothing until a citation is opened', () => {
		stubFetch();
		renderApp(<PageView />);
		expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
	});

	it('opens on a citation and names the page', () => {
		stubFetch();
		renderApp(<PageView />);
		act(() => openPage(citation));
		expect(screen.getByText('Beyond Good and Evil')).toBeTruthy();
		expect(screen.getByText(/p\. 9 \(PDF p\. 21\)/)).toBeTruthy();
	});

	it('closes when the page behind it is tapped', () => {
		stubFetch();
		const { container } = renderApp(<PageView />);
		act(() => openPage(citation));
		const scrim = container.querySelector('[aria-hidden="true"]');
		expect(scrim).toBeTruthy();
		fireEvent.click(scrim!);
		expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
	});

	it('closes on Escape, and on Close', () => {
		stubFetch();
		renderApp(<PageView />);
		act(() => openPage(citation));
		fireEvent.keyDown(document, { key: 'Escape' });
		expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();

		act(() => openPage(citation));
		fireEvent.click(screen.getByRole('button', { name: 'Close' }));
		expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
	});

	it('gives focus back to the citation that opened it, once', () => {
		stubFetch();
		renderApp(<PageView />);
		const first = document.createElement('button');
		const second = document.createElement('button');
		document.body.append(first, second);

		act(() => openPage(citation, first));
		act(() => openPage(other, second));
		// Swapping citations must not send focus back to the first one.
		expect(document.activeElement).not.toBe(first);

		act(() => closePage());
		expect(document.activeElement).toBe(second);
	});

	it('shows the second citation, not the first', () => {
		stubFetch();
		renderApp(<PageView />);
		act(() => openPage(citation));
		act(() => openPage(other));
		expect(screen.getByText('Thus Spoke Zarathustra')).toBeTruthy();
		expect(screen.queryByText('Beyond Good and Evil')).toBeNull();
	});

	// Focus scrolls what it lands on into view, and the drawer is still parked
	// off the right edge when it takes it: on a phone that carried the whole app
	// off the left of the screen, with the drawer behind it and Close out of reach.
	it('takes focus without scrolling anything to reach it', () => {
		stubFetch();
		const focus = vi.spyOn(HTMLElement.prototype, 'focus');
		renderApp(<PageView />);
		act(() => openPage(citation));

		const drawer = screen.getByRole('dialog');
		const taken = focus.mock.calls.filter(
			(_call, index) => focus.mock.instances[index] === drawer
		);
		expect(taken.length).toBeGreaterThan(0);
		for (const [options] of taken) {
			expect(options).toEqual({ preventScroll: true });
		}
		focus.mockRestore();
	});

	// The drawer is the whole screen on a phone, and the text layer breaks a
	// line wherever the typesetter did: printed as-is it was a column of
	// ragged half-lines.
	it('reflows the page rather than printing every line break', async () => {
		// Its own document, because `loadPages` caches for the life of the tab
		// and every other test in this file has already asked for doc-1.
		const ref = { document_id: 'doc-reflow', page_no: 99 };
		const reflowed = {
			...citation,
			ref,
			page: { ...citation.page!, ...ref },
		};
		stubFetch({
			pages: [
				{
					ref,
					work_id: 'w1',
					printed_page: '9',
					text: 'Supposing that Truth\nis a woman.\n\nWhat then?',
				},
			],
		});
		renderApp(<PageView />);
		act(() => openPage(reflowed));

		expect(
			await screen.findByText('Supposing that Truth is a woman.')
		).toBeTruthy();
		expect(screen.getByText('What then?')).toBeTruthy();
	});

	it('says how the quote came back, in words', () => {
		stubFetch();
		renderApp(<PageView />);
		act(() => openPage(citation));
		expect(screen.getAllByText('found on the page').length).toBeGreaterThan(
			0
		);
	});
});

/**
 * The drawer printed the whole page under three stacked explanations, because
 * the server sends no match window. It finds one itself now.
 */
describe('the passage behind a citation', () => {
	const QUOTE = 'the will to truth, which will still tempt us';
	const padding = (side: string) =>
		Array.from(
			{ length: 40 },
			(_, at) => `${side} sentence number ${at} of padding here.`
		).join(' ');
	const HEAD = padding('Opening');
	const TAIL = padding('Closing');
	// Its own document: `loadPages` holds one promise per id for the life of
	// the module, and the tests above have already asked for doc-1 p. 21.
	const cited = {
		...citation,
		quote: QUOTE,
		ref: { document_id: 'doc-window', page_no: 21 },
		page: { ...citation.page!, document_id: 'doc-window' },
	};
	const page = {
		pages: [
			{
				ref: { document_id: 'doc-window', page_no: 21 },
				printed_page: '9',
				text: `${HEAD} ${QUOTE} to many a venture. ${TAIL}`,
			},
		],
	};

	it('shows the quote lit in the page, not the whole page', async () => {
		stubFetch(page);
		renderApp(<PageView />);
		act(() => openPage(cited));

		const found = await screen.findByText(/will to truth/);
		expect(found.tagName).toBe('MARK');

		// The far ends of the page are not in the drawer.
		expect(screen.queryByText(/Opening sentence number 0 /)).toBeNull();
		expect(screen.queryByText(/Closing sentence number 39 /)).toBeNull();
	});

	// It is already lit in the passage above; printing it again was the same
	// words twice on a screen that is mostly drawer.
	it('does not print the quote a second time underneath', async () => {
		stubFetch(page);
		renderApp(<PageView />);
		act(() => openPage(cited));

		await screen.findByText(/will to truth/);
		expect(screen.queryByText('The words the answer relied on')).toBeNull();
	});

	// A verified citation shows the page and says nothing about itself.
	it('explains nothing when there is nothing wrong', async () => {
		stubFetch(page);
		renderApp(<PageView />);
		act(() => openPage(cited));

		await screen.findByText(/will to truth/);
		expect(screen.queryByText(/match window/)).toBeNull();
		expect(screen.queryByText(/The page.s own words/)).toBeNull();
	});
});

/**
 * A citation arrives with a `ref` and no `page`, so which book it is — and
 * whether that book has a scan — is a round trip away. The footer answered
 * before the round trip landed, and told every reader of every citation that
 * the page had no scan to show.
 */
describe('before the document behind a citation has arrived', () => {
	const hanging = () => {
		let land: (body: unknown) => void = () => {};
		const arrived = new Promise<unknown>((resolve) => (land = resolve));
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({
				ok: true,
				status: 200,
				json: async () => await arrived,
			}))
		);
		return (body: unknown) => act(() => void land(body));
	};

	const cited = (documentId: string) =>
		asProduction({
			...verified('P1', 'the will to truth'),
			ref: { document_id: documentId, page_no: 21 },
		});

	it('says nothing about a scan it has not heard about yet', () => {
		hanging();
		renderApp(<PageView />);
		act(() => openPage(cited('doc-pending')));

		expect(screen.queryByText('This page has no scan to show.')).toBeNull();
		expect(
			screen.queryByRole('button', { name: 'See the scan' })
		).toBeNull();
	});

	it('offers the scan once the document says there is one', async () => {
		const land = hanging();
		renderApp(<PageView />);
		act(() => openPage(cited('doc-lands')));

		land({
			document: {
				document_id: 'doc-lands',
				page_offset: 0,
				page_count: 232,
				text: 'searchable',
				has_file: true,
				work_id: 'w1',
				work_title: 'Beyond Good and Evil',
				creator: 'Friedrich Nietzsche',
				file_key: 'works/x.pdf',
			},
		});

		expect(
			await screen.findByRole('button', { name: /^See the scan/ })
		).toBeTruthy();
		expect(screen.queryByText('This page has no scan to show.')).toBeNull();
	});
});
