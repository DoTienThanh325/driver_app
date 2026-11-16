const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/**', '.expo/**'] },
  { files: ['tests/**/*.mjs'], languageOptions: { sourceType: 'module' } },
]);
