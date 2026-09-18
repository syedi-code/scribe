import { describe, expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { chat, renderApp, stubFetch, thread } from '../test/harness';
import { Home } from '../ask/Home';
import { AppFrame } from './AppFrame';
import { takeDeparture } from './departure';

/**
 * Leaving the home screen, the wordmark travels into the corner rather than
 * vanishing and reappearing, and the rail that sat in that corner steps down
 * out of its way. jsdom has no layout, so these check the hand-off and the
 * classes; the motion itself was checked in a browser.
 */

describe('the home wordmark, leaving', () => {
	it('says where it was, once', () => {
		stubFetch({ works: [] });
		const { unmount } = renderApp(<Home composerSlot={() => {}} />);
		unmount();

		expect(takeDeparture()).not.toBeNull();
		// A second reader would fly the mark from somewhere it no longer is.
		expect(takeDeparture()).toBeNull();
	});
});

describe('the rail, on the home screen', () => {
	const listed = (atHome: boolean) =>
		chat({
			threads: [thread('c1', 'The will to truth as faith')],
			activeId: atHome ? null : 'c1',
			atHome,
		});

	it('rises into the corner the wordmark will take', () => {
		stubFetch();
		renderApp(<AppFrame />, { state: listed(true) });
		const rail = screen.getByRole('navigation').parentElement!;
		expect(rail.className).toContain('-mt-(--header-rest)');
		expect(rail.className).toContain('@max-compact:mt-0');
	});

	it('steps down once there is a conversation', () => {
		stubFetch();
		renderApp(<AppFrame />, { state: listed(false) });
		const rail = screen.getByRole('navigation').parentElement!;
		expect(rail.className).not.toContain('-mt-(--header-rest)');
		expect(rail.className).toContain('transition-[margin-top]');
	});

	// The header lies over the risen rail, so it must not swallow the clicks
	// meant for it — only what it actually holds takes the pointer.
	it('lets clicks through the header where it holds nothing', () => {
		stubFetch();
		const { container } = renderApp(<AppFrame />, { state: listed(true) });
		const header = container.querySelector('header')!;
		expect(header.className).toContain('pointer-events-none');
		expect(screen.getByRole('tablist').className).toContain(
			'pointer-events-auto'
		);
	});
});
