import { LegalLinks } from '../ui/LegalLinks';
import { SETTLE, useSettle } from './settle';

/**
 * The last line of the home screen: the terms and the privacy note.
 *
 * They are linked from About and from the plans, but a visitor who opens
 * neither should still be able to find them — and a payment processor
 * reviewing the site looks for exactly this. Set faint and small, after
 * everything that was actually come for, and only here: the reading surface
 * gets no footer.
 */
export function HomeFooter() {
	const settle = useSettle(SETTLE.suggestions + 1);
	return (
		<div className={`mt-10 ${settle.className}`} style={settle.style}>
			<LegalLinks className="text-tiny text-center" />
		</div>
	);
}
