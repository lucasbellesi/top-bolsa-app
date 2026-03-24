import js from '@eslint/js';
import queryPlugin from '@tanstack/eslint-plugin-query';
import eslintConfigPrettier from 'eslint-config-prettier';
import importPlugin from 'eslint-plugin-import';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

const appFiles = ['**/*.{js,jsx,ts,tsx}'];

export default tseslint.config(
    {
        ignores: [
            'android/**',
            'dist/**',
            '.expo/**',
            'node_modules/**',
            'coverage/**',
            'supabase/functions/**',
        ],
    },
    js.configs.recommended,
    ...tseslint.configs.recommended,
    ...queryPlugin.configs['flat/recommended'],
    {
        files: ['**/*.{js,mjs,cjs}'],
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.es2024,
            },
        },
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
        },
    },
    {
        files: appFiles,
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.node,
                ...globals.es2024,
            },
        },
        plugins: {
            import: importPlugin,
            react: reactPlugin,
            'react-hooks': reactHooksPlugin,
        },
        settings: {
            react: {
                version: 'detect',
            },
            'import/resolver': {
                typescript: true,
            },
        },
        rules: {
            ...reactPlugin.configs.recommended.rules,
            ...reactHooksPlugin.configs.recommended.rules,
            'import/order': 'off',
            'react/react-in-jsx-scope': 'off',
            '@typescript-eslint/consistent-type-imports': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            'react-hooks/purity': 'off',
            'react-hooks/refs': 'off',
        },
    },
    eslintConfigPrettier,
);
