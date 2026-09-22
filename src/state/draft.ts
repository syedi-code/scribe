import { createStore, useStore } from '../lib/store';

/**
 * The question being written, held outside the composer.
 *
 * The composer is one instance, portalled between the home screen and the
 * dock, but a portal whose container changes is a remount — and a remount that
 * drops the draft is exactly the moment a reader is most annoyed to lose it.
 */
const draft = createStore(takeKeptDraft());

export const useDraft = () => useStore(draft);
export const setDraft = (text: string) => draft.set(text);

const KEPT = 'scribe:draft-across-sign-in';

/**
 * Signing in leaves the page for GitHub or Google and comes back to a fresh
 * one. The question half-typed when the reader pressed *Continue* is kept in
 * this tab's session storage and put back in the composer on return, once.
 */
export function keepDraftForSignIn() {
	try {
		const text = draft.get().trim();
		if (text) sessionStorage.setItem(KEPT, text);
	} catch {
		// Storage refused; the reader types it again.
	}
}

function takeKeptDraft(): string {
	try {
		const kept = sessionStorage.getItem(KEPT) ?? '';
		sessionStorage.removeItem(KEPT);
		return kept;
	} catch {
		return '';
	}
}
