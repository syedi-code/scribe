import { createStore, useStore } from '../lib/store';
import type { AnswerCitation } from '../api/types';

/**
 * Two pieces of state the whole app shares: which page is open, and whether
 * uncited prose is dimmed. Both are deliberately app-wide — the drawer is a
 * singleton opened by citation, never one per citation, and the dim holds
 * across answers so a reader who has asked to see what is uncited keeps
 * seeing it.
 */

export interface OpenPage {
	citation: AnswerCitation;
	/** Focus goes back here when the drawer closes. */
	opener: HTMLElement | null;
}

const page = createStore<OpenPage | null>(null);
const onlyCited = createStore(false);

export const openPage = (citation: AnswerCitation, opener?: HTMLElement) =>
	page.set({ citation, opener: opener ?? null });
export const closePage = () => page.set(null);
export const useOpenPage = () => useStore(page);

export const toggleOnlyCited = () => onlyCited.set((on) => !on);
export const useOnlyCited = () => useStore(onlyCited);
