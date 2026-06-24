import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';

export default [
  { ignores: ['.next/**', 'node_modules/**'] },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    ...react.configs.flat.recommended,
    ...react.configs.flat['jsx-runtime'],
  },
  {
    files: ['**/*.{js,jsx,mjs,cjs}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: { react: { version: '19.2' } },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'warn',
      'no-empty': 'warn',
      'no-cond-assign': 'warn',
      'no-prototype-builtins': 'warn',
      'no-fallthrough': 'warn',
      'no-undef': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'prefer-const': 'warn',
    },
  },
];
