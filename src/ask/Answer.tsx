import { useOnlyCited } from '../state/reader';
import { Citation } from './Citation';
import type { Paragraph } from '../citations/parse';
import type { AnswerCitation } from '../api/types';

/**
 * The answer: full width, no bubble, set in the reading face.
 *
 * It arrives a word at a time because that is how the model writes it, and each
 * word fades up where it already is — nothing reflows as the line fills. Only
 * paragraphs, emphasis and citations are rendered; the model is instructed to
 * write plain prose, and a heading in an answer would be a decision rather than
 * a default.
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

export function Answer({
	paragraphs,
	citations,
	resolved,
	streaming,
	lit,
	onLight,
	onAnchor,
}: {
	paragraphs: Paragraph[];
	citations: (AnswerCitation | null)[];
	/** How many citations have come back from the check so far. */
	resolved: number;
	streaming: boolean;
	lit: number | null;
	onLight: (index: number | null) => void;
	onAnchor: (index: number, element: HTMLElement | null) => void;
}) {
	const onlyCited = useOnlyCited();

	return (
		<div className="text-prose">
			{paragraphs.map((sentences, paragraph) => (
				<p key={paragraph} className="mb-3 last:mb-0">
					{sentences.map((sentence, index) => (
						<span
							key={index}
							className={`transition-opacity duration-300 ease-paper ${
								onlyCited && !sentence.cited
									? 'opacity-15'
									: 'opacity-100'
							}`}
						>
							{sentence.nodes.map((node, at) => {
								if (node.kind === 'text') {
									return (
										<Words
											key={at}
											text={node.text}
											fresh={streaming}
										/>
									);
								}
								if (node.kind === 'emphasis') {
									return (
										<em
											key={at}
											className={
												node.strong
													? 'font-medium not-italic'
													: 'italic'
											}
										>
											{node.text}
										</em>
									);
								}
								return (
									<Citation
										key={at}
										index={node.index}
										quote={node.quote}
										citation={
											node.index < resolved
												? citations[node.index]
												: null
										}
										lit={lit === node.index}
										onLight={onLight}
										onAnchor={onAnchor}
									/>
								);
							})}
						</span>
					))}
				</p>
			))}
		</div>
	);
}
