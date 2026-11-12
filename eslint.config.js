import eslint from '@eslint/js';
import prettier from 'eslint-config-prettier/flat';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist/**', 'node_modules/**', 'web/dist/**'],
  },
  eslint.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ['web/**/*.js'],
    languageOptions: {
      globals: {
        document: 'readonly',
        navigator: 'readonly',
        window: 'readonly',
      },
    },
  },
  {
    files: ['src/**/*.test.ts'],
    rules: {
      'no-constant-condition': 'off',
    },
  },
  prettier,
);
