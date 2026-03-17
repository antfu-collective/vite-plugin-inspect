import antfu from '@antfu/eslint-config'

export default antfu(
  {
    unocss: true,
    pnpm: true,
    ignores: [
      '.agents/**',
      '.claude/**',
      '.cursor/**',
    ],
  },
)
  .removeRules(
    'vue/no-v-text-v-html-on-component',
    'e18e/prefer-static-regex',
  )
