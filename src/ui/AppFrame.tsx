import { useEffect, useState } from 'react';
import { COPY } from '../copy';
import { AddPanel } from '../add/AddPanel';
import { AskPanel } from '../ask/AskPanel';
import { useConversation } from '../chat/context';
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
 * rather than the viewport's, which is what makes the phone frame exercise the
 * real mobile layout rather than a simulation of it. There is no `isMobile`
 * anywhere in the tree, and no second layout component for small screens.
 */

type Tab = 'ask' | 'add';

function TabBar({
	tab,
	onTab,
	onRail,
	railable,
	phone,
	onPhone,
}: {
	tab: Tab;
	onTab: (tab: Tab) => void;
	onRail: () => void;
	railable: boolean;
	phone: boolean;
	onPhone: () => void;
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
					className="font-app text-ui text-ink-faint hover:text-ink hidden @max-compact:block"
				>
					Questions
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
			<button
				type="button"
				onClick={onPhone}
				title={COPY.phoneFrame}
				aria-label={COPY.phoneFrame}
				aria-pressed={phone}
				className={`flex transition-colors ${phone ? 'text-ink' : 'text-ink-faint hover:text-ink'}`}
			>
				<svg
					width="11"
					height="16"
					viewBox="0 0 11 16"
					fill="none"
					aria-hidden
				>
					<rect
						x="0.6"
						y="0.6"
						width="9.8"
						height="14.8"
						rx="2"
						stroke="currentColor"
						strokeWidth="1.2"
					/>
					<line
						x1="4"
						y1="13"
						x2="7"
						y2="13"
						stroke="currentColor"
						strokeWidth="1.2"
					/>
				</svg>
			</button>
		</div>
	);
}

export function AppFrame({
	phone,
	onPhone,
}: {
	phone: boolean;
	onPhone: () => void;
}) {
	const { atHome, threads } = useConversation();
	const [tab, setTab] = useState<Tab>('ask');
	const [railOpen, setRailOpen] = useState(false);
	const hasThreads = threads.length > 0;

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
			className={`bg-paper relative grid h-full grid-rows-[auto_minmax(0,1fr)] overflow-hidden @container ${
				phone
					? 'w-phone h-[min(844px,100%)] rounded-[26px] border border-edge shadow-[0_40px_70px_-50px_rgba(36,31,26,0.8)]'
					: ''
			}`}
		>
			<header
				className={`flex items-center justify-between gap-4 border-b px-5 py-3 transition-colors duration-300 @max-compact:px-3.5 @max-compact:py-2.5 ${
					atHome ? 'border-transparent' : 'border-paper-deep'
				}`}
			>
				{atHome ? (
					<span />
				) : (
					<div className="animate-settle grid gap-0.5">
						<Wordmark className="text-[17px]" />
						<RunningModel />
					</div>
				)}
				<TabBar
					tab={tab}
					onTab={setTab}
					onRail={() => setRailOpen((was) => !was)}
					railable={hasThreads}
					phone={phone}
					onPhone={onPhone}
				/>
			</header>

			<main
				className={`grid min-h-0 ${
					hasThreads
						? 'grid-cols-[var(--container-rail)_minmax(0,1fr)] @max-compact:grid-cols-1'
						: 'grid-cols-1'
				}`}
			>
				{hasThreads && (
					<div
						className={`min-h-0 @max-compact:bg-paper @max-compact:absolute @max-compact:inset-y-0 @max-compact:left-0 @max-compact:z-20 @max-compact:w-rail @max-compact:shadow-[8px_0_24px_-24px_rgba(36,31,26,0.9)] ${
							railOpen ? '' : '@max-compact:hidden'
						}`}
					>
						<ThreadRail onNavigate={() => setRailOpen(false)} />
					</div>
				)}

				{tab === 'ask' ? <AskPanel /> : <AddPanel />}
			</main>

			<PageView />
		</div>
	);
}
