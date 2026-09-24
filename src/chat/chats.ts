import { Chat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { reportAllowance } from '../state/allowance';
import { refuseSpentMonth } from './refusal';
import type { ScribeMessage } from './message';

/**
 * One `Chat` per conversation, kept for the life of the tab.
 *
 * There used to be one for the whole app, and the conversation on screen was
 * swapped into it with `setMessages`. An answer still streaming went on writing
 * into that same chat, so opening another conversation mid-answer showed it for
 * a moment and then the stream took the page back, a part at a time (#72).
 * Now a stream writes into its own conversation's chat whatever is on screen,
 * and coming back to it shows it as far as it has got.
 */
const chats = new Map<string, Chat<ScribeMessage>>();

/** What is on screen before there is a conversation: nothing, and it never sends. */
export const homeChat = () => new Chat<ScribeMessage>({});

/** Whether this tab already holds a chat for the conversation. */
export const heldChat = (id: string): Chat<ScribeMessage> | null =>
	chats.get(id) ?? null;

/**
 * The conversation's chat, made on first use. `model` is read when a question
 * goes out, not when the chat is made, so switching models never rebuilds one.
 */
export function chatFor(
	id: string,
	model: () => string | null,
	messages: ScribeMessage[] = []
): Chat<ScribeMessage> {
	let chat = chats.get(id);
	if (!chat) {
		chat = new Chat<ScribeMessage>({
			id,
			messages,
			transport: new DefaultChatTransport<ScribeMessage>({
				api: `/api/conversations/${id}/chat`,
				prepareSendMessagesRequest: ({ messages: sent }) => ({
					body: { message: sent.at(-1), model_id: model() },
				}),
				fetch: refuseSpentMonth,
			}),
			// An answer that finishes off screen still spent a question, and
			// the counter should say so without waiting to be looked at.
			onFinish: ({ message }) =>
				reportAllowance(message.metadata?.allowance),
		});
		chats.set(id, chat);
	}
	return chat;
}

/** For tests: every conversation forgotten. */
export const forgetChats = () => chats.clear();
