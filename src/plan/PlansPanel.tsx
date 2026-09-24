import { COPY } from '../copy';
import { PlansLedger } from './PlansLedger';

/**
 * The plans as a page of their own, for a reader who goes looking for them
 * rather than one who is offered them. The same ledger as the sheet.
 */
export function PlansPanel() {
	return (
		<section className="grid min-h-0 grid-rows-[minmax(0,1fr)]">
			<div className="overflow-y-auto px-5 py-8 @max-compact:px-3.5 @max-compact:py-6">
				<div className="max-w-doc mx-auto w-full">
					<h1 className="font-read text-ink m-0 mb-6 text-3xl leading-tight font-normal">
						{COPY.plan.plans.title}
					</h1>
					<PlansLedger />
				</div>
			</div>
		</section>
	);
}
