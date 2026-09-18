import type { AnswerNode, Block, Sentence } from './parse';

/**
 * Reading a parsed answer back out, flat.
 *
 * An answer is blocks of sentences of nodes, and most questions about one —
 * is that name inked, did that quotation get folded — are about the nodes
 * without caring which block they landed in.
 */
export const sentencesIn = (blocks: readonly Block[]): Sentence[] =>
	blocks.flatMap((block) => {
		if (block.kind === 'list') {
			return block.items.flatMap((item) => item.sentences);
		}
		return 'sentences' in block ? block.sentences : [];
	});

export const nodesIn = (blocks: readonly Block[]): AnswerNode[] =>
	sentencesIn(blocks).flatMap((sentence) => sentence.nodes);

/** What a reader would actually see printed, with no marks left in it. */
export const printedIn = (blocks: readonly Block[]): string =>
	nodesIn(blocks)
		.map((node) => ('text' in node ? node.text : ''))
		.join('');
