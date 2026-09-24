import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { COPY } from '../copy';
import { AccountCorner } from '../account/AccountCorner';
import { useConversation } from '../chat/context';
import { useFlag } from '../flags/context';
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
 * Narrow, the header is two rows: the mark on the left of the first and the
 * account opposite it, and the tabs spread across the whole of the second.
 * Four tabs, the account and the mark on one row ran past a 360px phone, and a
 * round stamp in a row of words read as one more tab. On the home screen the
 * mark folds away as it does wide and the account keeps its corner, so it
 * never moves between screens. There the tabs move up beside it, into the
 * room the mark left (`TabBar`). The tab container is `contents` narrow, so the
 * tabs and the account are placed by the header's own grid.
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
	const account = useFlag('isAccountShown');
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
	const tabs = useRef<HTMLDivElement>(null);
	const conceal = useCallback((hidden: boolean) => {
		mark.current?.classList.toggle('invisible', hidden);
	}, []);

	// How tall the row is with the mark folded away, for the rail to rise by:
	// on the home screen the rail takes the empty corner (`ui/Rail`).
	//
	// Measured off the tabs and the account beside them, which do not fold,
	// and never off the row itself. The account's letter is the taller of the
	// two, so it is what sets the height when it is shown.
	//
	// This runs on the commit that starts the fold, when the row is still at
	// its open height — so coming back from a conversation the rail rose by
	// the open height, about twenty pixels too far, and pulled `Sessions` up
	// behind the header and off the top of the shell, which clips.
	useLayoutEffect(() => {
		const header = row.current;
		const shell = header?.parentElement;
		const tablist = tabs.current;
		if (!bare || !header || !shell || !tablist) return;

		const px = (value: string) => parseFloat(value) || 0;
		const measure = () => {
			const box = getComputedStyle(header);
			const frame =
				px(box.paddingTop) +
				px(box.paddingBottom) +
				px(box.borderBottomWidth);
			shell.style.setProperty(
				'--header-rest',
				`${tablist.offsetHeight + frame}px`
			);
		};

		measure();
		// The tabs change height when the window crosses the compact
		// breakpoint, and again when the face they are set in lands.
		const watch = new ResizeObserver(measure);
		watch.observe(tablist);
		return () => watch.disconnect();
	}, [bare]);

	return (
		<header
			ref={row}
			// Transparent to the pointer where it holds nothing, because on
			// the home screen the rail has risen under its empty corner.
			className={`pointer-events-none relative z-(--z-header) flex items-center justify-between gap-4 border-b px-5 py-3 transition-colors duration-300 @max-compact:grid @max-compact:grid-cols-[minmax(0,1fr)_auto] @max-compact:items-center @max-compact:gap-x-3 @max-compact:gap-y-2 @max-compact:px-3.5 @max-compact:py-2.5 ${
				bare ? 'border-transparent' : 'border-paper-deep'
			}`}
		>
			<div
				inert={bare}
				onTransitionEnd={() => {
					if (!bare) setArrived(true);
				}}
				// Opening, the fade waits half the journey, so the mark
				// arrives rather than crossing the row already lit.
				className={`grid transition-[grid-template-rows,opacity] duration-300 ease-paper @max-compact:col-start-1 @max-compact:row-start-1 ${
					bare
						? 'grid-rows-[0fr] opacity-0'
						: 'pointer-events-auto grid-rows-[1fr] [transition-delay:0ms,150ms]'
				}`}
			>
				<div className={folding ? 'overflow-hidden' : ''}>
					<button
						type="button"
						onClick={() => {
							onTab('ask');
							newQuestion();
						}}
						ref={mark}
						title={COPY.home}
						aria-label={COPY.home}
						className="block"
					>
						<Wordmark className="text-[17px]" />
					</button>
				</div>
			</div>

			{!bare && <Travel mark={mark} header={row} conceal={conceal} />}

			<div
				ref={tabs}
				className="flex items-center gap-4 @max-compact:contents"
			>
				<TabBar
					tab={tab}
					onTab={onTab}
					railable={railable}
					beside={bare}
				/>
				{account && (
					<div className="pointer-events-auto @max-compact:col-start-2 @max-compact:row-start-1">
						<AccountCorner />
					</div>
				)}
			</div>
		</header>
	);
}
