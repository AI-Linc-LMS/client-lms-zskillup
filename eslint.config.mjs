import { createRequire } from 'node:module';
import js from '@eslint/js';
import tseslint from 'typescript-eslint';

/**
 * Flat config (ESLint 9). We load Next's plugin via CJS `require` (its
 * `.configs` shape is stable that way) and register it directly, rather than
 * `eslint-config-next` through FlatCompat — that path crashes the validator
 * under ESLint 9.39 (circular plugin reference).
 */
const require = createRequire(import.meta.url);
const nextPlugin = require('@next/eslint-plugin-next');

export default [
  { ignores: ['.next/**', 'node_modules/**', 'next-env.d.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: { '@next/next': nextPlugin },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
];
