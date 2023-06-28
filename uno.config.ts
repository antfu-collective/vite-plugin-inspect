import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetUno,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

// @unocss-include
export default defineConfig({
  shortcuts: {
    'border-main': 'border-gray-400 border-opacity-30',
    'bg-main': 'bg-white dark:bg-[#121212]',
    'bg-active': 'bg-gray-400/10',
    'icon-btn': 'inline-block cursor-pointer select-none !outline-none '
      + 'opacity-75 transition duration-200 ease-in-out '
      + 'hover:opacity-100 hover:text-teal-600 '
      + 'text-0.9em h-1.2em',
  },
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
      warn: true,
    }),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
})
