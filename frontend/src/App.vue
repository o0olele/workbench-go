<script lang="ts" setup>
import HelloWorld from './components/HelloWorld.vue'
import TitleBar from './components/TitleBar.vue'
</script>

<template>
  <TitleBar />
  <div class="app-content">
    <img id="logo" alt="Wails logo" src="./assets/images/logo-universal.png"/>
    <HelloWorld/>
  </div>
</template>

<style>
#logo {
  display: block;
  width: 50%;
  height: 50%;
  margin: auto;
  padding: 10% 0 0;
  background-position: center;
  background-repeat: no-repeat;
  background-size: 100% 100%;
  background-origin: content-box;
}

.app-content {
  padding-top: 30px; /* 为标题栏留出空间 */
  height: calc(100vh - 30px);
  overflow: auto;
}
</style>
