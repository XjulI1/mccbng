import { ref, readonly } from 'vue'

const STORAGE_KEY = 'debugToolsEnabled'

const isDebugEnabled = ref<boolean>(false)
let erudaLoaded = false

async function loadAndInitEruda () {
  if (!erudaLoaded) {
    const eruda = (await import('eruda')).default
    eruda.init()
    erudaLoaded = true
  }
}

async function destroyEruda () {
  if (erudaLoaded) {
    const eruda = (await import('eruda')).default
    eruda.destroy()
    erudaLoaded = false
  }
}

export function useDebugTools () {
  const initDebugTools = async () => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'true') {
      isDebugEnabled.value = true
      await loadAndInitEruda()
    }
  }

  const toggleDebugTools = async () => {
    isDebugEnabled.value = !isDebugEnabled.value
    localStorage.setItem(STORAGE_KEY, String(isDebugEnabled.value))

    if (isDebugEnabled.value) {
      await loadAndInitEruda()
    } else {
      await destroyEruda()
    }
  }

  return {
    isDebugEnabled: readonly(isDebugEnabled),
    initDebugTools,
    toggleDebugTools
  }
}

let debugInstance: ReturnType<typeof useDebugTools> | null = null

export function useGlobalDebugTools () {
  if (!debugInstance) {
    debugInstance = useDebugTools()
  }
  return debugInstance
}
