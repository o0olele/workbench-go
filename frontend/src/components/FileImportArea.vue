<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Upload, FileIcon } from 'lucide-vue-next'

interface Props {
  title: string
  accept?: string
  multiple?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  accept: '*',
  multiple: false
})

const emit = defineEmits<{
  filesSelected: [files: File[]]
}>()

const isDragOver = ref(false)
const fileInput = ref<HTMLInputElement>()

const handleDragOver = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = true
}

const handleDragLeave = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false
}

const handleDrop = (e: DragEvent) => {
  e.preventDefault()
  isDragOver.value = false
  
  const files = Array.from(e.dataTransfer?.files || [])
  if (files.length > 0) {
    emit('filesSelected', files)
  }
}

const handleFileSelect = (e: Event) => {
  const target = e.target as HTMLInputElement
  const files = Array.from(target.files || [])
  if (files.length > 0) {
    emit('filesSelected', files)
  }
}

const openFileDialog = () => {
  fileInput.value?.click()
}

const preventDefaults = (e: DragEvent) => {
  e.preventDefault()
}

onMounted(() => {
  // 防止页面默认的拖拽行为
  document.addEventListener('dragenter', preventDefaults)
  document.addEventListener('dragover', preventDefaults)
  document.addEventListener('dragleave', preventDefaults)
  document.addEventListener('drop', preventDefaults)
})

onUnmounted(() => {
  document.removeEventListener('dragenter', preventDefaults)
  document.removeEventListener('dragover', preventDefaults)
  document.removeEventListener('dragleave', preventDefaults)
  document.removeEventListener('drop', preventDefaults)
})
</script>

<template>
  <div
    class="relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 hover:border-primary/50 hover:bg-accent/50"
    :class="{
      'border-primary bg-primary/10': isDragOver,
      'border-border': !isDragOver
    }"
    @dragover="handleDragOver"
    @dragleave="handleDragLeave"
    @drop="handleDrop"
    @click="openFileDialog"
  >
    <input
      ref="fileInput"
      type="file"
      :accept="accept"
      :multiple="multiple"
      class="hidden"
      @change="handleFileSelect"
    >
    
    <div class="flex flex-col items-center space-y-4">
      <div class="p-4 rounded-full bg-accent">
        <Upload class="w-8 h-8 text-muted-foreground" />
      </div>
      
      <div>
        <h3 class="text-lg font-semibold mb-2">{{ title }}</h3>
        <p class="text-sm text-muted-foreground mb-2">
          点击选择文件或拖拽文件到这里
        </p>
        <p class="text-xs text-muted-foreground">
          支持的格式: {{ accept === '*' ? '所有文件' : accept }}
        </p>
      </div>
    </div>
    
    <div
      v-if="isDragOver"
      class="absolute inset-0 bg-primary/20 rounded-lg flex items-center justify-center"
    >
      <div class="text-primary font-medium">
        释放文件进行导入
      </div>
    </div>
  </div>
</template>
