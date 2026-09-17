import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintConfigPrettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default tseslint.config(
	{ ignores: ['**/node_modules/**', '**/dist/**', '**/.wrangler/**'] },
	eslint.configs.recommended,
	...tseslint.configs.recommended,
	{
		files: ['src/**/*.{ts,tsx}'],
		extends: [reactHooks.configs.flat['recommended-latest']],
		plugins: { 'react-refresh': reactRefresh },
		rules: {
			'react-refresh/only-export-components': [
				'warn',
				{ allowConstantExport: true },
			],
		},
	},
	eslintConfigPrettier,
	{
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					vars: 'all',
					varsIgnorePattern: '^_',
				},
			],
		},
	}
);
