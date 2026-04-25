const react = require('eslint-plugin-react');
const reactNative = require('eslint-plugin-react-native');
const reactHooks = require('eslint-plugin-react-hooks');
const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const prettier = require('eslint-config-prettier');

module.exports = [
  {
    ignores: ['node_modules/**', 'dist/**', '.expo/**', '.expo-shared/**', 'web-build/**'],
  },
  {
    files: ['**/*.{js,jsx,ts,tsx}'],
    plugins: {
      react,
      'react-native': reactNative,
      'react-hooks': reactHooks,
      '@typescript-eslint': typescriptEslint,
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      'react/react-in-jsx-scope': 'off',
      'react-native/no-unused-styles': 'warn',
      'react-native/split-platform-components': 'warn',
      'react-native/no-inline-styles': 'warn',
      'react-native/no-color-literals': 'warn',
      'react-native/no-raw-text': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      ...reactHooks.configs.recommended.rules,
    },
  },
  prettier,
];
