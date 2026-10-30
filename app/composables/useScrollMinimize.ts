import { onBeforeUnmount, onMounted, ref } from 'vue'

// Seuils du repli de la barre d'onglets au défilement (comme sur iOS 26) :
// jamais près du haut de page, et seulement au-delà d'un petit déplacement pour ignorer les tremblements.
const TOP_ZONE = 80
const DELTA = 8

export function useScrollMinimize () {
  const minimized = ref(false)
  let lastY = 0
  let frame = 0

  const update = () => {
    frame = 0
    const y = window.scrollY
    if (y < TOP_ZONE) {
      minimized.value = false
      lastY = y
    } else if (Math.abs(y - lastY) >= DELTA) {
      minimized.value = y > lastY
      lastY = y
    }
  }

  const onScroll = () => {
    if (!frame) frame = requestAnimationFrame(update)
  }

  const expand = () => {
    minimized.value = false
    lastY = window.scrollY
  }

  onMounted(() => {
    lastY = window.scrollY
    window.addEventListener('scroll', onScroll, { passive: true })
  })

  onBeforeUnmount(() => {
    window.removeEventListener('scroll', onScroll)
    if (frame) cancelAnimationFrame(frame)
  })

  return { minimized, expand }
}
