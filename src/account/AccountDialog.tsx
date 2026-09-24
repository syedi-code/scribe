import type { ReactNode } from 'react';
import { COPY } from '../copy';
import { remainingOf, standingOf } from '../state/allowance';
import { seePlans } from '../state/dialog';
import { Modal } from '../ui/Modal';
import { Billing } from './Billing';
import { useAccount } from './useAccount';
import type { Allowance } from '../api/types';

/**
 * The account, as a settings sheet: a label on the left, the fact on the
 * right, a hairline between each — the arrangement ChatGPT and Claude both
 * give their settings, because a reader scanning for one fact reads down the
 * left and across once.
 *
 * The week is shown here as a measure and a word, though the rest of the app
 * says nothing about it until two questions are left. A reader who opens their
 * account has asked — but never as a count out of the allowance, which is
 * tuned week to week and is not a number the app promises.
 */
export function AccountDialog() {
	const account = useAccount();
	const { allowance } = account;

	return (
		<Modal title={COPY.account.title}>
			<dl className="m-0">
				<Row label={COPY.account.email}>
					<span className="block truncate">{account.email}</span>
				</Row>

				<Row label={COPY.account.plan}>
					<span className="flex items-center justify-between gap-3">
						<span>{account.planName}</span>
						{account.offerPlans && !account.admin && (
							<button
								type="button"
								onClick={seePlans}
								className="font-app text-small text-ink border-edge hover:bg-paper-deep rounded-full border px-3 py-1 leading-none transition-colors"
							>
								{COPY.plan.see}
							</button>
						)}
					</span>
					{!account.admin && <Billing plan={account.plan} />}
				</Row>

				{allowance && (
					<Row label={COPY.account.week}>
						{allowance.limit === null ? (
							COPY.account.unlimited
						) : (
							<>
								<span className="block">
									{standingIn(allowance)}
								</span>
								<Measure
									used={allowance.used}
									limit={allowance.limit}
									label={standingIn(allowance)}
								/>
								{allowance.resets_at && (
									<span className="font-app text-small text-ink-faint mt-1.5 block">
										{COPY.plan.resets(allowance.resets_at)}
									</span>
								)}
							</>
						)}
					</Row>
				)}
			</dl>

			<div className="border-paper-deep mt-1 flex items-center justify-between gap-4 border-t pt-4">
				<p className="font-app text-small text-ink-faint m-0">
					{COPY.account.signOutNote}
				</p>
				<button
					type="button"
					onClick={account.signOut}
					disabled={account.leaving}
					className="font-app text-small text-ink border-edge enabled:hover:bg-paper-deep shrink-0 rounded-full border px-3 py-1 leading-none transition-colors disabled:text-ink-faint"
				>
					{account.leaving
						? COPY.account.signingOut
						: COPY.account.signOut}
				</button>
			</div>
		</Modal>
	);
}

function Row({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="border-paper-deep grid grid-cols-[6rem_minmax(0,1fr)] items-baseline gap-4 border-t py-3 first:border-t-0 first:pt-0 @max-compact:grid-cols-1 @max-compact:gap-1">
			<dt className="font-app text-small text-ink-faint">{label}</dt>
			<dd className="font-app text-ui text-ink m-0">{children}</dd>
		</div>
	);
}

/**
 * How much of the month is gone, as a length. In ink, not a status colour:
 * nearly spent is not *not found*, and rubric here would be the first place
 * that colour meant two things.
 */
function Measure({
	used,
	limit,
	label,
}: {
	used: number;
	limit: number;
	label: string;
}) {
	const share = limit === 0 ? 1 : Math.min(1, used / limit);
	return (
		<span
			role="meter"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={Math.round(share * 100)}
			aria-valuetext={label}
			aria-label={COPY.account.week}
			className="bg-paper-deep mt-2 block h-1 overflow-hidden rounded-full"
		>
			<span
				className="bg-ink block h-full rounded-full transition-[width] duration-500 ease-paper"
				style={{ width: `${share * 100}%` }}
			/>
		</span>
	);
}

/** How the week stands, in words; a count only once there are two or fewer. */
function standingIn(allowance: Allowance): string {
	const standing = standingOf(allowance);
	if (standing === 'spent') return COPY.account.spent;
	if (standing === 'last-few')
		return COPY.plan.remaining(remainingOf(allowance) ?? 0);
	return COPY.account.plenty;
}
