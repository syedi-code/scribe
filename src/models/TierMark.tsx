import type { TierId } from './tiers';

/**
 * A tier's name, set as a mark rather than as a word of the interface.
 *
 * How it is set belongs to the stylesheet (`@utility tier-mark` and one ink
 * per tier), the way a work's title does; this decides only which ink, and
 * only ever from the tier. A name with no tier behind it — the admin's own
 * models — is printed in whatever ink it is standing in: it is not a mark, and
 * giving it one of these would say it was.
 */
export function TierMark({
	name,
	tier,
	className = '',
}: {
	name: string;
	tier?: TierId | null;
	className?: string;
}) {
	const ink = tier ? `tier-${tier}` : '';

	return <span className={`tier-mark ${ink} ${className}`}>{name}</span>;
}
