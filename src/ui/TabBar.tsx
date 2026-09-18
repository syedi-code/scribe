import { COPY } from '../copy';
import type { Tab } from './tabs';

/**
 * Where in the app you are, and — narrow — the way to the rail.
 *
 * `Add a book` is struck through and disabled rather than removed: it is
 * coming back, and a reader who remembers it should see that it is held rather
 * than wonder where it went.
 */
export function TabBar({
	tab,
	onTab,
	onRail,
	railable,
	railOpen,
}: {
	tab: Tab;
	onTab: (tab: Tab) => void;
	onRail: () => void;
	railable: boolean;
	railOpen: boolean;
}) {
	const tabClass = (which: Tab) =>
		`font-read text-ui leading-tight whitespace-nowrap transition-colors ${
			tab === which ? 'text-ink' : 'text-ink-faint hover:text-ink'
		}`;

	return (
		<div className="flex items-center gap-4 @max-compact:gap-3">
			{railable && (
				<button
					type="button"
					onClick={onRail}
					aria-expanded={railOpen}
					data-rail-toggle
					className={`font-app text-ui hidden transition-colors @max-compact:block ${
						railOpen ? 'text-ink' : 'text-ink-faint hover:text-ink'
					}`}
				>
					{COPY.sessions}
				</button>
			)}
			<button
				type="button"
				role="tab"
				aria-selected={tab === 'ask'}
				onClick={() => onTab('ask')}
				className={tabClass('ask')}
			>
				{COPY.tabs.ask}
			</button>
			<button
				type="button"
				role="tab"
				aria-selected={tab === 'books'}
				onClick={() => onTab('books')}
				className={tabClass('books')}
			>
				{COPY.tabs.books}
			</button>
			<button
				type="button"
				role="tab"
				disabled
				aria-selected={false}
				title={COPY.addLater}
				className="font-read text-ui text-ink-faint leading-tight whitespace-nowrap line-through opacity-60 disabled:cursor-default"
			>
				{COPY.tabs.add}
			</button>
		</div>
	);
}
