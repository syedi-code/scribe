import { createContext, use } from 'react';
import type { Model } from '../api/types';

export interface ModelChoice extends Model {
	/** Whether the worker has a key for this model's provider. */
	available: boolean;
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
