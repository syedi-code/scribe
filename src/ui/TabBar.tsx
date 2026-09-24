import { COPY } from '../copy';
import { useFlag } from '../flags/context';
import type { Tab } from './tabs';

/**
 * Where in the app you are.
 *
 * `Sessions` is a tab only when narrow: a list of conversations on a phone is
 * a destination, not an overlay, and a drawer over a screen one column wide
 * was a second layer with nothing beside it. Wide, the list is the rail and
 * the tab is not offered — so if the window widens while it is showing, the
 * page under it is Ask, and Ask is what reads as current.
 *
 * `Add a book` is struck through and disabled rather than removed: it is
 * coming back, and a reader who remembers it should see that it is held rather
 * than wonder where it went. Narrow, it is not shown at all: a phone's header
 * is short of room, and a tab nobody can press is the one to go.
 *
 * Narrow, the tabs are centred on their own row — spread edge to edge they
 * read as four separate things rather than one control — and the row scrolls
 * sideways before it ever clips (`justify-center-safe`, so an overflowing row
 * starts at its first tab rather than cutting it off) — a fifth tab must never
 * push the account off the screen.
 */
export function TabBar({
	tab,
	onTab,
	railable,
}: {
	tab: Tab;
	onTab: (tab: Tab) => void;
	railable: boolean;
}) {
	const about = useFlag('isAboutShown');

	// Wide, a reader on Sessions is looking at Ask: the tab is not there.
	const tabClass = (which: Tab) =>
		`font-read text-ui leading-tight whitespace-nowrap transition-colors ${
			which === 'ask' && tab === 'sessions'
				? 'text-ink @max-compact:text-ink-faint @max-compact:hover:text-ink'
				: tab === which
					? 'text-ink'
					: 'text-ink-faint hover:text-ink'
		}`;

	const named = (which: Tab, label: string, className = '') => (
		<button
			type="button"
			role="tab"
			aria-selected={tab === which}
			onClick={() => onTab(which)}
			className={`${tabClass(which)} ${className}`}
		>
			{label}
		</button>
	);

	return (
		<div
			role="tablist"
			className="pointer-events-auto flex items-center gap-4 @max-compact:col-span-2 @max-compact:row-start-2 @max-compact:min-w-0 @max-compact:justify-center-safe @max-compact:gap-6 @max-compact:overflow-x-auto"
		>
			{railable &&
				named('sessions', COPY.sessions, 'hidden @max-compact:block')}
			{named('ask', COPY.tabs.ask)}
			{named('books', COPY.tabs.books)}
			<button
				type="button"
				role="tab"
				disabled
				aria-selected={false}
				title={COPY.addLater}
				className="font-read text-ui text-ink-faint leading-tight whitespace-nowrap line-through opacity-60 disabled:cursor-default @max-compact:hidden"
			>
				{COPY.tabs.add}
			</button>
			{named('plans', COPY.tabs.plans)}
			{about && named('about', COPY.tabs.about)}
		</div>
	);
}
