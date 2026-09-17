import { describe, expect, it, vi } from 'vitest';
import { fireEvent, screen } from '@testing-library/react';
import { chat, renderApp, stubFetch, thread } from '../test/harness';
import { AppFrame } from './AppFrame';

/**
 * The shell, and the four things reported broken on a phone: the rail would
 * not go away, the switcher opened behind the page, the phone-frame toggle was
 * still shipping, and the rail was called Questions.
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
