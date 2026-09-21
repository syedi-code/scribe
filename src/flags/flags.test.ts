import { describe, expect, it } from 'vitest';
import { DEFAULT_FLAGS, FLAGS, readFlags } from './flags';

const name = FLAGS.isClaudeHaikuEnabled.env;

describe('readFlags', () => {
	it('reads the ways a variable is written on', () => {
		for (const said of ['true', '1', 'on', 'yes', 'TRUE', ' true ']) {
			expect(readFlags({ [name]: said }).isClaudeHaikuEnabled).toBe(true);
		}
	});

	it('reads the ways it is written off', () => {
		for (const said of ['false', '0', 'off', 'no', '', 'FALSE']) {
			expect(readFlags({ [name]: said }).isClaudeHaikuEnabled).toBe(
				false
			);
		}
	});

	/* A flag nobody set is a feature nobody turned on, and a typo is not a
	   decision to turn one on either. */
	it('falls back when the variable is unset or not an answer', () => {
		expect(readFlags({}).isClaudeHaikuEnabled).toBe(false);
		expect(readFlags(null).isClaudeHaikuEnabled).toBe(false);
		expect(readFlags({ [name]: 'ture' }).isClaudeHaikuEnabled).toBe(false);
		expect(readFlags({ [name]: {} }).isClaudeHaikuEnabled).toBe(false);
	});

	it('is what the app assumes until the answer lands', () => {
		expect(DEFAULT_FLAGS).toEqual(readFlags({}));
	});
});
