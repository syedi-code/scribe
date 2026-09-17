import { useState } from 'react';
import { COPY } from '../copy';
import { useConversation } from '../chat/context';
import { useReducedMotion } from '../lib/motion';
import { RunningModel } from '../models/RunningModel';
import { Wordmark } from '../ui/Wordmark';

/**
 * The home screen is one centred column and nothing else: the wordmark, the
 * line saying which model is running, the composer, and two questions to start
 * from. No header chrome beside the tabs, no rail until there is a conversation
 * to list, no explanatory paragraph. The composer is the only thing anyone came
 * for.
 */

/** The wordmark types itself once a session, not every time you come back here. */
let launched = false;

export function Home({
	composerSlot,
}: {
	composerSlot: (element: HTMLDivElement | null) => void;
}) {
	const { ask } = useConversation();
	const reduced = useReducedMotion();
	const [typing] = useState(() => !reduced && !launched);
	const [ready, setReady] = useState(() => reduced || launched);

	// Model line, composer, suggestions: they fade up in that order once the
	// wordmark has finished typing itself.
	const fade = (order: number) => ({
		className: ready ? 'animate-settle' : 'opacity-0',
		style: ready ? { animationDelay: `${order * 130}ms` } : undefined,
	});

	return (
		<div className="row-span-full grid min-h-0 content-center justify-items-center px-5 pt-5 pb-[7vh] @max-compact:pb-[14vh]">
			<Wordmark
				typing={typing}
				onTyped={() => {
					launched = true;
					setReady(true);
				}}
				className="text-[clamp(2.4rem,6.5vw,3.3rem)] @max-compact:text-[2.4rem]"
			/>

			<div
				className={`mt-3.5 ${fade(0).className}`}
				style={fade(0).style}
			>
				<RunningModel hero />
			</div>

			<div
				ref={composerSlot}
				className={`mt-6 w-full max-w-[33rem] ${fade(1).className}`}
				style={fade(1).style}
			/>

			<div
				className={`mt-3 grid w-full max-w-[33rem] ${fade(2).className}`}
				style={fade(2).style}
			>
				{COPY.suggestions.map((question) => (
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
