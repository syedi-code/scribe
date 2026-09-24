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
 * Narrow on the home screen, where the header's mark has folded away, the
 * tabs take its place on the first row, set from the left opposite the
 * account: a row of their own there held only the account, and pushed the
 * tabs down against the big wordmark. Everywhere else the mark is back, and
 * the tabs are centred on their own row — spread edge to edge they
 * read as four separate things rather than one control — and the row scrolls
 * sideways before it ever clips (`justify-center-safe`, so an overflowing row
 * starts at its first tab rather than cutting it off) — a fifth tab must never
 * push the account off the screen.
 */
/** Narrow: centred on a row of their own, under the mark and the account. */
const OWN_ROW =
	'@max-compact:col-span-2 @max-compact:row-start-2 @max-compact:justify-center-safe @max-compact:gap-6';
/** Narrow: on the account's row, from the left. */
const BESIDE =
	'@max-compact:col-start-1 @max-compact:row-start-1 @max-compact:justify-start @max-compact:gap-4';
/**
 * Five tabs beside *Sign in* need 330px, which a 360px phone does not have
 * once the header's gutters are taken; below `--container-crowded` they keep a
 * row of their own rather than scroll half a tab out of sight.
 */
const CROWDED =
	'@max-crowded:col-span-2 @max-crowded:row-start-2 @max-crowded:justify-center-safe @max-crowded:gap-6 @min-crowded:@max-compact:col-start-1 @min-crowded:@max-compact:row-start-1 @min-crowded:@max-compact:justify-start @min-crowded:@max-compact:gap-4';

export function TabBar({
	tab,
	onTab,
	railable,
	beside,
}: {
	tab: Tab;
	onTab: (tab: Tab) => void;
	railable: boolean;
	/** Narrow, on the account's row rather than a row of their own. */
	beside: boolean;
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
			className={`pointer-events-auto flex items-center gap-4 @max-compact:min-w-0 @max-compact:overflow-x-auto ${
				!beside ? OWN_ROW : railable ? CROWDED : BESIDE
			}`}
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
