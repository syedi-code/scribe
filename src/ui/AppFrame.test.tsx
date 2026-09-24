import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';
import {
	chat,
	models,
	renderApp,
	stubFetch,
	thread,
	verified,
} from '../test/harness';
import { closePage, openPage } from '../state/reader';
import { ChatContext, type ChatState } from '../chat/context';
import { ModelContext } from '../models/context';
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
	// A tier out of reach is a decision, and it is said by striking the name
	// through and not letting it be picked. `no key set` would have claimed
	// the deployment was misconfigured, and a `coming soon` beside the strike
	// was the same fact said twice.
	it('strikes an unreachable tier through rather than labelling it', () => {
		stubFetch();
		renderApp(<AppFrame />, { state: withThreads(), roster: models });
		fireEvent.click(screen.getByRole('button', { name: /Alpha/ }));

		const held = screen.getByRole('menuitem', { name: /Omega/ });
		expect(held.textContent).not.toContain('no key set');
		expect(held.textContent).not.toContain('coming soon');
		expect(held.querySelector('.line-through')).toBeTruthy();
	});

	// The switcher moved into the composer, which is at the foot of every
	// layout: a menu hung below it opens off the bottom of a phone.
	it('hangs its menu above the control', () => {
		stubFetch();
		renderApp(<AppFrame />, { state: withThreads(), roster: models });
		fireEvent.click(screen.getByRole('button', { name: /Alpha/ }));
		const menu = screen.getByRole('menu');
		expect(menu.className).toContain('bottom-full');
		// It still has to win over everything it opens across.
		expect(menu.className).toContain('z-(--z-menu)');
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

/**
 * The rail in the header's empty corner, and the two things reported wrong
 * with it: `Sessions` cut off at the top of the page after a conversation had
 * been open, and `New question` answering a click with nothing.
 */
const shell = (state: ChatState) => (
	<ModelContext value={models}>
		<ChatContext value={state}>
			<AppFrame />
		</ChatContext>
	</ModelContext>
);

describe('the rail risen into the corner', () => {
	const OPEN = 65;
	const TABS = 20;

	/** jsdom has no layout, so the two heights that matter are stood up here. */
	const withHeights = (run: () => void) => {
		const real = Object.getOwnPropertyDescriptor(
			HTMLElement.prototype,
			'offsetHeight'
		);
		Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
			configurable: true,
			get(this: HTMLElement) {
				if (this.tagName === 'HEADER') return OPEN;
				// What does not fold: the tabs, and the account beside them.
				return this.querySelector(':scope > [role="tablist"]')
					? TABS
					: 0;
			},
		});
		try {
			run();
		} finally {
			if (real) {
				Object.defineProperty(
					HTMLElement.prototype,
					'offsetHeight',
					real
				);
			}
		}
	};

	// The height was read off the row itself, on the commit that starts the
	// fold — when the row is still open. Coming home from a conversation the
	// rail rose by the open height, about twenty pixels too far, and took
	// `Sessions` up behind the header and off the top of the shell, which
	// clips. The tabs do not fold, so they are what is measured.
	it('rises by the resting header, not the one still folding', () => {
		stubFetch();
		withHeights(() => {
			const { container, rerender } = render(shell(withThreads()));
			rerender(
				shell(
					chat({
						threads: [thread('c1', 'The will to truth as faith')],
						atHome: true,
					})
				)
			);
			const frame = container.firstElementChild as HTMLElement;
			expect(frame.style.getPropertyValue('--header-rest')).toBe(
				`${TABS}px`
			);
		});
	});
});

describe('New question', () => {
	const button = () => screen.getByRole('button', { name: /New question/ });

	it('leaves a conversation for a blank one', () => {
		stubFetch();
		const newQuestion = vi.fn();
		renderApp(<AppFrame />, { state: withThreads({ newQuestion }) });
		fireEvent.click(button());
		expect(newQuestion).toHaveBeenCalled();
	});

	// On the home screen there is no conversation to leave, so the click did
	// nothing at all and was reported as a button that does not work. It says
	// so now, in the disabled it already wears while a turn is in flight.
	it('says so when there is nothing to leave', () => {
		stubFetch();
		renderApp(<AppFrame />, {
			state: chat({
				threads: [thread('c1', 'The will to truth as faith')],
				atHome: true,
			}),
		});
		expect(button().hasAttribute('disabled')).toBe(true);
	});

	// Narrow, Sessions is a page of its own and the home screen is elsewhere,
	// so the button was grey on a phone for good. There it takes you home.
	it('takes the reader to Ask from the Sessions tab, even from home', () => {
		stubFetch();
		const newQuestion = vi.fn();
		renderApp(<AppFrame />, {
			state: chat({
				threads: [thread('c1', 'The will to truth as faith')],
				atHome: true,
				newQuestion,
			}),
		});
		fireEvent.click(screen.getByRole('tab', { name: 'Sessions' }));
		expect(button().hasAttribute('disabled')).toBe(false);

		fireEvent.click(button());
		expect(
			screen
				.getByRole('tab', { name: 'Ask' })
				.getAttribute('aria-selected')
		).toBe('true');
		expect(newQuestion).not.toHaveBeenCalled();
	});
});
