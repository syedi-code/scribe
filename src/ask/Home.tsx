import { useState } from 'react';
import { libraryCount } from '../api/library';
import { COPY } from '../copy';
import { useConversation } from '../chat/context';
import { useAsync } from '../lib/useAsync';
import { useReducedMotion } from '../lib/motion';
import { RunningModel } from '../models/RunningModel';
import { Wordmark } from '../ui/Wordmark';

/**
 * The home screen is one centred column and nothing else: the wordmark, the
 * line saying which model is running and how much it has to read, the
 * composer, and three questions to start from. No header chrome beside the
 * tabs, no rail until there is a conversation to list, no explanatory
 * paragraph. The composer is the only thing anyone came for.
 */

/**
 * Three of the twenty-five, drawn on arrival and then left alone. They turned
 * over on a timer for a while, which moved text about beside the thing a
 * reader was trying to type into. The library is varied by coming back.
 */
function draw(): (typeof COPY.suggestions)[number][] {
	const pool = [...COPY.suggestions];
	const drawn = [];
	while (drawn.length < COPY.howManySuggestions && pool.length > 0) {
		drawn.push(...pool.splice(Math.floor(Math.random() * pool.length), 1));
	}
	return drawn;
}

export function Home({
	composerSlot,
}: {
	composerSlot: (element: HTMLDivElement | null) => void;
}) {
	const { ask } = useConversation();
	const reduced = useReducedMotion();
	const [questions] = useState(draw);
	const books = useAsync(() => libraryCount(), []);
	// Coming back here is an arrival, and the wordmark writes itself again.
	const [ready, setReady] = useState(reduced);

	const fade = (order: number) => ({
		className: ready ? 'animate-settle' : 'opacity-0',
		style: ready ? { animationDelay: `${order * 130}ms` } : undefined,
	});

	const library = books.value === null ? null : COPY.library(books.value);

	return (
		<div className="row-span-full grid min-h-0 content-center justify-items-center px-5 pt-5 pb-[7vh] @max-compact:pb-[14vh]">
			<Wordmark
				typing={!reduced}
				onTyped={() => setReady(true)}
				className="text-[clamp(2.4rem,6.5vw,3.3rem)] @max-compact:text-[2.4rem]"
			/>

			{/* Lifted off the reading surface, because the model menu hangs out
			    of this line over the composer under it — and no higher, so the
			    rail still covers it. */}
			<div
				className={`relative z-(--z-lifted) mt-1.5 grid justify-items-center gap-0.5 ${fade(0).className}`}
				style={fade(0).style}
			>
				<RunningModel hero />
				{library && (
					<p className="font-app text-small text-ink-faint m-0">
						{library.before}
						<span className="font-bold underline underline-offset-2">
							{library.count}
						</span>
						{library.after}
					</p>
				)}
			</div>

			<div
				ref={composerSlot}
				className={`mt-6 w-full max-w-[30rem] ${fade(1).className}`}
				style={fade(1).style}
			/>

			<div
				className={`mt-4 grid w-full max-w-[30rem] ${fade(2).className}`}
				style={fade(2).style}
			>
				{questions.map((suggestion) => (
					<button
						key={suggestion.question}
						type="button"
						onClick={() => ask(suggestion.question)}
						className="group/ask hover:bg-bubble/45 grid grid-cols-[0.9rem_minmax(0,1fr)] items-start gap-x-2 rounded-[4px] px-1 py-1.5 text-left transition-colors duration-300 ease-paper"
					>
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
				))}
			</div>
		</div>
	);
}
