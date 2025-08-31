<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Sun, Moon, Monitor, Languages } from 'lucide-vue-next'
import { useI18n } from 'vue-i18n'
import { setLocale, getCurrentLocale } from '@/i18n'

type Theme = 'light' | 'dark' | 'system'
type Locale = 'zh' | 'en'

const { t } = useI18n()
const currentTheme = ref<Theme>('dark')
const currentLocale = ref<Locale>('zh')
const systemTime = ref('')

// 获取当前时间
const updateTime = () => {
  const now = new Date()
  systemTime.value = now.toLocaleTimeString('zh-CN', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// 主题切换
const toggleTheme = () => {
  const themes: Theme[] = ['light', 'dark', 'system']
  const currentIndex = themes.indexOf(currentTheme.value)
  const nextIndex = (currentIndex + 1) % themes.length
  currentTheme.value = themes[nextIndex]
  applyTheme(currentTheme.value)
}

// 应用主题
const applyTheme = (theme: Theme) => {
  const htmlElement = document.documentElement
  
  // 移除所有主题类
  htmlElement.classList.remove('light', 'dark')
  
  if (theme === 'system') {
    // 系统主题：检测系统偏好
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) {
      htmlElement.classList.add('dark')
    } else {
      htmlElement.classList.add('light')
    }
  } else {
    // 手动选择的主题
    htmlElement.classList.add(theme)
  }
  
  // 保存到本地存储
  localStorage.setItem('theme', theme)
}

// 获取主题图标
const getThemeIcon = () => {
  switch (currentTheme.value) {
    case 'light':
      return Sun
    case 'dark':
      return Moon
    case 'system':
      return Monitor
    default:
      return Moon
  }
}

// 获取主题描述
const getThemeLabel = () => {
  switch (currentTheme.value) {
    case 'light':
      return t('theme.light')
    case 'dark':
      return t('theme.dark')
    case 'system':
      return t('theme.system')
    default:
      return t('theme.dark')
  }
}

// 语言切换
const toggleLanguage = () => {
  const newLocale = currentLocale.value === 'zh' ? 'en' : 'zh'
  currentLocale.value = newLocale
  setLocale(newLocale)
}

// 获取语言标签
const getLanguageLabel = () => {
  return currentLocale.value === 'zh' ? t('common.chinese') : t('common.english')
}

// 初始化
onMounted(() => {
  // 从本地存储恢复主题
  const savedTheme = localStorage.getItem('theme') as Theme
  if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
    currentTheme.value = savedTheme
    applyTheme(savedTheme)
  }
  
  // 初始化语言设置
  currentLocale.value = getCurrentLocale() as Locale
  
  // 开始时间更新
  updateTime()
  setInterval(updateTime, 1000)
  
  // 监听系统主题变化
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  mediaQuery.addEventListener('change', () => {
    if (currentTheme.value === 'system') {
      applyTheme('system')
    }
  })
})
</script>

<template>
  <div class="h-6 bg-card border-t border-border flex items-center justify-between px-3 text-xs text-muted-foreground select-none">
    <!-- 左侧状态信息 -->
    <div class="flex items-center space-x-4">
      <span class="flex items-center">
        <span class="w-2 h-2 bg-green-500 rounded-full mr-1.5"></span>
        {{ t('common.ready') }}
      </span>
      <span class="text-primary">{{ t('app.name') }} {{ t('app.version') }}</span>
    </div>
    
    <!-- 右侧控制区 -->
    <div class="flex items-center space-x-3">
      <span class="font-mono">{{ systemTime }}</span>
      
      <!-- 语言切换按钮 -->
      <button
        @click="toggleLanguage"
        :title="t('common.language')"
        class="flex items-center space-x-1 px-2 py-1 rounded hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <Languages class="w-3 h-3" />
        <span class="hidden sm:inline">{{ getLanguageLabel() }}</span>
      </button>
      
      <!-- 主题切换按钮 -->
      <button
        @click="toggleTheme"
        :title="getThemeLabel()"
        class="flex items-center space-x-1 px-2 py-1 rounded hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <component :is="getThemeIcon()" class="w-3 h-3" />
        <span class="hidden sm:inline">{{ getThemeLabel() }}</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* 状态栏样式 */
</style>
