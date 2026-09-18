import { describe, expect, it } from 'vitest';
import { cleanTitle } from './title';

/** Verbatim from production, where the rail printed every character of it. */
const RUNAWAY =
	'# The Randomness of Two Books\n\n*Imagine I’ve pulled:*\n1. **"A Brief History of Time"** by Stephen Hawking\n2. **"The Art';

describe('a conversation name', () => {
	it('is one line, however many the model wrote', () => {
		const name = cleanTitle(RUNAWAY);
		expect(name).not.toContain('\n');
		expect(name).toBe('The Randomness of Two Books');
	});

	it('keeps a name that was already a name', () => {
		expect(cleanTitle('Iqbal’s Critique of Nietzschean Selfhood')).toBe(
			'Iqbal’s Critique of Nietzschean Selfhood'
		);
	});

	it('drops the marks, wherever the model put them', () => {
		expect(cleanTitle('**Nietzsche** on the *will* to `truth`')).toBe(
			'Nietzsche on the will to truth'
		);
	});

	it('drops a heading mark', () => {
		expect(cleanTitle('### Descartes Doubts Everything')).toBe(
			'Descartes Doubts Everything'
		);
	});

	it('drops a list mark and a quotation mark', () => {
		expect(cleanTitle('- A Sample of Works')).toBe('A Sample of Works');
		expect(cleanTitle('> A Sample of Works')).toBe('A Sample of Works');
	});

	// The instruction says no quotes; it uses them anyway.
	it('unwraps a name the model put in quotes', () => {
		expect(cleanTitle('"The Nature of the Library"')).toBe(
			'The Nature of the Library'
		);
	});

	it('drops a trailing full stop', () => {
		expect(cleanTitle('The Nature of the Library.')).toBe(
			'The Nature of the Library'
		);
	});

	it('is short enough for a rail', () => {
		const long = cleanTitle('word '.repeat(60));
		expect(long!.length).toBeLessThanOrEqual(72);
		expect(long!.endsWith('…')).toBe(true);
	});

	it('is nothing when there was nothing to read', () => {
		expect(cleanTitle(null)).toBeNull();
		expect(cleanTitle('')).toBeNull();
		expect(cleanTitle('   \n  ** \n')).toBeNull();
	});
});
