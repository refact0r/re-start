import js from '@eslint/js'
import tseslint from 'typescript-eslint'
import globals from 'globals'
import svelte from 'eslint-plugin-svelte'
import svelteParser from 'svelte-eslint-parser'
import eslintConfigPrettier from 'eslint-config-prettier'

export default tseslint.config(
    // Global ignores - files and directories to exclude from linting
    {
        ignores: [
            // Build outputs
            'dist/**',
            'dist-ssr/**',
            'backend/public/**',

            // Dependencies
            'node_modules/**',

            // Auto-generated and tooling
            '.auto-claude/**',
            '.worktrees/**',
            'releases/**',

            // Test coverage
            'coverage/**',

            // Logs
            '*.log',
            'logs/**',
        ],
    },

    // ESLint recommended rules
    js.configs.recommended,

    // TypeScript ESLint recommended rules (without type checking)
    ...tseslint.configs.recommended,

    // Svelte recommended rules
    ...svelte.configs['flat/recommended'],

    // Configuration for JavaScript files (no type checking)
    {
        files: ['**/*.js'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.es2021,
                ...globals.node,
                __APP_VERSION__: 'readonly',
            },
        },
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
        },
    },

    // Configuration for TypeScript files in the project
    {
        files: ['src/**/*.ts', 'vite.config.ts', 'vitest.config.ts'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.es2021,
                ...globals.node,
                __APP_VERSION__: 'readonly',
            },
            parser: tseslint.parser,
            parserOptions: {
                project: './tsconfig.json',
            },
        },
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
        },
    },

    // Configuration for Svelte files (without type-aware linting)
    {
        files: ['**/*.svelte'],
        languageOptions: {
            ecmaVersion: 2022,
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.es2021,
                __APP_VERSION__: 'readonly',
            },
            parser: svelteParser,
            parserOptions: {
                parser: tseslint.parser,
                extraFileExtensions: ['.svelte'],
            },
        },
        rules: {
            '@typescript-eslint/no-unused-vars': [
                'error',
                {
                    argsIgnorePattern: '^_',
                    varsIgnorePattern: '^_',
                    caughtErrorsIgnorePattern: '^_',
                },
            ],
        },
    },

    // Prettier integration - MUST be last to disable conflicting formatting rules
    eslintConfigPrettier
)
