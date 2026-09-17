import { useMemo, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import { useAsync } from '../lib/useAsync';
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
 */
const SUSPENDED = new Set(['claude-sonnet-5', 'claude-opus-5']);

/** Cheapest model first while the interface is being built. One line to change. */
export const PREFERRED_MODEL_ID = 'claude-haiku-4-5-20251001';

/** Models Scribe knows of, so one without a key can be named rather than omitted. */
const KNOWN: Model[] = [
	{
		id: 'claude-haiku-4-5-20251001',
		label: 'Claude Haiku 4.5',
		provider: 'anthropic',
		acceptsFiles: true,
	},
	{
		id: 'claude-sonnet-5',
		label: 'Claude Sonnet 5',
		provider: 'anthropic',
		acceptsFiles: true,
	},
	{
		id: 'claude-opus-5',
		label: 'Claude Opus 5',
		provider: 'anthropic',
		acceptsFiles: true,
	},
	{
		id: 'gpt-5.5',
		label: 'GPT-5.5',
		provider: 'openai',
		acceptsFiles: true,
	},
	{
		id: 'gemini-3.5-flash',
		label: 'Gemini 3.5 Flash',
		provider: 'google',
		acceptsFiles: true,
	},
];

export function ModelProvider({ children }: { children: ReactNode }) {
	const [chosen, setChosen] = useState<string | null>(null);
	const roster = useAsync(() => api.get<ModelsResponse>('/models'), []);

	const value = useMemo<ModelState>(() => {
		const available = roster.value?.models ?? [];
		const byId = new Map(available.map((model) => [model.id, model]));
		const choices: ModelChoice[] = [
			...KNOWN.map((model) => ({
				...(byId.get(model.id) ?? model),
				available: byId.has(model.id) && !SUSPENDED.has(model.id),
				suspended: SUSPENDED.has(model.id),
			})),
			// A model the server offers that this build has never heard of.
			...available
				.filter(
					(model) => !KNOWN.some((known) => known.id === model.id)
				)
				.map((model) => ({
					...model,
					available: true,
					suspended: false,
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
			loading: roster.loading,
		};
	}, [roster.value, roster.loading, chosen]);

	return <ModelContext value={value}>{children}</ModelContext>;
}
