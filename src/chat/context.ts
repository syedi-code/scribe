import { createContext, use } from 'react';
import type { ChatStatus } from 'ai';
import type { Conversation } from '../api/types';
import type { ScribeMessage } from './message';

export interface ChatState {
	threads: Conversation[];
	activeId: string | null;
	messages: ScribeMessage[];
	status: ChatStatus;
	error: Error | undefined;
	/** True until there is a conversation on screen. */
	atHome: boolean;
	busy: boolean;
	ask(text: string): void;
	openThread(id: string): void;
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
