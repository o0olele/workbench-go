import { createI18n } from 'vue-i18n'

const messages = {
    zh: {
        "common": {
            "ready": "就绪",
            "processing": "处理中...",
            "welcome": "欢迎",
            "close": "关闭",
            "minimize": "最小化",
            "maximize": "最大化",
            "restore": "还原",
            "language": "语言",
            "chinese": "中文",
            "english": "English"
        },
        "theme": {
            "light": "浅色主题",
            "dark": "深色主题",
            "system": "跟随系统"
        },
        "workspace": {
            "welcome_page": "欢迎页",
            "new_tab": "新标签页",
            "add_new_tab": "添加新标签页",
            "welcome_message": "欢迎使用工作台！",
            "navmesh_debug": "NavMesh调试",
            "physics_visualization": "物理碰撞可视化",
            "octree_scene": "八叉树场景",
            "click_or_drag": "点击选择文件或拖拽文件到这里",
            "click_to_enter_octree": "点击进入八叉树可视化场景",
            "spatial_data_structure": "空间分割数据结构可视化",
            "supported_formats": "支持的格式",
            "all_files": "所有文件",
            "multi_file_support": "支持多文件选择",
            "drop_files": "释放文件进行导入",
            "navmesh_tab_title": "NavMesh调试",
            "physics_tab_title": "物理碰撞可视化",
            "octree_tab_title": "八叉树可视化",
            "physx_debug": "PhysX调试",
            "click_to_enter_physx": "点击进入PhysX调试场景",
            "welcome_content": "欢迎使用Workbench！",
            "statetree_debug": 'StateTree调试',
            "click_to_enter_statetree": '点击进入StateTree调试场景',
            "state_management": '状态管理可视化',
            "statetree_content": 'StateTree内容将在这里显示',
            "statetree_placeholder": 'StateTree功能开发中...'
        },
        "app": {
            "name": "Workbench",
            "version": "v1.0.0"
        }
    },
    en: {
        "common": {
            "ready": "Ready",
            "processing": "Processing...",
            "welcome": "Welcome",
            "close": "Close",
            "minimize": "Minimize",
            "maximize": "Maximize",
            "restore": "Restore",
            "language": "Language",
            "chinese": "中文",
            "english": "English"
        },
        "theme": {
            "light": "Light Theme",
            "dark": "Dark Theme",
            "system": "Follow System"
        },
        "workspace": {
            "welcome_page": "Welcome",
            "new_tab": "New Tab",
            "add_new_tab": "Add New Tab",
            "welcome_message": "Welcome to Workbench!",
            "navmesh_debug": "NavMesh Debug",
            "physics_visualization": "Physics Visualization",
            "octree_scene": "Octree Scene",
            "click_or_drag": "Click to select files or drag files here",
            "click_to_enter_octree": "Click to enter octree visualization scene",
            "spatial_data_structure": "Spatial data structure visualization",
            "navmesh_tab_title": "NavMesh Debug",
            "physics_tab_title": "Physics Visualization",
            "octree_tab_title": "Octree Scene",
            "supported_formats": "Supported formats",
            "all_files": "All files",
            "multi_file_support": "Multi-file selection supported",
            "drop_files": "Drop files to import",
            "physx_debug": "PhysX Debug",
            "click_to_enter_physx": "Click to enter PhysX debug scene",
            "welcome_content": "Welcome to Workbench!",
            "statetree_debug": "StateTree Debug",
            "click_to_enter_statetree": "Click to enter StateTree debug scene",
            "state_management": "State management visualization",
            "statetree_content_placeholder": "StateTree content will be displayed here"
        },
        "app": {
            "name": "Workbench",
            "version": "v1.0.0"
        }
    }
}

// 获取浏览器语言或本地存储的语言设置
const getDefaultLocale = (): string => {
    const savedLocale = localStorage.getItem('locale')
    if (savedLocale && ['zh', 'en'].includes(savedLocale)) {
        return savedLocale
    }

    // 检测浏览器语言
    const browserLang = navigator.language.toLowerCase()
    if (browserLang.startsWith('zh')) {
        return 'zh'
    }
    return 'en'
}

const i18n = createI18n({
    legacy: false, // 使用 Composition API 模式
    locale: getDefaultLocale(),
    fallbackLocale: 'zh',
    messages,
    globalInjection: true // 全局注入 $t 函数
})

export default i18n

// 导出切换语言的函数
export const setLocale = (locale: string) => {
    if (['zh', 'en'].includes(locale)) {
        i18n.global.locale.value = locale as any
        localStorage.setItem('locale', locale)
        document.documentElement.lang = locale
    }
}

// 导出获取当前语言的函数
export const getCurrentLocale = () => {
    return i18n.global.locale.value
}