const js = require('@eslint/js')
const globals = require('globals')
const stylistic = require('@stylistic/eslint-plugin')

module.exports = [
  js.configs.recommended,
  {
    files: ['lib/**/*.js', 'test/**/*.js', 'examples/**/*.js'],
    languageOptions: {
      ecmaVersion: 2019,
      globals: {
        ...globals.node,
        ...globals.es2015,
      }
    },
    plugins: {
      '@stylistic': stylistic,
    },
    rules: {
      'no-prototype-builtins': 'off',
      'no-setter-return': 'off',
      'require-await': 'error',
      'no-shadow': 'error',
      'no-var': 'error',
      '@stylistic/max-len': ['error', 120],
      '@stylistic/semi': ['error', 'never'],
      'eqeqeq': ['error', 'smart'],
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/arrow-spacing': ['error', { before: true, after: true }],
      'prefer-const': 'error',
      'no-throw-literal': 'error',
      'no-unused-expressions': ['error', { allowShortCircuit: true }],
      '@stylistic/object-curly-spacing': ['error', 'always'],
      'no-unused-vars': ['error', { caughtErrors: 'none' }],
      'no-useless-assignment': 0,
      'preserve-caught-error': 0,
    }
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.mocha,
        Backendless: true,
        expect: true,
      }
    },
    rules: {
      'no-throw-literal': 'off',
      'no-console': 'off',
    }
  },
  {
    files: ['examples/**/*.js'],
    languageOptions: {
      globals: {
        Backendless: true,
      }
    },
    rules: {
      'no-console': 'off',
      'no-unused-vars': 'off',
    }
  },
]
