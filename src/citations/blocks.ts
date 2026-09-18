/**
 * An answer cut into the blocks the model wrote it in.
 *
 * Models write Markdown however firmly they are asked not to, and an answer
 * about five books genuinely is a list. Stripping the marks left a wall;
 * printing them showed the reader `**`. So it is parsed — a small, deliberate
 * subset, not CommonMark: headings, lists, quotations, code, rules, prose.
 *
 * Every block carries **spans into the original answer**, not a copy of its
 * text. Citations are found by character offset (`markersFor`), and a parser
 * that handed back cleaned strings would put every offset in an answer out by
 * the width of the marks it removed. A blockquote is several spans because its
 * `>` sits on every line; everything else is one.
 */

export interface Span {
	from: number;
	to: number;
}

export type RawBlock =
	| { kind: 'prose'; spans: Span[] }
	| { kind: 'heading'; level: 2 | 3; spans: Span[] }
	| { kind: 'quote'; spans: Span[] }
	| { kind: 'code'; lang: string; spans: Span[] }
	| { kind: 'rule'; spans: Span[] }
	| { kind: 'item'; ordered: boolean; depth: 0 | 1; spans: Span[] };

interface Line {
	text: string;
	from: number;
	to: number;
}

function linesOf(text: string): Line[] {
	const lines: Line[] = [];
	let from = 0;
	for (;;) {
		const at = text.indexOf('\n', from);
		const to = at === -1 ? text.length : at;
		lines.push({ text: text.slice(from, to), from, to });
		if (at === -1) break;
		from = at + 1;
	}
	return lines;
}

const BLANK = /^\s*$/;
const FENCE = /^ {0,3}(`{3,}|~{3,})\s*(\S*)/;
const ATX = /^ {0,3}(#{1,6})\s+/;
/** A line that is nothing but one bold run is a heading written in bold. */
const BOLD_LINE = /^\s*\*\*([\s\S]+?)\*\*[\s:.]*$/;
const RULE = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/;
const QUOTE = /^ {0,3}> ?/;
const BULLET = /^(\s*)([-*+]|\d{1,9}[.)])\s+/;

/** Where the content of a line begins, once its mark is stepped over. */
const after = (line: Line, mark: RegExpMatchArray) =>
	line.from + mark[0].length;

export function blocksOf(text: string): RawBlock[] {
	const lines = linesOf(text);
	const blocks: RawBlock[] = [];
	let at = 0;

	while (at < lines.length) {
		const line = lines[at];

		if (BLANK.test(line.text)) {
			at++;
			continue;
		}

		const fence = FENCE.exec(line.text);
		if (fence) {
			const closer = fence[1][0];
			let end = at + 1;
			while (
				end < lines.length &&
				!new RegExp(`^ {0,3}${closer}{3,}\\s*$`).test(lines[end].text)
			) {
				end++;
			}
			// An unterminated fence runs to the end: mid-stream the closing
			// ticks have simply not arrived yet.
			const body = lines.slice(at + 1, end);
			blocks.push({
				kind: 'code',
				lang: fence[2] ?? '',
				spans: body.length
					? [{ from: body[0].from, to: body[body.length - 1].to }]
					: [],
			});
			at = end + 1;
			continue;
		}

		if (RULE.test(line.text)) {
			blocks.push({ kind: 'rule', spans: [] });
			at++;
			continue;
		}

		const atx = ATX.exec(line.text);
		if (atx) {
			blocks.push({
				kind: 'heading',
				level: atx[1].length <= 2 ? 2 : 3,
				spans: [{ from: after(line, atx), to: line.to }],
			});
			at++;
			continue;
		}

		const bold = BOLD_LINE.exec(line.text);
		if (bold) {
			const from = line.from + line.text.indexOf('**') + 2;
			blocks.push({
				kind: 'heading',
				level: 3,
				spans: [{ from, to: from + bold[1].length }],
			});
			at++;
			continue;
		}

		if (QUOTE.test(line.text)) {
			const spans: Span[] = [];
			while (at < lines.length && QUOTE.test(lines[at].text)) {
				const mark = QUOTE.exec(lines[at].text)!;
				spans.push({ from: after(lines[at], mark), to: lines[at].to });
				at++;
			}
			blocks.push({ kind: 'quote', spans });
			continue;
		}

		const bullet = BULLET.exec(line.text);
		if (bullet) {
			const spans: Span[] = [{ from: after(line, bullet), to: line.to }];
			at++;
			// Lines under an item that start no block of their own belong to it.
			while (
				at < lines.length &&
				!BLANK.test(lines[at].text) &&
				!BULLET.test(lines[at].text) &&
				!ATX.test(lines[at].text) &&
				!QUOTE.test(lines[at].text) &&
				!RULE.test(lines[at].text) &&
				!FENCE.test(lines[at].text)
			) {
				spans.push({ from: lines[at].from, to: lines[at].to });
				at++;
			}
			blocks.push({
				kind: 'item',
				ordered: /\d/.test(bullet[2]),
				depth: bullet[1].length >= 2 ? 1 : 0,
				spans,
			});
			continue;
		}

		const spans: Span[] = [];
		while (
			at < lines.length &&
			!BLANK.test(lines[at].text) &&
			!BULLET.test(lines[at].text) &&
			!ATX.test(lines[at].text) &&
			!QUOTE.test(lines[at].text) &&
			!RULE.test(lines[at].text) &&
			!FENCE.test(lines[at].text) &&
			!(spans.length > 0 && BOLD_LINE.test(lines[at].text))
		) {
			spans.push({ from: lines[at].from, to: lines[at].to });
			at++;
		}
		// A line that begins no block and closes none either — a stray `**`
		// mid-stream — would spin here forever.
		if (spans.length === 0) {
			spans.push({ from: line.from, to: line.to });
			at++;
		}
		blocks.push({ kind: 'prose', spans });
	}

	return blocks;
}

/**
 * A block's own text, and the citations inside it rebased onto it.
 *
 * The marks a block is made of — `> `, `## `, `- ` — are not in its text, so
 * an offset into the answer is not an offset into the block. Every character kept
 * remembers where it came from, and the citations are moved onto the block by
 * looking their old positions up in that map.
 */
export function localise<T extends { start: number; end: number }>(
	source: string,
	spans: readonly Span[],
	markers: readonly T[]
): { text: string; markers: T[] } {
	let text = '';
	const origin: number[] = [];
	const local = new Map<number, number>();

	for (const span of spans) {
		if (text.length > 0) {
			text += '\n';
			origin.push(-1);
		}
		for (let at = span.from; at < span.to; at++) {
			local.set(at, origin.length);
			origin.push(at);
			text += source[at];
		}
	}

	const moved: T[] = [];
	for (const marker of markers) {
		const start = local.get(marker.start);
		const last = local.get(marker.end - 1);
		if (start === undefined || last === undefined) continue;
		moved.push({ ...marker, start, end: last + 1 });
	}

	return { text, markers: moved };
}
