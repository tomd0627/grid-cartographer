import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2024,
      globals: {
        document: 'readonly',
        window: 'readonly',
        navigator: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        parseInt: 'readonly',
        Number: 'readonly',
        Math: 'readonly',
        Event: 'readonly',
        Set: 'readonly',
        Map: 'readonly',
        Infinity: 'readonly',
      },
      sourceType: 'module',
    },
    rules: {
      eqeqeq: ['error', 'always'],
      'no-console': 'warn',
      'no-undef': 'error',
      'no-unused-vars': 'error',
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
];
