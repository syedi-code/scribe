import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import { useFlags } from '../flags/context';
import type { Flags } from '../flags/flags';
import { useAsync } from '../lib/useAsync';
import { reportAllowance } from '../state/allowance';
import { ModelContext, type ModelChoice, type ModelState } from './context';
import type { Model, ModelsResponse } from '../api/types';

/**
 * The model roster and the selection, in one place, because the switcher is
 * rendered twice — under the wordmark at home, and in the header once a
 * conversation starts — and two switchers would be two selections.
 *
 * `GET /models` returns only the models whose provider key is set on the
 * worker. Everything the roster knows about is listed; the ones without a key
 * are shown disabled rather than hidden, so a reader can see what Scribe could
 * run if it were configured for it.
 */

/**
 * Held back from the switcher for now, and shown as held back rather than
 * quietly dropped: a reader can see what Scribe could run, and that the reason
 * it is not running is a decision rather than a missing key.
 *
 * Gemini has never run here. Haiku is behind `isClaudeHaikuEnabled` — it is
 * five times Luna's input and four times its output, for a lower score, and
 * every step of the agent loop pays that again, so it is turned on for as long
 * as someone wants it and off again by flipping a variable.
 */
const HELD_BACK = new Set(['gemini-3.8-flash']);

const HAIKU = 'claude-haiku-4-5-20251001';

const heldBack = (id: string, flags: Flags) =>
	HELD_BACK.has(id) || (id === HAIKU && !flags.isClaudeHaikuEnabled);

/**
 * Luna first: a fifth of Haiku's input price and a quarter of its output, and
 * it scores higher. What it spends instead is time — minutes can pass before
 * its first word. One line to change.
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
		id: 'claude-haiku-4-5-20251001',
		label: 'Claude Haiku 4.5',
		provider: 'anthropic',
		acceptsFiles: true,
	},
	{
		id: 'gemini-3.8-flash',
		label: 'Gemini 3.8 Flash',
		provider: 'google',
		acceptsFiles: true,
	},
];

export function ModelProvider({ children }: { children: ReactNode }) {
	const [chosen, setChosen] = useState<string | null>(null);
	const roster = useAsync(() => api.get<ModelsResponse>('/models'), []);
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
		const choices: ModelChoice[] = [
			...KNOWN.map((model) => ({
				...(byId.get(model.id) ?? model),
				available: byId.has(model.id) && !heldBack(model.id, flags),
				comingSoon: heldBack(model.id, flags),
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
				})),
		];

		const usable = choices.filter((model) => model.available);
		const selected =
			usable.find((model) => model.id === chosen) ??
			usable.find((model) => model.id === PREFERRED_MODEL_ID) ??
			usable.find(
				(model) => model.id === roster.value?.default_model_id
			) ??
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
