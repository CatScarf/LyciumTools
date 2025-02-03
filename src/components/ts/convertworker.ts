export type ConvertArgs = {
  file: File
  quality: number
}

const toJPEG = async (file: ArrayBuffer, quality: number): Promise<ArrayBuffer> => {
  const blob = new Blob([file])
  const imageBitmap = await createImageBitmap(blob)
  const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height)
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    throw new Error('Could not get canvas context')
  }
  ctx.drawImage(imageBitmap, 0, 0)
  const jpegBlob = await canvas.convertToBlob({ type: 'image/jpeg', quality })
  return await jpegBlob.arrayBuffer()
}

self.onmessage = async (e) => {
  try {
    const { file, quality } = e.data as ConvertArgs
    const image = await toJPEG(await file.arrayBuffer(), quality)
    self.postMessage(image)
  } catch (error) {
    console.error('Failed to compress', error, e.data)
  }
}
