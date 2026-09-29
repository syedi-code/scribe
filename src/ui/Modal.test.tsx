import { act, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Modal } from './Modal';

/**
 * A sheet on a phone went off the bottom of the screen: pinned to the bottom
 * of the layout viewport, under whatever the browser had drawn over it — the
 * sign-in dialog's one button with it. It is pinned to what can be seen.
 */

class FakeVisualViewport extends EventTarget {
	offsetTop = 0;
	height: number;
	constructor(height: number) {
		super();
		this.height = height;
	}
}

const original = Object.getOwnPropertyDescriptor(window, 'visualViewport');

afterEach(() => {
	if (original) Object.defineProperty(window, 'visualViewport', original);
	else delete (window as { visualViewport?: unknown }).visualViewport;
});

function showing(seen: FakeVisualViewport) {
	Object.defineProperty(window, 'visualViewport', {
		configurable: true,
		value: seen,
	});
	Object.defineProperty(window, 'innerHeight', {
		configurable: true,
		value: 844,
	});
	render(<Modal title="Sign in">body</Modal>);
	return screen.getByRole('dialog', { hidden: true });
}

describe('a sheet', () => {
	it('is lifted by what covers the bottom of the screen', () => {
		const sheet = showing(new FakeVisualViewport(700));
		expect(sheet.style.getPropertyValue('--hidden-below')).toBe('144px');
		expect(sheet.style.getPropertyValue('--seen-height')).toBe('700px');
	});

	it('follows the visible area as it changes', () => {
		const seen = new FakeVisualViewport(844);
		const sheet = showing(seen);
		expect(sheet.style.getPropertyValue('--hidden-below')).toBe('0px');

		// The keyboard comes up.
		seen.height = 500;
		act(() => {
			seen.dispatchEvent(new Event('resize'));
		});
		expect(sheet.style.getPropertyValue('--hidden-below')).toBe('344px');
		expect(sheet.style.getPropertyValue('--seen-height')).toBe('500px');
	});

	it('takes its room from those measures, not the viewport', () => {
		const sheet = showing(new FakeVisualViewport(844));
		expect(sheet.className).toContain(
			'@max-compact:mb-[var(--hidden-below,0px)]'
		);
		expect(sheet.className).toContain(
			'@max-compact:max-h-[calc(var(--seen-height,100dvh)-1.5rem)]'
		);
	});
});
