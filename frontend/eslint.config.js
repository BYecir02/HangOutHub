// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },

  // ─── FSD Architecture boundaries ────────────────────────────────────────────
  // Rule: features/ internals (screens, hooks) are private to their feature.
  // Cross-feature imports must go through components/ or services/.
  {
    files: ['features/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['warn', {
        patterns: [
          {
            group: ['@/features/*/screens', '@/features/*/screens/*'],
            message: "Screens are private to their feature. Navigate via router, don't import.",
          },
          {
            group: ['@/features/*/hooks', '@/features/*/hooks/*'],
            message: "Hooks are private to their feature. Move to @/shared/hooks/ if reusable.",
          },
        ],
      }],
    },
  },

  // Rule: shared/ must never depend on features/ (would create circular deps).
  {
    files: ['shared/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', {
        patterns: [
          {
            group: ['@/features/**'],
            message: "shared/ must not import from features/ — keep shared/ independent.",
          },
        ],
      }],
    },
  },
]);
