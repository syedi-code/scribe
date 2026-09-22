import { createStore, useStore } from '../lib/store';

/**
 * The one modal that is open, if any, and where it sits in the browser's
 * history.
 *
 * One at a time is the rule rather than an accident of how they are opened: a
 * reader who presses *See plans* inside the account dialog is moved to the
 * plans, not handed a second modal stacked over the first with two ways out.
 *
 * Every modal is a history entry with an address — `#plans`, `#account` — for
 * two reasons. On a phone the back gesture is how anything is put away, and a
 * sheet that ignored it navigated the reader out of the app instead. And the
 * plans need to be somewhere a link can point: a post, an email, and Stripe
 * sending a reader back from checkout. That is what a *Plans* tab would have
 * bought, without a tab of billing beside the three places a reader reads.
 */
export type Dialog = 'account' | 'plans' | 'checkout' | 'upgraded' | 'limit';

/** The modals a URL may open. The limit is raised by the app, never linked to. */
const ADDRESSABLE: readonly Dialog[] = ['account', 'plans', 'checkout'];

/**
 * What a history entry holds. `depth` counts the modal entries this app has
 * pushed, so closing can step back past all of them at once rather than
 * reopening the one underneath.
 */
interface Entry {
	dialog: Dialog;
	depth: number;
}

const dialog = createStore<Dialog | null>(null);

export const useDialog = () => useStore(dialog);
export const readDialog = () => dialog.get();

const entry = (): Entry | null => {
	const state = window.history.state as Partial<Entry> | null;
	return state?.dialog ? (state as Entry) : null;
};

const bare = () => window.location.pathname + window.location.search;

/** Opens a modal as the next entry in history, over whatever is open. */
export function openDialog(which: Dialog) {
	const depth = (entry()?.depth ?? 0) + 1;
	window.history.pushState({ dialog: which, depth }, '', `#${which}`);
	dialog.set(which);
}

/** Set by `closeDialog` while its step back through history is in flight. */
let closing = false;

/** Puts every modal away, and the history entries with them. */
export function closeDialog() {
	const depth = entry()?.depth ?? 0;
	if (depth > 0) {
		closing = true;
		window.history.go(-depth);
		return;
	}
	// Opened by the address itself: there is nothing of ours to step back
	// over, and stepping back would leave the app.
	window.history.replaceState(null, '', bare());
	dialog.set(null);
}

/** One step back: from checkout to the plans it was chosen from. */
export function backDialog() {
	if ((entry()?.depth ?? 0) > 1) window.history.back();
	else openDialog('plans');
}

function onPopState() {
	const landed = entry();
	if (closing) {
		closing = false;
		// Landed on the modal the page was opened at, which is still a modal:
		// closing means all of them.
		if (landed) window.history.replaceState(null, '', bare());
		dialog.set(null);
		return;
	}
	dialog.set(landed?.dialog ?? null);
}

/**
 * Where Stripe sends a reader back to: `?checkout=done` or
 * `?checkout=cancelled`, which alexandria will name as the session's success
 * and cancel URLs. Done opens the welcome; cancelled opens checkout again
 * where they left it. `?billing=returned`, from the billing portal, opens the
 * account again. The query is taken off either way, so a reload does not
 * welcome anyone twice.
 */
function followCheckoutReturn(): boolean {
	const query = new URLSearchParams(window.location.search);
	const returned = query.get('checkout');
	// Back from Stripe's billing page, the reader lands on the sheet they left
	// from, and it reads their billing afresh when it opens.
	const fromPortal = query.get('billing') === 'returned';
	if (!returned && !fromPortal) return false;
	query.delete('checkout');
	query.delete('billing');
	const which: Dialog = fromPortal
		? 'account'
		: returned === 'done'
			? 'upgraded'
			: 'checkout';
	const rest = query.toString();
	window.history.replaceState(
		{ dialog: which, depth: 0 },
		'',
		`${window.location.pathname}${rest ? `?${rest}` : ''}#${which}`
	);
	dialog.set(which);
	return true;
}

/**
 * Reads the address once, when the app starts — a link to `#plans` opens the
 * plans — and follows the back button from then on. Returns its removal.
 */
export function followAddress(): () => void {
	const named = window.location.hash.slice(1) as Dialog;
	if (!followCheckoutReturn() && ADDRESSABLE.includes(named)) {
		window.history.replaceState(
			{ dialog: named, depth: 0 },
			'',
			`#${named}`
		);
		dialog.set(named);
	}
	window.addEventListener('popstate', onPopState);
	return () => window.removeEventListener('popstate', onPopState);
}

/** Forgets everything. Between tests. */
export function resetDialog() {
	closing = false;
	window.history.replaceState(null, '', bare());
	dialog.set(null);
}

/**
 * Where every offer of a paid plan leads — the composer's notice, the limit
 * dialog, the account menu, the account dialog, the home screen once a month
 * is spent. There is one destination on purpose: checkout is reached from here
 * and nowhere else, so every button that offers a plan already points at it.
 */
export const seePlans = () => openDialog('plans');
