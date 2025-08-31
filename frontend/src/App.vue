<script lang="ts" setup>
import { onMounted } from 'vue'
import TitleBar from './components/TitleBar.vue'
import WorkspaceArea from './components/WorkspaceArea.vue'
import StatusBar from './components/StatusBar.vue'
import { setLocale, getCurrentLocale } from './i18n'

// 在应用启动时初始化语言设置
onMounted(() => {
  const savedLocale = localStorage.getItem('locale')
  if (savedLocale && ['zh', 'en'].includes(savedLocale)) {
    setLocale(savedLocale)
  } else {
    // 检测浏览器语言
    const browserLang = navigator.language.toLowerCase()
    const defaultLang = browserLang.startsWith('zh') ? 'zh' : 'en'
    setLocale(defaultLang)
  }
})
</script>

<template>
  <div class="app-container">
    <TitleBar />
    <div class="app-content">
      <WorkspaceArea />
    </div>
    <StatusBar />
  </div>
</template>

<style>
.app-container {
  height: 100vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.app-content {
  flex: 1;
  padding-top: 32px; /* 为固定定位的标题栏留出空间（30px + 2px边框）*/
  padding-bottom: 0; /* 为状态栏留出空间 */
  box-sizing: border-box;
  overflow: hidden;
  min-height: 0; /* 确保 flexbox 子项可以收缩 */
}
</style>
