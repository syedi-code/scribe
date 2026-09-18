import { afterEach, describe, expect, it, vi } from 'vitest';
import { stubFetch } from '../test/harness';
import { forgetThread, loadThread, readThread, warmThread } from './threads';

/**
 * Switching between two conversations was a round trip every time, and the
 * reading surface went blank for the length of it.
 */
const OPENED = {
	conversation: { id: 'c1', title: 'The will to truth as faith' },
	messages: [{ id: 'm1', role: 'user', parts: [] }],
};

afterEach(() => {
	forgetThread('c1');
	vi.unstubAllGlobals();
});

describe('a conversation already read', () => {
	it('is not in hand until it has been fetched once', () => {
		expect(readThread('c1')).toBeNull();
	});

	it('is in hand the moment it lands, and needs no second trip', async () => {
		const fetcher = stubFetch(OPENED);
		await loadThread('c1');

		expect(readThread('c1')?.messages).toHaveLength(1);
		await loadThread('c1');
		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	it('is asked for once however many times it is warmed', async () => {
		const fetcher = stubFetch(OPENED);
		warmThread('c1');
		warmThread('c1');
		await loadThread('c1');
		warmThread('c1');

		expect(fetcher).toHaveBeenCalledTimes(1);
	});

	// A turn written into it makes what was held for it wrong.
	it('is let go of when a question is asked in it', async () => {
		const fetcher = stubFetch(OPENED);
		await loadThread('c1');
		forgetThread('c1');

		expect(readThread('c1')).toBeNull();
		await loadThread('c1');
		expect(fetcher).toHaveBeenCalledTimes(2);
	});

	it('is not held when the fetch failed', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ({
				ok: false,
				status: 500,
				json: async () => ({ error: 'nope' }),
			}))
		);
		await expect(loadThread('c1')).rejects.toThrow();
		expect(readThread('c1')).toBeNull();
	});

	// The reader never asked for it, so a failure is not theirs to hear about.
	it('swallows a failed warm rather than throwing into nothing', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => {
				throw new Error('offline');
			})
		);
		expect(() => warmThread('c1')).not.toThrow();
		await new Promise((settle) => setTimeout(settle, 0));
		expect(readThread('c1')).toBeNull();
	});
});
