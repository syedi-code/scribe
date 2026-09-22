import { useEffect } from 'react';
import { useConversation } from '../chat/context';
import { useFlag } from '../flags/context';
import { standingOf, useAllowance } from '../state/allowance';
import { openDialog, useDialog } from '../state/dialog';

const STORAGE_KEY = 'scribe:limit-nudged';

/**
 * Which moments have already been raised: one key per month per standing, so
 * the dialog comes at two left and at none and never again that month — not
 * on the next answer, not on a reload. Storage is a convenience; where it is
 * refused, the tab remembers on its own.
 */
const raised = new Set<string>(readRaised());

function readRaised(): string[] {
	try {
		const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
		return Array.isArray(stored) ? stored : [];
	} catch {
		return [];
	}
}

function raiseOnce(key: string): boolean {
	if (raised.has(key)) return false;
	raised.add(key);
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify([...raised]));
	} catch {
		// The Set above already holds it for this tab.
	}
	return true;
}

/** Forgets every moment raised. Between tests. */
export const resetLimitNudge = () => {
	raised.clear();
	try {
		localStorage.removeItem(STORAGE_KEY);
	} catch {
		// Nothing was stored.
	}
};

/**
 * Raises the limit dialog inside a conversation as the month runs down.
 *
 * Only once an answer has finished — never over one being written, which is
 * the moment a reader is least able to take in anything else — and never over
 * another dialog. The home screen says it without a dialog: there the composer
 * is the whole screen, and it says so itself.
 */
export function useLimitNudge() {
	const shown = useFlag('isPlanLimitShown');
	const { atHome, busy } = useConversation();
	const allowance = useAllowance();
	const open = useDialog();
	const standing = standingOf(allowance);

	useEffect(() => {
		// A visitor is asked to sign in, not offered a plan (VisitorNotice).
		if (!shown || atHome || busy || open || !allowance || allowance.guest)
			return;
		if (standing !== 'last-few' && standing !== 'spent') return;
		if (raiseOnce(`${allowance.resets_at}:${standing}`))
			openDialog('limit');
	}, [shown, atHome, busy, open, allowance, standing]);
}
