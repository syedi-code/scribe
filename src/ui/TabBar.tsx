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
 * than wonder where it went. Narrow, it gives its room up to `About`: a phone's
 * header holds four tabs and the account, and a tab nobody can press is the
 * one to go.
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
			className="pointer-events-auto flex items-center gap-4 @max-compact:gap-3"
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
				className={`font-read text-ui text-ink-faint leading-tight whitespace-nowrap line-through opacity-60 disabled:cursor-default ${
					about ? '@max-compact:hidden' : ''
				}`}
			>
				{COPY.tabs.add}
			</button>
			{about && named('about', COPY.tabs.about)}
		</div>
	);
}
