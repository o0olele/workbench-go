<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, X } from 'lucide-vue-next'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import FileImportArea from './FileImportArea.vue'
import GoFileImportArea from './GoFileImportArea.vue'
import ThreeJSScene from './ThreeJSScene.vue'
import NavMeshScene from './NavMeshScene.vue'
import { LogDebug } from '../../wailsjs/runtime/runtime'

type TabType = 'welcome' | 'threejs' | 'navmesh'

interface TabItem {
  id: string
  title: string
  type: TabType
  content?: string
  files?: File[]
  filesString?: string[]
}

const tabs = ref<TabItem[]>([
  { id: 'welcome', title: '欢迎页', type: 'welcome', content: '欢迎使用工作台！' }
])

const activeTab = ref('welcome')
const nextTabId = ref(2)

const addNewTab = () => {
  const newTab: TabItem = {
    id: `tab-${nextTabId.value}`,
    title: `新标签页 ${nextTabId.value}`,
    type: 'welcome',
    content: `这是新标签页 ${nextTabId.value} 的内容`
  }
  tabs.value.push(newTab)
  activeTab.value = newTab.id
  nextTabId.value++
}

const removeTab = (tabId: string) => {
  if (tabs.value.length <= 1) return // 保持至少一个标签页

  const index = tabs.value.findIndex(tab => tab.id === tabId)
  if (index === -1) return

  tabs.value.splice(index, 1)

  // 如果删除的是当前激活的标签页，切换到相邻的标签页
  if (activeTab.value === tabId) {
    const newIndex = Math.min(index, tabs.value.length - 1)
    activeTab.value = tabs.value[newIndex].id
  }
}

const handleNavMeshFiles = (files: string[]) => {
  console.debug('NavMesh文件:', files)

  // 找到当前激活的tab
  const currentTabIndex = tabs.value.findIndex(tab => tab.id === activeTab.value)
  if (currentTabIndex === -1) return

  // 将当前tab转换为3D场景类型
  const currentTab = tabs.value[currentTabIndex]
  currentTab.type = 'navmesh'
  currentTab.title = `NavMesh调试 - ${files.map(f => f).join(', ')}`
  currentTab.filesString = [...files]
}

const handleNavMeshFilesProcessed = (success: boolean, error?: string) => {
  
  console.debug('File processing result:', { success, error })
}

const handlePhysicsFiles = (files: File[]) => {

  // 找到当前激活的tab
  const currentTabIndex = tabs.value.findIndex(tab => tab.id === activeTab.value)
  if (currentTabIndex === -1) return

  // 将当前tab转换为3D场景类型
  const currentTab = tabs.value[currentTabIndex]
  currentTab.type = 'threejs'
  currentTab.title = `物理碰撞可视化 - ${files.map(f => f.name).join(', ')}`
  currentTab.files = [...files]
}

const navMeshFilters = [
  { pattern: '*.bin', displayName: 'Binary NavMesh (*.bin)' },
  { pattern: '*.navmesh', displayName: 'NavMesh Files (*.navmesh)' }
]

</script>

<template>
  <div class="h-full flex flex-col bg-background" >
    <!-- 顶部标签栏 -->
    <div class="border-b bg-card" >
      <Tabs v-model="activeTab" class="w-full" >
        <div class="flex items-center">
          <TabsList class="flex-1 justify-start h-10 bg-transparent p-0">
            <TabsTrigger v-for="tab in tabs" :key="tab.id" :value="tab.id"
              :title="tab.title"
              class="relative group h-10 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center justify-between tab-fixed-width">
              <span class="truncate flex-1 text-left">{{ tab.title }}</span>
              <button v-if="tabs.length > 1" @click.stop="removeTab(tab.id)"
                class="ml-2 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive rounded-sm p-0.5 transition-all flex-shrink-0">
                <X class="w-3 h-3" />
              </button>
            </TabsTrigger>
          </TabsList>

          <!-- 添加标签页按钮 -->
          <button @click="addNewTab"
            class="flex items-center justify-center w-10 h-10 hover:bg-accent rounded-md transition-colors"
            title="添加新标签页">
            <Plus class="w-4 h-4" />
          </button>
        </div>
      </Tabs>
    </div>

    <!-- 主内容区域 -->
    <div class="flex-1 h-full">
      <Tabs v-model="activeTab" class="h-full">
        <TabsContent v-for="tab in tabs" :key="tab.id" :value="tab.id" class="h-full">
          <!-- 欢迎页类型 -->
          <div v-if="tab.type === 'welcome'" class="h-full flex items-center justify-center p-6">
            <div class="max-w-4xl w-full space-y-8 mb-16">
              <!-- 标签页标题 -->
              <div class="text-center mb-8">
                <h2 class="text-2xl font-bold mb-2">{{ tab.title }}</h2>
                <p class="text-muted-foreground">{{ tab.content }}</p>
              </div>

              <!-- 文件导入区域 -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- NavMesh调试 -->
                <!-- <FileImportArea title="NavMesh调试" accept=".bin,.navmesh" :multiple="false"
                  @files-selected="handleNavMeshFiles" /> -->

                <GoFileImportArea title="NavMesh调试" :filters="[
                  { pattern: '*.bin', displayName: 'Binary NavMesh (*.bin)' },
                  { pattern: '*.navmesh', displayName: 'NavMesh Files (*.navmesh)' }
                ]" @files-selected="handleNavMeshFiles" @file-processed="handleNavMeshFilesProcessed" />

                <!-- 物理碰撞可视化 -->
                <FileImportArea title="物理碰撞可视化" accept=".xml,.obj" :multiple="false"
                  @files-selected="handlePhysicsFiles" />
              </div>
            </div>
          </div>

          <!-- Three.js 3D场景类型 -->
          <div v-else-if="tab.type === 'threejs'" class="h-full">
            <ThreeJSScene :files="tab.files || []" />
          </div>

          <!-- NavMesh 3D场景类型 -->
          <div v-else-if="tab.type === 'navmesh'" class="h-full">
            <NavMeshScene :files="tab.filesString || []" :nav-mesh-id="tab.id" />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  </div>
</template>

<style scoped>
/* 固定标签页宽度 */
.tab-fixed-width {
  width: 200px !important;
  min-width: 200px !important;
  max-width: 200px !important;
  flex-grow: 0 !important;
  flex-shrink: 0 !important;
  flex-basis: 200px !important;
}
</style>
