import { createContext, use } from 'react';
import type { Model } from '../api/types';
import type { TierId } from './tiers';

/**
 * One row of the switcher.
 *
 * `id` is still a real model id — it is what the chat route is told and what a
 * saved answer carries — but `label` is the tier's name. So the wire never
 * learns about tiers and the reader never learns about models.
 */
export interface ModelChoice extends Model {
	/** The tier this row stands for, or null for a model with no tier (the admin's). */
	tier: TierId | null;
	/** The line under the name in the menu: what it does, never how good it is. */
	note: string;
	/** Whether this can be chosen: a key on the worker, and not held back. */
	available: boolean;
	/** Held back deliberately, which is a different thing from having no key. */
	comingSoon: boolean;
	/** Set up, but on a plan above the reader's: pressing it shows the plans. */
	locked: boolean;
}

export interface ModelState {
	choices: ModelChoice[];
	selected: ModelChoice | null;
	select(id: string): void;
	/** The name a saved answer should carry, whatever is selected now. */
	labelFor(id: string | undefined): string | null;
	loading: boolean;
}

export const ModelContext = createContext<ModelState | null>(null);

export function useModels(): ModelState {
	const value = use(ModelContext);
	if (!value) throw new Error('useModels outside ModelProvider');
	return value;
}
