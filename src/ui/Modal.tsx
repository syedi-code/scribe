import { useEffect, useId, useRef, type ReactNode } from 'react';
import { COPY } from '../copy';
import { closeDialog } from '../state/dialog';

/** How far a sheet has to be pulled down before letting go puts it away. */
const DISMISS_AT = 80;

/**
 * The frame every modal in the app is drawn in: a sheet of lifted paper over
 * a dimmed page, a title, and one way to put it down.
 *
 * A native `<dialog>` opened with `showModal()`, because the browser already
 * does the three things a modal gets wrong — it traps focus, it answers
 * Escape, and it goes to the top layer, above every layer in `--z-*` without a
 * number being written here. Pressing the dimmed page closes it too, which is
 * what every reader expects of a sheet over something.
 *
 * Narrow, it is a sheet: it slides up from the bottom edge, takes the width,
 * carries a handle that pulls it back down, and keeps its `footer` — the one
 * thing to press — pinned within a thumb's reach however long the body is.
 * Wide, it sits in the middle at the width of a letter. One tree; the
 * container query decides, and the handle is only there to hold where it is
 * drawn.
 */
export function Modal({
	title,
	children,
	footer,
	onBack,
	wide = false,
}: {
	title: ReactNode;
	children: ReactNode;
	/** Pinned under the body, which scrolls past it. */
	footer?: ReactNode;
	/** A step back rather than out: checkout returns to the plans. */
	onBack?: () => void;
	/** Room for two columns side by side, for the plans. */
	wide?: boolean;
}) {
	const sheet = useRef<HTMLDialogElement>(null);
	const pull = useRef<{ from: number; by: number } | null>(null);
	const heading = useId();

	useEffect(() => {
		const element = sheet.current;
		if (!element) return;
		element.showModal();
		return () => element.close();
	}, []);

	// `translate`, not `transform`: the sheet's entrance is a transform
	// animation that holds its last frame, and would win over a transform set
	// here. The two properties compose.
	const moveTo = (by: number) => {
		if (sheet.current)
			sheet.current.style.translate = by ? `0 ${by}px` : '';
	};

	return (
		<dialog
			ref={sheet}
			aria-labelledby={heading}
			// Escape is taken over rather than let through: which modal is
			// open is the store's to say. Let the browser close the element
			// and its `close` event fires after the store has moved on — so
			// the plans, opened from the limit dialog, were shut by the
			// limit dialog on its way out.
			onCancel={(event) => {
				event.preventDefault();
				closeDialog();
			}}
			// The sheet fills the dialog box edge to edge, so a press that
			// lands on the dialog itself landed on the dim around it.
			onClick={(event) => {
				if (event.target === event.currentTarget) closeDialog();
			}}
			className={`bg-paper-lift text-ink border-paper-deep animate-rise m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] flex-col overflow-hidden rounded-2xl border p-0 shadow-[0_24px_60px_-30px_rgba(36,31,26,0.9)] transition-[translate] duration-300 ease-paper backdrop:bg-ink/25 open:flex @max-compact:animate-sheet @max-compact:mb-0 @max-compact:max-h-[calc(100dvh-1.5rem)] @max-compact:w-full @max-compact:max-w-none @max-compact:rounded-b-none @max-compact:border-b-0 ${
				wide ? 'max-w-[40rem]' : 'max-w-[26rem]'
			}`}
		>
			{/* The handle. Pulled down past DISMISS_AT it puts the sheet
			    away; short of that it springs back. */}
			<div
				aria-hidden
				onPointerDown={(event) => {
					event.currentTarget.setPointerCapture(event.pointerId);
					pull.current = { from: event.clientY, by: 0 };
					sheet.current?.classList.add('transition-none');
				}}
				onPointerMove={(event) => {
					if (!pull.current) return;
					pull.current.by = Math.max(
						0,
						event.clientY - pull.current.from
					);
					moveTo(pull.current.by);
				}}
				onPointerUp={() => {
					const by = pull.current?.by ?? 0;
					pull.current = null;
					sheet.current?.classList.remove('transition-none');
					moveTo(0);
					if (by > DISMISS_AT) closeDialog();
				}}
				onPointerCancel={() => {
					pull.current = null;
					moveTo(0);
				}}
				className="hidden touch-none justify-center pt-2.5 pb-1 @max-compact:flex"
			>
				<span className="bg-paper-deep h-1 w-9 rounded-full" />
			</div>

			<div className="flex items-center gap-2 px-6 pt-5 pb-4 @max-compact:px-5 @max-compact:pt-2">
				{onBack && (
					<button
						type="button"
						onClick={onBack}
						aria-label={COPY.dialog.back}
						className="font-read text-ink-soft hover:text-ink hover:bg-paper-deep -ml-2 grid size-9 place-items-center rounded-full pb-0.5 text-[1.6rem] leading-none transition-colors"
					>
						‹
					</button>
				)}
				{/* Focus lands on the title, not on the first button: a
				    dialog that opens with its ✕ ringed in verdigris is
				    saying *found* about a close button. */}
				<h2
					id={heading}
					tabIndex={-1}
					autoFocus
					className="font-read text-ink m-0 min-w-0 flex-1 text-[1.35rem] leading-tight font-light outline-none"
				>
					{title}
				</h2>
				<button
					type="button"
					onClick={closeDialog}
					aria-label={COPY.dialog.close}
					className="font-app text-ui text-ink-faint hover:text-ink hover:bg-paper-deep -mr-2 grid size-8 shrink-0 place-items-center rounded-full leading-none transition-colors"
				>
					✕
				</button>
			</div>

			<div
				className={`min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 @max-compact:px-5 ${
					footer
						? 'pb-5'
						: 'pb-6 @max-compact:pb-[max(1.5rem,env(safe-area-inset-bottom))]'
				}`}
			>
				{children}
			</div>

			{footer && (
				<div className="border-paper-deep border-t px-6 pt-4 pb-5 @max-compact:px-5 @max-compact:pb-[max(1.25rem,env(safe-area-inset-bottom))]">
					{footer}
				</div>
			)}
		</dialog>
	);
}
