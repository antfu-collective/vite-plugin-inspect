import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetUno,
  presetWebFonts,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

// @unocss-include
export default defineConfig({
  shortcuts: {
    'border-main': 'border-gray-400 border-opacity-30',
    'border-subtle': 'border-gray-400 border-opacity-10',
    'bg-main': 'bg-white dark:bg-[#121212]',
    'bg-active': 'bg-gray-400/8',
    'bg-subtle': 'bg-gray-400/3',
    'text-main': 'text-gray-700 dark:text-gray-200',

    'icon-btn': [
      'inline-block cursor-pointer select-none !outline-none',
      'opacity-75 transition duration-200 ease-in-out p2 rounded-lg',
      'hover:opacity-100 hover:text-teal-600 hover:bg-active',
      'text-0.9em',
    ].join(' '),
  },
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
    }),
    presetWebFonts({
      fonts: {
        mono: 'DM Mono',
        sans: 'DM Sans',
      },
    }),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
})
