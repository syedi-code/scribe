import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import { useFlags } from '../flags/context';
import type { Flags } from '../flags/flags';
import { useAsync } from '../lib/useAsync';
import { reportAllowance } from '../state/allowance';
import { useRosterVersion } from '../state/roster';
import { ModelContext, type ModelChoice, type ModelState } from './context';
import { TIERS, TIERED_MODEL_IDS, tierOfModel } from './tiers';
import type { Model, ModelsResponse } from '../api/types';

/**
 * The roster and the selection, in one place, because the switcher is drawn
 * inside the composer and the composer is portalled between the home screen
 * and the dock — one provider, one selection, wherever it is standing.
 *
 * `GET /models` answers in model ids, and so does the chat route. This is
 * where that vocabulary stops: everything above it speaks in tiers
 * (`tiers.ts`), and a row's `id` is simply whichever model the tier resolved
 * to. A tier with several models behind it takes the first one the worker has
 * a key for, so losing a provider narrows what runs without taking a name
 * away from the reader.
 *
 * A tier a higher plan would open is listed, not hidden, and says so — that
 * row is the one door to the plans a reader finds on their own, at the moment
 * they want what it opens. A tier with no key anywhere is listed too, and says
 * something different: the two used to read alike, and a free reader was told
 * a key was missing when the key was fine and the plan was the reason.
 *
 * The admin's own models have no tier. They arrive only in the admin's roster,
 * through the path for a model this build has never heard of, so nobody else
 * is ever shown one they could not have.
 */

/**
 * Held back from the switcher, and shown as held back rather than quietly
 * dropped. Haiku stands behind Luna in Omicron, so this only decides which
 * model the tier resolves to — never whether the tier is offered.
 */
const HAIKU = 'claude-haiku-4-5-20251001';

const heldBack = (id: string, flags: Flags) =>
	id === HAIKU && !flags.isClaudeHaikuEnabled;

/** The tier a new reader starts on when the server names no default. */
export const PREFERRED_TIER_ID = 'omicron';

/** Models Scribe knows the name of, so one without a key can still be named. */
const KNOWN: Record<string, Model> = {
	'gpt-5.6-luna': {
		id: 'gpt-5.6-luna',
		label: 'GPT-5.6 Luna',
		provider: 'openai',
		acceptsFiles: true,
	},
	'claude-sonnet-5': {
		id: 'claude-sonnet-5',
		label: 'Claude Sonnet 5',
		provider: 'anthropic',
		acceptsFiles: true,
	},
	[HAIKU]: {
		id: HAIKU,
		label: 'Claude Haiku 4.5',
		provider: 'anthropic',
		acceptsFiles: true,
	},
};

export function ModelProvider({ children }: { children: ReactNode }) {
	const [chosen, setChosen] = useState<string | null>(null);
	const version = useRosterVersion();
	const roster = useAsync(
		() => api.get<ModelsResponse>('/models'),
		[version]
	);
	const { flags, loading: flagsLoading } = useFlags();

	// The roster is the one request this app makes that already knows what the
	// reader has left, so the allowance rides in on it rather than costing a
	// second round trip.
	useEffect(() => {
		reportAllowance(roster.value?.allowance);
	}, [roster.value]);

	const value = useMemo<ModelState>(() => {
		const offered = roster.value?.models ?? [];
		const byId = new Map(offered.map((model) => [model.id, model]));
		const locked = new Set(
			(roster.value?.locked ?? []).map((model) => model.id)
		);

		/** One row per tier, standing for the best model it can reach. */
		const rows: ModelChoice[] = TIERS.map((tier) => {
			const usable = tier.models.find(
				(id) => byId.has(id) && !heldBack(id, flags)
			);
			const shut = tier.models.find((id) => locked.has(id));
			const waiting = tier.models.find((id) => heldBack(id, flags));
			// Whichever model speaks for the tier — the one that can run, else
			// the one a plan would open, else the first, so the row always has
			// an id to be selected and sent by.
			const id = usable ?? shut ?? waiting ?? tier.models[0];
			const model = byId.get(id) ?? KNOWN[id];

			return {
				...(model ?? {
					id,
					label: tier.name,
					provider: 'openai' as const,
					acceptsFiles: true,
				}),
				id,
				// The tier's name stands in for the model's, everywhere a
				// reader can see. Nothing below this line knows the difference.
				label: tier.name,
				tier: tier.id,
				note: tier.note,
				available: Boolean(usable),
				comingSoon: !usable && !shut && Boolean(waiting),
				locked: !usable && Boolean(shut),
			};
		});

		// A model the server offers that belongs to no tier: the admin's.
		const untiered: ModelChoice[] = offered
			.filter((model) => !TIERED_MODEL_IDS.includes(model.id))
			.map((model) => ({
				...model,
				tier: null,
				note: '',
				available: true,
				comingSoon: false,
				locked: false,
			}));

		const choices = [...rows, ...untiered];
		const open = choices.filter((choice) => choice.available);
		// The server names the default by plan — Omega on Pro, Omicron on Free
		// — so its word comes before this build's own preference.
		const byDefault = roster.value?.default_model_id;
		const selected =
			open.find((choice) => choice.id === chosen) ??
			open.find((choice) => choice.id === byDefault) ??
			open.find((choice) => choice.tier === PREFERRED_TIER_ID) ??
			open[0] ??
			null;

		return {
			choices,
			selected,
			select: setChosen,
			labelFor: (id) => {
				if (!id) return null;
				return (
					tierOfModel(id)?.name ??
					choices.find((choice) => choice.id === id)?.label ??
					KNOWN[id]?.label ??
					id
				);
			},
			// A flag still in flight is a roster not yet decided.
			loading: roster.loading || flagsLoading,
		};
	}, [roster.value, roster.loading, flags, flagsLoading, chosen]);

	return <ModelContext value={value}>{children}</ModelContext>;
}
