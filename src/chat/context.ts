import { createContext, use } from 'react';
import type { ChatStatus } from 'ai';
import type { Conversation } from '../api/types';
import type { ScribeMessage } from './message';

export interface ChatState {
	threads: Conversation[];
	/** The conversations the server is being asked to name, right now. */
	naming: string[];
	activeId: string | null;
	messages: ScribeMessage[];
	status: ChatStatus;
	error: Error | undefined;
	/** A question that never reached the model, and why. */
	failure: string | null;
	/** True until there is a conversation on screen. */
	atHome: boolean;
	busy: boolean;
	ask(text: string): void;
	openThread(id: string): void;
	/** A conversation the pointer is on, fetched before it is asked for. */
	warmThread(id: string): void;
	newQuestion(): void;
	stop(): void;
	retry(): void;
}

export const ChatContext = createContext<ChatState | null>(null);

export function useConversation(): ChatState {
	const value = use(ChatContext);
	if (!value) throw new Error('useConversation outside ChatProvider');
	return value;
}
