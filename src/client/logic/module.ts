export function useModule() {
  const route = useRoute()
  const id = ref(getModuleId(route.fullPath))

  watch(() => route.fullPath, (fullPath) => {
    id.value = getModuleId(fullPath)
  }, { immediate: true, flush: 'post' })

  return id
}

function getModuleId(fullPath?: string) {
  if (!fullPath)
    return undefined

  return new URL(fullPath, 'http://localhost').searchParams.get('id') || undefined
}
