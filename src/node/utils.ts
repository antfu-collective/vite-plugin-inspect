export async function openBrowser(address: string) {
  await import('open')
    .then(r => r.default(address, { newInstance: true }))
    .catch(() => {})
}

export function removeVersionQuery(url: string) {
  if (url.includes('v=')) {
    return url
      .replace(/&v=\w+/, '')
      .replace(/\?v=\w+/, '?')
      .replace(/\?$/, '')
  }
  return url
}
