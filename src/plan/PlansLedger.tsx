import type { ReactNode } from 'react';
import { COPY } from '../copy';
import { useAccount } from '../account/useAccount';
import { TierMark } from '../models/TierMark';
import { tiersOf } from '../models/tiers';
import { openDialog } from '../state/dialog';
import { LegalLinks } from '../ui/LegalLinks';
import { amountOf, nothingIn, timesFree, usePlans } from './usePlans';
import type { PlanOffer } from '../api/types';

/**
 * Free beside Pro, and the way to Pro.
 *
 * Shown in two places and drawn once: the Plans tab, and the sheet every
 * offer of a paid plan opens (`seePlans`). Checkout is reached from here and
 * nowhere else.
 *
 * A ledger: both cards carry the same rows in the same order, and each card is
 * a subgrid of one six-row grid, so a row sits level with its partner however
 * its text wraps and the eye reads straight across. The price is the largest
 * thing on a card, in one unit on both. Every row is a plain label, the fact,
 * and at most a line saying what the fact means.
 *
 * What it will not do is lean on anyone. The terms sit beside the button, not
 * behind it; nothing counts down; Free is described as it is. The reader's own
 * plan is named, not shaded. Narrow, Pro comes first and Free folds to its name
 * and price, so the button is in reach without scrolling past a whole card.
 */
export function PlansLedger() {
	const plans = usePlans();
	const account = useAccount();
	const free = plans.value?.find((plan) => plan.id === 'free');
	const paid = plans.value?.find((plan) => plan.id === 'paid');

	return (
		<>
			{plans.error ? (
				<p className="font-app text-small text-ink-soft m-0">
					{COPY.plan.plans.unreachable}
				</p>
			) : !free || !paid ? (
				<p className="font-app text-small text-ink-faint m-0 min-h-60 animate-breathe">
					{COPY.plan.plans.loading}
				</p>
			) : (
				<>
					<div className="grid grid-cols-2 grid-rows-[repeat(6,auto)] gap-x-3 @max-compact:grid-cols-1 @max-compact:grid-rows-none @max-compact:gap-y-3">
						<Card
							plan={free}
							name={COPY.plan.plans.free}
							amount={nothingIn(paid)}
							period={null}
							note={COPY.plan.plans.freeFor}
							questions={COPY.plan.plans.freeQuestions}
							modelsNote={COPY.plan.plans.freeModels}
							current={account.plan === 'free' && !account.admin}
						/>
						<Card
							plan={paid}
							name={COPY.plan.plans.paid}
							amount={amountOf(paid)}
							period={COPY.plan.plans.aMonth}
							note={COPY.plan.plans.paidFor}
							questions={COPY.plan.plans.paidQuestions(
								timesFree(free, paid)
							)}
							modelsNote={COPY.plan.plans.paidModels}
							current={account.plan === 'paid'}
							forward
						>
							{account.offerPlans && (
								<>
									<button
										type="button"
										onClick={() => openDialog('checkout')}
										className="font-app text-ask bg-ink text-paper w-full rounded-full px-4 py-3.5 leading-none transition-opacity hover:opacity-85"
									>
										{COPY.plan.plans.choose}
									</button>
									<p className="font-app text-tiny text-ink-faint m-0 mt-2.5 text-center">
										{COPY.plan.plans.terms}
									</p>
								</>
							)}
						</Card>
					</div>
					<p className="font-app text-small text-ink-soft m-0 mt-4">
						{COPY.plan.plans.shared}
					</p>
					<LegalLinks className="mt-3" />
				</>
			)}
		</>
	);
}

function Card({
	plan,
	name,
	amount,
	period,
	note,
	questions,
	modelsNote,
	current,
	forward = false,
	children,
}: {
	plan: PlanOffer;
	name: string;
	/** Null until Stripe has a price on sale. */
	amount: string | null;
	period: string | null;
	note: string;
	questions: string;
	modelsNote: string;
	current: boolean;
	/** The plan on offer: drawn forward, and first and whole when stacked. */
	forward?: boolean;
	children?: ReactNode;
}) {
	// Narrow, the plan not on offer folds to its name and price.
	const folds = forward ? '' : '@max-compact:hidden';

	return (
		<section
			aria-label={name}
			className={`bg-paper-lift row-span-6 grid grid-rows-subgrid rounded-xl border px-5 pt-4 pb-5 @max-compact:row-span-1 @max-compact:flex @max-compact:flex-col ${
				forward
					? 'border-ink/35 shadow-[0_14px_34px_-24px_rgba(36,31,26,0.9)] @max-compact:order-first'
					: 'border-paper-deep'
			}`}
		>
			<div className="flex items-center justify-between gap-2">
				<h3 className="font-read text-ink m-0 text-[1.2rem] leading-tight font-normal">
					{name}
				</h3>
				{current && (
					<span className="font-app text-tiny text-ink-soft bg-paper-deep rounded-full px-2 py-0.5">
						{COPY.plan.plans.current}
					</span>
				)}
			</div>

			<div
				className={`pt-2.5 pb-4 ${forward ? '' : '@max-compact:pb-0'}`}
			>
				{amount ? (
					<p className="m-0 flex items-baseline gap-1.5">
						<span className="font-read text-ink text-[2.5rem] leading-none font-light tabular-nums">
							{amount}
						</span>
						{period && (
							<span className="font-app text-ui text-ink-soft">
								{period}
							</span>
						)}
					</p>
				) : (
					<p className="font-read text-ink m-0 text-[1.35rem] leading-[2.5rem] font-light">
						{COPY.plan.plans.priceLater}
					</p>
				)}
				<p className="font-app text-small text-ink-soft m-0 mt-1">
					{note}
				</p>
			</div>

			<Row label={COPY.plan.plans.questions} className={folds}>
				{questions}
			</Row>

			<Row
				label={COPY.plan.plans.models}
				note={modelsNote}
				className={folds}
			>
				{tiersOf(plan.models).map((tier, at) => (
					<span key={tier.id}>
						{at > 0 && ' and '}
						<TierMark name={tier.name} tier={tier.id} />
					</span>
				))}
			</Row>

			<Row label={COPY.plan.plans.sources} className={folds}>
				<span className="flex gap-2">
					<Mark given={plan.page_scans === true} />
					<span>
						{plan.page_scans
							? COPY.plan.plans.sourceScan
							: COPY.plan.plans.sourceText}
					</span>
				</span>
			</Row>

			<div className={`self-end pt-2 @max-compact:self-stretch ${folds}`}>
				{children}
			</div>
		</section>
	);
}

function Row({
	label,
	note,
	className,
	children,
}: {
	label: string;
	note?: string;
	className: string;
	children: ReactNode;
}) {
	return (
		<div className={`border-paper-deep border-t py-3 ${className}`}>
			<p className="font-app text-tiny text-ink-faint m-0 mb-1">
				{label}
			</p>
			<p className="font-app text-ask text-ink m-0">{children}</p>
			{note && (
				<p className="font-app text-small text-ink-soft m-0 mt-0.5">
					{note}
				</p>
			)}
		</div>
	);
}

/**
 * A check or a dash, in ink: colour on a mark is a citation's verdict, and a
 * green check here would read as *verified*. Both are drawn in one 14px box
 * whose height is one line of the text beside it, so the mark sits on the
 * first line's centre however the sentence wraps, and level with its partner
 * across the cards.
 */
function Mark({ given }: { given: boolean }) {
	return (
		<span
			aria-hidden
			className={`flex h-[1lh] w-3.5 shrink-0 items-center ${given ? 'text-ink' : 'text-ink-faint'}`}
		>
			<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
				{given ? (
					<path
						d="M2.75 7.25 5.5 10l5.75-6.5"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				) : (
					<path
						d="M3.5 7h7"
						stroke="currentColor"
						strokeWidth="1.5"
						strokeLinecap="round"
					/>
				)}
			</svg>
		</span>
	);
}
