import { useMemo, useRef } from 'react';
import { useConversation } from '../chat/context';
import { describeStreamFailure } from '../chat/failure';
import { useStickToBottom } from '../lib/useStickToBottom';
import { Turn } from './Turn';
import type { ScribeMessage } from '../chat/message';

/**
 * The conversation is a list of turns, and a turn is one question with whatever
 * came back for it. It behaves like a chat, because that is what every reader
 * already knows how to use; what is unconventional is the margin beside it.
 *
 * Keyed on which conversation it is, so moving between two of them reads as
 * turning to one rather than as a list being rewritten in place. It cost
 * nothing to add and it is most of why switching feels immediate: the other
 * half is `chat/threads.ts`, which usually has the conversation already.
 */

const questionOf = (message: ScribeMessage) =>
	message.parts
		.filter(
			(part): part is { type: 'text'; text: string } =>
				part.type === 'text'
		)
		.map((part) => part.text)
		.join('\n');

interface Exchange {
	id: string;
	question: string;
	answer: ScribeMessage | null;
}

export function Conversation() {
	const { messages, busy, error, retry, activeId } = useConversation();
	const scroll = useRef<HTMLDivElement>(null);

	const exchanges = useMemo(() => {
		const turns: Exchange[] = [];
		for (const message of messages) {
			if (message.role === 'user') {
				turns.push({
					id: message.id,
					question: questionOf(message),
					answer: null,
				});
			} else if (turns.length > 0) {
				turns[turns.length - 1].answer = message;
			}
		}
		return turns;
	}, [messages]);

	useStickToBottom(scroll, [messages]);

	return (
		<div
			ref={scroll}
			className="overflow-y-auto px-5 pt-6 pb-1 @max-compact:px-3.5 @max-compact:pt-4"
		>
			<div
				key={activeId ?? 'new'}
				className="animate-rise max-w-spread mx-auto grid w-full grid-cols-[minmax(0,var(--container-thread))_var(--container-margin)] gap-9 @max-fold:max-w-thread @max-fold:grid-cols-1"
			>
				{exchanges.map((exchange, index) => {
					const last = index === exchanges.length - 1;
					return (
						<Turn
							key={exchange.id}
							question={exchange.question}
							message={exchange.answer}
							streaming={last && busy}
							failure={
								last && error
									? describeStreamFailure(error)
									: undefined
							}
							onRetry={last && !busy ? retry : undefined}
						/>
					);
				})}
			</div>
		</div>
	);
}
