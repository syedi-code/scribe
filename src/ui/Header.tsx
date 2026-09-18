import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { COPY } from '../copy';
import { useConversation } from '../chat/context';
import { RunningModel } from '../models/RunningModel';
import { TabBar } from './TabBar';
import { Travel } from './Travel';
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
 *
 * Leaving the home screen, the big mark does not vanish and reappear here: it
 * travels into the corner over the same 300ms (`Travel`).
 */
export function Header({
	tab,
	onTab,
	railable,
}: {
	tab: Tab;
	onTab: (tab: Tab) => void;
	railable: boolean;
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
	const row = useRef<HTMLElement>(null);
	const mark = useRef<HTMLButtonElement>(null);
	const conceal = useCallback((hidden: boolean) => {
		mark.current?.classList.toggle('invisible', hidden);
	}, []);

	// How tall the row is with the mark folded away, for the rail to rise by:
	// on the home screen the rail takes the empty corner (`ui/Rail`).
	useLayoutEffect(() => {
		const header = row.current;
		if (!bare || !header?.parentElement) return;
		header.parentElement.style.setProperty(
			'--header-rest',
			`${header.offsetHeight}px`
		);
	}, [bare]);

	return (
		<header
			ref={row}
			// Transparent to the pointer where it holds nothing, because on
			// the home screen the rail has risen under its empty corner.
			className={`pointer-events-none relative z-(--z-header) flex items-center justify-between gap-4 border-b px-5 py-3 transition-colors duration-300 @max-compact:px-3.5 @max-compact:py-2.5 ${
				bare ? 'border-transparent' : 'border-paper-deep'
			}`}
		>
			<div
				inert={bare}
				onTransitionEnd={() => {
					if (!bare) setArrived(true);
				}}
				// Opening, the fade waits half the journey, so the model line
				// comes up under a mark that has all but landed rather than
				// through one still crossing it.
				className={`grid transition-[grid-template-rows,opacity] duration-300 ease-paper ${
					bare
						? 'grid-rows-[0fr] opacity-0'
						: 'pointer-events-auto grid-rows-[1fr] [transition-delay:0ms,150ms]'
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
							ref={mark}
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

			{!bare && <Travel mark={mark} header={row} conceal={conceal} />}

			<TabBar tab={tab} onTab={onTab} railable={railable} />
		</header>
	);
}
