/**
 * The two names a reader chooses between, and the models behind them.
 *
 * A reader picks Omicron or Omega; they never pick `claude-sonnet-5`. The
 * names are Greek for *little O* and *great O*, which is the whole of the
 * relationship — nothing has to be explained for the order to be read.
 *
 * Naming the tier rather than the model is not decoration. A published model
 * name pins the cost of every answer to one vendor's price list in public, so
 * the model cannot be changed without it reading as a downgrade; a tier can be
 * re-pointed on a Tuesday and nobody has to be told. What is underneath today
 * is in the docs, because the roster is in a public repository anyway.
 *
 * `models` is best first. A tier stands for whichever of its models the worker
 * actually has a key for, so losing a provider narrows what Scribe runs on
 * without taking a name away from the reader.
 */

/**
 * What both names begin with. The mark sets the stem in the app's weight and
 * the tail a weight up, so the pair reads as a family and separates exactly
 * where it differs — see `@utility tier-mark`. A name that does not start with
 * it is printed whole.
 */
export const TIER_STEM = 'Om';

export type TierId = 'omicron' | 'omega';

export interface Tier {
	id: TierId;
	/** What the reader sees, in the composer and the menu. */
	name: string;
	/** The one line under it: what choosing it means, not how good it is. */
	note: string;
	/** The models that may stand for it, best first. */
	models: readonly string[];
	/** Whether it belongs to the paid plan. */
	pro: boolean;
}

export const TIERS: readonly Tier[] = [
	{
		id: 'omicron',
		name: 'Omicron',
		note: 'lower thinking',
		models: ['gpt-5.6-luna', 'claude-haiku-4-5-20251001'],
		pro: false,
	},
	{
		id: 'omega',
		name: 'Omega',
		note: 'higher thinking',
		models: ['claude-sonnet-5'],
		pro: true,
	},
] as const;

/**
 * The tier a saved answer was written by, so an answer from months ago is
 * named the way the switcher names things now. A model that has since left
 * every tier keeps its own name rather than losing one.
 */
export function tierOfModel(modelId: string): Tier | null {
	return TIERS.find((tier) => tier.models.includes(modelId)) ?? null;
}

/** Whether a name is a tier's, and so is set as a mark rather than as words. */
export const isTierName = (name: string): boolean =>
	TIERS.some((tier) => tier.name === name);

/** Every model id any tier can stand for. */
export const TIERED_MODEL_IDS: readonly string[] = TIERS.flatMap(
	(tier) => tier.models
);

/**
 * The tiers a plan opens, named as the switcher names them and in the
 * switcher's order. The plans card is sold in the same words the composer
 * offers, or the abstraction leaks at the one screen where it matters most.
 */
export function tierNamesOf(models: readonly { id: string }[]): string[] {
	const held = new Set(models.map((model) => model.id));
	return TIERS.filter((tier) => tier.models.some((id) => held.has(id))).map(
		(tier) => tier.name
	);
}
