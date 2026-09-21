import { render, screen, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, beforeEach } from 'vitest';
import { COPY } from '../copy';
import { ChatContext } from '../chat/context';
import { FlagContext } from '../flags/context';
import { DEFAULT_FLAGS } from '../flags/flags';
import { reportAllowance, resetAllowance } from '../state/allowance';
import { closeDialog, useDialog } from '../state/dialog';
import { chat } from '../test/harness';
import { PlanNotice } from './PlanNotice';
import type { Allowance } from '../api/types';

const free = (used: number, limit: number | null = 20): Allowance => ({
	plan: 'free',
	used,
	limit,
	resets_at: '2026-10-01T00:00:00.000Z',
});

function Open() {
	return <span data-testid="open">{useDialog() ?? ''}</span>;
}

function show(on: boolean, { atHome = false } = {}) {
	render(
		<FlagContext
			value={{
				flags: { ...DEFAULT_FLAGS, isPlanLimitShown: on },
				loading: false,
			}}
		>
			<ChatContext value={chat({ atHome })}>
				<PlanNotice />
				<Open />
			</ChatContext>
		</FlagContext>
	);
}

beforeEach(() => {
	resetAllowance();
	closeDialog();
});

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
		expect(screen.getByText(COPY.plan.spent)).toBeTruthy();
	});

	it('says what is still open on a spent home screen', () => {
		reportAllowance(free(20));
		show(true, { atHome: true });
		expect(screen.getByRole('status').textContent).toContain(
			COPY.plan.stillOpen
		);
	});

	it('never counts down for an unlimited reader', () => {
		reportAllowance(free(900, null));
		show(true);
		expect(screen.queryByRole('status')).toBeNull();
	});

	it('leads to the plans, the same place every offer leads', () => {
		reportAllowance(free(20));
		show(true);
		fireEvent.click(screen.getByRole('button', { name: COPY.plan.see }));
		expect(screen.getByTestId('open').textContent).toBe('plans');
	});

	it('offers nothing to a reader already on the paid plan', () => {
		reportAllowance({ ...free(499, 500), plan: 'paid' });
		show(true);
		expect(screen.getByRole('status')).toBeTruthy();
		expect(
			screen.queryByRole('button', { name: COPY.plan.see })
		).toBeNull();
	});

	it('is polite, so it does not cut across an answer being read out', () => {
		reportAllowance(free(20));
		show(true);
		expect(screen.getByRole('status').getAttribute('aria-live')).toBe(
			'polite'
		);
	});
});

describe('the day a month resets', () => {
	const zone = process.env.TZ;
	afterEach(() => {
		process.env.TZ = zone;
	});

	// Midnight UTC on the first is still the thirtieth in New York, and a
	// reader there was told their questions came back a day early.
	it('is the first of the month wherever the reader is', () => {
		process.env.TZ = 'America/Los_Angeles';
		const said = COPY.plan.resets('2026-10-01T00:00:00.000Z');
		expect(said).toMatch(/\b1\b/);
		expect(said).not.toMatch(/30/);
	});
});
