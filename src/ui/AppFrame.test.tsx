import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen } from '@testing-library/react';
import { chat, renderApp, stubFetch, thread, verified } from '../test/harness';
import { closePage, openPage } from '../state/reader';
import { AppFrame } from './AppFrame';

/**
 * The shell, and the things reported broken on a phone: the rail would not go
 * away, the switcher opened behind the page, the phone-frame toggle was still
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
		expect(screen.getByRole('button', { name: 'Sessions' })).toBeTruthy();
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
		expect(header?.className).toContain('z-40');
		expect(header?.contains(menu)).toBe(true);
		expect(menu.className).toContain('z-50');
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

describe('the rail, narrow', () => {
	it('opens from the header and closes again when clicked away', () => {
		stubFetch();
		const { container } = renderApp(<AppFrame />, {
			state: withThreads(),
		});
		const toggle = screen.getByRole('button', { name: 'Sessions' });

		fireEvent.click(toggle);
		expect(screen.getByRole('navigation')).toBeTruthy();
		expect(toggle.getAttribute('aria-expanded')).toBe('true');

		fireEvent.pointerDown(container.querySelector('main')!);
		expect(toggle.getAttribute('aria-expanded')).toBe('false');
	});

	it('closes on Escape', () => {
		stubFetch();
		renderApp(<AppFrame />, { state: withThreads() });
		const toggle = screen.getByRole('button', { name: 'Sessions' });
		fireEvent.click(toggle);
		fireEvent.keyDown(document, { key: 'Escape' });
		expect(toggle.getAttribute('aria-expanded')).toBe('false');
	});

	it('is not reopened by the very tap that closed it', () => {
		stubFetch();
		renderApp(<AppFrame />, { state: withThreads() });
		const toggle = screen.getByRole('button', { name: 'Sessions' });
		fireEvent.click(toggle);
		expect(toggle.getAttribute('aria-expanded')).toBe('true');
		fireEvent.pointerDown(toggle);
		expect(toggle.getAttribute('aria-expanded')).toBe('true');
		fireEvent.click(toggle);
		expect(toggle.getAttribute('aria-expanded')).toBe('false');
	});
});
