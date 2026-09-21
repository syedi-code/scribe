import { useCallback, useRef, useState } from 'react';
import { COPY } from '../copy';
import { useDismiss } from '../lib/useDismiss';
import { openDialog, seePlans } from '../state/dialog';
import { monogramOf, useAccount } from './useAccount';

/**
 * The reader's own corner: a letter at the far end of the header, and a menu
 * under it.
 *
 * Where every chat app has settled it — ChatGPT, Claude and Gemini all keep
 * the account one press from anywhere, behind a mark that is the reader's
 * own, and open a short menu rather than a page. The menu says who you are and
 * what you are on before it offers anything, because that is most often all a
 * reader came to check; the rest is one row each.
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
				className={`font-read text-small text-ink border-edge grid size-7 place-items-center rounded-full border leading-none transition-colors hover:bg-paper-deep ${
					open ? 'bg-paper-deep' : 'bg-paper-lift'
				}`}
			>
				{monogramOf(account.email)}
			</button>

			<div
				role="menu"
				hidden={!open}
				className="border-paper-deep bg-paper-lift absolute top-9 right-0 z-(--z-menu) w-[17rem] max-w-[calc(100cqw-1.5rem)] overflow-hidden rounded-xl border py-1 shadow-[0_16px_34px_-24px_rgba(36,31,26,0.9)]"
			>
				<div className="px-3 pt-1.5 pb-2">
					<p className="font-app text-ui text-ink m-0 truncate">
						{account.email}
					</p>
					<p className="font-app text-small text-ink-faint m-0 mt-0.5">
						{COPY.account.summary(account.planName, account.left)}
					</p>
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
			className="font-app text-ui text-ink block w-full px-3 py-1.5 text-left enabled:hover:bg-paper-deep disabled:text-ink-faint disabled:cursor-default"
		>
			{children}
		</button>
	);
}
