import { useEffect, useState } from 'react';
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

/** How long a hand of questions stays before the next is dealt. */
const TURN_MS = 8000;

type Suggestion = (typeof COPY.suggestions)[number];

interface Hand {
	deck: Suggestion[];
	at: number;
}

function shuffled(): Suggestion[] {
	const deck = [...COPY.suggestions];
	for (let i = deck.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[deck[i], deck[j]] = [deck[j], deck[i]];
	}
	return deck;
}

/**
 * The pool is shuffled once and dealt in threes, so nothing comes round again
 * until the rest of the library has had its turn. When what is left will not
 * fill a hand the deck is cut afresh.
 */
function deal(previous?: Hand): Hand {
	const size = COPY.howManySuggestions;
	const at = previous ? previous.at + size : 0;
	if (previous && at + size <= previous.deck.length) {
		return { deck: previous.deck, at };
	}
	return { deck: shuffled(), at: 0 };
}

export function Home({
	composerSlot,
}: {
	composerSlot: (element: HTMLDivElement | null) => void;
}) {
	const { ask } = useConversation();
	const reduced = useReducedMotion();
	const [hand, setHand] = useState<Hand>(() => deal());
	// A question being read is not a question to take away.
	const [held, setHeld] = useState(false);
	const books = useAsync(() => libraryCount(), []);
	// Coming back here is an arrival, and the wordmark writes itself again.
	const [ready, setReady] = useState(reduced);

	useEffect(() => {
		if (reduced || held) return;
		const turn = setInterval(() => setHand(deal), TURN_MS);
		return () => clearInterval(turn);
	}, [reduced, held]);

	const fade = (order: number) => ({
		className: ready ? 'animate-settle' : 'opacity-0',
		style: ready ? { animationDelay: `${order * 130}ms` } : undefined,
	});

	const questions = hand.deck.slice(
		hand.at,
		hand.at + COPY.howManySuggestions
	);
	const library = books.value === null ? null : COPY.library(books.value);

	return (
		<div className="row-span-full grid min-h-0 content-center justify-items-center px-5 pt-5 pb-[7vh] @max-compact:pb-[14vh]">
			<Wordmark
				typing={!reduced}
				onTyped={() => setReady(true)}
				className="text-[clamp(2.4rem,6.5vw,3.3rem)] @max-compact:text-[2.4rem]"
			/>

			{/* Above the composer in the stack as well as on the page: the
			    model menu hangs out of this line over whatever is below it. */}
			<div
				className={`relative z-20 mt-1.5 grid justify-items-center gap-0.5 ${fade(0).className}`}
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
				className={`mt-4 w-full max-w-[30rem] ${fade(2).className}`}
				style={fade(2).style}
				onMouseEnter={() => setHeld(true)}
				onMouseLeave={() => setHeld(false)}
				onFocusCapture={() => setHeld(true)}
				onBlurCapture={() => setHeld(false)}
			>
				{/* Keyed on the hand, so a new three is dealt in rather than
				    swapped under the reader's eye. */}
				<div
					key={`${hand.at}:${questions[0].question}`}
					className="grid"
				>
					{questions.map((suggestion, order) => (
						<button
							key={suggestion.question}
							type="button"
							onClick={() => ask(suggestion.question)}
							style={
								reduced
									? undefined
									: { animationDelay: `${order * 90}ms` }
							}
							className={`group/ask hover:bg-bubble/45 grid grid-cols-[0.9rem_minmax(0,1fr)] items-start gap-x-2 rounded-[4px] px-1 py-1.5 text-left transition-colors duration-300 ease-paper ${
								reduced ? '' : 'animate-settle'
							}`}
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
		</div>
	);
}
