import { useCallback, useRef, useState } from 'react';
import { COPY } from '../copy';
import { useDismiss } from '../lib/useDismiss';
import { openDialog, seePlans } from '../state/dialog';
import { Monogram } from './Monogram';
import { useAccount } from './useAccount';

/**
 * The reader's own corner: their stamp at the far end of the header, and a
 * menu under it.
 *
 * Where every chat app has settled it — ChatGPT, Claude and Gemini all keep
 * the account one press from anywhere, behind a mark that is the reader's
 * own, and open a short menu rather than a page. The button says the plan
 * beside the stamp, because *what am I on* is the question most often asked
 * of it, and answering it on the button saves the press. Narrow, the stamp
 * alone: the tab bar needs the room.
 *
 * The menu opens on who you are — the stamp again, larger, the address, and
 * what is left — before it offers anything, because that is most often all a
 * reader came to check.
 */
export function AccountMenu() {
	const account = useAccount();
	const [open, setOpen] = useState(false);
	const host = useRef<HTMLDivElement>(null);
	const close = useCallback(() => setOpen(false), []);
	useDismiss(host, open, close);

	const choose = (then: () => void) => () => {
		close();
		then();
	};

	return (
		<div ref={host} className="pointer-events-auto relative">
			<button
				type="button"
				aria-haspopup="menu"
				aria-expanded={open}
				aria-label={COPY.account.open}
				title={account.email}
				onClick={() => setOpen((was) => !was)}
				className={`border-paper-deep flex items-center gap-2 rounded-full border py-[3px] pr-3 pl-[3px] transition-colors hover:bg-paper-deep @max-compact:border-transparent @max-compact:p-1.5 @max-compact:hover:bg-transparent ${
					open
						? 'bg-paper-deep'
						: 'bg-paper-lift @max-compact:bg-transparent'
				}`}
			>
				<Monogram email={account.email} />
				<span className="font-app text-small text-ink-soft leading-none @max-compact:hidden">
					{account.planName}
				</span>
			</button>

			<div
				role="menu"
				hidden={!open}
				className="border-paper-deep bg-paper-lift animate-rise absolute top-10 right-0 z-(--z-menu) w-[18rem] max-w-[calc(100cqw-1.5rem)] overflow-hidden rounded-2xl border py-1.5 shadow-[0_16px_34px_-24px_rgba(36,31,26,0.9)]"
			>
				<div className="flex items-center gap-3 px-3.5 pt-2 pb-3">
					<Monogram email={account.email} large />
					<div className="min-w-0">
						<p className="font-app text-ui text-ink m-0 truncate">
							{account.email}
						</p>
						<p className="font-app text-small text-ink-faint m-0 mt-0.5">
							{COPY.account.summary(
								account.planName,
								account.left
							)}
						</p>
					</div>
				</div>
				<div className="border-paper-deep my-1 border-t" />
				<Item onClick={choose(() => openDialog('account'))}>
					{COPY.account.menu}
				</Item>
				{account.offerPlans && (
					<Item onClick={choose(seePlans)}>{COPY.plan.see}</Item>
				)}
				<div className="border-paper-deep my-1 border-t" />
				<Item onClick={account.signOut} disabled={account.leaving}>
					{account.leaving
						? COPY.account.signingOut
						: COPY.account.signOut}
				</Item>
			</div>
		</div>
	);
}

function Item({
	onClick,
	disabled = false,
	children,
}: {
	onClick: () => void;
	disabled?: boolean;
	children: string;
}) {
	return (
		<button
			type="button"
			role="menuitem"
			onClick={onClick}
			disabled={disabled}
			className="font-app text-ui text-ink block w-full px-3.5 py-2 text-left enabled:hover:bg-paper-deep disabled:text-ink-faint disabled:cursor-default @max-compact:py-2.5"
		>
			{children}
		</button>
	);
}
