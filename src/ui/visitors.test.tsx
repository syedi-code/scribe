import {
	act,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { COPY } from '../copy';
import { ModelContext } from '../models/context';
import { ChatContext } from '../chat/context';
import { refuseSpentMonth } from '../chat/refusal';
import { FlagContext } from '../flags/context';
import { DEFAULT_FLAGS, type Flags } from '../flags/flags';
import { safeNext } from '../lib/safeNext';
import { resetLimitNudge } from '../plan/useLimitNudge';
import { VisitorNotice } from '../plan/VisitorNotice';
import { reportAllowance, resetAllowance } from '../state/allowance';
import { readDialog, resetDialog } from '../state/dialog';
import { keepDraftForSignIn, setDraft } from '../state/draft';
import { resetIdentity } from '../state/identity';
import { readStanding, reportStanding } from '../state/visitor';
import { chat, models } from '../test/harness';
import { AccountCorner } from '../account/AccountCorner';
import { Dialogs } from './Dialogs';
import { openReader } from './openReader';
import type { Allowance } from '../api/types';

/**
 * A visitor before signing in (scribe#38): let in as a guest past Turnstile,
 * or to look without one; told how many questions they have; asked to sign
 * in, in our own dialog, when they are spent; and sent back only to our own
 * pages when they have.
 */

vi.mock('../api/turnstile', () => ({
	turnstileToken: vi.fn(async () => 'a-token'),
}));
const { turnstileToken } = await import('../api/turnstile');

type Reply = { status: number; body?: unknown };
let replies: Record<string, Reply | (() => Reply)>;
let calls: string[];

function server() {
	calls = [];
	vi.stubGlobal(
		'fetch',
		vi.fn(async (url: string, init?: RequestInit) => {
			const key = `${init?.method ?? 'GET'} ${url}`;
			calls.push(key);
			const found = replies[key];
			const reply = typeof found === 'function' ? found() : found;
			if (!reply) return new Response(null, { status: 204 });
			return new Response(
				reply.body === undefined ? null : JSON.stringify(reply.body),
				{ status: reply.status }
			);
		})
	);
}

const GUEST = {
	id: 'guest-1',
	email: 'guest-1@guest.invalid',
	name: null,
	role: 'member' as const,
	plan: 'free' as const,
	guest: true,
};

const visitor = (used: number): Allowance => ({
	plan: 'free',
	guest: true,
	used,
	limit: 3,
	resets_at: null,
});

beforeEach(() => {
	resetAllowance();
	resetIdentity();
	resetDialog();
	resetLimitNudge();
	reportStanding('account');
	setDraft('');
	sessionStorage.clear();
	replies = {};
	server();
	vi.mocked(turnstileToken).mockClear();
	vi.mocked(turnstileToken).mockResolvedValue('a-token');
});

afterEach(() => {
	vi.unstubAllGlobals();
});

const slot = () => document.body;

describe('safeNext', () => {
	const origin = 'https://scribe.socialeating.studio';

	it('keeps a path on this site, with its query and hash', () => {
		expect(safeNext('/?q=kant#plans', origin)).toBe('/?q=kant#plans');
		expect(safeNext('/books', origin)).toBe('/books');
	});

	it.each([
		['https://evil.example/', 'another site'],
		['//evil.example/', 'a protocol-relative address'],
		['/\\evil.example', 'a backslash browsers read as a slash'],
		['javascript:alert(1)', 'a script'],
		['/login/github', 'the login route itself, which would loop'],
		['', 'nothing'],
		[null, 'no next at all'],
	])('sends %s home (%s)', (next: string | null, _why: string) => {
		expect(safeNext(next, origin)).toBe('/');
	});
});

describe('openReader', () => {
	it('answers a signed-in reader as an account', async () => {
		replies['POST /api/session'] = { status: 200, body: {} };
		replies['GET /api/me'] = {
			status: 200,
			body: { user: { ...GUEST, guest: false } },
		};
		expect(await openReader(async () => true, slot)).toBe('account');
		expect(turnstileToken).not.toHaveBeenCalled();
	});

	it('answers a guest from earlier as a guest, without Turnstile again', async () => {
		replies['POST /api/session'] = { status: 200, body: {} };
		replies['GET /api/me'] = { status: 200, body: { user: GUEST } };
		expect(await openReader(async () => true, slot)).toBe('guest');
		expect(turnstileToken).not.toHaveBeenCalled();
	});

	it('with visitor mode off, no session is the failure it always was', async () => {
		replies['POST /api/session'] = { status: 401, body: { error: 'no' } };
		await expect(openReader(async () => false, slot)).rejects.toThrow();
		expect(calls).not.toContain('POST /api/session/guest');
	});

	it('makes a visitor a guest past Turnstile', async () => {
		replies['POST /api/session'] = { status: 401, body: {} };
		replies['GET /api/visitor'] = {
			status: 200,
			body: { turnstile_site_key: 'site-key' },
		};
		replies['POST /api/session/guest'] = { status: 201, body: {} };
		replies['GET /api/me'] = { status: 200, body: { user: GUEST } };

		expect(await openReader(async () => true, slot)).toBe('guest');
		expect(turnstileToken).toHaveBeenCalledWith('site-key', document.body);
		expect(readStanding()).toBe('guest');
	});

	it.each([
		[
			'there is no site key yet',
			() => {
				replies['GET /api/visitor'] = {
					status: 200,
					body: { turnstile_site_key: null },
				};
			},
		],
		[
			'Turnstile refuses',
			() => {
				replies['GET /api/visitor'] = {
					status: 200,
					body: { turnstile_site_key: 'k' },
				};
				vi.mocked(turnstileToken).mockRejectedValueOnce(
					new Error('refused')
				);
			},
		],
		[
			'the address has made too many guests today',
			() => {
				replies['GET /api/visitor'] = {
					status: 200,
					body: { turnstile_site_key: 'k' },
				};
				replies['POST /api/session/guest'] = {
					status: 429,
					body: { code: 'GUEST_LIMIT_REACHED' },
				};
			},
		],
	])('lets a visitor in to look when %s', async (_, arrange) => {
		replies['POST /api/session'] = { status: 401, body: {} };
		arrange();
		expect(await openReader(async () => true, slot)).toBe('none');
	});

	it('does not treat a server failure as being signed out', async () => {
		replies['POST /api/session'] = { status: 500, body: {} };
		await expect(openReader(async () => true, slot)).rejects.toThrow();
	});
});

function app(flags: Partial<Flags> = {}) {
	render(
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
			<ChatContext value={chat({ atHome: true })}>
				<AccountCorner />
				<Dialogs />
			</ChatContext>
		</FlagContext>
	);
}

describe('the sign-in dialog', () => {
	it('is where a visitor’s corner leads', () => {
		reportStanding('guest');
		app();
		fireEvent.click(
			screen.getByRole('button', { name: COPY.visitor.signIn })
		);
		expect(readDialog()).toBe('signin');
		expect(screen.getByText(COPY.visitor.dialog.lead.chosen)).toBeTruthy();
	});

	it('links straight to GitHub’s sign-in, coming back here', () => {
		window.history.replaceState(null, '', '/?from=test');
		reportStanding('guest');
		app();
		fireEvent.click(
			screen.getByRole('button', { name: COPY.visitor.signIn })
		);

		const github = screen.getByRole('link', {
			name: COPY.visitor.dialog.github,
		});
		expect(github.getAttribute('href')).toBe(
			`/login/github?next=${encodeURIComponent('/?from=test')}`
		);
		// Google waits for its own Access app.
		expect(
			screen.queryByRole('link', { name: COPY.visitor.dialog.google })
		).toBeNull();
	});

	it('offers Google once its flag is on', () => {
		reportStanding('guest');
		app({ isGoogleSignInShown: true });
		fireEvent.click(
			screen.getByRole('button', { name: COPY.visitor.signIn })
		);
		expect(
			screen.getByRole('link', { name: COPY.visitor.dialog.google })
		).toBeTruthy();
	});

	it('keeps what was typed for the return', () => {
		setDraft('  Where does Kant say it?  ');
		keepDraftForSignIn();
		expect(sessionStorage.getItem('scribe:draft-across-sign-in')).toBe(
			'Where does Kant say it?'
		);
	});

	it('shows a signed-in reader their menu, not a sign-in', () => {
		reportStanding('account');
		app();
		expect(
			screen.queryByRole('button', { name: COPY.visitor.signIn })
		).toBeNull();
		expect(
			screen.getByRole('button', { name: COPY.account.open })
		).toBeTruthy();
	});
});

describe('what a visitor is told', () => {
	const notice = (allowance: Allowance) => {
		reportAllowance(allowance);
		render(<VisitorNotice allowance={allowance} />);
	};

	it('says what is on offer before the first question, not a count', () => {
		notice(visitor(0));
		expect(screen.getByText(COPY.visitor.allowance(3))).toBeTruthy();
		expect(screen.queryByRole('status')).toBeNull();
	});

	it('counts only once one is left', () => {
		notice(visitor(2));
		expect(screen.getByRole('status').textContent).toContain(
			COPY.visitor.lastOne
		);
	});

	it('spent, says why the composer closed, and opens the sign-in', () => {
		notice(visitor(3));
		expect(screen.getByText(COPY.visitor.spent)).toBeTruthy();
		fireEvent.click(
			screen.getByRole('button', { name: COPY.visitor.signIn })
		);
		expect(readDialog()).toBe('signin');
	});
});

describe('a visitor’s refused question', () => {
	it('opens the sign-in dialog rather than showing a plan', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					new Response(
						JSON.stringify({
							code: 'SIGN_IN_REQUIRED',
							allowance: visitor(3),
						}),
						{ status: 402 }
					)
			)
		);
		await expect(
			refuseSpentMonth('/api/conversations/c/chat')
		).rejects.toThrow(COPY.visitor.refused);
		expect(readDialog()).toBe('signin');
	});

	it('still says a month is spent for a reader who is signed in', async () => {
		vi.stubGlobal(
			'fetch',
			vi.fn(
				async () =>
					new Response(
						JSON.stringify({ code: 'TURN_LIMIT_REACHED' }),
						{ status: 402 }
					)
			)
		);
		await expect(
			refuseSpentMonth('/api/conversations/c/chat')
		).rejects.toThrow(COPY.plan.refused);
		await waitFor(() => expect(readDialog()).toBeNull());
	});
});

describe('a visitor we could not let in', () => {
	it('keeps the question and asks them to sign in', async () => {
		const { Composer } = await import('../ask/Composer');
		reportStanding('none');
		const ask = vi.fn();
		render(
			<FlagContext value={{ flags: DEFAULT_FLAGS, loading: false }}>
				<ModelContext value={models}>
					<ChatContext value={chat({ atHome: true, ask })}>
						<Composer />
					</ChatContext>
				</ModelContext>
			</FlagContext>
		);
		const field = screen.getByRole('textbox');
		fireEvent.change(field, {
			target: { value: 'What is the will to power?' },
		});
		act(() => {
			fireEvent.keyDown(field, { key: 'Enter' });
		});

		expect(ask).not.toHaveBeenCalled();
		expect(readDialog()).toBe('signin');
		expect((field as HTMLTextAreaElement).value).toBe(
			'What is the will to power?'
		);
	});
});
