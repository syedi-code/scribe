import { fireEvent, render } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it } from 'vitest';
import { useStickToBottom } from './useStickToBottom';

/**
 * Sending on a phone left the question and the start of the answer below the
 * fold (#50): a reader who had scrolled up was never taken back down, and the
 * keyboard's own resize counted as the reader scrolling away.
 */

function Chat({ tick, follow }: { tick: number; follow: string }) {
	const ref = useRef<HTMLDivElement>(null);
	useStickToBottom(ref, [tick], follow);
	return <div data-testid="chat" ref={ref} />;
}

/** jsdom lays nothing out, so the box is described by hand. */
function box(element: HTMLElement, sizes: { scroll: number; client: number }) {
	Object.defineProperty(element, 'scrollHeight', {
		configurable: true,
		get: () => sizes.scroll,
	});
	Object.defineProperty(element, 'clientHeight', {
		configurable: true,
		get: () => sizes.client,
	});
}

function setUp() {
	const view = render(<Chat tick={0} follow="a:1" />);
	const chat = view.getByTestId('chat');
	const sizes = { scroll: 2000, client: 600 };
	box(chat, sizes);
	// The first layout, which the hook takes as the viewport and not the reader.
	fireEvent.scroll(chat);
	const readAt = (top: number) => {
		chat.scrollTop = top;
		fireEvent.scroll(chat);
	};
	return { view, chat, sizes, readAt };
}

describe('a chat following its tail', () => {
	it('stays where the reader put it while an answer streams', () => {
		const { view, chat, readAt } = setUp();
		readAt(200);
		view.rerender(<Chat tick={1} follow="a:1" />);
		expect(chat.scrollTop).toBe(200);
	});

	it('goes to the end when a question is sent, wherever the reader was', () => {
		const { view, chat, sizes, readAt } = setUp();
		readAt(200);
		sizes.scroll = 2400;
		view.rerender(<Chat tick={1} follow="a:2" />);
		expect(chat.scrollTop).toBe(2400);

		// And follows the answer from there.
		sizes.scroll = 2900;
		view.rerender(<Chat tick={2} follow="a:2" />);
		expect(chat.scrollTop).toBe(2900);
	});

	it('does not count the keyboard resizing the page as the reader leaving', () => {
		const { view, chat, sizes } = setUp();
		// The keyboard opens: the box shrinks, and the scroll it fires
		// measures far from the end with nobody touching anything.
		sizes.client = 300;
		chat.scrollTop = 900;
		fireEvent.scroll(chat);

		sizes.scroll = 2300;
		view.rerender(<Chat tick={1} follow="a:1" />);
		expect(chat.scrollTop).toBe(2300);
	});
});
