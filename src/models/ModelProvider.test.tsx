import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { COPY } from '../copy';
import { readDialog, resetDialog } from '../state/dialog';
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

async function switcher(
	isClaudeHaikuEnabled: boolean,
	roster: object = ROSTER
) {
	stubFetch(roster);
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

const luna = ROSTER.models[0];
const [sonnet, haiku] = [
	{
		id: 'claude-sonnet-5',
		label: 'Claude Sonnet 5',
		provider: 'anthropic',
		acceptsFiles: true,
	},
	ROSTER.models[1],
];

describe("a model on a plan above the reader's", () => {
	beforeEach(() => resetDialog());

	it('says which plan has it, and shows the plans when pressed', async () => {
		await switcher(true, {
			models: [luna],
			locked: [sonnet, haiku],
			default_model_id: luna.id,
		});
		const locked = screen.getByRole('menuitem', { name: /Sonnet 5/ });
		expect(locked.textContent).toContain(COPY.onPaid);
		expect(locked.textContent).not.toContain(COPY.noKey);
		fireEvent.click(locked);
		expect(readDialog()).toBe('plans');
	});

	it('still says no key set when there is none', async () => {
		await switcher(true, { models: [luna], default_model_id: luna.id });
		const missing = screen.getByRole('menuitem', { name: /Sonnet 5/ });
		expect(missing.textContent).toContain(COPY.noKey);
		expect(missing.hasAttribute('disabled')).toBe(true);
	});
});

describe("the admin's own model", () => {
	it('is offered to the admin, from the roster alone', async () => {
		await switcher(true, {
			models: [
				luna,
				{
					id: 'gpt-5.6-sol',
					label: 'GPT-5.6 Sol',
					provider: 'openai',
					acceptsFiles: true,
					adminOnly: true,
				},
			],
			default_model_id: luna.id,
		});
		const sol = screen.getByRole('menuitem', { name: /Sol/ });
		expect(sol.hasAttribute('disabled')).toBe(false);
		expect(sol.textContent).toContain(COPY.adminOnly);
	});

	it('is never named to anyone the roster leaves it out for', async () => {
		await switcher(true);
		expect(screen.queryByRole('menuitem', { name: /Sol/ })).toBeNull();
		expect(screen.queryByRole('menuitem', { name: /Gemini/ })).toBeNull();
	});
});

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
