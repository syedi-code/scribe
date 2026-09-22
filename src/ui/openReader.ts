import { api, ApiError, openGuestSession, openSession } from '../api/client';
import { turnstileToken } from '../api/turnstile';
import { reportIdentity } from '../state/identity';
import { reportStanding, type Standing } from '../state/visitor';
import type { VisitorConfig } from '../flags/visitor';

/**
 * Open whatever session this reader can have, and say which it was.
 *
 * A reader with a session — signed in, or a guest from earlier — is answered
 * by `POST /session`. Without one, and with visitor mode on, the visitor is
 * made a guest past Turnstile, so they can look around and ask. If that
 * cannot be done (no site key, Turnstile said no, too many visitors from one
 * address today) they are still let in to look — `none` — and the first
 * question they ask opens the sign-in dialog instead.
 *
 * With visitor mode off, no session is the failure it always was, and the
 * gate shows why.
 */
export async function openReader(
	visitorMode: () => Promise<boolean>,
	slot: () => HTMLElement | null
): Promise<Standing> {
	try {
		const user = await openSession();
		reportIdentity(user);
		return settle(user.guest ? 'guest' : 'account');
	} catch (error) {
		const signedOut = error instanceof ApiError && error.status === 401;
		if (!signedOut || !(await visitorMode())) throw error;
	}

	try {
		const { turnstile_site_key: key } =
			await api.get<VisitorConfig>('/visitor');
		const holder = slot();
		if (!key || !holder) return settle('none');
		const user = await openGuestSession(await turnstileToken(key, holder));
		reportIdentity(user);
		return settle('guest');
	} catch (error) {
		console.warn('[visitor] no guest session', error);
		return settle('none');
	}
}

function settle(standing: Standing): Standing {
	reportStanding(standing);
	return standing;
}
