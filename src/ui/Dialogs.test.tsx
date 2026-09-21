import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COPY } from '../copy';
import { AccountMenu } from '../account/AccountMenu';
import { ChatContext, type ChatState } from '../chat/context';
import { FlagContext } from '../flags/context';
import { DEFAULT_FLAGS, type Flags } from '../flags/flags';
import { resetLimitNudge } from '../plan/useLimitNudge';
import { reportAllowance, resetAllowance } from '../state/allowance';
import { closeDialog, openDialog } from '../state/dialog';
import { reportIdentity, resetIdentity } from '../state/identity';
import { chat } from '../test/harness';
import { Dialogs } from './Dialogs';
import type { Allowance } from '../api/types';

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

beforeEach(() => {
	resetAllowance();
	resetIdentity();
	resetLimitNudge();
	closeDialog();
	reportIdentity(MEMBER);
});

afterEach(() => vi.unstubAllGlobals());

describe('the limit, raised inside a conversation', () => {
	it('is raised once two questions are left', () => {
		reportAllowance(month(3));
		app();
		expect(dialog()?.textContent).toMatch(/2 questions left this month/);
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

	it('is raised once a month for each moment, not after every answer', () => {
		reportAllowance(month(3));
		app();
		fireEvent.click(
			screen.getByRole('button', { name: COPY.plan.nudge.later })
		);
		expect(dialog()).toBeNull();

		act(() => reportAllowance(month(4)));
		expect(dialog()).toBeNull();

		act(() => reportAllowance(month(5)));
		expect(dialog()?.textContent).toContain(COPY.plan.nudge.spent);
	});

	it('hands over to the plans without the plans being shut behind it', async () => {
		reportAllowance(month(5));
		app();
		fireEvent.click(screen.getByRole('button', { name: COPY.plan.see }));
		await act(async () => {});
		expect(dialog()?.textContent).toContain(COPY.plan.plans.note);
	});

	it('closes on Escape', () => {
		reportAllowance(month(5));
		app();
		fireEvent(dialog()!, new Event('cancel', { cancelable: true }));
		expect(dialog()).toBeNull();
	});
});

describe('the plans', () => {
	it('marks the plan the reader is on, and cannot take money yet', () => {
		reportAllowance(month(2));
		app({ atHome: true });
		act(() => openDialog('plans'));
		const sheet = dialog()!;
		expect(sheet.textContent).toContain('5 questions a month');
		expect(sheet.textContent).toContain(COPY.plan.plans.current);
		const choose = screen.getByRole('button', {
			name: COPY.plan.plans.choose,
		}) as HTMLButtonElement;
		expect(choose.disabled).toBe(true);
	});
});

describe('the account', () => {
	const openMenu = () =>
		fireEvent.click(
			screen.getByRole('button', { name: COPY.account.open })
		);

	it('says who is signed in and what they have left, from the menu', () => {
		reportAllowance(month(2));
		app({ atHome: true });
		openMenu();
		const menu = screen.getByRole('menu');
		expect(menu.textContent).toContain(MEMBER.email);
		expect(menu.textContent).toContain('Free · 3 left this month');
	});

	it('opens the account sheet with the month measured', () => {
		reportAllowance(month(2));
		app({ atHome: true });
		openMenu();
		fireEvent.click(
			screen.getByRole('menuitem', { name: COPY.account.menu })
		);
		expect(dialog()?.textContent).toContain(MEMBER.email);
		expect(dialog()?.textContent).toContain('2 of 5 questions');
		expect(screen.getByRole('meter').getAttribute('aria-valuenow')).toBe(
			'2'
		);
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
		const calls: string[] = [];
		vi.stubGlobal(
			'fetch',
			vi.fn(async (url: string, init?: RequestInit) => {
				calls.push(`${init?.method} ${url}`);
				return new Response(null, { status: 204 });
			})
		);
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
