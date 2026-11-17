// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/**', '.expo/**'],
    rules: {
      'import/no-unresolved': 'off',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/immutability': 'off',
    },
  },
  { files: ['tests/**/*.mjs'], languageOptions: { sourceType: 'module' } },
]);
