import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import { useFlags } from '../flags/context';
import type { Flags } from '../flags/flags';
import { useAsync } from '../lib/useAsync';
import { reportAllowance } from '../state/allowance';
import { useRosterVersion } from '../state/roster';
import { ModelContext, type ModelChoice, type ModelState } from './context';
import type { Model, ModelsResponse } from '../api/types';

/**
 * The model roster and the selection, in one place, because the switcher is
 * rendered twice — under the wordmark at home, and in the header once a
 * conversation starts — and two switchers would be two selections.
 *
 * `GET /models` returns the models this reader may choose, and under `locked`
 * those a plan above theirs would open. Everything the roster knows about is
 * listed; a locked one says which plan has it, and one with no key at all is
 * shown disabled rather than hidden, so a reader can see what Scribe could run
 * if it were configured for it. The two used to read alike — a free reader was
 * told Claude had *no key set* when the key was fine and the plan was the
 * reason.
 *
 * The admin's own models are not known here. They arrive only in the admin's
 * roster, through the path for a model this build has never heard of, so no
 * one else is shown one they could never have.
 */

/**
 * Held back from the switcher, and shown as held back rather than quietly
 * dropped: a reader can see what Scribe could run, and that the reason it is
 * not running is a decision rather than a missing key.
 *
 * Haiku is behind `isClaudeHaikuEnabled` — it is five times Luna's input and
 * four times its output, for a lower score, and every step of the agent loop
 * pays that again, so it is turned on for as long as someone wants it and off
 * again by flipping a variable.
 */
const HAIKU = 'claude-haiku-4-5-20251001';

const heldBack = (id: string, flags: Flags) =>
	id === HAIKU && !flags.isClaudeHaikuEnabled;

/**
 * Luna, when the server names no default: a fifth of Haiku's input price and
 * a quarter of its output, and it scores higher. What it spends instead is
 * time — minutes can pass before its first word.
 */
export const PREFERRED_MODEL_ID = 'gpt-5.6-luna';

/** Models Scribe knows of, so one without a key can be named rather than omitted. */
const KNOWN: Model[] = [
	{
		id: 'gpt-5.6-luna',
		label: 'GPT-5.6 Luna',
		provider: 'openai',
		acceptsFiles: true,
	},
	{
		id: 'claude-sonnet-5',
		label: 'Claude Sonnet 5',
		provider: 'anthropic',
		acceptsFiles: true,
	},
	{
		id: 'claude-haiku-4-5-20251001',
		label: 'Claude Haiku 4.5',
		provider: 'anthropic',
		acceptsFiles: true,
	},
];

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
		const available = roster.value?.models ?? [];
		const byId = new Map(available.map((model) => [model.id, model]));
		const locked = new Set(
			(roster.value?.locked ?? []).map((model) => model.id)
		);
		const choices: ModelChoice[] = [
			...KNOWN.map((model) => ({
				...(byId.get(model.id) ?? model),
				available: byId.has(model.id) && !heldBack(model.id, flags),
				comingSoon: heldBack(model.id, flags),
				locked: locked.has(model.id) && !heldBack(model.id, flags),
			})),
			// A model the server offers that this build has never heard of.
			...available
				.filter(
					(model) => !KNOWN.some((known) => known.id === model.id)
				)
				.map((model) => ({
					...model,
					available: true,
					comingSoon: false,
					locked: false,
				})),
		];

		const usable = choices.filter((model) => model.available);
		// The server names the default by plan — Sonnet on Paid, Luna on Free
		// — so it comes before this build's own preference.
		const selected =
			usable.find((model) => model.id === chosen) ??
			usable.find(
				(model) => model.id === roster.value?.default_model_id
			) ??
			usable.find((model) => model.id === PREFERRED_MODEL_ID) ??
			usable[0] ??
			null;

		return {
			choices,
			selected,
			select: setChosen,
			labelFor: (id) =>
				id ? (choices.find((m) => m.id === id)?.label ?? id) : null,
			// A flag still in flight is a roster not yet decided: Haiku would
			// read as held back for a frame and then stop being.
			loading: roster.loading || flagsLoading,
		};
	}, [roster.value, roster.loading, flags, flagsLoading, chosen]);

	return <ModelContext value={value}>{children}</ModelContext>;
}
