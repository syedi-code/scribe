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

afterEach(cleanup);
