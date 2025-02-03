<script setup lang="ts">

import { onMounted, onUnmounted } from 'vue'
import { WorkerPool } from './ts/workerpool'
import { ref } from 'vue'
import { readableElapse } from './ts/utils'
import type { ConvertArgs } from './ts/convertworker'
import { createPDF } from "./ts/pdf"
import Worker from './ts/convertworker.ts?worker'

type Image = {
  file: File
  url: string
}

const fileInput = ref<HTMLInputElement | null>(null)
const dirInput = ref<HTMLInputElement | null>(null)

const imagesDiv = ref<HTMLInputElement | null>(null)
const images = ref<Image[]>([])
const percent = ref<number>(0)
const pdfs = ref<File[]>([])
const name = ref("document")

const zoomTarget = ref(280)  // 刚好可以让pro为一列，pro max为两列
const zoomMin = ref(1)
const zoomMax = ref(5)
const zoomValue = ref(3)
const imagesWidth = ref(0)

const isMobile = ref(false)
const githubIcon = new URL('../assets/github-icon.svg', import.meta.url).href
const bilibiliIcon = new URL('../assets/bilibili-icon.svg', import.meta.url).href

// 添加文件
const addFile = () => {
  if (fileInput.value) {
    fileInput.value?.click()
  }
}

// 添加文件夹
const addDir = () => {
  if (fileInput.value) {
    dirInput.value?.click()
  }
}

// 清空图片
const clearImages = () => {
  images.value.forEach((image) => {
    URL.revokeObjectURL(image.url)
  })
  percent.value = 0
  images.value = []
}

// 按文件名排序图片
const sortImagesByName = () => {
  const split = (str: string): string[] => {
    const matches = str.match(/(\D+|\d+)/g) || []
    return matches.filter(Boolean)
  }

  const lt = (n1: string, n2: string): boolean => {
    const parts1 = split(n1)
    const parts2 = split(n2)

    const maxLength = Math.max(parts1.length, parts2.length)

    for (let i = 0; i < maxLength; i++) {
      const p1 = parts1[i]
      const p2 = parts2[i]

      if (typeof p1 === 'undefined') return true
      if (typeof p2 === 'undefined') return false

      const isNum1 = /^\d+$/.test(p1)
      const isNum2 = /^\d+$/.test(p2)

      if (isNum1 && isNum2) {
        const num1 = parseInt(p1, 10)
        const num2 = parseInt(p2, 10)
        if (num1 !== num2) return num1 < num2
        continue
      }

      if (isNum1 !== isNum2) {
        return p1 < p2
      }

      if (p1 !== p2) {
        return p1 < p2
      }
    }

    return n1 < n2
  }

  images.value.sort((a, b) => {
    if (a.file.name == b.file.name) {
      return 0
    } else if (lt(a.file.name, b.file.name)) {
      return -1
    }
    return 1
  })

}

// 判断是否是图片
const isImage = (file: File) => {
  return file.type.startsWith("image")
}

// 生成临时Url
const createImage = (file: File): Image => {
  return {
    "file": file,
    "url": URL.createObjectURL(file)
  }
}

// 处理文件添加
const handleFileInput = (event: Event) => {
  const input = event.target as HTMLInputElement
  if (input.files && input.files.length > 0) {

    // 提取文件夹名
    let newName = "document"
    for (const file of input.files) {
      if (isImage(file)) {
        const pathList = input.files[0].webkitRelativePath.split('/')
        if (pathList.length >= 2) {
          newName = pathList[pathList.length - 2]
        }
      }
    }
    name.value = newName

    const newImages = Array.from(input.files).filter(isImage).map(createImage)
    input.value = ''
    images.value = images.value.concat(newImages)
    sortImagesByName()
    percent.value = 0
  }
}

// 下载文件
const download = (file: File) => {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  a.click()
}


// 打开新窗口
const openNewWindow = (url: string) => {
  window.open(url, '_blank')
}


// 开始转换
const convert = async () => {
  const toConvertArgs = (file: File): ConvertArgs => {
    return {
      file: file,
      quality: 1.0,
    }
  }
  const files = images.value.map((data) => data.file)
  const threads = navigator.hardwareConcurrency || 4
  const workers = Array(threads).fill(0).map(() => new Worker())
  const pool = new WorkerPool<ConvertArgs, ArrayBuffer>(workers)

  clearImages()

  let start = Date.now()
  let num = 0
  const buffers: ArrayBuffer[] = []

  for (const promise of pool.map(files.map(toConvertArgs))) {
    promise.then((buffer) => {
      num += 1
      percent.value = num / files.length * 100
      buffers.push(buffer)
      if (num === files.length) {
        const elapse1 = readableElapse(Date.now() - start)
        start = Date.now()
        createPDF(buffers, name.value + ".pdf").then((pdf) => {
          const elapse2 = readableElapse(Date.now() - start)
          console.log(`Convert success ${elapse1}, ${elapse2}`, pdf)
          pdfs.value.push(pdf)
          download(pdf)
        })
      }
    })
  }
}

// 处理缩放滑块移动事件
const onZoom = (event: Event) => {
  const target = event.target as HTMLInputElement
  const density = zoomMax.value + 1 - parseInt(target.value)
  zoomTarget.value = imagesWidth.value / density
  onImagesResize()
}


// 处理ImagesDiv宽度变化事件
const onImagesResize = () => {
  const minTarget = 100
  if (imagesDiv.value) {
    imagesWidth.value = imagesDiv.value.clientWidth
    zoomMin.value = 1
    zoomMax.value = Math.round(imagesWidth.value / minTarget)
    zoomValue.value = Math.max(1, Math.round(imagesWidth.value / zoomTarget.value))
  }
}

// 处理窗口大小变化事件
const onWindowResize = () => {
  const width = window.innerWidth
  const height = window.innerHeight
  isMobile.value = (width < 500 && height / width >= 1) || height / width > 2
}

onMounted(async () => {
  onWindowResize()
  onImagesResize()
  // 监听ImagesDiv宽度变化事件
  if (imagesDiv.value) {
    new ResizeObserver(onImagesResize).observe(imagesDiv.value)
  }
  // 监听窗口大小变化事件
  window.addEventListener('resize', onWindowResize)
})

// 组件销毁时释放所有 URL
onUnmounted(() => {
  clearImages()
  // 移除窗口大小变化事件监听
  window.removeEventListener('resize', onWindowResize)
})

</script>

<template>
  <div class="container" :class="{ 'container-mobile': isMobile }">
    <div class="images-container" ref="imagesDiv" :class="{ 'images-container-mobile': isMobile }">
      <div class="image-container" v-for="(image, i) in images" :key="i" :style="{ width: `${100 / zoomValue}%` }">
        <img class="image" :src="image.url" alt="Preview" />
        <div class=" image-title">{{ image.file.name }}
        </div>
      </div>
      <div v-if="images.length === 0" class="start-zone column-flex">
        <div class="start-title">
          图片合成PDF
        </div>
        <div class="start-message">
          极速，完全本地运行
        </div>
        <div class="history" v-if="pdfs.length > 0">
          <div class="history-item" v-for="(pdf, i) in pdfs" :key="i" @click="download(pdfs[i])">
            <div class="history-item-name">{{ pdf.name }}</div>
            <div class="clickable history-download-button">⬇</div>
          </div>
        </div>
      </div>
    </div>
    <div class="control-panel" :class="{ 'control-panel-mobile': isMobile }">
      <div class="slider-container">
        <input type="range" :min="zoomMin" :max="zoomMax" :value="zoomMax + 1 - zoomValue" @input="onZoom"
          :style="{ background: `linear-gradient(to right, #666 ${100 * (zoomMax - zoomValue) / (zoomMax - 1)}%, #ccc ${100 * (zoomMax - zoomValue) / (zoomMax - 1)}%)` }"
          class="slider" />
      </div>

      <div class="add-buttons" :class="{ 'add-buttons-mobile': isMobile }">
        <div class="clickable common-button" @click="clearImages">
          清空全部
        </div>
        <div class="clickable common-button" @click="addFile">
          添加文件
          <input ref="fileInput" type="file" multiple class="hidden-input" @change="handleFileInput" />
        </div>
        <div class="clickable common-button" @click="addDir" v-if="!isMobile">
          添加文件夹
          <input ref="dirInput" type="file" webkitdirectory class="hidden-input" @change="handleFileInput" />
        </div>
      </div>
      <div class="icons-and-convert-button" :class="{ 'icons-and-convert-button-mobile': isMobile }">
        <div class="icons">
          <img class="icon clickable" :src="githubIcon"
            @click="openNewWindow('https://github.com/CatScarf/LyciumTools')" />
          <img class="icon clickable" :src="bilibiliIcon" />
        </div>
        <div class="clickable common-button" @click="convert"
          :style="{ background: `linear-gradient(to right, #4caf50 ${percent}%, white ${percent}%)` }">
          生成PDF
        </div>
      </div>

    </div>
  </div>
</template>

<style scoped>
.container {
  --control-panel-width: 8rem;
  --control-panel-height: 8.6rem;
  min-height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: rgb(231, 231, 230);
}

.container-mobile {
  flex-direction: column;
}

/* .images {
  position: relative;
  --image-margin: 0.1rem;
  width: calc(100% - var(--image-margin));
  height: max-content;
  display: flex;
  flex-wrap: wrap;
  overflow-y: auto;
  margin: var(--image-margin);
} */

.images-container {
  display: flex;
  flex-direction: row;
  width: calc(100% - var(--control-panel-width));
  flex-wrap: wrap;
  overflow-y: auto;
  height: 100%;
}

.images-container-mobile {
  width: 100%;
  height: calc(100% - var(--control-panel-height))
}

.control-panel {
  position: sticky;
  top: 0;
  width: var(--control-panel-width);
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  justify-content: flex-end;
  align-items: center;
  padding: 1rem;
  box-sizing: border-box;
}

.control-panel-mobile {
  top: auto;
  bottom: 0;
  width: 100%;
  height: var(--control-panel-height);
}

.add-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
}

.add-buttons-mobile {
  flex-direction: row;
}

.icons-and-convert-button {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
}

.icons-and-convert-button-mobile {
  flex-direction: row;
}

.icons {
  display: flex;
  gap: 1rem;
  user-select: none;
}

.icon {
  height: 1.2rem;
}

.column-flex {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.row-flex {
  display: flex;
  justify-content: center;
  align-items: center;
}

.hidden-input {
  display: none;
}

.start-zone {
  width: 100%;
  height: 100%;
  user-select: none;
}

.history {
  min-width: 20rem;
  max-width: calc(100% - 2rem);
  margin: 1rem;
  background-color: rgb(255, 255, 255);
  padding: 0.5rem;
  border-radius: 0.5rem;
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.3);
  font-size: 0.8rem;


  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

.history-item {
  display: flex;
  justify-content: space-between;
}

.history-item-name {
  width: calc(100% - 1rem);
  overflow: auto;
}

.slider-container {
  width: 100%;
}

.slider {
  appearance: none;
  width: 100%;
  height: 0.3rem;
  border-radius: 0.3rem;
  background: rgb(183, 183, 183);
  transition: opacity 0.2s;
  border: 0.04rem solid rgb(215, 215, 215);
}

.slider::-webkit-slider-thumb {
  appearance: none;
  width: 1rem;
  height: 1rem;
  background: #fff;
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.3);
  border-radius: 50%;
  cursor: pointer;
}

@media (hover: hover) {
  .slider::-webkit-slider-thumb:hover {
    transform: scale(1.1);
  }
}

.slider::-webkit-slider-thumb:active {
  transform: scale(1.2);
}

.common-button {
  font-size: 0.8rem;
  height: 1.6rem;
  width: 100%;
  background-color: white;
  border-radius: 0.5rem;
  box-shadow: 0px 2px 4px rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  user-select: none;
}

.clickable {
  transform: scale(1.0);
}

@media (hover: hover) {
  .clickable:hover {
    transform: scale(1.05);
  }
}

.clickable:active {
  transform: scale(1.1);
}

.start-title {
  font-size: 2rem;
  font-weight: bold;
  color: black;
}

.start-message {
  font-size: 1rem;
  color: gray;
}


.image-container {
  height: auto;
  position: relative;
  display: flex;
  justify-content: center;
  box-sizing: border-box;
}

.image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  padding: var(--image-margin);
  box-sizing: border-box;
}

.image-title {
  position: absolute;
  bottom: 0;
  padding: 0 0.2rem;
  max-width: 100%;
  white-space: pre-line;
  border-radius: 0.3rem;
  background-color: rgba(0, 0, 0, 0.8);
  color: white;
  font-size: 0.8rem;
  text-align: center;
  user-select: none;
  margin: calc(0.5rem + var(--image-margin));
}
</style>
