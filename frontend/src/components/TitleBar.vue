<template>
  <div class="title-bar" style="--wails-draggable: drag;">
    <!-- 左侧：应用图标和名称 -->
    <div class="title-bar-left">
      <img src="../assets/images/logo-universal.png" alt="App Icon" class="app-icon" />
      <span class="app-name">Workbench</span>
    </div>

    <!-- 右侧：窗口控制按钮 -->
    <div class="title-bar-right">
      <button @click="minimizeWindow" class="window-control minimize" title="最小化" style="--wails-draggable: no-drag;">
        <Minus :size="14" />
      </button>
      <button @click="toggleMaximize" class="window-control maximize" :title="isMaximized ? '还原' : '最大化'" style="--wails-draggable: no-drag;">
        <Maximize2 v-if="!isMaximized" :size="14" />
        <Minimize2 v-else :size="14" />
      </button>
      <button @click="closeWindow" class="window-control close" title="关闭" style="--wails-draggable: no-drag;">
        <X :size="14" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Minus, Maximize2, Minimize2, X } from 'lucide-vue-next'
import { WindowMaximise, WindowMinimise, WindowUnmaximise, Quit, WindowIsMaximised } from '../../wailsjs/runtime/runtime'

const isMaximized = ref(false)

const minimizeWindow = async () => {
  try {
    await WindowMinimise()
  } catch (error) {
    console.error('Error minimizing window:', error)
  }
}

const toggleMaximize = async () => {
  try {
    if (isMaximized.value) {
      await WindowUnmaximise()
      isMaximized.value = false
    } else {
      await WindowMaximise()
      isMaximized.value = true
    }
  } catch (error) {
    console.error('Error toggling maximize:', error)
  }
}

const closeWindow = async () => {
  try {
    await Quit()
  } catch (error) {
    console.error('Error closing window:', error)
  }
}

const checkMaximizeState = async () => {
  try {
    isMaximized.value = await WindowIsMaximised()
  } catch (error) {
    console.error('Error checking maximize state:', error)
  }
}

onMounted(() => {
  checkMaximizeState()
  // 监听窗口状态变化
  window.addEventListener('resize', checkMaximizeState)
})
</script>

<style scoped>
.title-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  height: 30px;
  background-color: hsl(var(--background));
  padding: 0 8px;
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 1000;
  user-select: none;
}

.title-bar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-icon {
  width: 16px;
  height: 16px;
}

.app-name {
  font-size: 13px;
  color: hsl(var(--foreground));
  font-weight: 400;
}

.title-bar-right {
  display: flex;
  align-items: center;
}

.window-control {
  width: 46px;
  height: 30px;
  border: none;
  background: transparent;
  color: hsl(var(--muted-foreground));
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.window-control:hover {
  background-color: hsl(var(--accent));
  color: hsl(var(--accent-foreground));
}

.window-control.close:hover {
  background-color: #e81123;
  color: white;
}

.window-control:active {
  background-color: hsl(var(--accent) / 0.8);
  color: hsl(var(--accent-foreground));
}

.window-control.close:active {
  background-color: #f1707a;
  color: white;
}
</style> 