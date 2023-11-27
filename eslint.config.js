import antfu from '@antfu/eslint-config'

export default antfu(
  {
    unocss: true,
  },
  {
    rules: {
      'vue/no-v-text-v-html-on-component': 'off',
    },
  },
)
