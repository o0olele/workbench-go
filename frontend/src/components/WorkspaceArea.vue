<script setup lang="ts">
import { ref, computed } from 'vue'
import { Plus, X } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import FileImportArea from './FileImportArea.vue'
import GoFileImportArea from './GoFileImportArea.vue'
import ThreeJSScene from './ThreeJSScene.vue'
import NavMeshScene from './NavMeshScene.vue'
import OctreeScene from './OctreeScene.vue'

const { t } = useI18n()

type TabType = 'welcome' | 'threejs' | 'navmesh' | 'octree'

interface TabItem {
  id: string
  title: string
  type: TabType
  content?: string
  files?: File[]
  filesString?: string[]
}

const tabs = ref<TabItem[]>([
  { id: 'welcome', title: 'workspace.welcome_page', type: 'welcome', content: 'workspace.welcome_message' }
])

const activeTab = ref('welcome')
const nextTabId = ref(2)

// 计算属性：处理标签页标题的国际化
const getTabTitle = (tab: TabItem) => {
  if (tab.title.includes('|')) {
    const [key, suffix] = tab.title.split('|')
    return `${t(key)} - ${suffix}`
  }
  if (tab.title.startsWith('workspace.new_tab_')) {
    const number = tab.title.replace('workspace.new_tab_', '')
    return `${t('workspace.new_tab')} ${number}`
  }
  return t(tab.title)
}

const addNewTab = () => {
  const newTab: TabItem = {
    id: `tab-${nextTabId.value}`,
    title: `workspace.new_tab_${nextTabId.value}`,
    type: 'welcome',
    content: `workspace.new_tab_${nextTabId.value}`
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
  currentTab.title = `workspace.navmesh_tab_title|${files.map(f => f).join(', ')}`
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
  currentTab.title = `workspace.physics_tab_title|${files.map(f => f.name).join(', ')}`
  currentTab.files = [...files]
}

const handleOctreeScene = () => {
  // 找到当前激活的tab
  const currentTabIndex = tabs.value.findIndex(tab => tab.id === activeTab.value)
  if (currentTabIndex === -1) return

  // 将当前tab转换为八叉树场景类型
  const currentTab = tabs.value[currentTabIndex]
  currentTab.type = 'octree'
  currentTab.title = 'workspace.octree_tab_title'
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
              :title="getTabTitle(tab)"
              class="relative group h-10 px-3 data-[state=active]:bg-background data-[state=active]:shadow-sm flex items-center justify-between tab-fixed-width">
              <span class="truncate flex-1 text-left">{{ getTabTitle(tab) }}</span>
              <button v-if="tabs.length > 1" @click.stop="removeTab(tab.id)"
                class="ml-2 opacity-0 group-hover:opacity-100 hover:bg-destructive/20 hover:text-destructive rounded-sm p-0.5 transition-all flex-shrink-0">
                <X class="w-3 h-3" />
              </button>
            </TabsTrigger>
          </TabsList>

          <!-- 添加标签页按钮 -->
          <button @click="addNewTab"
            class="flex items-center justify-center w-10 h-10 hover:bg-accent rounded-md transition-colors"
            :title="t('workspace.add_new_tab')">
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
                <h2 class="text-2xl font-bold mb-2">{{ getTabTitle(tab) }}</h2>
                <p class="text-muted-foreground">{{ t(tab.content || '') }}</p>
              </div>

              <!-- 文件导入区域 -->
              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                
                <GoFileImportArea :title="t('workspace.navmesh_debug')" :filters="[
                  { pattern: '*.bin', displayName: 'Binary NavMesh (*.bin)' },
                  { pattern: '*.navmesh', displayName: 'NavMesh Files (*.navmesh)' }
                ]" @files-selected="handleNavMeshFiles" @file-processed="handleNavMeshFilesProcessed" />

                <!-- 物理碰撞可视化 -->
                <FileImportArea :title="t('workspace.physics_visualization')" accept=".xml,.obj" :multiple="false"
                  @files-selected="handlePhysicsFiles" />

                <!-- 八叉树场景 -->
                <div
                  class="relative border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all duration-200 hover:border-primary/50 hover:bg-accent/50 border-border"
                  @click="handleOctreeScene"
                >
                  <div class="flex flex-col items-center space-y-4">
                    <div class="p-4 rounded-full bg-accent">
                      <svg class="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
                      </svg>
                    </div>
                    
                    <div>
                      <h3 class="text-lg font-semibold mb-2">{{ t('workspace.octree_scene') }}</h3>
                      <p class="text-sm text-muted-foreground mb-2">
                        {{ t('workspace.click_to_enter_octree') }}
                      </p>
                      <p class="text-xs text-muted-foreground">
                        {{ t('workspace.spatial_data_structure') }}
                      </p>
                    </div>
                  </div>
                </div>
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

          <!-- 八叉树场景类型 -->
          <div v-else-if="tab.type === 'octree'" class="h-full">
            <OctreeScene :id="tab.id" />
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
