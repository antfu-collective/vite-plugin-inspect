import antfu from '@antfu/eslint-config'
import unocss from '@unocss/eslint-plugin'

export default antfu(
  {},
  unocss.configs.flat,
  {
    rules: {
      'vue/no-v-text-v-html-on-component': 'off',
    },
  },
)
