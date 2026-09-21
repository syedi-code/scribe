import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COPY } from '../copy';
import { readAllowance, resetAllowance } from '../state/allowance';
import { refuseSpentMonth } from './refusal';

const SPENT = {
	plan: 'free',
	used: 5,
	limit: 5,
	resets_at: '2026-10-01T00:00:00.000Z',
};

beforeEach(resetAllowance);
afterEach(() => vi.unstubAllGlobals());

describe('a turn the month has no room for', () => {
	it('is told in words, not as the body of the refusal', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					new Response(
						JSON.stringify({
							error: 'You have used all 5 of this month’s turns.',
							code: 'TURN_LIMIT_REACHED',
							allowance: SPENT,
						}),
						{ status: 402 }
					)
			)
		);
		await expect(refuseSpentMonth('/api/x')).rejects.toThrow(
			COPY.plan.refused
		);
		expect(readAllowance()).toEqual(SPENT);
	});

	it('leaves every other response to the transport', async () => {
		const ok = new Response('data: {}\n\n', { status: 200 });
		vi.stubGlobal(
			'fetch',
			vi.fn(async () => ok)
		);
		expect(await refuseSpentMonth('/api/x')).toBe(ok);
		expect(readAllowance()).toBeNull();
	});
});
