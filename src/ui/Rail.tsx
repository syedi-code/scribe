import { useCallback, useRef } from 'react';
import { useDismiss } from '../lib/useDismiss';
import { ThreadRail } from './ThreadRail';

/**
 * Earlier questions, beside the reading surface when there is room for them
 * and over it when there is not.
 *
 * Narrow, the rail is an overlay, and an overlay says so: the page behind it
 * dims and a tap anywhere on it puts the rail away — including on the button
 * that opened it, which would otherwise reopen it on the same tap.
 *
 * Going to a conversation is not the same as putting the rail away, and the
 * two are separate props for it: wide, the rail never closes, so a thread
 * opened from the Books tab loaded into a panel nobody was looking at.
 */
export function Rail({
	open,
	onClose,
	onNavigate,
}: {
	open: boolean;
	onClose: () => void;
	onNavigate: () => void;
}) {
	const rail = useRef<HTMLDivElement>(null);

	const dismiss = useCallback(
		(event: Event) => {
			const target = event.target as Element | null;
			// The tap that closes must not be the tap that reopens; Escape has
			// no element to make an exception for.
			if (target?.closest?.('[data-rail-toggle]')) return;
			onClose();
		},
		[onClose]
	);
	useDismiss(rail, open, dismiss);

	return (
		<>
			{open && (
				<div
					aria-hidden
					onClick={onClose}
					className="bg-ink/15 absolute inset-0 z-(--z-rail) hidden @max-compact:block"
				/>
			)}
			<div
				ref={rail}
				className={`min-h-0 @max-compact:bg-paper @max-compact:absolute @max-compact:inset-y-0 @max-compact:left-0 @max-compact:z-(--z-rail) @max-compact:w-rail @max-compact:shadow-[8px_0_24px_-20px_rgba(36,31,26,0.9)] ${
					open ? '' : '@max-compact:hidden'
				}`}
			>
				<ThreadRail onNavigate={onNavigate} />
			</div>
		</>
	);
}
