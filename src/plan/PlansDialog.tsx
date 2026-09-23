import type { ReactNode } from 'react';
import { COPY } from '../copy';
import { useAccount } from '../account/useAccount';
import { tierNamesOf } from '../models/tiers';
import { openDialog } from '../state/dialog';
import { LegalLinks } from '../ui/LegalLinks';
import { Modal } from '../ui/Modal';
import { priceOf, usePlans } from './usePlans';
import type { PlanOffer } from '../api/types';

/**
 * Free beside Paid, and the way to Paid.
 *
 * Every offer of a paid plan in the app opens this (`seePlans`), and checkout
 * is reached from here and nowhere else.
 *
 * Laid out to be read in one pass. A card carries only what differs between
 * the two — the number of questions, set large because it is the difference a
 * reader actually feels, then the models — and what both plans share is said
 * once underneath. The plan on offer is drawn forward and holds the only
 * filled button; the reader's own is named, not shaded, because shading it
 * made the plan they are on look like the better one.
 *
 * What it will not do is lean on anyone. The price and how it is billed sit
 * beside the button, not behind it; nothing counts down; leaving is as plain
 * as staying; Free is described as it is, not as a lesser thing. Narrow, Paid
 * comes first so its button is in reach without scrolling — the order a
 * reader who opened *See plans* came for.
 */
export function PlansDialog() {
	const plans = usePlans();
	const account = useAccount();
	const free = plans.value?.find((plan) => plan.id === 'free');
	const paid = plans.value?.find((plan) => plan.id === 'paid');

	return (
		<Modal title={COPY.plan.plans.title} wide>
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
					<div className="grid grid-cols-2 gap-3 @max-compact:grid-cols-1">
						<Card
							plan={free}
							name={COPY.plan.plans.free}
							price={COPY.plan.plans.freePrice}
							current={account.plan === 'free' && !account.admin}
						/>
						<Card
							plan={paid}
							name={COPY.plan.plans.paid}
							price={priceOf(paid)}
							current={account.plan === 'paid'}
							forward
						>
							{account.offerPlans && (
								<>
									<button
										type="button"
										onClick={() => openDialog('checkout')}
										className="font-app text-ui bg-ink text-paper w-full rounded-full px-4 py-2.5 leading-none transition-opacity hover:opacity-85 @max-compact:py-3"
									>
										{COPY.plan.plans.choose}
									</button>
									<p className="font-app text-tiny text-ink-faint m-0 mt-2 text-center">
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
		</Modal>
	);
}

function Card({
	plan,
	name,
	price,
	current,
	forward = false,
	children,
}: {
	plan: PlanOffer;
	name: string;
	price: string;
	current: boolean;
	/** The plan on offer: drawn forward, and first when stacked. */
	forward?: boolean;
	children?: ReactNode;
}) {
	return (
		<section
			aria-label={name}
			className={`bg-paper-lift flex flex-col rounded-xl border px-5 pt-4 pb-5 ${
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
			<p className="font-app text-small text-ink-soft m-0 mt-0.5">
				{price}
			</p>

			<p className="m-0 mt-4 flex items-baseline gap-2">
				<span className="font-read text-ink text-[2.4rem] leading-none font-light tabular-nums">
					{plan.turns_per_month}
				</span>
				<span className="font-app text-small text-ink-soft">
					{COPY.plan.plans.questions}
				</span>
			</p>

			<div className="border-paper-deep mt-4 border-t pt-3">
				<p className="font-app text-tiny text-ink-faint m-0 mb-1.5">
					{COPY.plan.plans.models}
				</p>
				<ul className="m-0 grid list-none gap-1 p-0">
					{tierNamesOf(plan.models).map((name) => (
						<li key={name} className="font-app text-ui text-ink">
							{name}
						</li>
					))}
				</ul>
			</div>

			{plan.page_scans !== undefined && (
				<div className="border-paper-deep mt-3 border-t pt-3">
					<p className="font-app text-tiny text-ink-faint m-0 mb-1.5">
						{COPY.plan.plans.sources}
					</p>
					<p className="font-app text-ui text-ink m-0">
						{plan.page_scans
							? COPY.plan.plans.sourceScan
							: COPY.plan.plans.sourceText}
					</p>
				</div>
			)}

			{children && <div className="mt-auto pt-5">{children}</div>}
		</section>
	);
}
