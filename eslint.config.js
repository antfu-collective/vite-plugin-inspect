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
  {
    rules: {
      'vue/no-v-text-v-html-on-component': 'off',
    },
  },
)
