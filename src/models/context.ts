import { createContext, use } from 'react';
import type { Model } from '../api/types';

export interface ModelChoice extends Model {
	/** Whether this model can be chosen: a key on the worker, and not held back. */
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
	/** The label a saved answer should carry, whatever is selected now. */
	labelFor(id: string | undefined): string | null;
	loading: boolean;
}

export const ModelContext = createContext<ModelState | null>(null);

export function useModels(): ModelState {
	const value = use(ModelContext);
	if (!value) throw new Error('useModels outside ModelProvider');
	return value;
}
