import { useEffect, useRef, useState } from 'react';

/**
 * scribe-lm, typed in place.
 *
 * Every glyph is laid out before the animation starts and only its opacity
 * changes; the caret is absolutely positioned and walks to the trailing edge of
 * each character as it appears. So it reads as typing while the line itself
 * never moves. Inserting characters one at a time — the obvious
 * implementation — jitters the whole line as it renders.
 */

const STEM = 'scribe';
const SUFFIX = '-lm';
const GLYPH_MS = 86;
/** The hyphen is where the name turns; it is worth a beat. */
const HYPHEN_MS = 190;
const SETTLE_MS = 430;

const LETTERS = [
	...[...STEM].map((glyph) => ({ glyph, italic: false })),
	...[...SUFFIX].map((glyph) => ({ glyph, italic: true })),
];

export function Wordmark({
	typing = false,
	className = '',
	onTyped,
}: {
	typing?: boolean;
	className?: string;
	onTyped?: () => void;
}) {
	const [shown, setShown] = useState(typing ? 0 : LETTERS.length);
	const [caretDone, setCaretDone] = useState(!typing);
	const glyphs = useRef<(HTMLSpanElement | null)[]>([]);
	const caret = useRef<HTMLSpanElement>(null);
	const typed = useRef(onTyped);

	useEffect(() => {
		typed.current = onTyped;
	});

	useEffect(() => {
		if (!typing) {
			typed.current?.();
			return;
		}
		let timer: ReturnType<typeof setTimeout>;
		let at = 0;

		const step = () => {
			const letter = LETTERS[at];
			const element = glyphs.current[at];
			if (element && caret.current) {
				caret.current.style.left = `${element.offsetLeft + element.offsetWidth}px`;
			}
			at += 1;
			setShown(at);
			if (at < LETTERS.length) {
				timer = setTimeout(
					step,
					letter.glyph === '-' ? HYPHEN_MS : GLYPH_MS
				);
			} else {
				timer = setTimeout(() => {
					setCaretDone(true);
					typed.current?.();
				}, SETTLE_MS);
			}
		};

		timer = setTimeout(step, 260);
		return () => clearTimeout(timer);
	}, [typing]);

	return (
		<h1
			className={`relative m-0 leading-none font-normal tracking-[-0.012em] whitespace-nowrap ${className}`}
		>
			<span className="sr-only">scribe-lm</span>
			{LETTERS.map((letter, index) => {
				const glyph = (
					<span
						key={index}
						aria-hidden
						ref={(element) => {
							glyphs.current[index] = element;
						}}
						className={`transition-opacity duration-200 ${
							index < shown ? 'opacity-100' : 'opacity-0'
						}`}
					>
						{letter.glyph}
					</span>
				);
				return letter.italic ? (
					<em key={index} className="font-bold italic">
						{glyph}
					</em>
				) : (
					glyph
				);
			})}
			{typing && (
				<span
					ref={caret}
					aria-hidden
					className={`bg-ink absolute top-[0.16em] left-0 h-[0.74em] w-[0.05em] transition-[left,opacity] duration-75 ${
						caretDone ? 'opacity-0' : 'animate-blink'
					}`}
				/>
			)}
		</h1>
	);
}
