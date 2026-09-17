import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

/**
 * Two kinds of test, one runner: the citation parser, which is pure, and the
 * few pieces of the interface whose behaviour has been reported broken and
 * must not break again.
 */
export default defineConfig({
	plugins: [react()],
	test: {
		environment: 'jsdom',
		globals: false,
		setupFiles: ['./src/test/setup.ts'],
		include: ['src/**/*.test.{ts,tsx}'],
	},
});
