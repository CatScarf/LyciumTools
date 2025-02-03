import imageCompression from 'browser-image-compression'
// import { readableSize, readableElapse } from './utils'

export type ConvertArgs = {
  file: File
  quality: number
}

self.onmessage = async (e: MessageEvent) => {
  const { file, quality } = e.data as ConvertArgs
  let res = file
  try {
    res = await imageCompression(file, {
      initialQuality: Math.max(Math.min(quality, 1), 0),
      fileType: 'image/jpeg',
    })
  } catch (error) {
    console.log(`Failed to convert`, e.data, error)
  }
  const buffer = await res.arrayBuffer()
  self.postMessage(buffer)
}
