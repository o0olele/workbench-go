<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { Upload, FileIcon } from 'lucide-vue-next'
import { OnFileDrop, OnFileDropOff } from '../../wailsjs/runtime/runtime'
import { OpenFileDialog, ProcessSelectedFiles } from '../../wailsjs/go/main/App'
import { frontend } from '../../wailsjs/go/models'

interface Props {
  title: string
  accept?: string
  multiple?: boolean
  filters?: Array<{ pattern: string; displayName?: string }>
}

const props = withDefaults(defineProps<Props>(), {
  accept: '*',
  multiple: false,
  filters: () => [{ pattern: '*' }]
})

const emit = defineEmits<{
  filesSelected: [files: string[]]
  fileProcessed: [success: boolean, error?: string]
}>()

const isDragOver = ref(false)
const isProcessing = ref(false)

// Convert filters to Wails format
const getWailsFilters = (): frontend.FileFilter[] => {
  return props.filters.map(filter => new frontend.FileFilter({
    Pattern: filter.pattern,
    DisplayName: filter.displayName || filter.pattern
  }))
}

const handleFileDrop = (x: number, y: number, paths: string[]) => {
  console.log('Wails OnFileDrop triggered:', { x, y, paths })
  isDragOver.value = false
  
  if (paths.length > 0) {
    emit('filesSelected', paths)
    processFiles(paths)
  }
}

const processFiles = async (filePaths: string[]) => {
  if (isProcessing.value) return
  
  isProcessing.value = true
  try {
    await ProcessSelectedFiles(filePaths)
    emit('fileProcessed', true)
  } catch (error) {
    console.error('Error processing files:', error)
    emit('fileProcessed', false, error instanceof Error ? error.message : 'Unknown error')
  } finally {
    isProcessing.value = false
  }
}

const openFileDialog = async () => {
  if (isProcessing.value) return
  
  try {
    const filePath = await OpenFileDialog(props.title, getWailsFilters())
    if (filePath) {
      const filePaths = [filePath]
      emit('filesSelected', filePaths)
      await processFiles(filePaths)
    }
  } catch (error) {
    console.error('Error opening file dialog:', error)
    emit('fileProcessed', false, error instanceof Error ? error.message : 'Failed to open file dialog')
  }
}

const handleDragEnter = () => {
  isDragOver.value = true
}

const handleDragLeave = (e: DragEvent) => {
  // Only set isDragOver to false if we're actually leaving the drop area
  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
  const x = e.clientX
  const y = e.clientY
  
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    isDragOver.value = false
  }
}

const preventDefaults = (e: DragEvent) => {
  e.preventDefault()
  e.stopPropagation()
}

onMounted(async () => {
  // Setup Wails file drop listener
  await OnFileDrop(handleFileDrop, false)
  
  // Prevent default browser drag behavior (but NOT drop - let Wails handle it)
  document.addEventListener('dragenter', preventDefaults)
  document.addEventListener('dragover', preventDefaults)
  document.addEventListener('dragleave', preventDefaults)
  // Remove the drop event prevention to allow Wails OnFileDrop to work
})

onUnmounted(() => {
  // Remove Wails file drop listener
  OnFileDropOff()
  
  // Remove document event listeners (drop was not added)
  document.removeEventListener('dragenter', preventDefaults)
  document.removeEventListener('dragover', preventDefaults)
  document.removeEventListener('dragleave', preventDefaults)
})
</script>

<template>
  <div
    class="relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 hover:border-primary/50 hover:bg-accent/50"
    :class="{
      'border-primary bg-primary/10': isDragOver,
      'border-border': !isDragOver,
      'opacity-75 cursor-not-allowed': isProcessing
    }"
    @dragenter="handleDragEnter"
    @dragleave="handleDragLeave"
    @dragover="preventDefaults"
    @drop="() => isDragOver = false"
    @click="openFileDialog"
  >
    <div class="flex flex-col items-center space-y-4">
      <div class="p-4 rounded-full bg-accent">
        <Upload 
          class="w-8 h-8 text-muted-foreground transition-transform duration-200"
          :class="{ 'animate-pulse': isProcessing }"
        />
      </div>
      
      <div>
        <h3 class="text-lg font-semibold mb-2">{{ title }}</h3>
        <p class="text-sm text-muted-foreground mb-2">
          {{ isProcessing ? '正在处理文件...' : '点击选择文件或拖拽文件到这里' }}
        </p>
        <p class="text-xs text-muted-foreground">
          支持的格式: {{ 
            filters.length === 1 && filters[0].pattern === '*' 
              ? '所有文件' 
              : filters.map(f => f.displayName || f.pattern).join(', ')
          }}
        </p>
        <p v-if="multiple" class="text-xs text-muted-foreground mt-1">
          支持多文件选择
        </p>
      </div>
    </div>
    
    <!-- Drag overlay -->
    <div
      v-if="isDragOver && !isProcessing"
      class="absolute inset-0 bg-primary/20 rounded-lg flex items-center justify-center"
    >
      <div class="text-primary font-medium">
        释放文件进行导入
      </div>
    </div>
    
    <!-- Processing overlay -->
    <div
      v-if="isProcessing"
      class="absolute inset-0 bg-background/80 rounded-lg flex items-center justify-center"
    >
      <div class="flex flex-col items-center space-y-2">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        <div class="text-sm text-muted-foreground">处理中...</div>
      </div>
    </div>
  </div>
</template>
