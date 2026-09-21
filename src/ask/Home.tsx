import { useFlag } from '../flags/context';
import { standingOf, useAllowance } from '../state/allowance';
import { Arrival } from './Arrival';
import { ComposerSlot } from './ComposerSlot';
import { Opening } from './Opening';
import { RunningLine } from './RunningLine';
import { Suggestions } from './Suggestions';

/**
 * The home screen is one centred column and nothing else: the wordmark, the
 * line saying which model is running and how much it has to read, the
 * composer, and three questions to start from. No header chrome beside the
 * tabs, no rail until there is a conversation to list, no explanatory
 * paragraph. The composer is the only thing anyone came for.
 *
 * The column is the whole of this file. What each piece is, and when it
 * arrives, belongs to the piece — `Arrival` holds the sequence.
 *
 * A spent month takes the questions away. Each one asks on a press, so
 * offering three things to ask under a composer that has just said it cannot
 * take one would be offering three refusals.
 */
export function Home({
	composerSlot,
}: {
	composerSlot: (element: HTMLDivElement | null) => void;
}) {
	const explained = useFlag('isPlanLimitShown');
	const allowance = useAllowance();
	const spent = explained && standingOf(allowance) === 'spent';

	return (
		<Arrival>
			<Opening />
			<RunningLine />
			<ComposerSlot slot={composerSlot} />
			{!spent && <Suggestions />}
		</Arrival>
	);
}
