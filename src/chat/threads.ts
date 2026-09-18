import { api } from '../api/client';
import type { Conversation } from '../api/types';
import type { ScribeMessage } from './message';

/**
 * Conversations already fetched, kept for the life of the tab.
 *
 * Switching between two conversations was a round trip every time, and the
 * reading surface went blank for the length of it. A conversation only changes
 * when this tab writes a turn into it, so what was read once can be shown again
 * at once — and the one the reader is about to open can be fetched before they
 * ask for it.
 */

export interface OpenedThread {
	conversation: Conversation;
	messages: ScribeMessage[];
}

const asked = new Map<string, Promise<OpenedThread>>();
const held = new Map<string, OpenedThread>();

/** What is already in hand, for the switch that should not wait at all. */
export const readThread = (id: string): OpenedThread | null =>
	held.get(id) ?? null;

export function loadThread(id: string): Promise<OpenedThread> {
	let pending = asked.get(id);
	if (!pending) {
		pending = api
			.get<OpenedThread>(`/conversations/${id}`)
			.then((body) => {
				held.set(id, body);
				return body;
			})
			.catch((error: unknown) => {
				asked.delete(id);
				throw error;
			});
		asked.set(id, pending);
	}
	return pending;
}

/**
 * A conversation the reader has their pointer on. They have not asked for it,
 * so a failure here is not theirs to hear about — the click that follows will
 * ask again and can fail in front of them properly.
 */
export function warmThread(id: string): void {
	if (held.has(id)) return;
	void loadThread(id).catch(() => undefined);
}

/** A turn written into a conversation makes what was held for it wrong. */
export function forgetThread(id: string): void {
	asked.delete(id);
	held.delete(id);
}
