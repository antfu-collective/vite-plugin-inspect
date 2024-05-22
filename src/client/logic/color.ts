import { isDark } from './dark'

/**
 * Predefined color map for matching the branding
 *
 * Accpet a 6-digit hex color string or a hue number
 * Hue numbers are preferred because they will adapt better contrast in light/dark mode
 *
 * Hue numbers reference:
 * - 0: red
 * - 30: orange
 * - 60: yellow
 * - 120: green
 * - 180: cyan
 * - 240: blue
 * - 270: purple
 */
const predefinedColorMap = {
  client: 60,
} as Record<string, string | number>

export function getHashColorFromString(
  name: string,
  opacity: number | string = 1,
) {
  let hash = 0
  for (let i = 0; i < name.length; i++)
    hash = name.charCodeAt(i) + ((hash << 5) - hash)
  const h = hash % 360
  return getHsla(h, opacity)
}

export function getHsla(
  hue: number,
  opacity: number | string = 1,
) {
  const saturation = isDark.value ? 50 : 65
  const lightness = isDark.value ? 60 : 40
  return `hsla(${hue}, ${saturation}%, ${lightness}%, ${opacity})`
}

export function getPluginColor(name: string, opacity = 1): string {
  if (predefinedColorMap[name]) {
    const color = predefinedColorMap[name]
    if (typeof color === 'number') {
      return getHsla(color, opacity)
    }
    else {
      if (opacity === 1)
        return color
      const opacityHex = Math.floor(opacity * 255).toString(16).padStart(2, '0')
      return color + opacityHex
    }
  }
  return getHashColorFromString(name, opacity)
}
