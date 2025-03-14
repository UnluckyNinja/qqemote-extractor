<script lang="ts" setup>
import '@unocss/reset/tailwind.css'
import '@/assets/mesher.css'
import '@/assets/main.css'

import type { Header} from 'cfb-reader';
import { readHeader } from 'cfb-reader'
import type { InMessage, OutMessage } from './lib/reader';

const file = shallowRef<File | null>(null)
const isFileValid = ref(false)
const header = shallowRef<Header | null>(null)
watch(file, async (newFile)=>{
  if (!newFile) return
  try {
    header.value = readHeader(await newFile.slice(0, 512).arrayBuffer())
  } catch {
    isFileValid.value = false
    return
  }
  isFileValid.value = true
})

function selectFile(){
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.db'
  function onFileSelected(event: Event){
    const f = (event.target as HTMLInputElement).files![0]
    if (!f) return
    file.value = f
    input.removeEventListener('change', onFileSelected)
  }
  input.addEventListener('change', onFileSelected) 
  input.click()
}

function onDropFile(event: DragEvent){
  if (!event.dataTransfer || event.dataTransfer.files.length === 0) {
    return
  }
  event.preventDefault()
  file.value = event.dataTransfer.files[0]!
}

const progressPage = useTemplateRef('progressPage')
const isProcessing = ref(false)

const totalSize = ref(0)
const totalFiles = ref(0)
const zipBuffer = shallowRef<ArrayBuffer | null>(null)
const objectURL = ref('')

watch(zipBuffer, (newVal)=>{
  if (!newVal) return
  if (objectURL.value) {
    URL.revokeObjectURL(objectURL.value)
  }
  objectURL.value = URL.createObjectURL(
    new Blob([newVal], { type: "application/zip-compressed" })
  );
})

async function processCFB() {
  isProcessing.value = true

  // release some resources
  if (objectURL.value) {
    URL.revokeObjectURL(objectURL.value)
    objectURL.value = ''
  }
  zipBuffer.value = null

  nextTick(()=>{
    progressPage.value?.scrollIntoView({behavior: 'smooth'})
  })
  const worker = new Worker(new URL('./lib/reader.ts', import.meta.url), {
    type: 'module'
  })
  send(worker, { 
    type: 'buffer',
    buffer: await file.value!.arrayBuffer()
  })
  receive(worker, (msg)=>{
    switch (msg.type) {
      case 'size':
        totalSize.value = msg.size
        break
      case 'file':
        totalFiles.value = msg.file
        break
      case 'done':
        zipBuffer.value = msg.buffer
        isProcessing.value = false
        break
    }
  })
  worker.onerror = (e)=>{
    console.error(e)
  }
}

function send(worker: Worker, msg: InMessage) {
  worker.postMessage(msg, [msg.buffer])
}
function receive(worker: Worker, callback: (msg: OutMessage)=>void) {
  useEventListener(worker, 'message', (event: MessageEvent)=>callback(event.data))
}

</script>

<template>
  <div class="snap-y snap-mandatory overflow-x-hidden overflow-y-auto h-100dvh">
    <!-- file drop -->
    <div class="snap-center relative w-100dvw h-100dvh overflow-hidden p-20 max-sm:p-8 mesher-background-A flex flex-col items-center justify-center gap-12 ">
      <h1 class="text-6xl max-sm:text-4xl font-[ChillRoundM]">找回你的<span class="m-8 rainbow-text whitespace-nowrap">QQ自定义表情</span></h1>
      <div
        class="
          rainbow-border h-50% min-h-60 p-4 before:border-4 rounded-lg 
          self-stretch shrink-1
          flex flex-col justify-center items-center gap-4
          backdrop-blur backdrop-contrast-90 cursor-pointer"
        @click="selectFile"
        @drop="onDropFile"
        @dragover="$event.preventDefault()">
        <div v-if="!file" class="flex flex-col justify-center items-center text-center text-lg">
          <div class="i-fluent-emoji:open-file-folder text-6xl m-4" />
          点击选择文件<br>或<br>拖入文件至此区域<br>
          <div class="m-2 text-sm text-black/60">
            文件应位于 <span class="font-mono ring-2 ring-gray rounded backdrop-grayscale-40">C:\Users\用户名\Documents\Tencent Files\你的QQ号</span><br>
            CustomFace.db 和 FaceStore.db 都包含表情<br>
            推荐直接用Everything等工具搜索这两个文件
          </div>
        </div>
        <div v-else class="flex flex-col justify-center items-center">
          
          <div class="rainbow-text text-center">
            <div v-if="isFileValid" class="i-fluent-emoji:face-savoring-food text-6xl" />
            <div v-else class="i-fluent-emoji:face-with-raised-eyebrow text-6xl" />
          </div>
          <span v-if="isFileValid" class="text-green-600 text-3xl text-shadow-color-white text-shadow font-[ChillRoundM] ">
            是它没错，让我们开始吧！
          </span>
          <span v-else class="text-red-500 text-3xl text-shadow-color-white text-shadow font-[ChillRoundM] text-shadow">
            好像不是我们要找的文件，换一个试试吧
          </span>
          <div class="mt-6"/>
          <div class="grid grid-cols-[repeat(2,auto)] children-[*:nth-child(2n+1)]:text-right">
            <span>文件名：</span>
            <span>{{ file.name }}</span>
            <span>大小：</span>
            <span>{{ file.size }} 字节</span>
            <span>上次修改日期：</span>
            <span>{{ new Date(file.lastModified).toLocaleString() }}</span>
          </div>
        </div>
      </div>
      <button
        v-if="isFileValid"
        class="absolute bottom-24 rainbow-border rounded-full before:border-4 bg-zinc-8 text-white px-4 py-2"
        :class="[isProcessing? 'grayscale cursor-not-allowed':'']"
        :disabled="isProcessing"
        @click="processCFB"
        >
        <span class="rainbow-text text-lg font-bold brightness-120 font-[ChillRoundM]">
          <span class="decoration-line-through decoration-solid decoration-3 decoration-red-500 text-zinc-5 bg-zinc-8">开导</span> 开始导出 GO
        </span>
      </button>
      <a class="fixed bottom-8 z-999" href="https://github.com/UnluckyNinja/qqemote-extractor" target="_blank">
        <div class="i-carbon:logo-github text-3xl"/>
      </a>
    </div>
    <!-- save file -->
    <div
      v-if="objectURL || isProcessing" ref="progressPage"
      class="snap-center relative w-100dvw h-100dvh mesher-background-B overflow-hidden p-20 max-sm:p-8 flex flex-col items-center justify-center gap-8">
      <div v-if="isProcessing" class="i-fluent-emoji:hourglass-not-done text-6xl" />
      <div v-else class="i-fluent-emoji:check-mark-button text-6xl"/>
      <div class="grid grid-cols-[repeat(3,auto)] auto-cols-auto gap-x-2 children-[*:nth-child(3n+2)]:text-right">
        <span>已处理文件：</span>
        <span>{{ totalFiles }}</span>
        <span>个</span>
        <span>已处理大小：</span>
        <span>{{ totalSize }}</span>
        <span>字节</span>
        <span
          class="col-span-1 underline underline-dotted cursor-help"
          title="文件本身不包含其中文件的统计信息，也就是说不处理完不知道总共有多少，你可以把这个当成处理进度"
        >
          导出文件压缩率：
        </span>
        <span>{{ (totalSize / (file?.size ?? 1) * 100).toFixed(2) }}</span>
        <span>%</span>

      </div>
      <a 
        :class="objectURL ? '' : 'invisible'"
        class="relative rainbow-border px-4 py-2 before:border-4 rounded bg-zinc-8 text-white"
        :href="objectURL"
        :download="file?.name+'_表情导出_'+Date.now()+'.zip'"
        target="_blank"
      >
        <span class="rainbow-text font-[ChillRoundM]">保存文件</span>
      </a>
    </div>
  </div>
</template>

<style>
</style>