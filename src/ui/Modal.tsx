import { useEffect, useId, useRef, type ReactNode } from 'react';
import { COPY } from '../copy';
import { closeDialog } from '../state/dialog';

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
 * Narrow, it rises from the bottom edge and takes the width, the way a sheet
 * does on a phone; wide, it sits in the middle at the width of a letter.
 */
export function Modal({
	title,
	children,
	wide = false,
}: {
	title: ReactNode;
	children: ReactNode;
	/** Room for two columns side by side, for the plans. */
	wide?: boolean;
}) {
	const sheet = useRef<HTMLDialogElement>(null);
	const heading = useId();

	useEffect(() => {
		const element = sheet.current;
		if (!element) return;
		element.showModal();
		return () => element.close();
	}, []);

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
			className={`bg-paper-lift text-ink border-paper-deep animate-rise m-auto w-[calc(100%-2rem)] overflow-visible rounded-2xl border p-0 shadow-[0_24px_60px_-30px_rgba(36,31,26,0.9)] backdrop:bg-ink/25 @max-compact:mb-0 @max-compact:w-full @max-compact:rounded-b-none ${
				wide ? 'max-w-[37rem]' : 'max-w-[26rem]'
			}`}
		>
			<div className="px-6 pt-5 pb-6 @max-compact:px-5 @max-compact:pb-[max(1.5rem,env(safe-area-inset-bottom))]">
				<div className="mb-4 flex items-baseline justify-between gap-4">
					<h2
						id={heading}
						className="font-read text-ink m-0 text-[1.35rem] leading-tight font-light"
					>
						{title}
					</h2>
					<button
						type="button"
						onClick={closeDialog}
						aria-label={COPY.dialog.close}
						className="font-app text-ui text-ink-faint hover:text-ink hover:bg-paper-deep -mr-2 rounded-full px-2 py-0.5 leading-none transition-colors"
					>
						✕
					</button>
				</div>
				{children}
			</div>
		</dialog>
	);
}
