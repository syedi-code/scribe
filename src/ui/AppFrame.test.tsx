import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import {
	chat,
	models,
	renderApp,
	stubFetch,
	thread,
	verified,
} from '../test/harness';
import { closePage, openPage } from '../state/reader';
import { AppFrame } from './AppFrame';

/**
 * The shell, and the things reported broken on a phone: the rail would not go
 * away (it is a tab now), the switcher opened behind the page, the phone-frame toggle was still
 * shipping, the rail was called Questions, and the drawer behind a citation
 * came up over the header with the app carried off the side of the screen.
 */

const withThreads = (over = {}) =>
	chat({
		threads: [thread('c1', 'The will to truth as faith')],
		activeId: 'c1',
		atHome: false,
		...over,
	});

describe('the header', () => {
	it('does not ship the phone-frame preview', () => {
		stubFetch();
		renderApp(<AppFrame />, { state: withThreads() });
		expect(screen.queryByLabelText(/phone width/i)).toBeNull();
	});

	it('calls earlier conversations Sessions', () => {
		stubFetch();
		renderApp(<AppFrame />, { state: withThreads() });
		expect(screen.getByRole('tab', { name: 'Sessions' })).toBeTruthy();
	});

	it('takes the reader home when the wordmark is clicked', () => {
		stubFetch();
		const newQuestion = vi.fn();
		renderApp(<AppFrame />, { state: withThreads({ newQuestion }) });
		fireEvent.click(screen.getByLabelText(/home screen/i));
		expect(newQuestion).toHaveBeenCalled();
	});

	it('stands above the page, so the model menu is never behind it', () => {
		stubFetch();
		const { container } = renderApp(<AppFrame />, {
			state: withThreads(),
		});
		fireEvent.click(screen.getByRole('button', { name: /Claude/ }));
		const header = container.querySelector('header');
		const menu = screen.getByRole('menu');
		expect(header?.className).toContain('z-(--z-header)');
		expect(header?.contains(menu)).toBe(true);
		expect(menu.className).toContain('z-(--z-menu)');
	});

	it('lets the model menu wrap rather than run out of its box', () => {
		stubFetch();
		renderApp(<AppFrame />, { state: withThreads() });
		fireEvent.click(screen.getByRole('button', { name: /Claude/ }));
		expect(screen.getByRole('menu').className).toContain(
			'whitespace-normal'
		);
	});
});

describe('the tabs', () => {
	it('shows Add a book struck through, and will not open it', () => {
		stubFetch();
		renderApp(<AppFrame />, { state: withThreads() });
		const add = screen.getByRole('tab', { name: 'Add a book' });

		expect(add.hasAttribute('disabled')).toBe(true);
		expect(add.className).toContain('line-through');

		fireEvent.click(add);
		expect(screen.queryByText(/Drop a PDF here/)).toBeNull();
	});

	it('opens the shelves, and leaves the reading surface alone', () => {
		stubFetch({ works: [] });
		renderApp(<AppFrame />, { state: withThreads() });
		fireEvent.click(screen.getByRole('tab', { name: 'Books' }));
		expect(screen.getByRole('searchbox')).toBeTruthy();
	});
});

describe('the model switcher', () => {
	const roster = {
		...models,
		choices: [
			...models.choices,
			{
				id: 'gemini-3.8-flash',
				label: 'Gemini 3.8 Flash',
				provider: 'google' as const,
				acceptsFiles: true,
				available: false,
				comingSoon: true,
			},
		],
	};

	// A model held back is a decision, and reads as one: `no key set` would
	// have said the deployment was misconfigured.
	it('says a held-back model is coming, not keyless', () => {
		stubFetch();
		renderApp(<AppFrame />, { state: withThreads(), roster });
		fireEvent.click(screen.getByRole('button', { name: /Claude Haiku/ }));

		const held = screen.getByRole('menuitem', { name: /Gemini 3.8 Flash/ });
		expect(held.textContent).toContain('coming soon');
		expect(held.textContent).not.toContain('no key set');
		expect(held.hasAttribute('disabled')).toBe(true);
	});
});

describe('the rail, naming', () => {
	it('says naming only while the server is being asked', () => {
		stubFetch();
		renderApp(<AppFrame />, {
			state: chat({
				threads: [thread('c1', null), thread('c2', null)],
				naming: ['c1'],
				activeId: 'c1',
				atHome: false,
			}),
		});
		fireEvent.click(screen.getByRole('tab', { name: 'Sessions' }));

		expect(screen.getByText('naming…')).toBeTruthy();
		// The one nobody is naming any more says what it is, and stops
		// promising a title that is not coming.
		expect(screen.getByText('untitled')).toBeTruthy();
	});
});

describe('the sessions rail', () => {
	const listed = (over = {}) =>
		chat({
			threads: [thread('c1', 'The will to truth as faith')],
			activeId: null,
			atHome: false,
			...over,
		});

	it('says what it is, and how many there are', () => {
		stubFetch();
		renderApp(<AppFrame />, { state: listed() });
		const rail = screen.getByRole('navigation');
		expect(rail.textContent).toContain('Sessions');
		expect(
			screen.getByLabelText('1 session', { selector: 'span' })
		).toBeTruthy();
	});

	it('draws a mark beside New question', () => {
		stubFetch();
		const { container } = renderApp(<AppFrame />, { state: listed() });
		const button = screen.getByRole('button', { name: /New question/ });
		expect(button.querySelector('svg')).toBeTruthy();
		expect(container.querySelector('nav svg')).toBeTruthy();
	});

	// The round trip is started as the pointer arrives, so the click that
	// follows has nothing left to wait for.
	it('warms a conversation as the pointer reaches it', () => {
		stubFetch();
		const warmThread = vi.fn();
		renderApp(<AppFrame />, { state: listed({ warmThread }) });

		const row = screen.getByRole('button', {
			name: 'The will to truth as faith',
		});
		fireEvent.pointerEnter(row);
		expect(warmThread).toHaveBeenCalledWith('c1');

		fireEvent.focus(row);
		expect(warmThread).toHaveBeenCalledTimes(2);
	});

	// Wide, the rail never closes, so nothing else would take a reader off the
	// shelves: the thread used to load into a panel nobody was looking at.
	it('takes a reader to the conversation, from whatever tab they were on', () => {
		stubFetch({ works: [] });
		const openThread = vi.fn();
		renderApp(<AppFrame />, { state: listed({ openThread }) });

		fireEvent.click(screen.getByRole('tab', { name: 'Books' }));
		expect(screen.getByRole('searchbox')).toBeTruthy();

		fireEvent.click(
			screen.getByRole('button', { name: 'The will to truth as faith' })
		);
		expect(openThread).toHaveBeenCalledWith('c1');
		expect(
			screen
				.getByRole('tab', { name: 'Ask' })
				.getAttribute('aria-selected')
		).toBe('true');
		expect(screen.queryByRole('searchbox')).toBeNull();
	});

	it('takes a reader to a new question the same way', () => {
		stubFetch({ works: [] });
		const newQuestion = vi.fn();
		renderApp(<AppFrame />, { state: listed({ newQuestion }) });

		fireEvent.click(screen.getByRole('tab', { name: 'Books' }));
		fireEvent.click(screen.getByRole('button', { name: /New question/ }));
		expect(newQuestion).toHaveBeenCalled();
		expect(
			screen
				.getByRole('tab', { name: 'Ask' })
				.getAttribute('aria-selected')
		).toBe('true');
	});
});

describe('the header, folding', () => {
	// The mark and the model line fold away on the home screen. `0fr`/`1fr` on
	// a grid row is what lets the header's own height ease rather than jump.
	it('folds the mark away at home, and takes it out of reach', () => {
		stubFetch();
		const { container } = renderApp(<AppFrame />, { state: chat() });
		const fold = container.querySelector('header > div')!;
		expect(fold.className).toContain('grid-rows-[0fr]');
		expect(fold.hasAttribute('inert')).toBe(true);
	});

	it('unfolds it once there is a conversation', () => {
		stubFetch();
		const { container } = renderApp(<AppFrame />, {
			state: withThreads(),
		});
		const fold = container.querySelector('header > div')!;
		expect(fold.className).toContain('grid-rows-[1fr]');
		expect(fold.hasAttribute('inert')).toBe(false);
		expect(fold.className).toContain('transition-[grid-template-rows');
	});

	// The clip is what makes a fold a fold, and it must never outstay it: it
	// would cut the model menu off where it hangs out of the header.
	it('clips while the mark is folded away', () => {
		stubFetch();
		const { container } = renderApp(<AppFrame />, { state: chat() });
		const fold = container.querySelector('header > div')!;
		expect(fold.firstElementChild!.className).toContain('overflow-hidden');
	});

	it('does not clip once the mark is showing', () => {
		stubFetch();
		const { container } = renderApp(<AppFrame />, {
			state: withThreads(),
		});
		const fold = container.querySelector('header > div')!;
		fireEvent.transitionEnd(fold);
		expect(fold.firstElementChild!.className).not.toContain(
			'overflow-hidden'
		);
	});
});

describe('the drawer behind a citation', () => {
	afterEach(() => act(() => closePage()));

	it('opens inside the page, never over the header', () => {
		stubFetch();
		const { container } = renderApp(<AppFrame />, {
			state: withThreads(),
		});
		act(() => openPage(verified('P1', 'the will to truth')));

		const drawer = screen.getByRole('dialog');
		expect(container.querySelector('main')!.contains(drawer)).toBe(true);
		expect(container.querySelector('header')!.contains(drawer)).toBe(false);
	});

	// `overflow: hidden` is still a scroll container, and focusing the drawer
	// while it was parked off the right edge scrolled the app out from under it.
	it('clips the shell rather than letting it scroll sideways', () => {
		stubFetch();
		const { container } = renderApp(<AppFrame />, {
			state: withThreads(),
		});
		const shell = container.querySelector('header')!.parentElement!;
		expect(shell.className).toContain('overflow-clip');
		expect(shell.className).not.toContain('overflow-hidden');
	});

	it('closes from its own Close button', () => {
		stubFetch();
		renderApp(<AppFrame />, { state: withThreads() });
		act(() => openPage(verified('P1', 'the will to truth')));
		fireEvent.click(screen.getByRole('button', { name: 'Close' }));
		expect(screen.queryByRole('button', { name: 'Close' })).toBeNull();
	});
});

/**
 * Narrow, Sessions was a drawer over the page. It is a tab now, level with Ask
 * and Books, and takes the whole page. The container query decides which of
 * the two is on screen; these check that the tree asks it to.
 */
describe('sessions, narrow', () => {
	it('is a tab, offered only where there is no rail beside the page', () => {
		stubFetch();
		renderApp(<AppFrame />, { state: withThreads() });
		const tab = screen.getByRole('tab', { name: 'Sessions' });
		expect(tab.className).toContain('hidden');
		expect(tab.className).toContain('@max-compact:block');
	});

	it('takes the page from Ask rather than lying over it', () => {
		stubFetch();
		const { container } = renderApp(<AppFrame />, {
			state: withThreads(),
		});
		const rail = screen.getByRole('navigation').parentElement!;
		const panel = container.querySelector('main > div.contents')!;
		expect(rail.className).toContain('@max-compact:hidden');
		expect(panel.className).not.toContain('@max-compact:hidden');

		fireEvent.click(screen.getByRole('tab', { name: 'Sessions' }));
		expect(rail.className).not.toContain('@max-compact:hidden');
		expect(panel.className).toContain('@max-compact:hidden');
		expect(
			screen
				.getByRole('tab', { name: 'Sessions' })
				.getAttribute('aria-selected')
		).toBe('true');
	});

	it('goes to Ask when a conversation is chosen from it', () => {
		stubFetch();
		const openThread = vi.fn();
		renderApp(<AppFrame />, { state: withThreads({ openThread }) });
		fireEvent.click(screen.getByRole('tab', { name: 'Sessions' }));
		fireEvent.click(
			screen.getByRole('button', { name: 'The will to truth as faith' })
		);
		expect(openThread).toHaveBeenCalledWith('c1');
		expect(
			screen
				.getByRole('tab', { name: 'Ask' })
				.getAttribute('aria-selected')
		).toBe('true');
	});

	// Wide there is no Sessions tab to be on: the rail is beside Ask, so Ask
	// is what reads as current.
	it('leaves Ask reading as current when the window is wide', () => {
		stubFetch();
		renderApp(<AppFrame />, { state: withThreads() });
		fireEvent.click(screen.getByRole('tab', { name: 'Sessions' }));
		const ask = screen.getByRole('tab', { name: 'Ask' });
		expect(ask.className).toContain('text-ink @max-compact:text-ink-faint');
	});
});
