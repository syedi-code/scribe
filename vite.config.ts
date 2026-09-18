import { createReadStream } from 'node:fs';
import { cp } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

/**
 * What pdf.js needs beside its own code to draw a scanned page.
 *
 * `wasm` decodes JBIG2 and JPEG 2000, which is what a scanned book actually
 * is; `standard_fonts` draws the Base-14 faces a born-digital PDF names
 * without embedding; `cmaps` maps the encodings the rest use; `iccs` keeps
 * their colour honest. Without them a page renders blank or bare, so they are
 * served from one path in dev and copied beside the bundle for production.
 */
const PDF_ASSETS = ['wasm', 'standard_fonts', 'cmaps', 'iccs'];
const PDF_PATH = '/pdf';
const from = (asset: string) => `node_modules/pdfjs-dist/${asset}`;

const TYPES: Record<string, string> = {
	'.wasm': 'application/wasm',
	'.js': 'text/javascript',
	'.icc': 'application/vnd.iccprofile',
};

function pdfAssets(): Plugin {
	return {
		name: 'scribe:pdf-assets',
		configureServer(server) {
			server.middlewares.use(PDF_PATH, (request, response, next) => {
				const asked = normalize(
					decodeURIComponent((request.url ?? '').split('?')[0])
				).replace(/^[\\/]+/, '');
				const asset = asked.split(/[\\/]/)[0];
				if (!PDF_ASSETS.includes(asset)) return next();
				response.setHeader(
					'Content-Type',
					TYPES[extname(asked)] ?? 'application/octet-stream'
				);
				createReadStream(join('node_modules/pdfjs-dist', asked))
					.on('error', next)
					.pipe(response);
			});
		},
		async closeBundle() {
			await Promise.all(
				PDF_ASSETS.map((asset) =>
					cp(from(asset), `dist${PDF_PATH}/${asset}`, {
						recursive: true,
					})
				)
			);
		},
	};
}

export default defineConfig({
	plugins: [react(), tailwindcss(), pdfAssets()],
	server: {
		// Mirrors what the Pages Function does in production, so local dev
		// exercises the same same-origin path.
		proxy: {
			'/api': {
				target: process.env.VITE_API_TARGET ?? 'http://localhost:8787',
				changeOrigin: true,
			},
		},
	},
});
