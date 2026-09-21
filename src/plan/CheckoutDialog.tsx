import { useState, type ReactNode } from 'react';
import { describeApiError } from '../api/client';
import { startCheckout } from '../api/billing';
import { COPY } from '../copy';
import { useAccount } from '../account/useAccount';
import { BrandedLabel } from '../models/BrandedLabel';
import { backDialog } from '../state/dialog';
import { Modal } from '../ui/Modal';
import { priceOf, usePlans } from './usePlans';

type Step =
	| { kind: 'ready' }
	| { kind: 'opening' }
	| { kind: 'not-open' }
	| { kind: 'failed'; reason: string };

/**
 * The last thing a reader sees before paying: what they are buying, what it
 * costs, how it is billed, and where their card goes — all before the button,
 * so nothing arrives as a surprise on the page after it.
 *
 * The button asks alexandria for a Stripe Checkout session and goes to it
 * (`startCheckout`). Card details are typed into Stripe's page, never this
 * one. Until checkout is open alexandria says so, and this says so to the
 * reader in the same place the payment page would have opened: nothing
 * charged, nothing half-done.
 */
export function CheckoutDialog() {
	const plans = usePlans();
	const account = useAccount();
	const [step, setStep] = useState<Step>({ kind: 'ready' });
	const paid = plans.value?.find((plan) => plan.id === 'paid');

	const pay = async () => {
		setStep({ kind: 'opening' });
		try {
			const checkout = await startCheckout();
			if (checkout.kind === 'redirect') {
				window.location.assign(checkout.url);
				return;
			}
			setStep({ kind: 'not-open' });
		} catch (error) {
			setStep({ kind: 'failed', reason: describeApiError(error) });
		}
	};

	const footer = (
		<>
			{step.kind === 'not-open' && (
				<p
					role="status"
					className="font-app text-small text-ink bg-paper-deep/60 m-0 mb-3 rounded-lg px-3 py-2.5"
				>
					{COPY.checkout.notOpen}
				</p>
			)}
			{step.kind === 'failed' && (
				<p
					role="alert"
					className="font-app text-small text-rubric m-0 mb-3"
				>
					{step.reason}
				</p>
			)}
			<button
				type="button"
				onClick={pay}
				disabled={
					!paid || step.kind === 'opening' || step.kind === 'not-open'
				}
				className="font-app text-ui bg-ink text-paper w-full rounded-full px-4 py-3 leading-none transition-opacity enabled:hover:opacity-85 disabled:cursor-default disabled:opacity-40"
			>
				{step.kind === 'opening'
					? COPY.checkout.opening
					: COPY.checkout.pay}
			</button>
			<p className="font-app text-tiny text-ink-faint m-0 mt-2.5 text-center">
				{COPY.checkout.stripe}
			</p>
		</>
	);

	return (
		<Modal title={COPY.checkout.title} onBack={backDialog} footer={footer}>
			{!paid ? (
				<p className="font-app text-small text-ink-faint m-0">
					{plans.error
						? COPY.plan.plans.unreachable
						: COPY.plan.plans.loading}
				</p>
			) : (
				<>
					<dl className="border-paper-deep m-0 rounded-xl border px-4">
						<Row label={COPY.checkout.questions}>
							{COPY.checkout.perMonth(paid.turns_per_month)}
						</Row>
						<Row label={COPY.checkout.models}>
							{paid.models.map((model, at) => (
								<span key={model.id}>
									{at > 0 && ', '}
									<BrandedLabel label={model.label} />
								</span>
							))}
						</Row>
						<Row label={COPY.checkout.price}>{priceOf(paid)}</Row>
						<Row label={COPY.checkout.billing}>
							{COPY.checkout.billingValue}
						</Row>
						<Row label={COPY.checkout.account}>
							<span className="block truncate">
								{account.email}
							</span>
						</Row>
					</dl>
					<p className="font-app text-small text-ink-soft m-0 mt-4">
						{COPY.checkout.cancel}
					</p>
				</>
			)}
		</Modal>
	);
}

function Row({ label, children }: { label: string; children: ReactNode }) {
	return (
		<div className="border-paper-deep grid grid-cols-[6.5rem_minmax(0,1fr)] items-baseline gap-3 border-t py-2.5 first:border-t-0 @max-compact:grid-cols-[5.25rem_minmax(0,1fr)]">
			<dt className="font-app text-small text-ink-faint">{label}</dt>
			<dd className="font-app text-ui text-ink m-0">{children}</dd>
		</div>
	);
}
