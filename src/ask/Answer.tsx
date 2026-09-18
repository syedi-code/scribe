import { inkClass } from '../citations/authors';
import { useOnlyCited } from '../state/reader';
import { Citation } from './Citation';
import type { AnswerNode, Block, Sentence } from '../citations/parse';
import type { AnswerCitation } from '../api/types';

/**
 * The answer: full width, no bubble, set in the reading face.
 *
 * It arrives a word at a time because that is how the model writes it, and
 * each word fades up where it already is — nothing reflows as the line fills.
 *
 * The blocks are the model's own. It writes Markdown whatever the instruction
 * says, and an answer about five books genuinely is a list, so the shapes it
 * reaches for are set the way a book sets them rather than stripped back to a
 * wall of prose. What a block may never borrow is a mark that means something
 * else here: no coloured rule, no square, no stamp.
 */

/** Each word fades where it stands, so a line never jumps as it fills. */
function Words({ text, fresh }: { text: string; fresh: boolean }) {
	if (!fresh) return <>{text}</>;
	return (
		<>
			{text.split(/(\s+)/).map((word, index) => (
				<span key={index} className="animate-word">
					{word}
				</span>
			))}
		</>
	);
}

interface Marks {
	citations: (AnswerCitation | null)[];
	resolved: number;
	streaming: boolean;
	lit: number | null;
	onLight: (index: number | null) => void;
	onAnchor: (index: number, element: HTMLElement | null) => void;
}

function Node({ node, marks }: { node: AnswerNode; marks: Marks }) {
	if (node.kind === 'text') {
		return <Words text={node.text} fresh={marks.streaming} />;
	}
	if (node.kind === 'title') {
		return <cite className="work-title">{node.text}</cite>;
	}
	if (node.kind === 'author') {
		return <span className={inkClass(node.ink)}>{node.text}</span>;
	}
	if (node.kind === 'code') {
		return <code className="code-inline">{node.text}</code>;
	}
	if (node.kind === 'emphasis') {
		return (
			<em className={node.strong ? 'font-medium not-italic' : 'italic'}>
				{node.text}
			</em>
		);
	}
	return (
		<Citation
			index={node.index}
			quote={node.quote}
			citation={
				node.index < marks.resolved ? marks.citations[node.index] : null
			}
			lit={marks.lit === node.index}
			onLight={marks.onLight}
			onAnchor={marks.onAnchor}
		/>
	);
}

/**
 * A run of sentences. The dimming is per sentence because `Only what's cited`
 * is a claim about sentences: one with no citation behind it is one the answer
 * is standing on by itself.
 */
function Prose({
	sentences,
	marks,
}: {
	sentences: Sentence[];
	marks: Marks;
}) {
	const onlyCited = useOnlyCited();

	return (
		<>
			{sentences.map((sentence, index) => (
				<span
					key={index}
					className={`transition-opacity duration-300 ease-paper ${
						onlyCited && !sentence.cited
							? 'opacity-15'
							: 'opacity-100'
					}`}
				>
					{sentence.nodes.map((node, at) => (
						<Node key={at} node={node} marks={marks} />
					))}
				</span>
			))}
		</>
	);
}

/** `1.` `2.` … for an ordered list, and a dash for one that is not. */
const markerFor = (ordered: boolean, at: number) =>
	ordered ? `${at + 1}.` : '–';

function List({
	block,
	marks,
}: {
	block: Extract<Block, { kind: 'list' }>;
	marks: Marks;
}) {
	const Tag = block.ordered ? 'ol' : 'ul';
	// A nested item is numbered within its own run, not the whole list.
	let counted = -1;

	return (
		<Tag className="list-hang">
			{block.items.map((item, at) => {
				if (item.depth === 0) counted++;
				return item.depth === 0 ? (
					<li key={at} className="contents">
						<span className="list-mark" aria-hidden>
							{markerFor(block.ordered, counted)}
						</span>
						<span>
							<Prose sentences={item.sentences} marks={marks} />
						</span>
					</li>
				) : (
					<li key={at} className="list-deep">
						<Prose sentences={item.sentences} marks={marks} />
					</li>
				);
			})}
		</Tag>
	);
}

function Section({ block, marks }: { block: Block; marks: Marks }) {
	if (block.kind === 'rule') return <hr className="page-break" />;

	if (block.kind === 'code') {
		return (
			<pre className="code-block">
				<code>{block.text}</code>
			</pre>
		);
	}

	if (block.kind === 'list') return <List block={block} marks={marks} />;

	if (block.kind === 'quote') {
		return (
			<blockquote className="extract">
				<Prose sentences={block.sentences} marks={marks} />
			</blockquote>
		);
	}

	if (block.kind === 'heading') {
		return block.level === 2 ? (
			<h2 className="section-head">
				<Prose sentences={block.sentences} marks={marks} />
			</h2>
		) : (
			<h3 className="run-in-head">
				<Prose sentences={block.sentences} marks={marks} />
			</h3>
		);
	}

	return (
		<p className="mb-3 last:mb-0">
			<Prose sentences={block.sentences} marks={marks} />
		</p>
	);
}

export function Answer({
	blocks,
	citations,
	resolved,
	streaming,
	lit,
	onLight,
	onAnchor,
}: {
	blocks: Block[];
	citations: (AnswerCitation | null)[];
	/** How many citations have come back from the check so far. */
	resolved: number;
	streaming: boolean;
	lit: number | null;
	onLight: (index: number | null) => void;
	onAnchor: (index: number, element: HTMLElement | null) => void;
}) {
	const marks = { citations, resolved, streaming, lit, onLight, onAnchor };

	return (
		<div className="text-prose">
			{blocks.map((block, at) => (
				<Section key={at} block={block} marks={marks} />
			))}
		</div>
	);
}
