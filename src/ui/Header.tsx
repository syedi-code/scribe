import { useState } from 'react';
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
 *
 * The giving up and taking back is a fold rather than a cut: `0fr`→`1fr` on a
 * grid row is what lets the header's own height ease instead of jumping as you
 * move between tabs. The clip that makes a fold a fold has to come off once it
 * has finished, or it would cut the model menu off where it hangs out of the
 * header — so it is on while the mark is away, and while it is on its way
 * back, and off once it has arrived.
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

	// The mark has arrived only once the row has finished growing. Every
	// change of mind starts the journey again, so the clip goes back on.
	const [arrived, setArrived] = useState(!bare);
	const [wasBare, setWasBare] = useState(bare);
	if (wasBare !== bare) {
		setWasBare(bare);
		setArrived(false);
	}
	const folding = bare || !arrived;

	return (
		<header
			className={`relative z-(--z-header) flex items-center justify-between gap-4 border-b px-5 py-3 transition-colors duration-300 @max-compact:px-3.5 @max-compact:py-2.5 ${
				bare ? 'border-transparent' : 'border-paper-deep'
			}`}
		>
			<div
				inert={bare}
				onTransitionEnd={() => {
					if (!bare) setArrived(true);
				}}
				className={`grid transition-[grid-template-rows,opacity] duration-300 ease-paper ${
					bare ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr]'
				}`}
			>
				<div className={folding ? 'overflow-hidden' : ''}>
					<div className="grid gap-0.5">
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
				</div>
			</div>

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
