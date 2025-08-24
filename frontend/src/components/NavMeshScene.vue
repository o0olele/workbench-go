<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { LoadNavMesh, GetNavMeshInfo, LoadNavMeshLocal, RemoveNavMesh } from '../../wailsjs/go/main/App'
import { LogDebug } from '../../wailsjs/runtime/runtime'
import { DebugDrawer } from '@/lib/debug-drawer'
import { FolderApi, Pane } from 'tweakpane'
import { CrowdHelper, DebugCrowd } from '@/lib/crowd'

interface Props {
    files?: string[],
    navMeshId?: string
}

const props = withDefaults(defineProps<Props>(), {
    files: () => []
})

const containerRef = ref<HTMLDivElement>()
const canvasRef = ref<HTMLCanvasElement>()
const paneRef = ref<HTMLElement>()
let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let animationId: number
let resizeObserver: ResizeObserver | null = null
let isSceneInitialized = false
let pendingFiles: string[] = []
let raycaster: THREE.Raycaster
let crowd: DebugCrowd
let crowdHelper: CrowdHelper
let themeObserver: MutationObserver | null = null

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

interface ColorApi {
    color: THREE.Color
}

const createColorControl = (obj: ColorApi, folder: FolderApi) => {
    const baseColor255 = obj.color.clone().multiplyScalar(255)
    const params = { color: { r: baseColor255.r, g: baseColor255.g, b: baseColor255.b } }
    folder.addBinding(params, 'color', { label: 'Color' }).on('change', e => {
        obj.color.setRGB(e.value.r, e.value.g, e.value.b).multiplyScalar(1 / 255)
    })
}

// 初始化Three.js场景
const initScene = () => {
    if (!canvasRef.value || !containerRef.value || !paneRef.value) return

    const pane = new Pane({
        container: paneRef.value
    })
    // 获取容器尺寸
    const containerRect = containerRef.value.getBoundingClientRect()
    const width = containerRect.width
    const height = containerRect.height

    // 创建场景
    scene = new THREE.Scene()
    updateSceneBackground() // 使用主题相关的背景色

    // 创建相机
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    camera.position.set(5, 5, 5)
    camera.lookAt(0, 0, 0)

    // 创建渲染器
    renderer = new THREE.WebGLRenderer({
        canvas: canvasRef.value,
        antialias: true
    })
    renderer.setSize(width, height)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap

    const folder = pane.addFolder({ title: 'Scene' })
    const params = {
        background: { r: 18, g: 18, b: 18 }
    }
    folder.addBinding(params, 'background', { label: 'Background Color' }).on('change', e => {
        scene.background = new THREE.Color(e.value.r / 255, e.value.g / 255, e.value.b / 255)
    })

    // 添加环境光
    const ambientLight = new THREE.AmbientLight(0x404040, 0.6)
    ambientLight.userData.isUserObject = false
    scene.add(ambientLight)

    // 添加方向光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
    directionalLight.position.set(10, 10, 5)
    directionalLight.castShadow = true
    directionalLight.shadow.mapSize.width = 2048
    directionalLight.shadow.mapSize.height = 2048
    directionalLight.userData.isUserObject = false
    scene.add(directionalLight)

    // 添加坐标轴辅助器
    const axesHelper = new THREE.AxesHelper(5)
    axesHelper.userData.isUserObject = false
    scene.add(axesHelper)

    console.log('场景初始化完成，基础对象数量:', scene.children.length)

    // 设置轨道控制器
    controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true // 启用阻尼（惯性）
    controls.dampingFactor = 0.05
    controls.screenSpacePanning = false
    controls.minDistance = 1
    controls.maxDistance = 100
    controls.maxPolarAngle = Math.PI / 2 // 限制垂直旋转角度

    // 设置尺寸监听
    setupResizeObserver()
    setupMouseEvents()

    // 标记场景已初始化
    isSceneInitialized = true

    // 如果有等待加载的文件，现在加载它们
    if (pendingFiles.length > 0) {
        console.log(`加载等待中的${pendingFiles.length}个文件`)
        loadFiles([...pendingFiles])
        pendingFiles = []
    }

    if (props.navMeshId) {
        crowd = new DebugCrowd(props.navMeshId)
        crowdHelper = new CrowdHelper(crowd)

        crowd.createAgentFolder(pane, () => {
            crowdHelper.update()
            scene.add(crowdHelper)
        })
        crowd.createPathFolder(pane)
        crowd.createDebugFolder(pane)
    }

    // 开始渲染循环
    animate()
}

// 设置尺寸监听器
const setupResizeObserver = () => {
    if (!containerRef.value) return

    resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
            const { width, height } = entry.contentRect
            if (width > 0 && height > 0) {
                resizeRenderer(width, height)
            }
        }
    })

    resizeObserver.observe(containerRef.value)

    // 也监听窗口大小变化
    window.addEventListener('resize', handleWindowResize)
}

const setupMouseEvents = () => {
    if (!containerRef.value) return
    if (!raycaster) {
        raycaster = new THREE.Raycaster()
    }


    containerRef.value.addEventListener('mousedown', (e) => {

        const rect = containerRef.value!.getBoundingClientRect()
        const pointer = new THREE.Vector2()
        pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

        console.log('Mouse click - button:', e.button, 'pointer:', pointer)

        // 0 is left, 1 is middle, 2 is right
        if (e.button === 2) {
            raycaster.setFromCamera(pointer, camera);
            const intersects = raycaster.intersectObjects(scene.children, true);
            console.log('Right click - intersects:', intersects.length)
            if (intersects.length > 0 && props.navMeshId) {
                const point = intersects[0].point
                console.log('Teleporting agent to:', point)
                crowd.teleportAgent(props.navMeshId, point)
            }
        } else if (e.button === 0) {
            raycaster.setFromCamera(pointer, camera);
            const intersects = raycaster.intersectObjects(scene.children, true);
            console.log('Left click - intersects:', intersects.length)
            if (intersects.length > 0 && props.navMeshId) {
                const point = intersects[0].point
                console.log('Setting agent target to:', point)
                crowd.moveAgent(props.navMeshId, point)
            }
        }
    })
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

// 动画循环
const animate = () => {
    animationId = requestAnimationFrame(animate)

    // 更新轨道控制器
    if (controls) {
        controls.update()
    }

    if (props.navMeshId && crowd) {
        // 获取移动状态信息
        const status = crowd.getMovementStatus()
        
        // 始终更新调试状态显示
        crowd.debugStatus.isMoving = status.isMoving
        crowd.debugStatus.stillFrames = status.stillFrameCount
        crowd.debugStatus.updating = status.shouldUpdate

        // 只在需要时更新 crowd
        if (status.shouldUpdate) {
            crowd.update(props.navMeshId)
            crowdHelper.update()
        }
    }

    renderer.render(scene, camera)
}
const loadNavMesh = async (file: string) => {
    if (props.navMeshId) {
        await LoadNavMeshLocal(props.navMeshId, file, 'tilemesh', file)

        const info = await GetNavMeshInfo(props.navMeshId, true)
        console.log(info, props.navMeshId)
        const debugDrawer = new DebugDrawer()
        debugDrawer.drawPrimitives(info.primitives)
        scene.add(debugDrawer)

        LogDebug(`已加载NavMesh文件: ${file}`)
        console.log('已加载NavMesh文件: ', file)
        console.log('当前场景子对象数量: ', debugDrawer)
    } else {
        LogDebug(`未找到NavMeshId: ${props.navMeshId}`)
    }
}

// 处理文件加载
const loadFiles = async (files: string[]) => {
    if (!isSceneInitialized || !scene) {
        console.log('场景尚未初始化，将文件添加到等待队列')
        pendingFiles = [...files]
        return
    }

    console.log(`开始加载${files.length}个文件`)
    console.log(`加载前场景子对象数量:`, scene.children.length)

    // 清除之前的用户添加的对象（保留灯光、网格和坐标轴）
    const objectsToRemove: THREE.Object3D[] = []
    scene.traverse((child) => {
        // 移除之前加载的模型，但保留场景基础对象
        if (child !== scene &&
            !(child instanceof THREE.Light) &&
            !(child instanceof THREE.GridHelper) &&
            !(child instanceof THREE.AxesHelper) &&
            child.parent === scene) {
            // 只移除直接添加到场景的对象
            if (child.userData.isUserObject !== false) {
                objectsToRemove.push(child)
            }
        }
    })

    console.log(`将移除${objectsToRemove.length}个之前的对象`)
    objectsToRemove.forEach(obj => {
        scene.remove(obj)
        console.log('移除对象:', obj)
    })

    // 加载新文件
    for (const file of files) {
        const extension = file.toLowerCase().split('.').pop()
        console.log(`处理文件: ${file}, 扩展名: ${extension}`)

        switch (extension) {
            case 'bin':
                await loadNavMesh(file)
                break
            default:
                console.warn(`不支持的文件类型: ${extension}`)
        }
    }

    console.log(`加载完成后场景子对象数量:`, scene.children.length)
}

// 监听文件变化
watch(() => props.files, (newFiles, oldFiles) => {
    console.log('文件props发生变化:', { newFiles, oldFiles, isSceneInitialized })
    if (newFiles && newFiles.length > 0) {
        console.log(`准备加载${newFiles.length}个文件`)
        loadFiles(newFiles)
    } else {
        console.log('没有文件需要加载')
    }
}, { deep: true })

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

        // 初始化完成后，如果props中已经有文件，立即加载
        if (props.files && props.files.length > 0) {
            console.log(`组件挂载后发现${props.files.length}个文件，立即加载`)
            loadFiles(props.files)
        }
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
    if (resizeObserver) {
        resizeObserver.disconnect()
    }
    if (themeObserver) {
        themeObserver.disconnect()
    }
    if (props.navMeshId) {
        RemoveNavMesh(props.navMeshId)
    }
    window.removeEventListener('resize', handleWindowResize)
})
</script>

<template>

    <div ref="containerRef" class="navmesh-container">
        <div ref="paneRef" class="debug-container"></div>
        <canvas ref="canvasRef" class="navmesh-canvas" />
    </div>
</template>

<style scoped>
.navmesh-container {
    width: 100%;
    height: 100%;
    position: relative;
    overflow: hidden;
}

.navmesh-canvas {
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
