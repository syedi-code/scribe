import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COPY } from '../copy';
import { forgetPlans } from '../api/billing';
import { ChatContext } from '../chat/context';
import { chat } from '../test/harness';
import { FlagContext } from '../flags/context';
import { DEFAULT_FLAGS } from '../flags/flags';
import { readDialog, resetDialog } from '../state/dialog';
import { reportIdentity, resetIdentity } from '../state/identity';
import { reportStanding, type Standing } from '../state/visitor';
import { Dialogs } from '../ui/Dialogs';
import { PlansPanel } from './PlansPanel';
import type { PlanOffer } from '../api/types';

/**
 * The Plans tab offers a way on to everyone who can take it. A visitor on a
 * phone — not yet signed in — found Pro described and no button under it:
 * the button was only for accounts, and nothing stood in its place.
 */

const MODEL = { id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna', provider: 'openai' };
const PLANS: PlanOffer[] = [
	{
		id: 'free',
		turns_per_month: 13,
		turns_per_week: 3,
		models: [MODEL],
		page_scans: false,
		price: null,
	},
	{
		id: 'paid',
		turns_per_month: 108,
		turns_per_week: 25,
		models: [MODEL],
		page_scans: true,
		price: { amount_cents: 2000, currency: 'usd', interval: 'month' },
	},
];

const MEMBER = {
	id: 'u1',
	email: 'reader@example.test',
	name: null,
	role: 'member' as const,
	plan: 'free' as const,
};

beforeEach(() => {
	resetIdentity();
	resetDialog();
	forgetPlans();
	reportStanding('account');
	window.history.replaceState(null, '', '/');
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string) =>
			url === '/api/plans'
				? new Response(JSON.stringify({ plans: PLANS }))
				: new Response(null, { status: 204 })
		)
	);
});

afterEach(() => vi.unstubAllGlobals());

function tab() {
	render(
		<FlagContext value={{ flags: DEFAULT_FLAGS, loading: false }}>
			<ChatContext value={chat({ atHome: true })}>
				<PlansPanel />
				<Dialogs />
			</ChatContext>
		</FlagContext>
	);
}

const getPro = () =>
	screen.findByRole('button', { name: COPY.plan.plans.choose });

describe('the Plans tab', () => {
	it('takes a signed-in reader on Free to checkout', async () => {
		reportIdentity(MEMBER);
		tab();
		fireEvent.click(await getPro());
		expect(readDialog()).toBe('checkout');
	});

	it.each<[string, Standing, boolean]>([
		['a guest', 'guest', true],
		['a visitor with no session', 'none', false],
	])(
		'offers %s Pro by way of signing in, and back to the plans',
		async (_who, standing, hasGuestSession) => {
			reportStanding(standing);
			if (hasGuestSession) reportIdentity({ ...MEMBER, guest: true });
			tab();

			fireEvent.click(await getPro());
			expect(readDialog()).toBe('signin');
			expect(
				screen.getByText(COPY.visitor.dialog.lead.plans)
			).toBeTruthy();
			expect(
				screen
					.getByRole('link', { name: COPY.visitor.dialog.github })
					.getAttribute('href')
			).toBe(`/login/github?next=${encodeURIComponent('/#plans')}`);
		}
	);

	it('does not call a visitor’s allowance a plan', async () => {
		reportStanding('guest');
		reportIdentity({ ...MEMBER, guest: true });
		tab();
		await getPro();
		expect(screen.queryByText(COPY.plan.plans.current)).toBeNull();
	});

	it('offers nothing to a reader already on Pro', async () => {
		reportIdentity({ ...MEMBER, plan: 'paid' });
		tab();
		await act(async () => {});
		await screen.findByText(COPY.plan.plans.current);
		expect(
			screen.queryByRole('button', { name: COPY.plan.plans.choose })
		).toBeNull();
	});
});
