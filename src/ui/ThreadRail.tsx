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
 */
export function ThreadRail({ onNavigate }: { onNavigate?: () => void }) {
	const { threads, naming, activeId, openThread, newQuestion, busy } =
		useConversation();

	return (
		<nav
			aria-label="Earlier questions"
			className="border-paper-deep h-full overflow-y-auto border-r px-4 py-4"
		>
			<button
				type="button"
				disabled={busy}
				onClick={() => {
					newQuestion();
					onNavigate?.();
				}}
				className="font-app text-ui text-ink mb-2 block w-full py-1 text-left disabled:opacity-40"
			>
				{COPY.newQuestion}
			</button>

			{threads.map((thread) => (
				<button
					key={thread.id}
					type="button"
					onClick={() => {
						openThread(thread.id);
						onNavigate?.();
					}}
					aria-current={thread.id === activeId}
					className={`font-app text-ui block w-full py-1 text-left leading-snug transition-colors hover:text-ink ${
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
