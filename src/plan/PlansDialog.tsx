import type { ReactNode } from 'react';
import { COPY } from '../copy';
import { useAllowance } from '../state/allowance';
import { Modal } from '../ui/Modal';

/**
 * What a paid plan gives, beside what the reader has now.
 *
 * This is the placeholder checkout will replace, and it is the only one:
 * every offer of a paid plan in the app opens this (`seePlans`), so when
 * there is a price and a way to pay, it is built here and nowhere else.
 *
 * Until then it says so. The button that would take a reader's money is
 * drawn and disabled rather than left out, so the page has the shape it will
 * have, and a reader who came to pay is told plainly that they cannot yet —
 * not left pressing something that does nothing.
 */
export function PlansDialog() {
	const allowance = useAllowance();
	const onPaid = allowance?.plan === 'paid';
	const freeLimit =
		allowance?.plan === 'free' && allowance.limit !== null
			? allowance.limit
			: null;

	return (
		<Modal title={COPY.plan.plans.title} wide>
			<div className="grid grid-cols-2 gap-3 @max-compact:grid-cols-1">
				<Plan
					name={COPY.plan.plans.free}
					current={!onPaid}
					points={[
						freeLimit === null
							? null
							: COPY.plan.plans.freeLimit(freeLimit),
						COPY.plan.plans.freeModel,
						COPY.plan.plans.freeCitations,
					]}
				/>
				<Plan
					name={COPY.plan.plans.paid}
					price={COPY.plan.plans.price}
					current={onPaid}
					points={[
						COPY.plan.plans.paidMore,
						COPY.plan.plans.paidModels,
						COPY.plan.plans.paidEverything,
					]}
				>
					{!onPaid && (
						<button
							type="button"
							disabled
							className="font-app text-ui bg-ink text-paper mt-4 w-full cursor-default rounded-full px-4 py-2 leading-none opacity-40"
						>
							{COPY.plan.plans.choose}
						</button>
					)}
				</Plan>
			</div>
			<p className="font-app text-small text-ink-soft mt-4 mb-0">
				{COPY.plan.plans.note}
			</p>
		</Modal>
	);
}

function Plan({
	name,
	price,
	current,
	points,
	children,
}: {
	name: string;
	price?: string;
	current: boolean;
	points: (string | null)[];
	children?: ReactNode;
}) {
	return (
		<section
			// The plan on offer is the one drawn forward. The reader's own is
			// named, not shaded: shading it made the plan they are on look like
			// the better one.
			className={`flex flex-col rounded-xl border px-4 pt-3.5 pb-4 ${
				current
					? 'border-paper-deep'
					: 'border-edge shadow-[0_10px_28px_-22px_rgba(36,31,26,0.9)]'
			}`}
		>
			<div className="flex items-baseline justify-between gap-2">
				<h3 className="font-read text-ink m-0 text-[1.15rem] leading-tight font-normal">
					{name}
				</h3>
				{current && (
					<span className="font-app text-tiny text-ink-soft">
						{COPY.plan.plans.current}
					</span>
				)}
			</div>
			{price && (
				<p className="font-app text-small text-ink-faint mt-0.5 mb-0">
					{price}
				</p>
			)}
			<ul className="m-0 mt-3 grid list-none gap-1.5 p-0">
				{points
					.filter((point): point is string => point !== null)
					.map((point) => (
						<li
							key={point}
							className="font-app text-small text-ink-soft grid grid-cols-[0.9rem_minmax(0,1fr)] items-start gap-x-1.5"
						>
							{/* The same short rule the home screen's questions
							    hang from, rather than a tick: a tick in this
							    app would read as *found*. */}
							<span
								aria-hidden
								className="bg-ink-faint mt-[0.6em] h-px w-2 justify-self-end"
							/>
							<span>{point}</span>
						</li>
					))}
			</ul>
			<div className="mt-auto">{children}</div>
		</section>
	);
}
