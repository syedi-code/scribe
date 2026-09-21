import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * jsdom has no layout, so the two browser APIs the margin uses have to exist
 * before anything renders. Nothing here fakes behaviour a test then asserts —
 * these only stop the components crashing outside a browser.
 */
class NoopObserver {
	observe() {}
	unobserve() {}
	disconnect() {}
}

vi.stubGlobal('ResizeObserver', NoopObserver);

// jsdom declares matchMedia but does not implement it.
vi.stubGlobal('matchMedia', () => ({
	matches: false,
	addEventListener() {},
	removeEventListener() {},
}));

Object.defineProperty(document, 'fonts', {
	value: { ready: Promise.resolve() },
	configurable: true,
});

// jsdom implements no SVG geometry, and the tie line measures itself.
const svg = SVGElement.prototype as unknown as {
	getTotalLength?: () => number;
};
svg.getTotalLength ??= () => 0;

// jsdom has the <dialog> element but none of its methods. Opening one is
// setting `open`, which is all a test can see of it anyway; the focus trap
// and the top layer are the browser's, and nothing here pretends to them.
const dialog = HTMLDialogElement.prototype;
dialog.showModal ??= function (this: HTMLDialogElement) {
	this.setAttribute('open', '');
};
dialog.close ??= function (this: HTMLDialogElement) {
	this.removeAttribute('open');
};

afterEach(cleanup);
