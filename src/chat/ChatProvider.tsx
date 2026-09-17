import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { api } from '../api/client';
import { useModels } from '../models/context';
import { ChatContext, type ChatState } from './context';
import type { Conversation } from '../api/types';
import type { ScribeMessage } from './message';

/**
 * The conversation: the thread list, the one that is open, and the stream.
 *
 * `useChat` owns the messages. This owns which conversation they belong to,
 * because a question asked from the home screen has to create a conversation
 * before it can be sent, and because the server names a conversation a beat
 * after its first question lands.
 */

/** How long to keep asking the server what it called this conversation. */
const TITLE_POLLS = 6;
const TITLE_POLL_MS = 1400;

export function ChatProvider({ children }: { children: ReactNode }) {
	const { selected } = useModels();
	const [threads, setThreads] = useState<Conversation[]>([]);
	const [activeId, setActiveId] = useState<string | null>(null);

	// The transport is built once; the conversation and the model are read at
	// send time, so switching either never rebuilds the chat.
	const target = useRef<{ id: string | null; modelId: string | null }>({
		id: null,
		modelId: null,
	});
	useEffect(() => {
		target.current.modelId = selected?.id ?? null;
	}, [selected]);

	// The closure below runs when a request goes out, not while rendering: what
	// it needs is whatever conversation and model are current *then*.
	const transport = useMemo(
		() =>
			// eslint-disable-next-line react-hooks/refs
			new DefaultChatTransport<ScribeMessage>({
				api: '/api/conversations',
				prepareSendMessagesRequest: ({ messages }) => ({
					api: `/api/conversations/${target.current.id}/chat`,
					body: {
						message: messages[messages.length - 1],
						model_id: target.current.modelId,
					},
				}),
			}),
		[]
	);

	const {
		messages,
		setMessages,
		sendMessage,
		status,
		error,
		clearError,
		regenerate,
		stop,
	} = useChat<ScribeMessage>({ transport });

	useEffect(() => {
		api.get<{ conversations: Conversation[] }>('/conversations')
			.then((body) => setThreads(body.conversations))
			.catch(() => setThreads([]));
	}, []);

	/** The server names a conversation after its first question, not before it. */
	const pollTitle = useCallback(async (id: string) => {
		for (let attempt = 0; attempt < TITLE_POLLS; attempt++) {
			await new Promise((wake) => setTimeout(wake, TITLE_POLL_MS));
			const { conversation } = await api
				.get<{ conversation: Conversation }>(`/conversations/${id}`)
				.catch(() => ({ conversation: null }));
			if (!conversation?.title) continue;
			setThreads((current) =>
				current.map((thread) =>
					thread.id === id ? conversation : thread
				)
			);
			return;
		}
	}, []);

	const ask = useCallback(
		(text: string) => {
			const send = async () => {
				let id = target.current.id;
				if (!id) {
					const { conversation } = await api.post<{
						conversation: Conversation;
					}>('/conversations', {
						model_id: target.current.modelId ?? undefined,
					});
					id = conversation.id;
					target.current.id = id;
					setActiveId(id);
					setThreads((current) => [conversation, ...current]);
					void pollTitle(id);
				}
				await sendMessage({ text });
			};
			void send();
		},
		[pollTitle, sendMessage]
	);

	const openThread = useCallback(
		(id: string) => {
			target.current.id = id;
			setActiveId(id);
			setMessages([]);
			// Last conversation's failure is not this one's.
			clearError();
			api.get<{ conversation: Conversation; messages: ScribeMessage[] }>(
				`/conversations/${id}`
			)
				.then((body) => {
					if (target.current.id !== id) return;
					setMessages(body.messages);
					setThreads((current) =>
						current.map((thread) =>
							thread.id === id ? body.conversation : thread
						)
					);
				})
				.catch(() => undefined);
		},
		[clearError, setMessages]
	);

	const newQuestion = useCallback(() => {
		target.current.id = null;
		setActiveId(null);
		setMessages([]);
		clearError();
	}, [clearError, setMessages]);

	const value = useMemo<ChatState>(
		() => ({
			threads,
			activeId,
			messages,
			status,
			error,
			atHome: activeId === null && messages.length === 0,
			busy: status === 'submitted' || status === 'streaming',
			ask,
			openThread,
			newQuestion,
			stop,
			retry: () => void regenerate(),
		}),
		[
			threads,
			activeId,
			messages,
			status,
			error,
			ask,
			openThread,
			newQuestion,
			stop,
			regenerate,
		]
	);

	return <ChatContext value={value}>{children}</ChatContext>;
}
