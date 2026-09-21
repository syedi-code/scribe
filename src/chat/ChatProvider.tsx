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
import { COPY } from '../copy';
import { api, ApiError, describeApiError } from '../api/client';
import { useModels } from '../models/context';
import { reportAllowance } from '../state/allowance';
import { closePage } from '../state/reader';
import { ChatContext, type ChatState } from './context';
import { refuseSpentMonth } from './refusal';
import { forgetThread, loadThread, readThread, warmThread } from './threads';
import type { Conversation } from '../api/types';
import type { ScribeMessage } from './message';

/**
 * The conversation: the thread list, the one that is open, and the stream.
 *
 * `useChat` owns the messages. This owns which conversation they belong to,
 * because a question asked from the home screen has to create a conversation
 * before it can be sent, and because the server names a conversation a beat
 * after its first question lands.
 *
 * What has been read once is kept by `threads.ts`, and the rail warms a
 * conversation as the pointer reaches it, so switching is usually a render
 * rather than a round trip.
 */

/** How long to keep asking the server what it called this conversation. */
const TITLE_POLLS = 6;
const TITLE_POLL_MS = 1400;

export function ChatProvider({ children }: { children: ReactNode }) {
	const { selected } = useModels();
	const [threads, setThreads] = useState<Conversation[]>([]);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [failure, setFailure] = useState<string | null>(null);
	const [naming, setNaming] = useState<string[]>([]);

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
				fetch: refuseSpentMonth,
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

	/**
	 * Every finished answer carries a fresher allowance than the roster did,
	 * with the turn that has just finished already counted. Read off the
	 * messages rather than from an onFinish, so a conversation reopened from
	 * the cache updates the counter too.
	 */
	const lastAllowance = messages.at(-1)?.metadata?.allowance;
	useEffect(() => {
		reportAllowance(lastAllowance);
	}, [lastAllowance]);

	useEffect(() => {
		api.get<{ conversations: Conversation[] }>('/conversations')
			.then((body) => setThreads(body.conversations))
			.catch(() => setThreads([]));
	}, []);

	/**
	 * The server names a conversation after its first question, not before it.
	 *
	 * The polling is what `naming…` in the rail means, and the rail says
	 * something else the moment this gives up — a row that has stopped being
	 * named is untitled, and claiming otherwise for the life of the tab is how
	 * `naming…` came to sit there for ever.
	 */
	const pollTitle = useCallback(async (id: string) => {
		setNaming((current) => [...current, id]);
		try {
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
		} finally {
			setNaming((current) => current.filter((waiting) => waiting !== id));
		}
	}, []);

	const ask = useCallback(
		(text: string) => {
			setFailure(null);
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
				// This turn makes whatever was held for the conversation wrong.
				forgetThread(id);
				await sendMessage({ text });
			};
			// A conversation that could not be created is a question that never
			// reached the model, and the reader is owed the reason. A 402 is
			// that, with a reason of its own: the composer disables itself when
			// the month is spent, so reaching one means a second tab spent it.
			void send().catch((error: unknown) => {
				if (error instanceof ApiError && error.status === 402) {
					setFailure(COPY.plan.refused);
					return;
				}
				setFailure(describeApiError(error));
			});
		},
		[pollTitle, sendMessage]
	);

	const openThread = useCallback(
		(id: string) => {
			target.current.id = id;
			setActiveId(id);
			// Last conversation's failure is not this one's, and neither is
			// the page left open over it.
			clearError();
			setFailure(null);
			closePage();

			const name = (opened: { conversation: Conversation }) =>
				setThreads((current) =>
					current.map((thread) =>
						thread.id === id ? opened.conversation : thread
					)
				);

			// Already read: the switch is a render, and nothing blanks.
			const inHand = readThread(id);
			setMessages(inHand?.messages ?? []);
			if (inHand) return name(inHand);

			void loadThread(id)
				.then((opened) => {
					if (target.current.id !== id) return;
					setMessages(opened.messages);
					name(opened);
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
		setFailure(null);
		closePage();
	}, [clearError, setMessages]);

	const value = useMemo<ChatState>(
		() => ({
			threads,
			naming,
			activeId,
			messages,
			status,
			error,
			failure,
			atHome: activeId === null && messages.length === 0,
			busy: status === 'submitted' || status === 'streaming',
			ask,
			openThread,
			warmThread,
			newQuestion,
			stop,
			retry: () => void regenerate(),
		}),
		[
			threads,
			naming,
			activeId,
			messages,
			status,
			error,
			failure,
			ask,
			openThread,
			newQuestion,
			stop,
			regenerate,
		]
	);

	return <ChatContext value={value}>{children}</ChatContext>;
}
