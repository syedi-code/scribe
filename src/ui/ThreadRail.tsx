import { COPY } from '../copy';
import { useConversation } from '../chat/context';

/**
 * Earlier questions.
 *
 * The rail appears only once a conversation exists — the home screen is one
 * centred column and nothing else. A conversation is listed as soon as it is
 * created and titled a beat later, because the server names it after reading
 * its first question; the row is the same height either way, so nothing jumps
 * when the title lands.
 *
 * `naming…` is said only while the server is actually being asked. A row that
 * is still untitled after that says so, rather than promising a name that is
 * no longer coming.
 *
 * Its head sticks, and is set at the same left margin as the wordmark above
 * it, so the two read as one column of chrome rather than two things that
 * happen to be near each other.
 */

/** A plus, drawn. The app has no icon set and does not need one. */
function Plus() {
	return (
		<svg
			aria-hidden
			viewBox="0 0 12 12"
			className="size-3 shrink-0 opacity-70 transition-opacity group-hover/new:opacity-100"
		>
			<path
				d="M6 1.5v9M1.5 6h9"
				fill="none"
				stroke="currentColor"
				strokeWidth="1.3"
				strokeLinecap="round"
			/>
		</svg>
	);
}

export function ThreadRail({ onNavigate }: { onNavigate?: () => void }) {
	const {
		threads,
		naming,
		activeId,
		openThread,
		warmThread,
		newQuestion,
		busy,
	} = useConversation();

	return (
		<nav
			aria-label="Earlier questions"
			className="border-paper-deep h-full overflow-y-auto border-r px-5 pt-0 pb-4"
		>
			<div className="bg-paper border-paper-deep sticky top-0 z-(--z-lifted) mb-2 border-b pt-4 pb-2.5">
				<div className="flex items-baseline justify-between gap-2">
					<span className="font-app text-small text-ink-soft">
						{COPY.sessions}
					</span>
					<span
						className="font-app text-tiny text-ink-faint"
						aria-label={COPY.sessionCount(threads.length)}
					>
						{threads.length}
					</span>
				</div>

				<button
					type="button"
					disabled={busy}
					onClick={() => {
						newQuestion();
						onNavigate?.();
					}}
					className="group/new press font-app text-ui text-ink-soft hover:text-ink mt-1.5 flex w-full items-center gap-1.5 rounded-[4px] py-0.5 text-left disabled:opacity-40"
				>
					<Plus />
					{COPY.newQuestion}
				</button>
			</div>

			{threads.map((thread) => (
				<button
					key={thread.id}
					type="button"
					onClick={() => {
						openThread(thread.id);
						onNavigate?.();
					}}
					// Fetched as the pointer arrives, so the click that
					// follows has nothing left to wait for.
					onPointerEnter={() => warmThread(thread.id)}
					onFocus={() => warmThread(thread.id)}
					aria-current={thread.id === activeId}
					className={`press font-app text-ui hover:text-ink hover:bg-bubble/45 -mx-1 block w-[calc(100%+0.5rem)] rounded-[4px] px-1 py-1 text-left leading-snug ${
						thread.title
							? thread.id === activeId
								? 'text-ink'
								: 'text-ink-soft'
							: 'text-ink-faint italic'
					}`}
				>
					{thread.title ??
						(naming.includes(thread.id)
							? COPY.naming
							: COPY.unnamed)}
				</button>
			))}
		</nav>
	);
}
