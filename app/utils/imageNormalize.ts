// Normalisation des photos avant l'envoi à l'import par IA (repris de Meal-Manager) : HEIC/HEIF converti en JPEG,
// puis réduction (plus grand côté ≤ 1600 px) et réencodage JPEG. Le modèle réduit de toute façon les grandes images :
// la pleine résolution ne coûterait que du volume et des tokens.

export type ImageMediaType = 'image/jpeg' | 'image/png' | 'image/webp'

export interface NormalizedImage {
  mediaType: ImageMediaType
  // Base64 brut (sans préfixe data:)
  data: string
}

export const MAX_IMAGE_EDGE = 1600
const JPEG_QUALITY = 0.85

export const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('Lecture du fichier impossible'))
    reader.onload = () => {
      const result = reader.result as string
      resolve(result.slice(result.indexOf(',') + 1))
    }
    reader.readAsDataURL(blob)
  })

// Dimensions réduites (jamais agrandies) pour que le plus grand côté tienne dans `maxEdge`
export const fitWithin = (width: number, height: number, maxEdge = MAX_IMAGE_EDGE) => {
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) }
}

export const canvasToJpeg = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) =>
    canvas.toBlob(blob => (blob ? resolve(blob) : reject(new Error('Encodage JPEG impossible'))), 'image/jpeg', JPEG_QUALITY)
  )

const detectHeic = async (file: File): Promise<boolean> => {
  if (/image\/hei[cf]/i.test(file.type) || /\.hei[cf]$/i.test(file.name)) return true
  try {
    const { isHeic } = await import('heic-to')
    return await isHeic(file)
  } catch {
    return false
  }
}

const downscaleToJpeg = async (blob: Blob): Promise<Blob> => {
  const bitmap = await createImageBitmap(blob)
  try {
    const { width, height } = fitWithin(bitmap.width, bitmap.height)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas indisponible')
    context.drawImage(bitmap, 0, 0, width, height)
    return await canvasToJpeg(canvas)
  } finally {
    bitmap.close()
  }
}

export const normalizeImageFile = async (file: File): Promise<NormalizedImage> => {
  let source: Blob = file
  if (await detectHeic(file)) {
    try {
      const { heicTo } = await import('heic-to')
      source = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.9 })
    } catch {
      throw new Error(`Impossible de convertir la photo HEIC « ${file.name} ». Exportez-la en JPEG et réessayez.`)
    }
  }
  try {
    return { mediaType: 'image/jpeg', data: await blobToBase64(await downscaleToJpeg(source)) }
  } catch {
    const mediaType = (source.type || file.type) as ImageMediaType
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mediaType)) {
      throw new Error(`Image « ${file.name} » illisible.`)
    }
    return { mediaType, data: await blobToBase64(source) }
  }
}
