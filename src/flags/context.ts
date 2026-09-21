import { createContext, use } from 'react';
import { DEFAULT_FLAGS, type Flags } from './flags';

export interface FlagState {
	flags: Flags;
	/** True until `/flags` has answered; the flags are their fallbacks meanwhile. */
	loading: boolean;
}

export const FlagContext = createContext<FlagState>({
	flags: DEFAULT_FLAGS,
	loading: false,
});

export function useFlags(): FlagState {
	return use(FlagContext);
}

/** One flag, for the common case of a feature that is simply on or off. */
export function useFlag(name: keyof Flags): boolean {
	return use(FlagContext).flags[name];
}
