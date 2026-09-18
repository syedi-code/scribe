import { useState } from 'react';
import { COPY } from '../copy';
import { useConversation } from '../chat/context';
import { SETTLE, useSettle } from './settle';

/**
 * Three questions to start from, each naming the work it can be answered out
 * of, so a reader can see what they are about to be answered from.
 *
 * Drawn on arrival and then left alone. They turned over on a timer for a
 * while, which moved text about beside the thing a reader was trying to type
 * into; the library is varied by coming back, not by waiting.
 */

type Suggestion = (typeof COPY.suggestions)[number];

function draw(): Suggestion[] {
	const pool = [...COPY.suggestions];
	const drawn: Suggestion[] = [];
	while (drawn.length < COPY.howManySuggestions && pool.length > 0) {
		drawn.push(...pool.splice(Math.floor(Math.random() * pool.length), 1));
	}
	return drawn;
}

function Row({
	suggestion,
	onAsk,
}: {
	suggestion: Suggestion;
	onAsk: (question: string) => void;
}) {
	return (
		<button
			type="button"
			onClick={() => onAsk(suggestion.question)}
			className="group/ask hover:bg-bubble/45 grid grid-cols-[0.9rem_minmax(0,1fr)] items-start gap-x-2 rounded-[4px] px-1 py-1.5 text-left transition-colors duration-300 ease-paper"
		>
			{/* The rule hangs in the composer's left margin and reaches for the
			    question under the pointer. */}
			<span
				aria-hidden
				className="bg-paper-deep group-hover/ask:bg-ink-faint mt-[0.6em] h-px w-2 justify-self-end transition-[width,background-color] duration-300 ease-paper group-hover/ask:w-3.5"
			/>
			<span className="grid gap-0.5">
				<span className="font-read text-ui text-ink-soft group-hover/ask:text-ink font-light leading-snug transition-colors duration-300 ease-paper">
					{suggestion.question}
				</span>
				<span className="font-app text-tiny text-ink-faint">
					{suggestion.work}
				</span>
			</span>
		</button>
	);
}

export function Suggestions() {
	const { ask } = useConversation();
	const settle = useSettle(SETTLE.suggestions);
	const [questions] = useState(draw);

	return (
		<div
			className={`mt-4 grid w-full max-w-[30rem] ${settle.className}`}
			style={settle.style}
		>
			{questions.map((suggestion) => (
				<Row
					key={suggestion.question}
					suggestion={suggestion}
					onAsk={ask}
				/>
			))}
		</div>
	);
}
