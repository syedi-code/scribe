import type { PDFDocumentProxy } from 'pdfjs-dist';

/**
 * The scan renderer, and the only place in the app that knows what a PDF is.
 *
 * pdf.js and its worker are a megabyte between them, and most readers never
 * open a scan at all, so nothing here is imported until one does: the module
 * is pulled in on the first `openScan`, and the second costs nothing.
 *
 * Rendering the page ourselves, rather than handing the file to the browser,
 * is what makes a citation openable on a phone at all. A PDF in a new tab
 * lands on page 1 — iOS ignores `#page=` entirely — and a PDF in an iframe is
 * blank on Android. Neither of those is a way to look at page 147.
 */

export interface Scan {
	readonly pages: number;
	/**
	 * Draws one page into a canvas `width` CSS pixels across, at this screen's
	 * pixel density, and sizes the canvas to the page's own proportions.
	 */
	draw(page: number, canvas: HTMLCanvasElement, width: number): RenderTask;
}

export interface RenderTask {
	done: Promise<void>;
	/** A page the reader has already turned away from stops drawing. */
	cancel: () => void;
}

/** Safari had no `Promise.withResolvers` before 17.4, and pdf.js needs one. */
function ensureWithResolvers() {
	if (typeof Promise.withResolvers === 'function') return;
	Promise.withResolvers = function withResolvers<T>() {
		let resolve!: (value: T | PromiseLike<T>) => void;
		let reject!: (reason?: unknown) => void;
		const promise = new Promise<T>((res, rej) => {
			resolve = res;
			reject = rej;
		});
		return { promise, resolve, reject };
	};
}

let loading: Promise<typeof import('pdfjs-dist')> | null = null;

function pdfjs() {
	loading ??= (async () => {
		ensureWithResolvers();
		const [library, worker] = await Promise.all([
			import('pdfjs-dist'),
			import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
		]);
		library.GlobalWorkerOptions.workerSrc = worker.default;
		return library;
	})();
	return loading;
}

/** Where `vite.config.ts` serves pdf.js's decoders, fonts and encodings from. */
const ASSETS = '/pdf';

/** Pixels are rendered, not stretched, but a 3× phone is not worth 3×. */
const density = () => Math.min(globalThis.devicePixelRatio || 1, 2);

export async function openScan(url: string): Promise<Scan> {
	const library = await pdfjs();
	const file: PDFDocumentProxy = await library.getDocument({
		url,
		// The scans run to hundreds of megabytes and a reader wants one page
		// of one, so the file is read in pieces if alexandria will serve them.
		disableAutoFetch: true,
		disableStream: false,
		// A scanned page is JBIG2 or JPEG 2000 and a typeset one names fonts
		// it does not carry; both are decoded from files beside the bundle.
		// `vite.config.ts` is what puts them there.
		wasmUrl: `${ASSETS}/wasm/`,
		standardFontDataUrl: `${ASSETS}/standard_fonts/`,
		cMapUrl: `${ASSETS}/cmaps/`,
		cMapPacked: true,
		iccUrl: `${ASSETS}/iccs/`,
	}).promise;

	return {
		pages: file.numPages,
		draw(pageNo, canvas, width) {
			let task: { cancel: () => void } | null = null;
			let dropped = false;

			const done = (async () => {
				const page = await file.getPage(pageNo);
				if (dropped) return;

				const unit = page.getViewport({ scale: 1 });
				const scale = (width / unit.width) * density();
				const viewport = page.getViewport({ scale });
				const context = canvas.getContext('2d');
				if (!context) return;

				canvas.width = Math.round(viewport.width);
				canvas.height = Math.round(viewport.height);
				canvas.style.width = `${width}px`;
				canvas.style.height = `${Math.round(viewport.height / density())}px`;

				const render = page.render({
					canvas,
					canvasContext: context,
					viewport,
				});
				task = render;
				await render.promise;
			})().catch((error: unknown) => {
				// A cancelled render is the reader turning the page, not a fault.
				if (dropped) return;
				throw error;
			});

			return {
				done,
				cancel: () => {
					dropped = true;
					task?.cancel();
				},
			};
		},
	};
}
