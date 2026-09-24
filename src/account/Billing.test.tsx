import {
	act,
	render,
	screen,
	waitFor,
	fireEvent,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COPY } from '../copy';
import { forgetPlans } from '../api/billing';
import { ChatContext } from '../chat/context';
import { FlagContext } from '../flags/context';
import { DEFAULT_FLAGS } from '../flags/flags';
import { resetLimitNudge } from '../plan/useLimitNudge';
import { reportAllowance, resetAllowance } from '../state/allowance';
import { openDialog, resetDialog } from '../state/dialog';
import { reportIdentity, resetIdentity } from '../state/identity';
import { resetRoster, useRosterVersion } from '../state/roster';
import { chat } from '../test/harness';
import { Dialogs } from '../ui/Dialogs';
import type { Billing, PlanOffer } from '../api/types';

/**
 * Billing as a reader meets it: the account sheet saying when Paid renews or
 * ends, the way to Stripe's billing page, the wait for a payment to land, and
 * a checkout refused because Stripe already has one.
 */

const PAID: Billing = {
	plan: 'paid',
	manageable: true,
	subscription: {
		status: 'active',
		renews_at: '2026-10-21T12:00:00.000Z',
		ends_at: null,
	},
};

const PLANS: PlanOffer[] = [
	{
		id: 'free',
		turns_per_month: 13,
		turns_per_week: 3,
		models: [],
		page_scans: false,
		price: null,
	},
	{
		id: 'paid',
		turns_per_month: 108,
		turns_per_week: 25,
		models: [],
		page_scans: true,
		price: { amount_cents: 2000, currency: 'usd', interval: 'month' },
	},
];

interface Answers {
	billing?: () => { status: number; body: unknown };
	portal?: { status: number; body: unknown };
	checkout?: { status: number; body: unknown };
}

let calls: string[];

function server(answers: Answers) {
	calls = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init?: RequestInit) => {
			calls.push(`${init?.method ?? 'GET'} ${url}`);
			const json = (reply: { status: number; body: unknown }) =>
				new Response(JSON.stringify(reply.body), {
					status: reply.status,
				});
			if (url === '/api/plans')
				return json({ status: 200, body: { plans: PLANS } });
			if (url === '/api/billing' && answers.billing)
				return json(answers.billing());
			if (url === '/api/billing/portal' && answers.portal)
				return json(answers.portal);
			if (url === '/api/billing/checkout' && answers.checkout)
				return json(answers.checkout);
			return new Response(null, { status: 204 });
		})
	);
}

/** What the roster provider would read, so a test can see it asked again. */
let rosterAsks: number[] = [];
function RosterWatch() {
	rosterAsks.push(useRosterVersion());
	return null;
}

function app() {
	render(
		<FlagContext
			value={{
				flags: {
					...DEFAULT_FLAGS,
					isPlanLimitShown: true,
					isAccountShown: true,
				},
				loading: false,
			}}
		>
			<ChatContext value={chat({ atHome: true })}>
				<RosterWatch />
				<Dialogs />
			</ChatContext>
		</FlagContext>
	);
}

const reader = (plan: 'free' | 'paid') => {
	reportIdentity({
		id: 'u1',
		email: 'reader@example.test',
		name: null,
		role: 'member',
		plan,
	});
	reportAllowance({
		plan,
		used: 3,
		limit: plan === 'paid' ? 150 : 20,
		resets_at: '2026-10-01T00:00:00.000Z',
	});
};

beforeEach(() => {
	resetAllowance();
	resetIdentity();
	resetLimitNudge();
	resetDialog();
	forgetPlans();
	resetRoster();
	rosterAsks = [];
});

afterEach(() => {
	vi.useRealTimers();
});

describe('the account sheet, on Paid', () => {
	it('says when Paid renews', async () => {
		reader('paid');
		server({ billing: () => ({ status: 200, body: { billing: PAID } }) });
		app();
		act(() => openDialog('account'));

		expect(
			await screen.findByText(
				COPY.account.renews(PAID.subscription!.renews_at!)
			)
		).toBeTruthy();
	});

	it('says when a cancelled plan ends, and that Free follows', async () => {
		reader('paid');
		const ending: Billing = {
			...PAID,
			subscription: {
				status: 'active',
				renews_at: null,
				ends_at: '2026-10-21T12:00:00.000Z',
			},
		};
		server({ billing: () => ({ status: 200, body: { billing: ending } }) });
		app();
		act(() => openDialog('account'));

		expect(await screen.findByText(/Pro until .*, then Free/)).toBeTruthy();
	});

	it('says plainly when a payment did not go through', async () => {
		reader('paid');
		const late: Billing = {
			...PAID,
			subscription: { ...PAID.subscription!, status: 'past_due' },
		};
		server({ billing: () => ({ status: 200, body: { billing: late } }) });
		app();
		act(() => openDialog('account'));

		expect(await screen.findByText(COPY.account.pastDue)).toBeTruthy();
	});

	it('goes to Stripe’s billing page on the press', async () => {
		reader('paid');
		server({
			billing: () => ({ status: 200, body: { billing: PAID } }),
			portal: {
				status: 200,
				body: { url: 'https://billing.stripe.test/p' },
			},
		});
		const assign = vi.fn();
		vi.stubGlobal('location', { ...window.location, assign });
		app();
		act(() => openDialog('account'));

		fireEvent.click(
			await screen.findByRole('button', { name: COPY.account.manage })
		);
		await waitFor(() =>
			expect(assign).toHaveBeenCalledWith('https://billing.stripe.test/p')
		);
		expect(calls).toContain('POST /api/billing/portal');
	});

	it('says so when the billing page cannot be opened', async () => {
		reader('paid');
		server({
			billing: () => ({ status: 200, body: { billing: PAID } }),
			portal: { status: 500, body: { error: 'down' } },
		});
		app();
		act(() => openDialog('account'));

		fireEvent.click(
			await screen.findByRole('button', { name: COPY.account.manage })
		);
		expect((await screen.findByRole('alert')).textContent).toBe(
			COPY.account.manageFailed
		);
	});

	// Back from cancelling or resubscribing, the tab may be a plan behind.
	it('asks for the roster again when billing says another plan', async () => {
		reader('free');
		server({ billing: () => ({ status: 200, body: { billing: PAID } }) });
		app();
		act(() => openDialog('account'));

		await waitFor(() => expect(Math.max(...rosterAsks)).toBe(1));
	});
});

describe('the account sheet, on Free', () => {
	it('offers no billing page to someone who has never paid', async () => {
		reader('free');
		server({
			billing: () => ({
				status: 200,
				body: {
					billing: {
						plan: 'free',
						manageable: false,
						subscription: null,
					},
				},
			}),
		});
		app();
		act(() => openDialog('account'));

		await waitFor(() => expect(calls).toContain('GET /api/billing'));
		expect(
			screen.queryByRole('button', { name: COPY.account.manage })
		).toBeNull();
	});
});

describe('back from paying', () => {
	it('waits for Paid to land, then says so and refreshes the roster', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		reader('free');
		let asked = 0;
		server({
			billing: () => {
				asked += 1;
				return {
					status: 200,
					body: {
						billing:
							asked < 3
								? {
										plan: 'free',
										manageable: true,
										subscription: null,
									}
								: PAID,
					},
				};
			},
		});
		app();
		act(() => openDialog('upgraded'));
		expect(screen.getByRole('status').textContent).toBe(
			COPY.upgraded.pending
		);

		await act(async () => {
			await vi.advanceTimersByTimeAsync(7000);
		});
		expect(screen.getByRole('status').textContent).toBe(
			COPY.upgraded.arrived
		);
		expect(Math.max(...rosterAsks)).toBe(1);
	});

	it('says the wait is long, and where to write, past thirty seconds', async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		reader('free');
		server({
			billing: () => ({
				status: 200,
				body: {
					billing: {
						plan: 'free',
						manageable: true,
						subscription: null,
					},
				},
			}),
		});
		app();
		act(() => openDialog('upgraded'));

		await act(async () => {
			await vi.advanceTimersByTimeAsync(32_000);
		});
		expect(screen.getByRole('status').textContent).toBe(COPY.upgraded.slow);
		expect(COPY.upgraded.slow).toContain('support@socialeating.studio');
	});
});

describe('a checkout Stripe already has', () => {
	it('says nothing more was charged, and will not try again', async () => {
		reader('free');
		server({
			checkout: {
				status: 409,
				body: { error: 'x', code: 'ALREADY_PAID' },
			},
		});
		app();
		act(() => openDialog('checkout'));
		// The button is there before the plans are, and disabled until they are.
		await screen.findByText(COPY.checkout.perWeek(25));

		fireEvent.click(
			await screen.findByRole('button', { name: COPY.checkout.pay })
		);
		expect(await screen.findByText(COPY.checkout.alreadyPaid)).toBeTruthy();
		expect(
			screen
				.getByRole('button', { name: COPY.checkout.pay })
				.hasAttribute('disabled')
		).toBe(true);
		expect(Math.max(...rosterAsks)).toBe(1);
	});
});
