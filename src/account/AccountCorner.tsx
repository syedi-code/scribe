import { COPY } from '../copy';
import { standingOf, useAllowance } from '../state/allowance';
import { openSignIn } from '../state/dialog';
import { useStanding } from '../state/visitor';
import { AccountMenu } from './AccountMenu';

/**
 * The reader's corner of the header: their stamp and menu once signed in,
 * and until then a plain *Sign in* — a visitor has no stamp to show, and a
 * monogram of a placeholder address would be the one untrue thing on screen.
 */
export function AccountCorner() {
	const standing = useStanding();
	const spent = standingOf(useAllowance()) === 'spent';
	if (standing === 'account') return <AccountMenu />;
	return (
		<button
			type="button"
			onClick={() => openSignIn(spent ? 'spent' : 'chosen')}
			className="pointer-events-auto font-app text-small text-ink border-edge bg-paper-lift hover:bg-paper-deep rounded-full border px-3.5 py-1.5 leading-none transition-colors"
		>
			{COPY.visitor.signIn}
		</button>
	);
}
