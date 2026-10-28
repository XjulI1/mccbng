import { blobToBase64, canvasToJpeg, fitWithin, type NormalizedImage } from '@/utils/imageNormalize'

// Découpage d'une vidéo en images dans le navigateur : la vidéo n'est jamais envoyée au serveur.

export const MAX_FRAMES = 20
const FINGERPRINT_SIZE = 16
// Écart moyen (0-255) en dessous duquel une image est jugée identique à la précédente gardée
export const SIMILARITY_THRESHOLD = 6

// Instants de capture : une image par seconde, espacées davantage pour ne pas dépasser `max`.
export const frameTimes = (duration: number, max = MAX_FRAMES): number[] => {
  if (!Number.isFinite(duration) || duration <= 0) return [0]
  const step = Math.max(1, duration / max)
  const times: number[] = []
  // Décalage d'une demi-période : évite la première image noire et la toute dernière image
  for (let t = Math.min(step / 2, duration / 2); t < duration && times.length < max; t += step) times.push(Math.round(t * 100) / 100)
  return times
}

// Empreinte en niveaux de gris (16×16) d'un canvas
export const fingerprint = (data: Uint8ClampedArray): number[] => {
  const grey: number[] = []
  for (let i = 0; i < data.length; i += 4) grey.push(0.299 * data[i]! + 0.587 * data[i + 1]! + 0.114 * data[i + 2]!)
  return grey
}

export const meanDifference = (a: number[], b: number[]): number => {
  if (a.length !== b.length || !a.length) return Infinity
  let total = 0
  for (let i = 0; i < a.length; i++) total += Math.abs(a[i]! - b[i]!)
  return total / a.length
}

const seek = (video: HTMLVideoElement, time: number) =>
  new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      video.removeEventListener('seeked', onSeeked)
      video.removeEventListener('error', onError)
    }
    const onSeeked = () => { cleanup(); resolve() }
    const onError = () => { cleanup(); reject(new Error('Lecture de la vidéo impossible')) }
    video.addEventListener('seeked', onSeeked)
    video.addEventListener('error', onError)
    video.currentTime = time
  })

const loadVideo = (file: File) =>
  new Promise<HTMLVideoElement>((resolve, reject) => {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.onloadeddata = () => resolve(video)
    video.onerror = () => reject(new Error(`Format vidéo non lu par ce navigateur (« ${file.name} ») : envoyez plutôt des captures d'écran.`))
    video.src = URL.createObjectURL(file)
  })

export interface VideoFramesResult {
  images: NormalizedImage[]
  // Vrai si la vidéo était trop longue pour une image par seconde
  espacees: boolean
}

export const extractVideoFrames = async (file: File, max = MAX_FRAMES, onProgress?: (done: number, total: number) => void): Promise<VideoFramesResult> => {
  const video = await loadVideo(file)
  try {
    const times = frameTimes(video.duration, max)
    const { width, height } = fitWithin(video.videoWidth, video.videoHeight)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    const small = document.createElement('canvas')
    small.width = FINGERPRINT_SIZE
    small.height = FINGERPRINT_SIZE
    const smallContext = small.getContext('2d', { willReadFrequently: true })
    if (!context || !smallContext) throw new Error('Canvas indisponible')

    const images: NormalizedImage[] = []
    let previous: number[] | undefined
    for (const [index, time] of times.entries()) {
      await seek(video, time)
      context.drawImage(video, 0, 0, width, height)
      smallContext.drawImage(canvas, 0, 0, FINGERPRINT_SIZE, FINGERPRINT_SIZE)
      const current = fingerprint(smallContext.getImageData(0, 0, FINGERPRINT_SIZE, FINGERPRINT_SIZE).data)
      if (!previous || meanDifference(previous, current) >= SIMILARITY_THRESHOLD) {
        images.push({ mediaType: 'image/jpeg', data: await blobToBase64(await canvasToJpeg(canvas)) })
        previous = current
      }
      onProgress?.(index + 1, times.length)
    }
    return { images, espacees: video.duration > max }
  } finally {
    URL.revokeObjectURL(video.src)
    video.removeAttribute('src')
    video.load()
  }
}
