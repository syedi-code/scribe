import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DEFAULT_FLAGS } from '../flags/flags';
import { FlagContext } from '../flags/context';
import { stubFetch } from '../test/harness';
import { ModelProvider } from './ModelProvider';
import { RunningModel } from './RunningModel';

/**
 * The feature flag a reader can actually see the effect of: whether Claude
 * Haiku 4.5 is pickable. Held back it is struck through and disabled, and
 * turning it on is a variable on the deployment, not a change here.
 */
const ROSTER = {
	models: [
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
	],
	default_model_id: 'gpt-5.6-luna',
};

async function switcher(isClaudeHaikuEnabled: boolean) {
	stubFetch(ROSTER);
	render(
		<FlagContext
			value={{
				flags: { ...DEFAULT_FLAGS, isClaudeHaikuEnabled },
				loading: false,
			}}
		>
			<ModelProvider>
				<RunningModel />
			</ModelProvider>
		</FlagContext>
	);
	fireEvent.click(await screen.findByRole('button', { name: /Luna/ }));
	return screen.getByRole('menuitem', { name: /Claude Haiku/ });
}

describe('the Haiku flag', () => {
	it('lets Haiku be chosen when it is on', async () => {
		const haiku = await switcher(true);
		expect(haiku.hasAttribute('disabled')).toBe(false);
		expect(haiku.innerHTML).not.toContain('line-through');
	});

	it('holds Haiku back when it is off', async () => {
		const haiku = await switcher(false);
		expect(haiku.hasAttribute('disabled')).toBe(true);
		expect(haiku.innerHTML).toContain('line-through');
		// Held back is a decision of ours, never a missing key.
		expect(haiku.textContent).not.toContain('no key set');
	});
});
