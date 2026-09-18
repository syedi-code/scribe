import { describe, expect, it } from 'vitest';
import { markersFor, segmentAnswer } from './parse';
import { nodesIn } from './walk';
import type { AnswerNode } from './parse';

/**
 * The model writes markdown however firmly it is asked not to. All of these
 * are from conversation 773d7e0f on production, where the reader was shown
 * ten literal `**` and a literal `##`.
 */
describe('markdown the model wrote anyway', () => {
	const nodesOf = (text: string, titles: string[] = []): AnswerNode[] =>
		nodesIn(segmentAnswer(text, markersFor(text, undefined), titles));

	const printed = (text: string, titles: string[] = []) =>
		nodesOf(text, titles)
			.map((node) => ('text' in node ? node.text : ''))
			.join('');

	it('leaves no heading mark in the prose', () => {
		const out = printed('## A Sample of Five Works\n\nThis is the first.');
		expect(out).not.toContain('#');
		expect(out).toContain('A Sample of Five Works');
	});

	it('gives a heading a paragraph of its own', () => {
		const paragraphs = segmentAnswer(
			'## A Sample of Five Works\nThis is the first.',
			[]
		);
		expect(paragraphs).toHaveLength(2);
	});

	// `**1. Al-Ghazali's *Deliverance from Error* (11th century)**` matched
	// nothing, because bold refused to hold an asterisk.
	it('leaves no asterisk when a bold run holds an italic one', () => {
		const out = printed(
			"**1. Al-Ghazali's *Deliverance from Error* (11th century)**"
		);
		expect(out).not.toContain('*');
		expect(out).toContain("Al-Ghazali's");
		expect(out).toContain('(11th century)');
	});

	it('still emphasises an ordinary bold run', () => {
		const nodes = nodesOf('That is **exactly** the point.');
		expect(
			nodes.some(
				(node) =>
					node.kind === 'emphasis' &&
					node.strong &&
					node.text === 'exactly'
			)
		).toBe(true);
	});
});

/**
 * The model uses `*...*` for a book title, which looks exactly like
 * `work-title` but claims nothing. Six of the seven italics in the production
 * answer were titles and one was emphasis.
 */
describe('a title the model italicised itself', () => {
	const nodesOf = (text: string, titles: string[] = []): AnswerNode[] =>
		nodesIn(segmentAnswer(text, markersFor(text, undefined), titles));

	it('becomes a real title when the answer cited that work', () => {
		const nodes = nodesOf('He opens *Meditations on First Philosophy* so.', [
			'Meditations on First Philosophy',
		]);
		expect(
			nodes.some(
				(node) =>
					node.kind === 'title' &&
					node.text === 'Meditations on First Philosophy'
			)
		).toBe(true);
	});

	// A model shortens a title it has already given in full.
	it('becomes a real title when it is the head of a cited one', () => {
		const nodes = nodesOf('The *Meditations* came later.', [
			'Meditations on First Philosophy',
		]);
		expect(nodes.some((node) => node.kind === 'title')).toBe(true);
	});

	// Emphasis is not a claim about the library.
	it('stays emphasis when it names no cited work', () => {
		const nodes = nodesOf('That *is* the point.', [
			'Meditations on First Philosophy',
		]);
		expect(nodes.some((node) => node.kind === 'title')).toBe(false);
		expect(
			nodes.some((node) => node.kind === 'emphasis' && node.text === 'is')
		).toBe(true);
	});
});
