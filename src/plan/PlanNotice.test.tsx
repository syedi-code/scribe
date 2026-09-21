import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { COPY } from '../copy';
import { FlagContext } from '../flags/context';
import { DEFAULT_FLAGS } from '../flags/flags';
import { reportAllowance, resetAllowance } from '../state/allowance';
import { PlanNotice } from './PlanNotice';
import type { Allowance } from '../api/types';

const free = (used: number, limit: number | null = 20): Allowance => ({
	plan: 'free',
	used,
	limit,
	resets_at: '2026-10-01T00:00:00.000Z',
});

function show(on: boolean) {
	render(
		<FlagContext
			value={{
				flags: { ...DEFAULT_FLAGS, isPlanLimitShown: on },
				loading: false,
			}}
		>
			<PlanNotice />
		</FlagContext>
	);
}

beforeEach(resetAllowance);

describe('the plan notice', () => {
	it('says nothing while there is room', () => {
		reportAllowance(free(3));
		show(true);
		expect(screen.queryByRole('status')).toBeNull();
	});

	it('says nothing at all when the flag is off, even when spent', () => {
		reportAllowance(free(20));
		show(false);
		expect(screen.queryByRole('status')).toBeNull();
	});

	it('counts down the last few', () => {
		reportAllowance(free(19));
		show(true);
		expect(screen.getByText(/1 question left this month/)).toBeTruthy();
	});

	it('says questions, plural, at two', () => {
		reportAllowance(free(18));
		show(true);
		expect(screen.getByText(/2 questions left this month/)).toBeTruthy();
	});

	it('explains the silence once the month is spent', () => {
		reportAllowance(free(20));
		show(true);
		expect(screen.getByText(new RegExp(COPY.plan.spent))).toBeTruthy();
	});

	it('never counts down for an unlimited reader', () => {
		reportAllowance(free(900, null));
		show(true);
		expect(screen.queryByRole('status')).toBeNull();
	});

	it('offers the plan without claiming it is ready', () => {
		reportAllowance(free(20));
		show(true);
		expect(screen.queryByText(COPY.plan.soon)).toBeNull();
		fireEvent.click(screen.getByRole('button', { name: COPY.plan.see }));
		expect(screen.getByText(COPY.plan.soon)).toBeTruthy();
	});

	it('is polite, so it does not cut across an answer being read out', () => {
		reportAllowance(free(20));
		show(true);
		expect(screen.getByRole('status').getAttribute('aria-live')).toBe(
			'polite'
		);
	});
});
