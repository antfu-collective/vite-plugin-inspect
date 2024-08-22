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
    'badge-virtual': 'bg-teal-400:10 text-green-700 dark:text-teal-400',
    'badge-gray': 'bg-gray-400:10 text-gray-700 dark:text-gray-400',
    'badge-green': 'bg-teal-400:10 text-green-700 dark:text-[#34E676]',
    'badge-orange': 'bg-orange-400:10 text-orange-800 dark:text-orange-400',
    'badge-error': 'bg-main  text-[#b71c1c] dark:text-[#EF5350]',
    'badge-order': 'bg-violet-400:10 text-violet-700 dark:text-violet-400',
    'badge-load': 'bg-light-blue-400/10 text-blue-700 dark:text-light-blue-400',
    'badge-post': 'bg-purple7/5 text-purple7 dark:bg-purple3/5 dark:text-purple3',
    'status-green': 'text-green-700 dark:text-[#34E676]',
    'status-yellow': 'text-[#827717] dark:text-[#EAB306]',
    'status-red': 'text-[#b71c1c] dark:text-[#EF5350]',
    'module-title': 'whitespace-nowrap overflow-hidden text-ellipsis',
  },
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
    }),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup(),
  ],
})
