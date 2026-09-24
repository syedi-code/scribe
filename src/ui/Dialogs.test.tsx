import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COPY } from '../copy';
import { AccountMenu } from '../account/AccountMenu';
import { forgetPlans } from '../api/billing';
import { ChatContext, type ChatState } from '../chat/context';
import { FlagContext } from '../flags/context';
import { DEFAULT_FLAGS, type Flags } from '../flags/flags';
import { resetLimitNudge } from '../plan/useLimitNudge';
import { reportAllowance, resetAllowance } from '../state/allowance';
import { openDialog, readDialog, resetDialog } from '../state/dialog';
import { reportIdentity, resetIdentity } from '../state/identity';
import { chat } from '../test/harness';
import { Dialogs } from './Dialogs';
import type { Allowance, PlanOffer } from '../api/types';

const month = (used: number, limit: number | null = 5): Allowance => ({
	plan: 'free',
	used,
	limit,
	resets_at: '2026-10-01T00:00:00.000Z',
});

const MEMBER = {
	id: 'u1',
	email: 'reader@example.test',
	name: null,
	role: 'member' as const,
};

const PLANS: PlanOffer[] = [
	{
		id: 'free',
		turns_per_month: 13,
		turns_per_week: 3,
		models: [
			{ id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna', provider: 'openai' },
		],
		page_scans: false,
		price: null,
	},
	{
		id: 'paid',
		turns_per_month: 108,
		turns_per_week: 25,
		models: [
			{ id: 'gpt-5.6-luna', label: 'GPT-5.6 Luna', provider: 'openai' },
			{
				id: 'claude-sonnet-5',
				label: 'Claude Sonnet 5',
				provider: 'anthropic',
			},
		],
		page_scans: true,
		price: null,
	},
];

/** alexandria, as far as these dialogs ask it anything. */
function server(checkout: { status: number; body: unknown }) {
	const calls: string[] = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init?: RequestInit) => {
			calls.push(`${init?.method ?? 'GET'} ${url}`);
			if (url === '/api/plans')
				return new Response(JSON.stringify({ plans: PLANS }));
			if (url === '/api/billing/checkout')
				return new Response(JSON.stringify(checkout.body), {
					status: checkout.status,
				});
			return new Response(null, { status: 204 });
		})
	);
	return calls;
}

function app(state: Partial<ChatState> = {}, flags: Partial<Flags> = {}) {
	const tree = (over: Partial<ChatState>) => (
		<FlagContext
			value={{
				flags: {
					...DEFAULT_FLAGS,
					isPlanLimitShown: true,
					isAccountShown: true,
					...flags,
				},
				loading: false,
			}}
		>
			<ChatContext value={chat({ atHome: false, ...state, ...over })}>
				<AccountMenu />
				<Dialogs />
			</ChatContext>
		</FlagContext>
	);
	const view = render(tree({}));
	return {
		rerender: (over: Partial<ChatState>) => view.rerender(tree(over)),
	};
}

const dialog = () => screen.queryByRole('dialog');
const press = (name: string) =>
	fireEvent.click(screen.getByRole('button', { name }));

beforeEach(() => {
	resetAllowance();
	resetIdentity();
	resetLimitNudge();
	resetDialog();
	forgetPlans();
	reportIdentity(MEMBER);
	server({ status: 501, body: { code: 'CHECKOUT_NOT_OPEN' } });
});

afterEach(() => vi.unstubAllGlobals());

describe('the limit, raised inside a conversation', () => {
	it('is raised once two questions are left, as a count and a date', () => {
		reportAllowance(month(3));
		app();
		expect(dialog()?.textContent).toContain('2 questions left this week');
		expect(dialog()?.textContent).toContain('Resets');
	});

	it('is not raised while there is room', () => {
		reportAllowance(month(1));
		app();
		expect(dialog()).toBeNull();
	});

	it('waits for the answer to finish', () => {
		reportAllowance(month(3));
		const view = app({ busy: true });
		expect(dialog()).toBeNull();
		view.rerender({ busy: false });
		expect(dialog()).not.toBeNull();
	});

	it('is not raised on the home screen, which says it without a dialog', () => {
		reportAllowance(month(5));
		app({ atHome: true });
		expect(dialog()).toBeNull();
	});

	it('is not raised while the flag is off', () => {
		reportAllowance(month(5));
		app({}, { isPlanLimitShown: false });
		expect(dialog()).toBeNull();
	});

	it('is raised once a month for each moment, not after every answer', async () => {
		reportAllowance(month(3));
		app();
		press(COPY.plan.nudge.later);
		await waitFor(() => expect(dialog()).toBeNull());

		act(() => reportAllowance(month(4)));
		expect(dialog()).toBeNull();

		act(() => reportAllowance(month(5)));
		expect(dialog()?.textContent).toContain(COPY.plan.nudge.spent);
	});

	it('hands over to the plans without the plans being shut behind it', async () => {
		reportAllowance(month(5));
		app();
		press(COPY.plan.see);
		expect(
			await screen.findByRole('button', { name: COPY.plan.plans.choose })
		).toBeTruthy();
		expect(readDialog()).toBe('plans');
	});
});

describe('a modal and the back button', () => {
	it('has an address, so the plans can be linked to', () => {
		app({ atHome: true });
		act(() => openDialog('plans'));
		expect(window.location.hash).toBe('#plans');
	});

	it('is put away by going back, as a sheet is on a phone', async () => {
		app({ atHome: true });
		act(() => openDialog('plans'));
		act(() => window.history.back());
		await waitFor(() => expect(readDialog()).toBeNull());
		expect(window.location.hash).toBe('');
	});

	it('closes all the way, not back to the one underneath', async () => {
		reportAllowance(month(2));
		app({ atHome: true });
		act(() => openDialog('plans'));
		act(() => openDialog('checkout'));
		fireEvent(dialog()!, new Event('cancel', { cancelable: true }));
		await waitFor(() => expect(readDialog()).toBeNull());
		expect(window.location.hash).toBe('');
	});

	it('steps back from checkout to the plans', async () => {
		app({ atHome: true });
		act(() => openDialog('plans'));
		act(() => openDialog('checkout'));
		press(COPY.dialog.back);
		await waitFor(() => expect(readDialog()).toBe('plans'));
	});
});

describe('the plans', () => {
	it('says Pro as a multiple of Free, and names the tiers', async () => {
		reportAllowance(month(2));
		app({ atHome: true });
		act(() => openDialog('plans'));
		const paid = await screen.findByRole('region', {
			name: COPY.plan.plans.paid,
		});
		// 25 against 3: the ratio is said, the allowance never is. It is
		// tuned week to week, and a number here would be a broken promise.
		expect(paid.textContent).toContain('About 8 times as many');
		expect(dialog()?.textContent).not.toMatch(/\b(25|3) (a|questions)/);
		expect(dialog()?.textContent).not.toContain('108');
		// The card sells the tier the switcher offers, never the model
		// underneath it, or the abstraction leaks where it matters most.
		expect(paid.textContent).toContain('Omega');
		expect(paid.textContent).not.toContain('Sonnet');
		const free = screen.getByRole('region', { name: COPY.plan.plans.free });
		expect(free.textContent).toContain(COPY.plan.plans.current);
	});

	it('says the allowance as a multiple at checkout too', async () => {
		app({ atHome: true });
		act(() => openDialog('checkout'));
		await screen.findByText(COPY.checkout.perWeek(8));
		expect(dialog()?.textContent).not.toMatch(/\b25\b/);
	});

	it('says what each plan shows behind a quotation', async () => {
		app({ atHome: true });
		act(() => openDialog('plans'));
		const paid = await screen.findByRole('region', {
			name: COPY.plan.plans.paid,
		});
		expect(paid.textContent).toContain(COPY.plan.plans.sourceScan);
		const free = screen.getByRole('region', { name: COPY.plan.plans.free });
		expect(free.textContent).toContain(COPY.plan.plans.sourceText);
	});

	it('never shows a price it has not been given', async () => {
		app({ atHome: true });
		act(() => openDialog('plans'));
		const paid = await screen.findByRole('region', {
			name: COPY.plan.plans.paid,
		});
		expect(paid.textContent).toContain(COPY.plan.plans.priceLater);
		expect(paid.textContent).not.toMatch(/\$/);
	});

	it('shows its terms beside the button, not behind it', async () => {
		app({ atHome: true });
		act(() => openDialog('plans'));
		await screen.findByRole('button', { name: COPY.plan.plans.choose });
		expect(dialog()?.textContent).toContain(COPY.plan.plans.terms);
	});
});

describe('checkout', () => {
	it('says plainly that nothing was charged while payments are closed', async () => {
		const calls = server({
			status: 501,
			body: { code: 'CHECKOUT_NOT_OPEN' },
		});
		app({ atHome: true });
		act(() => openDialog('checkout'));
		await screen.findByText(COPY.checkout.perWeek(8));
		press(COPY.checkout.pay);
		expect(await screen.findByRole('status')).toBeTruthy();
		expect(screen.getByRole('status').textContent).toBe(
			COPY.checkout.notOpen
		);
		expect(calls).toContain('POST /api/billing/checkout');
	});

	it('goes to the payment page alexandria names', async () => {
		server({
			status: 200,
			body: { url: 'https://checkout.stripe.test/x' },
		});
		const assign = vi.fn();
		vi.stubGlobal('location', { ...window.location, assign });
		app({ atHome: true });
		act(() => openDialog('checkout'));
		await screen.findByText(COPY.checkout.perWeek(8));
		press(COPY.checkout.pay);
		await waitFor(() =>
			expect(assign).toHaveBeenCalledWith(
				'https://checkout.stripe.test/x'
			)
		);
	});

	it('welcomes a reader back from paying, once', () => {
		window.history.replaceState(null, '', '/?checkout=done');
		app({ atHome: true });
		expect(readDialog()).toBe('upgraded');
		expect(window.location.search).toBe('');
	});
});

describe('the account', () => {
	const openMenu = () => press(COPY.account.open);

	it('says the plan on the button, before anyone presses it', () => {
		reportAllowance(month(2));
		app({ atHome: true });
		expect(
			screen.getByRole('button', { name: COPY.account.open }).textContent
		).toContain(COPY.plan.plans.free);
	});

	it('says who is signed in, and no count while plenty is left', () => {
		reportAllowance(month(2));
		app({ atHome: true });
		openMenu();
		const menu = screen.getByRole('menu');
		expect(menu.textContent).toContain(MEMBER.email);
		expect(menu.textContent).toContain('Free');
		expect(menu.textContent).not.toContain('left this week');
	});

	it('says what is left from the menu once only a few are', () => {
		reportAllowance(month(3));
		app({ atHome: true });
		openMenu();
		expect(screen.getByRole('menu').textContent).toContain(
			'Free · 2 left this week'
		);
	});

	it('measures the week on the account sheet, never as a count of it', () => {
		reportAllowance(month(2, 10));
		app({ atHome: true });
		openMenu();
		fireEvent.click(
			screen.getByRole('menuitem', { name: COPY.account.menu })
		);
		expect(dialog()?.textContent).toContain(MEMBER.email);
		expect(dialog()?.textContent).toContain(COPY.account.plenty);
		expect(dialog()?.textContent).not.toMatch(/\b10\b/);
		const meter = screen.getByRole('meter');
		expect(meter.getAttribute('aria-valuenow')).toBe('20');
		expect(meter.getAttribute('aria-valuemax')).toBe('100');
		expect(meter.getAttribute('aria-valuetext')).toBe(COPY.account.plenty);
	});

	it('names the admin as the admin, and offers them nothing', () => {
		reportIdentity({ ...MEMBER, role: 'admin' });
		reportAllowance(month(40, null));
		app({ atHome: true });
		openMenu();
		expect(screen.getByRole('menu').textContent).toContain(
			COPY.account.admin
		);
		expect(
			screen.queryByRole('menuitem', { name: COPY.plan.see })
		).toBeNull();
		act(() => openDialog('account'));
		expect(dialog()?.textContent).toContain(COPY.account.unlimited);
	});

	it('ends the session in alexandria before it leaves through Access', async () => {
		const calls = server({ status: 501, body: {} });
		const assign = vi.fn();
		vi.stubGlobal('location', { ...window.location, assign });

		app({ atHome: true });
		openMenu();
		fireEvent.click(
			screen.getByRole('menuitem', { name: COPY.account.signOut })
		);
		await act(async () => {});

		expect(calls).toEqual(['DELETE /api/session']);
		expect(assign).toHaveBeenCalledWith('/cdn-cgi/access/logout');
	});
});
