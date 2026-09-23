import { render, screen, fireEvent } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { COPY } from '../copy';
import { readDialog, resetDialog } from '../state/dialog';
import { DEFAULT_FLAGS } from '../flags/flags';
import { FlagContext } from '../flags/context';
import { stubFetch } from '../test/harness';
import { ModelProvider } from './ModelProvider';
import { ModelPicker } from './ModelPicker';

/**
 * A reader chooses Omicron or Omega. Which model each stands for is this
 * build's business and the docs' — never the switcher's.
 */
const luna = {
	id: 'gpt-5.6-luna',
	label: 'GPT-5.6 Luna',
	provider: 'openai',
	acceptsFiles: true,
};
const haiku = {
	id: 'claude-haiku-4-5-20251001',
	label: 'Claude Haiku 4.5',
	provider: 'anthropic',
	acceptsFiles: true,
};
const sonnet = {
	id: 'claude-sonnet-5',
	label: 'Claude Sonnet 5',
	provider: 'anthropic',
	acceptsFiles: true,
};

const ROSTER = { models: [luna, haiku], default_model_id: luna.id };

async function open(roster: object = ROSTER, isClaudeHaikuEnabled = true) {
	stubFetch(roster);
	render(
		<FlagContext
			value={{
				flags: { ...DEFAULT_FLAGS, isClaudeHaikuEnabled },
				loading: false,
			}}
		>
			<ModelProvider>
				<ModelPicker />
			</ModelProvider>
		</FlagContext>
	);
	fireEvent.click(await screen.findByRole('button', { name: /Omicron/ }));
}

describe('the switcher names tiers, never models', () => {
	it('shows no maker or model name anywhere in the menu', async () => {
		await open({
			models: [luna, haiku],
			locked: [sonnet],
			default_model_id: luna.id,
		});
		const menu = screen.getByRole('menu');
		for (const leak of [
			'GPT',
			'Luna',
			'Claude',
			'Haiku',
			'Sonnet',
			'Gemini',
		]) {
			expect(menu.textContent).not.toContain(leak);
		}
		expect(menu.textContent).toContain('Omicron');
		expect(menu.textContent).toContain('Omega');
	});

	it('says what choosing one means, rather than how good it is', async () => {
		await open();
		expect(
			screen.getByRole('menuitem', { name: /Omicron/ }).textContent
		).toContain('lower thinking');
	});
});

describe('a tier the reader’s plan does not open', () => {
	beforeEach(() => resetDialog());

	it('says it needs Pro, and shows the plans when pressed', async () => {
		await open({
			models: [luna],
			locked: [sonnet],
			default_model_id: luna.id,
		});
		const shut = screen.getByRole('menuitem', { name: /Omega/ });
		expect(shut.textContent).toContain(COPY.model.requiresPro);
		expect(shut.textContent).not.toContain(COPY.noKey);
		expect(shut.innerHTML).toContain('line-through');
		fireEvent.click(shut);
		expect(readDialog()).toBe('plans');
	});

	// A plan is a decision; a missing key is a broken deployment. Saying the
	// second when the first is true is what sent free readers to the logs.
	it('still says no key set when there is none anywhere', async () => {
		await open({ models: [luna], default_model_id: luna.id });
		const missing = screen.getByRole('menuitem', { name: /Omega/ });
		expect(missing.textContent).toContain(COPY.noKey);
		expect(missing.hasAttribute('disabled')).toBe(true);
	});
});

describe('a tier stands for whichever of its models can run', () => {
	it('falls back to the second when the first has no key', async () => {
		await open({ models: [haiku], default_model_id: haiku.id });
		const omicron = screen.getByRole('menuitem', { name: /Omicron/ });
		expect(omicron.hasAttribute('disabled')).toBe(false);
		expect(omicron.textContent).not.toContain(COPY.noKey);
	});
});

describe('the admin’s own model', () => {
	it('is offered under its own name, having no tier', async () => {
		await open({
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
		await open();
		expect(screen.queryByRole('menuitem', { name: /Sol/ })).toBeNull();
	});
});
