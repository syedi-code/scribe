import { COPY } from '../copy';
import { openSignIn } from '../state/dialog';
import { remainingOf } from '../state/allowance';
import type { Allowance } from '../api/types';

/**
 * Under a visitor's composer: how many questions they have before signing
 * in, and the way to sign in once they are nearly or wholly spent.
 *
 * Before any question it is one quiet line of what is on offer — *3 questions
 * without signing in* — rather than a count, because a count from the first
 * minute makes the door feel metered. The count arrives at one left, the way
 * the monthly one waits for two; spent, it is the reason the composer has
 * closed, and the button beside it opens the sign-in dialog.
 */
export function VisitorNotice({ allowance }: { allowance: Allowance }) {
	const left = remainingOf(allowance) ?? 0;
	const limit = allowance.limit ?? 0;

	if (left > 1) {
		return (
			<p className="font-app text-small text-ink-faint m-0 mt-2 text-center">
				{COPY.visitor.allowance(allowance.used === 0 ? limit : left)}
			</p>
		);
	}

	const spent = left === 0;
	return (
		<div
			className="border-paper-deep bg-paper-lift mt-2 flex items-center gap-4 rounded-xl border px-3.5 py-3 @max-compact:flex-col @max-compact:items-stretch @max-compact:gap-2.5"
			role="status"
			aria-live="polite"
		>
			<div className="min-w-0 flex-1">
				<p className="font-app text-ui text-ink m-0">
					{spent ? COPY.visitor.spent : COPY.visitor.lastOne}
				</p>
				{spent && (
					<p className="font-app text-small text-ink-soft m-0 mt-0.5">
						{COPY.visitor.spentNote}
					</p>
				)}
			</div>
			<button
				type="button"
				onClick={() => openSignIn(spent ? 'spent' : 'chosen')}
				className={`font-app text-small shrink-0 rounded-full px-3.5 py-1.5 leading-none transition-[background-color,opacity] ${
					spent
						? 'bg-ink text-paper hover:opacity-85'
						: 'text-ink border-edge hover:bg-paper-deep border'
				}`}
			>
				{COPY.visitor.signIn}
			</button>
		</div>
	);
}

/**
 * Under the composer of a visitor we could not let in as a guest: one line,
 * so the first thing they learn is how to ask rather than that they cannot.
 */
export function LookingNotice() {
	return (
		<p className="font-app text-small text-ink-faint m-0 mt-2 text-center">
			<button
				type="button"
				onClick={() => openSignIn('blocked')}
				className="text-ink-soft hover:text-ink border-paper-deep border-b"
			>
				{COPY.visitor.signIn}
			</button>{' '}
			{COPY.visitor.lookingNote}
		</p>
	);
}
