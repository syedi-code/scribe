import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { renderApp, stubFetch, verified } from '../test/harness';
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

	it('says how the quote came back, in words', () => {
		stubFetch();
		renderApp(<PageView />);
		act(() => openPage(citation));
		expect(screen.getAllByText('found on the page').length).toBeGreaterThan(
			0
		);
	});
});
