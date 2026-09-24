import {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from 'react';
import { useChat } from '@ai-sdk/react';
import { COPY } from '../copy';
import { api, ApiError, describeApiError } from '../api/client';
import { useModels } from '../models/context';
import { reportAllowance } from '../state/allowance';
import { openSignIn } from '../state/dialog';
import { setDraft } from '../state/draft';
import { closePage } from '../state/reader';
import { readStanding } from '../state/visitor';
import { ChatContext, type ChatState } from './context';
import { chatFor, heldChat, homeChat } from './chats';
import { forgetThread, loadThread, readThread, warmThread } from './threads';
import type { Conversation } from '../api/types';
import type { ScribeMessage } from './message';

/**
 * The conversation: the thread list, the one that is open, and the stream.
 *
 * Each conversation has a chat of its own (`chats.ts`), and `useChat` shows
 * whichever is open. This owns which one that is, because a question asked
 * from the home screen has to create a conversation before it can be sent,
 * and because the server names a conversation a beat after its first
 * question lands.
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

	// Read when a question goes out, not while rendering: the conversation and
	// the model are whatever is current *then*.
	const target = useRef<{ id: string | null; modelId: string | null }>({
		id: null,
		modelId: null,
	});
	useEffect(() => {
		target.current.modelId = selected?.id ?? null;
	}, [selected]);
	const model = useCallback(() => target.current.modelId, []);

	const [home] = useState(homeChat);
	const [chat, setChat] = useState(home);
	const { messages, status, error, regenerate, stop } =
		useChat<ScribeMessage>({ chat });

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
			// A visitor we could not let in as a guest has no session to ask
			// with. The question is kept for when they come back signed in, from
			// the composer or a suggestion alike.
			if (readStanding() === 'none') {
				setDraft(text);
				openSignIn('blocked');
				return;
			}
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
					setChat(chatFor(id, model));
					setThreads((current) => [conversation, ...current]);
					void pollTitle(id);
				}
				// This turn makes whatever was held for the conversation wrong.
				forgetThread(id);
				await chatFor(id, model).sendMessage({ text });
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
		[model, pollTitle]
	);

	const openThread = useCallback(
		(id: string) => {
			target.current.id = id;
			setActiveId(id);
			// Last conversation's failure is not this one's, and neither is
			// the page left open over it. A chat's own error stays its own.
			setFailure(null);
			closePage();

			const name = (opened: { conversation: Conversation }) =>
				setThreads((current) =>
					current.map((thread) =>
						thread.id === id ? opened.conversation : thread
					)
				);

			// Held by this tab, perhaps still answering: exactly as it stands.
			const held = heldChat(id);
			if (held) return setChat(held);

			// Already read: the switch is a render, and nothing blanks.
			const inHand = readThread(id);
			const opening = chatFor(id, model, inHand?.messages);
			setChat(opening);
			if (inHand) return name(inHand);

			void loadThread(id)
				.then((opened) => {
					// A question asked before the page arrived is newer than it.
					if (opening.messages.length === 0)
						opening.messages = opened.messages;
					name(opened);
				})
				.catch(() => undefined);
		},
		[model]
	);

	const newQuestion = useCallback(() => {
		target.current.id = null;
		setActiveId(null);
		setChat(home);
		setFailure(null);
		closePage();
	}, [home]);

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
