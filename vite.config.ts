import { defineConfig } from 'vite';

export default defineConfig({
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
