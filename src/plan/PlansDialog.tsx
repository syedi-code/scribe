import { COPY } from '../copy';
import { Modal } from '../ui/Modal';
import { PlansLedger } from './PlansLedger';

/** The plans as a sheet, which is how every offer of Pro in the app opens them. */
export function PlansDialog() {
	return (
		<Modal title={COPY.plan.plans.title} wide>
			<PlansLedger />
		</Modal>
	);
}
