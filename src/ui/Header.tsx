import { COPY } from '../copy';
import { useConversation } from '../chat/context';
import { RunningModel } from '../models/RunningModel';
import { TabBar } from './TabBar';
import { Wordmark } from './Wordmark';
import type { Tab } from './tabs';

/**
 * The header stands in its own stacking context above every panel, because the
 * model switcher hangs out of it over whatever is below.
 *
 * The home screen carries the wordmark itself, so the header gives its left
 * half up while you are there and the rule under it goes; everywhere else the
 * mark is the way back, and returns to a home screen that writes itself out
 * again.
 */
export function Header({
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
	const { atHome, newQuestion } = useConversation();
	const bare = atHome && tab === 'ask';

	return (
		<header
			className={`relative z-(--z-header) flex items-center justify-between gap-4 border-b px-5 py-3 transition-colors duration-300 @max-compact:px-3.5 @max-compact:py-2.5 ${
				bare ? 'border-transparent' : 'border-paper-deep'
			}`}
		>
			{bare ? (
				<span />
			) : (
				<div className="animate-settle grid gap-0.5">
					<button
						type="button"
						onClick={() => {
							onTab('ask');
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
				onTab={onTab}
				onRail={onRail}
				railable={railable}
				railOpen={railOpen}
			/>
		</header>
	);
}
