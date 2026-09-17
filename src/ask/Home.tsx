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
 * composer, and two questions to start from. No header chrome beside the tabs,
 * no rail until there is a conversation to list, no explanatory paragraph. The
 * composer is the only thing anyone came for.
 */

/**
 * Slightly randomised: the first question is always there, so the screen has a
 * shape a returning reader recognises, and the rest are drawn from the pool so
 * the library does not look like it holds two books.
 */
function draw(pool: readonly string[], count: number): string[] {
	const [anchor, ...rest] = pool;
	const drawn = [anchor];
	const left = [...rest];
	while (drawn.length < count && left.length > 0) {
		drawn.push(...left.splice(Math.floor(Math.random() * left.length), 1));
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
	const [questions] = useState(() =>
		draw(COPY.suggestions, COPY.howManySuggestions)
	);
	const books = useAsync(() => libraryCount(), []);
	// Coming back here is an arrival, and the wordmark writes itself again.
	const [ready, setReady] = useState(reduced);

	const fade = (order: number) => ({
		className: ready ? 'animate-settle' : 'opacity-0',
		style: ready ? { animationDelay: `${order * 130}ms` } : undefined,
	});

	return (
		<div className="row-span-full grid min-h-0 content-center justify-items-center px-5 pt-5 pb-[7vh] @max-compact:pb-[14vh]">
			<Wordmark
				typing={!reduced}
				onTyped={() => setReady(true)}
				className="text-[clamp(2.4rem,6.5vw,3.3rem)] @max-compact:text-[2.4rem]"
			/>

			<div
				className={`mt-1.5 grid justify-items-center gap-0.5 ${fade(0).className}`}
				style={fade(0).style}
			>
				<RunningModel hero />
				{books.value !== null && (
					<p className="font-app text-small text-ink-faint m-0">
						{COPY.library(books.value)}
					</p>
				)}
			</div>

			<div
				ref={composerSlot}
				className={`mt-6 w-full max-w-[30rem] ${fade(1).className}`}
				style={fade(1).style}
			/>

			<div
				className={`mt-3 grid w-full max-w-[26rem] gap-0.5 ${fade(2).className}`}
				style={fade(2).style}
			>
				{questions.map((question) => (
					<button
						key={question}
						type="button"
						onClick={() => ask(question)}
						className="font-read text-ui text-ink-faint hover:text-ink px-0.5 py-1.5 text-left leading-snug font-light transition-[color,padding] duration-300 ease-paper hover:pl-1.5"
					>
						{question}
					</button>
				))}
			</div>
		</div>
	);
}
