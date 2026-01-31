import jsLint from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import jsdoc from 'eslint-plugin-jsdoc';
import globals from 'globals';
import tsLint from 'typescript-eslint';

export default [
  {
    files: ['**/*.{js,mjs,cjs,ts,mts}'],
  },
  {
    ignores: [
      '**/dist/**',
      '**/docs/**',
      '**/node_modules/**',
      '**/public/**',
      '**/build/**',
      '**/bundle/**',
      '**/wasm/**',
      '**/.tmp/**',
      '**/externals/**',
      '**/examples/tests/**',
      '**/examples/electron/**',
      '**/projects/**',
      '**/testdata/**',
      '**/ffbuild/**',
      '**/test_internal/**',
      'script.ts',
      'list.ts',
      '**/prebuildify/**',
    ],
  },
  jsLint.configs.recommended,
  // ...tsLint.configs.recommended,
  ...tsLint.configs.recommendedTypeChecked,
  ...tsLint.configs.stylisticTypeChecked,
  stylistic.configs['disable-legacy'],
  stylistic.configs.customize({
    indent: 2,
    quotes: 'single',
    semi: true,
    commaDangle: 'always-multiline',
    jsx: false,
    arrowParens: true,
    braceStyle: '1tbs',
    blockSpacing: true,
    quoteProps: 'as-needed',
  }),
  {
    ...jsdoc.configs['flat/recommended-typescript'],
    files: ['src/ffmpeg/*.ts', 'src/lib/*.ts', 'src/api/*.ts', 'src/api/utilities/*.ts', 'src/utils/*.ts'],
    rules: {
      ...jsdoc.configs['flat/recommended-typescript'].rules,
      'jsdoc/tag-lines': [
        'warn',
        'always',
        {
          count: 0,
          startLines: 1,
          endLines: 1,
          applyToEndTag: false,
          tags: {
            param: { lines: 'always', count: 1 },
            example: { lines: 'always', count: 1 },
            returns: { lines: 'always', count: 1 },
            throws: { lines: 'always', count: 1 },
            yields: { lines: 'always', count: 1 },
          },
        },
      ],
      'jsdoc/require-returns': [
        'warn',
        {
          // Require a return tag for all functions
          checkGetters: false,
          forceRequireReturn: false,
        },
      ],
      'jsdoc/require-example': [
        'warn',
        {
          checkConstructors: false,
          enableFixer: false,
          exemptedBy: ['internal'],
        },
      ],
    },
  },
  {
    languageOptions: {
      globals: { ...globals.node },
      parser: tsParser,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },

    rules: {
      // TypeScript specific rules
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          args: 'all',
          argsIgnorePattern: '^_',
          caughtErrors: 'all',
          caughtErrorsIgnorePattern: '^_',
          destructuredArrayIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          ignoreRestSiblings: true,
        },
      ],
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/prefer-promise-reject-errors': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/restrict-template-expressions': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-empty-object-type': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      '@typescript-eslint/no-unsafe-declaration-merging': 'off',
      '@typescript-eslint/prefer-for-of': 'off',
      '@typescript-eslint/prefer-find': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-redundant-type-constituents': 'off',
      '@typescript-eslint/no-namespace': 'off',
      '@typescript-eslint/no-this-alias': 'off',

      // Stylistic specific rules
      '@stylistic/generator-star-spacing': 'off',
      '@stylistic/max-len': ['error', { code: 170, tabWidth: 2 }],
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/operator-linebreak': 'off',
      '@stylistic/comma-dangle': [
        'error',
        {
          arrays: 'always-multiline',
          objects: 'always-multiline',
          imports: 'always-multiline',
          exports: 'only-multiline',
          functions: 'always-multiline',
          enums: 'always-multiline',
          generics: 'always-multiline',
          tuples: 'always-multiline',
        },
      ],

      semi: [1, 'always'],
      // quotes: ['error', 'single'],
      'comma-dangle': ['error', 'only-multiline'],
      'no-multiple-empty-lines': ['warn', { max: 1, maxEOF: 0 }],
      'eol-last': ['error', 'always'],
      'space-before-function-paren': ['error', { named: 'never' }],

      'no-unused-vars': 'off',
      'no-case-declarations': 'off',
      'no-async-promise-executor': 'off',
      'no-control-regex': 'off',
    },
  },
  {
    files: ['**/*.js', '**/*.cjs', '**/*.mjs', '*.d.ts', '*.config.ts'],
    ...tsLint.configs.disableTypeChecked,
  },
];
