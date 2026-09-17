import { useCallback, useEffect, useRef, useState } from 'react';
import { COPY } from '../copy';
import { AddPanel } from '../add/AddPanel';
import { AskPanel } from '../ask/AskPanel';
import { useConversation } from '../chat/context';
import { useDismiss } from '../lib/useDismiss';
import { RunningModel } from '../models/RunningModel';
import { PageView } from '../page/PageView';
import { focusComposer } from '../state/composer';
import { toggleOnlyCited } from '../state/reader';
import { ThreadRail } from './ThreadRail';
import { Wordmark } from './Wordmark';

/**
 * The shell: the header, the rail, and whichever panel is showing.
 *
 * The layout responds to this element's own width through container queries
 * rather than the viewport's. There is no `isMobile` anywhere in the tree, and
 * no second layout component for small screens.
 *
 * The header sits in its own stacking context above everything, because the
 * model switcher hangs out of it over whatever is below. The page drawer lives
 * inside `main` for the same reason from the other side: `inset-y-0` on the
 * shell would have covered the header.
 *
 * The shell clips rather than hides: `overflow: hidden` is still a scroll
 * container, and focusing the drawer while it was parked off the right edge
 * scrolled the whole app sideways under it.
 */

type Tab = 'ask' | 'add';

function TabBar({
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
		`font-read text-ui leading-tight transition-colors ${
			tab === which ? 'text-ink' : 'text-ink-faint hover:text-ink'
		}`;

	return (
		<div className="flex items-center gap-4">
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
				aria-selected={tab === 'add'}
				onClick={() => onTab('add')}
				className={tabClass('add')}
			>
				{COPY.tabs.add}
			</button>
		</div>
	);
}

export function AppFrame() {
	const { atHome, threads, newQuestion } = useConversation();
	const [tab, setTab] = useState<Tab>('ask');
	const [railOpen, setRailOpen] = useState(false);
	const hasThreads = threads.length > 0;
	const rail = useRef<HTMLDivElement>(null);

	// Clicking away from the rail closes it — including on the button that
	// opened it, which would otherwise reopen it on the same tap.
	const closeRail = useCallback((event: Event) => {
		const target = event.target as Element | null;
		// The tap that closes must not be the tap that reopens; Escape has no
		// element to make an exception for.
		if (target?.closest?.('[data-rail-toggle]')) return;
		setRailOpen(false);
	}, []);
	useDismiss(rail, railOpen, closeRail);

	// `/` to write, `c` to dim everything uncited. Escape belongs to whatever
	// is open, and handles itself.
	useEffect(() => {
		const onKeyDown = (event: KeyboardEvent) => {
			const target = event.target as HTMLElement | null;
			if (
				target?.tagName === 'TEXTAREA' ||
				target?.tagName === 'INPUT' ||
				event.metaKey ||
				event.ctrlKey ||
				event.altKey
			) {
				return;
			}
			if (event.key === '/') {
				event.preventDefault();
				setTab('ask');
				focusComposer();
			}
			if (event.key === 'c') toggleOnlyCited();
		};
		document.addEventListener('keydown', onKeyDown);
		return () => document.removeEventListener('keydown', onKeyDown);
	}, []);

	return (
		<div
			// The drawer parks itself just off the right edge, so the shell
			// clips: nothing of the app may widen the page.
			className="bg-paper relative grid h-full grid-rows-[auto_minmax(0,1fr)] overflow-clip @container"
		>
			<header
				className={`relative z-40 flex items-center justify-between gap-4 border-b px-5 py-3 transition-colors duration-300 @max-compact:px-3.5 @max-compact:py-2.5 ${
					atHome && tab === 'ask'
						? 'border-transparent'
						: 'border-paper-deep'
				}`}
			>
				{/* The home screen carries the wordmark itself; everywhere
				    else it belongs in the header. */}
				{atHome && tab === 'ask' ? (
					<span />
				) : (
					<div className="animate-settle grid gap-0.5">
						{/* The mark is the way back: it returns to the home
						    screen, which writes itself out again. */}
						<button
							type="button"
							onClick={() => {
								setTab('ask');
								newQuestion();
							}}
							title={COPY.home}
							aria-label={COPY.home}
							className="justify-self-start"
						>
							<Wordmark className="text-[17px]" />
						</button>
						<RunningModel />
					</div>
				)}
				<TabBar
					tab={tab}
					onTab={setTab}
					onRail={() => setRailOpen((was) => !was)}
					railable={hasThreads}
					railOpen={railOpen}
				/>
			</header>

			<main
				className={`relative grid min-h-0 ${
					hasThreads
						? 'grid-cols-[var(--container-rail)_minmax(0,1fr)] @max-compact:grid-cols-1'
						: 'grid-cols-1'
				}`}
			>
				{hasThreads && (
					<>
						{/* Narrow, the rail is an overlay, and an overlay says
						    so: the page behind it dims and a tap anywhere on it
						    puts the rail away. */}
						{railOpen && (
							<div
								aria-hidden
								onClick={() => setRailOpen(false)}
								className="bg-ink/15 absolute inset-0 z-20 hidden @max-compact:block"
							/>
						)}
						<div
							ref={rail}
							className={`min-h-0 @max-compact:bg-paper @max-compact:absolute @max-compact:inset-y-0 @max-compact:left-0 @max-compact:z-20 @max-compact:w-rail @max-compact:shadow-[8px_0_24px_-20px_rgba(36,31,26,0.9)] ${
								railOpen ? '' : '@max-compact:hidden'
							}`}
						>
							<ThreadRail onNavigate={() => setRailOpen(false)} />
						</div>
					</>
				)}

				{tab === 'ask' ? <AskPanel /> : <AddPanel />}

				<PageView />
			</main>
		</div>
	);
}
