<script lang="ts" setup>
import TitleBar from './components/TitleBar.vue'
import WorkspaceArea from './components/WorkspaceArea.vue'
import StatusBar from './components/StatusBar.vue'
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
