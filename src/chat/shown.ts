import { useMemo } from 'react';
import { useConversation } from './context';
import type { PageRef } from '../api/types';
import type { ScribeMessage } from './message';

/**
 * The pages the model was shown, by the handle it was shown them under.
 *
 * A citation names its book only once the check comes back, and until then the
 * margin had nothing to call it but a failure: `a page it was never shown`,
 * printed as the title of every entry while the answer was still being
 * written. But the handle was given out by a search or a read that is already
 * in the conversation, and that result says which book it is. Handles are
 * the conversation's, not the turn's, so every message is read.
 */

export interface ShownPage {
	ref: PageRef;
	work_title: string;
	creator: string;
}

const isShown = (value: unknown): value is ShownPage & { handle: string } => {
	const item = value as Partial<ShownPage & { handle: string }> | null;
	return (
		typeof item?.handle === 'string' &&
		typeof item.work_title === 'string' &&
		typeof item.ref?.document_id === 'string'
	);
};

export function pagesShown(
	messages: readonly ScribeMessage[]
): Map<string, ShownPage> {
	const shown = new Map<string, ShownPage>();
	for (const message of messages) {
		for (const part of message.parts) {
			if (!part.type.startsWith('tool-') || !('output' in part)) continue;
			if (!Array.isArray(part.output)) continue;
			for (const item of part.output) {
				if (isShown(item)) shown.set(item.handle, item);
			}
		}
	}
	return shown;
}

export function usePagesShown(): Map<string, ShownPage> {
	const { messages } = useConversation();
	return useMemo(() => pagesShown(messages), [messages]);
}
