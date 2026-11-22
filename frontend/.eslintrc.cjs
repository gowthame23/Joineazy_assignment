module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
  plugins: ['react'],
  settings: { react: { version: '18.3' } },
  ignorePatterns: ['dist', 'node_modules'],
  rules: {
    'no-undef': 'error',
    'react/jsx-no-undef': 'error',
    'react/jsx-uses-vars': 'error',
    'react/jsx-uses-react': 'error',
    'react/jsx-key': 'error',
    'no-unused-vars': 'warn',
    'no-dupe-keys': 'error',
    'no-unreachable': 'error',
  },
};
