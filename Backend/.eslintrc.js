module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    'no-console': process.env.NODE_ENV === 'production' ? 'error' : 'warn',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    'class-methods-use-this': 'off',
    'no-underscore-dangle': ['error', { allow: ['_id', '__v'] }],
    'consistent-return': 'off',
    'max-len': ['error', { code: 120, ignoreComments: true }],
    'import/no-extraneous-dependencies': ['error', { devDependencies: ['**/*.test.js', '**/*.spec.js'] }],
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/*.spec.js'],
      rules: {
        'no-unused-expressions': 'off',
      },
    },
  ],
};