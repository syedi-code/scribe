import { describe, expect, it, beforeEach } from 'vitest';
import {
	LAST_FEW,
	readAllowance,
	remainingOf,
	reportAllowance,
	resetAllowance,
	standingOf,
} from './allowance';
import type { Allowance } from '../api/types';

const free = (used: number, limit: number | null = 20): Allowance => ({
	plan: 'free',
	used,
	limit,
	resets_at: '2026-10-01T00:00:00.000Z',
});

describe('standingOf', () => {
	it('says nothing at all until the allowance is known', () => {
		expect(standingOf(null)).toBe('unknown');
	});

	it('treats a null limit as unlimited, never as zero', () => {
		expect(standingOf(free(200, null))).toBe('unlimited');
		expect(remainingOf(free(200, null))).toBeNull();
	});

	it('stays quiet while there is room', () => {
		expect(standingOf(free(0))).toBe('comfortable');
		expect(standingOf(free(20 - LAST_FEW - 1))).toBe('comfortable');
	});

	it('speaks up at the last few', () => {
		expect(standingOf(free(20 - LAST_FEW))).toBe('last-few');
		expect(standingOf(free(19))).toBe('last-few');
	});

	it('is spent at the limit, and stays spent past it', () => {
		expect(standingOf(free(20))).toBe('spent');
		expect(standingOf(free(25))).toBe('spent');
	});

	it('never reports a negative number of questions left', () => {
		expect(remainingOf(free(25))).toBe(0);
	});
});

describe('reportAllowance', () => {
	beforeEach(resetAllowance);

	it('takes the figure it is given', () => {
		reportAllowance(free(7));
		expect(readAllowance()?.used).toBe(7);
	});

	it('ignores nothing arriving, rather than blanking what it holds', () => {
		reportAllowance(free(7));
		reportAllowance(undefined);
		reportAllowance(null);
		expect(readAllowance()?.used).toBe(7);
	});

	it('does not let a stale roster undo a finished answer', () => {
		// The roster is fetched once a tab; an answer that finishes after it
		// reports a higher count, and the roster's copy must not win.
		reportAllowance(free(19));
		reportAllowance(free(0));
		expect(readAllowance()?.used).toBe(19);
		expect(standingOf(readAllowance())).toBe('last-few');
	});

	it('lets the month turn over, which lowers the count legitimately', () => {
		reportAllowance(free(20));
		reportAllowance({
			...free(0),
			resets_at: '2026-11-01T00:00:00.000Z',
		});
		expect(readAllowance()?.used).toBe(0);
		expect(standingOf(readAllowance())).toBe('comfortable');
	});

	it('accepts a plan change that does not lower the count', () => {
		reportAllowance(free(19));
		reportAllowance({ ...free(19), plan: 'paid', limit: 500 });
		expect(standingOf(readAllowance())).toBe('comfortable');
	});
});
