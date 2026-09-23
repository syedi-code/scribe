import { TIER_STEM } from './tiers';

/**
 * A tier's name, set as a mark rather than as a word of the interface.
 *
 * `Om` is the family and the tail is the choice, so the tail is the part set a
 * weight up — the two names then rhyme where they are the same and separate
 * exactly where they differ. How that is set belongs to the stylesheet
 * (`@utility tier-mark`), the way a work's title does; this decides only where
 * the name divides.
 *
 * A name that does not share the stem — the admin's own models, which have no
 * tier — is printed whole and unmarked. It is not a mark, and dressing it as
 * one would say it was.
 */
export function TierMark({
	name,
	className = '',
}: {
	name: string;
	className?: string;
}) {
	const marked = name.startsWith(TIER_STEM) && name.length > TIER_STEM.length;

	return (
		<span className={`tier-mark ${className}`}>
			{marked ? (
				<>
					{TIER_STEM}
					<b>{name.slice(TIER_STEM.length)}</b>
				</>
			) : (
				name
			)}
		</span>
	);
}
