import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
	plugins: [react(), tailwindcss()],
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
