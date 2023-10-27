export async function openBrowser(address: string) {
  await import('open')
    .then(r => r.default(address, { newInstance: true }))
    .catch(() => {})
}
