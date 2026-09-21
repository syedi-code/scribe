import { createStore, useStore } from '../lib/store';

/**
 * The one modal that is open, if any.
 *
 * One at a time is the rule rather than an accident of how they are opened: a
 * reader who presses *See plans* inside the account dialog is moved to the
 * plans, not handed a second modal stacked over the first with two ways out.
 */
export type Dialog = 'account' | 'plans' | 'limit';

const dialog = createStore<Dialog | null>(null);

export const useDialog = () => useStore(dialog);
export const openDialog = (which: Dialog) => dialog.set(which);
export const closeDialog = () => dialog.set(null);

/**
 * Where every offer of a paid plan leads — the composer's notice, the limit
 * dialog, the account menu, the account dialog, the home screen once a month
 * is spent. There is one destination on purpose: when checkout exists it is
 * built here, once, and every button that offered it is already pointing at
 * it.
 */
export const seePlans = () => openDialog('plans');
