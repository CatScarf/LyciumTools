import { PDFDocument } from 'pdf-lib'

export const createPDF = async (
  jpegs: ArrayBuffer[],
  name: string = 'document.pdf',
  width: number = 595,
): Promise<File> => {
  const pdfDoc = await PDFDocument.create()

  for (const jpegBuffer of jpegs) {
    try {
      const jpegBytes = new Uint8Array(jpegBuffer)
      const image = await pdfDoc.embedJpg(jpegBytes)
      const { width: imgWidth, height: imgHeight } = image.scale(1)
      const scale = width / imgWidth
      const pageHeight = imgHeight * scale
      const page = pdfDoc.addPage([width, pageHeight])
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: width,
        height: pageHeight,
      })
    } catch (error) {
      console.log('Failed to embed jpeg', error)
    }
  }
  const pdfBytes = await pdfDoc.save()
  return new File([pdfBytes], name, { type: 'application/pdf' })
}
