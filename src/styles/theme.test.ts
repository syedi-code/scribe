import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Rules that can only be written in the stylesheet, and one that can only be
 * checked across the whole tree. The stylesheet is read off disk because a
 * test runner hands back an empty string for a CSS import.
 */
const THEME = readFileSync('src/styles/theme.css', 'utf8');

const rule = (selector: string) =>
	THEME.slice(THEME.indexOf(`${selector} {`)).split('}')[0];

function* sources(dir: string): Generator<string> {
	for (const entry of readdirSync(dir, { withFileTypes: true })) {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) yield* sources(path);
		else if (
			(entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) &&
			!entry.name.includes('.test.')
		) {
			yield path;
		}
	}
}

/** Whatever a component wrote after `z-`, wherever it wrote one. */
function stackingIn(source: string): string[] {
	const written: string[] = [];
	const heads = new Set([' ', '"', '`', ':', '\t', '\n']);
	for (
		let at = source.indexOf('z-');
		at >= 0;
		at = source.indexOf('z-', at + 2)
	) {
		// `z-` counts at the head of a class only, never inside `--z-rail`.
		if (!heads.has(source[at - 1] ?? ' ')) continue;
		const token = source.slice(at, at + 40);
		written.push(token.split(' ')[0].split('"')[0].split('`')[0]);
	}
	return written;
}

describe('the base stylesheet', () => {
	// `overflow: hidden` on the viewport is what takes pull-to-refresh away
	// from a phone. Nothing scrolls the document anyway: the shell is exactly
	// the viewport and every scrolling region is inside it.
	it('leaves the document scroller alone, so a phone can pull to refresh', () => {
		expect(THEME).toContain('body {');
		expect(rule('body')).not.toContain('overflow');
	});

	it('still holds the shell to the height of the viewport', () => {
		expect(rule('#root')).toContain('height: 100%');
	});
});

/**
 * Five places print a book's name. Each asks the stylesheet how a title is
 * set, rather than writing `italic` and drifting from the other four.
 */
const PRINTS_A_BOOK_NAME = [
	'src/ask/Answer.tsx', // in the prose
	'src/ask/MarginNotes.tsx', // in the margin
	'src/ask/Shelf.tsx', // under the fold
	'src/books/BooksPanel.tsx', // on the shelves
	'src/page/PageView.tsx', // in the drawer
];

describe('a work set as a work', () => {
	it('is declared once, in the stylesheet', () => {
		expect(THEME).toContain('@utility work-title');
	});

	it('is what every component that prints a book name reaches for', () => {
		for (const path of PRINTS_A_BOOK_NAME) {
			expect(
				readFileSync(path, 'utf8'),
				`${path} prints a book name without work-title`
			).toContain('work-title');
		}
	});

	// `font-style: italic` alone inherits the family, and Condensed has no
	// italic cut -- the margin note was a browser-sheared Condensed Regular
	// while the other four were the real drawn italic.
	it('is set in the face that actually has an italic cut', () => {
		const rule = THEME.slice(THEME.indexOf('@utility work-title'));
		const body = rule.slice(0, rule.indexOf('}'));

		expect(body).toContain('font-family: var(--font-read)');
		expect(body).toContain('font-style: italic');
	});

	it('has a real italic file behind every weight a title is set in', () => {
		for (const weight of [300, 400, 700]) {
			const faces = THEME.split('@font-face');
			const italic = faces.find(
				(face) =>
					face.includes(`font-weight: ${weight}`) &&
					face.includes('font-style: italic') &&
					face.includes('GT Alpina')
			);
			expect(italic, `no italic cut at weight ${weight}`).toBeDefined();
			expect(italic).toContain('Italic.woff2');
		}
	});
});

describe('the stacking order', () => {
	const LAYERS = ['lifted', 'rail', 'drawer', 'header', 'menu'];

	const heightOf = (layer: string) => {
		const line = THEME.split('\n').find((text) =>
			text.trim().startsWith(`--z-${layer}:`)
		);
		return line ? Number(line.split(':')[1].trim().split(';')[0]) : null;
	};

	it('names every layer once, in rising order', () => {
		const heights = LAYERS.map(heightOf);
		heights.forEach((height, index) =>
			expect(
				height,
				`--z-${LAYERS[index]} is not declared`
			).not.toBeNull()
		);
		expect(heights).toEqual([...heights].sort((a, b) => a! - b!));
		expect(new Set(heights).size).toBe(heights.length);
	});

	// Two things written as 20 in two files is how the rail came up underneath
	// the home screen's subtitle. A component reads the scale, or says nothing.
	it('is never written as a number inside a component', () => {
		const offenders: string[] = [];
		for (const path of sources('src')) {
			for (const written of stackingIn(readFileSync(path, 'utf8'))) {
				if (!written.startsWith('z-(--z-')) {
					offenders.push(`${path}: ${written}`);
				}
			}
		}
		expect(offenders).toEqual([]);
	});

	it('reads only layers the scale declares', () => {
		const used = new Set<string>();
		for (const path of sources('src')) {
			for (const written of stackingIn(readFileSync(path, 'utf8'))) {
				used.add(written.slice('z-(--z-'.length).split(')')[0]);
			}
		}
		expect(used.size).toBeGreaterThan(0);
		for (const layer of used) expect(LAYERS).toContain(layer);
	});
});

/**
 * The class is built at run time from a hash, so Tailwind's scanner never
 * sees the name. Declared as a utility, it emitted no rule at all: the token
 * was in the stylesheet, the span carried the class, and every name rendered
 * in plain ink.
 */
describe('an author ink', () => {
	const SLOTS = [0, 1, 2, 3, 4, 5];

	it('is a rule of its own, not a utility waiting to be scanned', () => {
		for (const slot of SLOTS) {
			expect(THEME, `author-c${slot} is not declared as a rule`).toContain(
				`.author-c${slot} {`
			);
			expect(THEME).not.toContain(`@utility author-c${slot}`);
		}
	});

	const contrastOf = (a: string, b: string) => {
		const ink = (name: string) =>
			/#[0-9a-f]{6}/i.exec(THEME.slice(THEME.indexOf(`${name}:`)))![0];
		const luminance = (hex: string) => {
			const channel = (c: number) => {
				const v = c / 255;
				return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
			};
			const [r, g, bl] = [1, 3, 5].map((at) =>
				channel(parseInt(hex.slice(at, at + 2), 16))
			);
			return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
		};
		const [light, dark] = [luminance(ink(a)), luminance(ink(b))].sort(
			(x, y) => y - x
		);
		return (light + 0.05) / (dark + 0.05);
	};

	it('has a token behind every slot the hash can reach', () => {
		for (const slot of SLOTS) {
			expect(THEME).toContain(`--author-c${slot}:`);
		}
	});

	// Every ink has to carry its own colour on cream at prose size. Gold and
	// olive went muddy there and turquoise could not saturate at all, so the
	// floor is held here rather than in anyone's judgement.
	it('is readable on the paper it is printed on', () => {
		for (const slot of SLOTS) {
			expect(
				contrastOf(`--author-c${slot}`, '--color-paper'),
				`author-c${slot} is too faint on the paper`
			).toBeGreaterThan(4.5);
		}
	});

	// Against the prose, not against the paper: a name the reader cannot see
	// is not a name they can follow.
	it('sits clear of the ink the prose is set in', () => {
		const lightness = (hex: string) => {
			const lin = (c: number) => {
				const v = c / 255;
				return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
			};
			const [r, g, b] = [1, 3, 5].map((at) =>
				lin(parseInt(hex.slice(at, at + 2), 16))
			);
			return 0.2126 * r + 0.7152 * g + 0.0722 * b;
		};
		const inkOf = (name: string) =>
			/#[0-9a-f]{6}/i.exec(
				THEME.slice(THEME.indexOf(`${name}:`))
			)?.[0] as string;

		const prose = lightness(inkOf('--color-ink'));
		for (const slot of SLOTS) {
			expect(
				lightness(inkOf(`--author-c${slot}`)),
				`author-c${slot} is as dark as the prose`
			).toBeGreaterThan(prose * 1.5);
		}
	});
});

/**
 * The highlight behind a matched passage. It was a slightly deeper cream and
 * sat 1.18:1 off the paper, which is not a highlight so much as a rumour of
 * one.
 */
describe('the highlight', () => {
	const tokenOf = (name: string) =>
		/#[0-9a-f]{6}/i.exec(THEME.slice(THEME.indexOf(`${name}:`)))![0];

	const luminance = (hex: string) => {
		const channel = (c: number) => {
			const v = c / 255;
			return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
		};
		const [r, g, b] = [1, 3, 5].map((at) =>
			channel(parseInt(hex.slice(at, at + 2), 16))
		);
		return 0.2126 * r + 0.7152 * g + 0.0722 * b;
	};
	const contrast = (a: string, b: string) => {
		const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
		return (light + 0.05) / (dark + 0.05);
	};

	it('keeps the passage on it readable', () => {
		expect(
			contrast(tokenOf('--color-highlight'), tokenOf('--color-ink'))
		).toBeGreaterThan(7);
	});

	it('is visibly not the paper', () => {
		expect(
			contrast(tokenOf('--color-highlight'), tokenOf('--color-paper'))
		).toBeGreaterThan(1.2);
	});

	// The verdict is drawn as a rule under the passage, on top of this.
	it('leaves the verdict rule drawn on it legible', () => {
		for (const verdict of ['--color-rubric', '--color-verdigris']) {
			expect(
				contrast(tokenOf('--color-highlight'), tokenOf(verdict))
			).toBeGreaterThan(3);
		}
	});
});

