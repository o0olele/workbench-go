<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Pane } from 'tweakpane'
import * as models from '../../wailsjs/go/models';
import { InitPhysx, PhysxStep, ReleasePhysx, LoadPhysxXml, LoadAndCreateRigidKinematic, SetRigidKinematicPosition, OpenFileDialog } from '../../wailsjs/go/main/App'
import { PhysxXmlData } from '@/lib/physx/serialization'

interface Props {
    files?: File[],
    id?: string
}

const props = withDefaults(defineProps<Props>(), {
    files: () => [],
    id: () => 'default'
})

// 组件引用
const containerRef = ref<HTMLDivElement>()
const canvasRef = ref<HTMLCanvasElement>()
const paneRef = ref<HTMLElement>()

// Three.js 相关变量
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let animationId: number
let themeObserver: MutationObserver | null = null
let physxInitialized = ref(false)

// 主题相关
const updateSceneBackground = () => {
    if (!scene) return

    // 获取当前主题的背景色
    const htmlElement = document.documentElement
    const isDark = htmlElement.classList.contains('dark')

    if (isDark) {
        // 深色主题：使用深灰色
        scene.background = new THREE.Color(0x1a1a1a)
    } else {
        // 浅色主题：使用浅灰色
        scene.background = new THREE.Color(0xf5f5f5)
    }
}

let pane: Pane
// 初始化场景
const initScene = () => {
    if (!canvasRef.value || !containerRef.value || !paneRef.value) return

    const containerRect = containerRef.value.getBoundingClientRect()
    const width = containerRect.width
    const height = containerRect.height

    // 创建场景
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1a1a1a)
    // scene.fog = new THREE.Fog(0x1a1a1a, 50, 200)

    // 创建相机
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    camera.position.set(20, 20, 20)
    camera.lookAt(0, 0, 0)

    // 创建渲染器
    renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.value,
        antialias: true
    })
    renderer.setSize(width, height)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    // 添加灯光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.4)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(20, 20, 10)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    scene.add(directionalLight)

    // 设置控制器
    setupControls()

    // 添加坐标轴和网格
    const axesHelper = new THREE.AxesHelper(15)
    scene.add(axesHelper)

    const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0x444444)
    scene.add(gridHelper)

    pane = new Pane({
        container: paneRef.value
    })
    const sceneFolder = pane.addFolder({ title: 'Scene' })

    const params = {
        host: '127.0.0.1',
        port: 5425,
    }
    sceneFolder.addBinding(params, 'host')
    sceneFolder.addBinding(params, 'port', {
        min: 0,
        max: 65535,
        step: 1,
    })
    sceneFolder.addButton({
        title: 'Connect',
    }).on('click', () => {
        InitPhysx(params.host, params.port).then(() => {
            physxInitialized.value = true
            loadRepxButton.disabled = false
        })
    })

    const repxFolder = pane.addFolder({ title: 'Repx(xml)' })
    const loadRepxButton = repxFolder.addButton({
        title: 'Load',
    }).on('click', async () => {
        // 选择文件
        const filePath = await OpenFileDialog('Load Repx(xml)', [
            {
                DisplayName: 'Repx(xml)',
                Pattern: '*.repx;*.xml',
            },
        ])
        if (filePath) {
            const filePaths = [filePath]
            const ret = await LoadAndCreateRigidKinematic(filePaths[0], new models.main.Vec3({ X: 0, Y: 2, Z: 0 }))

        }
    })
    loadRepxButton.disabled = !physxInitialized.value

    const controlFolder = pane.addFolder({ title: 'Control' })
    const position = {
        pos: new THREE.Vector3(0, 2, 0),
    }
    controlFolder.addBinding(position, 'pos').on('change', (value) => {
        if (physxInitialized.value) {
            SetRigidKinematicPosition(0, new models.main.Vec3({ X: position.pos.x, Y: position.pos.y, Z: position.pos.z }))
        }
    })

    // 设置尺寸监听
    setupResizeObserver()

    // 开始渲染循环
    animate(0)
}

// 设置控制器
const setupControls = () => {
    if (!renderer || !camera) return
    controls = new OrbitControls(camera, renderer.domElement)
}

// 设置尺寸监听器
const setupResizeObserver = () => {
    if (!containerRef.value) return

    const resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const { width, height } = entry.contentRect
            if (width > 0 && height > 0) {
                resizeRenderer(width, height)
            }
        }
    })

    resizeObserver.observe(containerRef.value)
    window.addEventListener('resize', handleWindowResize)
}

// 处理窗口大小变化
const handleWindowResize = () => {
    if (!containerRef.value) return

    const containerRect = containerRef.value.getBoundingClientRect()
    if (containerRect.width > 0 && containerRect.height > 0) {
        resizeRenderer(containerRect.width, containerRect.height)
    }
}

// 调整渲染器尺寸
const resizeRenderer = (width: number, height: number) => {
    if (!camera || !renderer) return

    camera.aspect = width / height
    camera.updateProjectionMatrix()
    renderer.setSize(width, height)
}

let lastTime = 0
const targetFPS = 40
const frameDuration = 1000 / targetFPS // 每帧的目标间隔时间 (ms)
// 动画循环
const animate = (time: number) => {
    animationId = requestAnimationFrame(animate)

    const delta = time - lastTime
    if (delta < frameDuration) {
        return // 没到时间就跳过这帧
    }
    lastTime = time

    // 更新控制器
    if (controls) {
        controls.update()
    }

    if (physxInitialized.value) {
        PhysxStep()
    }

    // 渲染场景
    if (renderer && scene && camera) {
        renderer.render(scene, camera)
    }
}

// 组件挂载时初始化场景
onMounted(() => {
    nextTick(() => {
        initScene()

        // 监听主题变化
        themeObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    updateSceneBackground()
                }
            })
        })

        // 开始观察 html 元素的 class 属性变化
        themeObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['class']
        })
    })
})

// 组件卸载时清理资源
onUnmounted(() => {
    if (animationId) {
        cancelAnimationFrame(animationId)
    }
    if (controls) {
        controls.dispose()
    }
    if (renderer) {
        renderer.dispose()
    }
    if (themeObserver) {
        themeObserver.disconnect()
    }
    if (physxInitialized.value) {
        physxInitialized.value = false
        ReleasePhysx().then(() => {
            physxInitialized.value = false
        })
    }
    window.removeEventListener('resize', handleWindowResize)
})
</script>

<template>
    <div ref="containerRef" class="octree-container">
        <div ref="paneRef" class="debug-container"></div>
        <canvas ref="canvasRef" class="octree-canvas" />
    </div>
</template>

<style scoped>
.octree-container {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
}

.octree-canvas {
    display: block;
    width: 100%;
    height: 100%;
}

.debug-container {
    position: absolute;
    top: 10px;
    right: 10px;
    z-index: 1000;
}

/* 确保 tweakpane 内部元素可以接收鼠标事件 */
.debug-container :deep(.tp-dfwv) {
    pointer-events: auto;
}
</style>
