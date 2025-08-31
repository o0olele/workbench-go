<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { Pane } from 'tweakpane'
import { OctreeHelper } from '@/lib/octree-helper'

interface Props {
    files?: File[],
    id?: string
}

const props = withDefaults(defineProps<Props>(), {
    files: () => [],
    id: () => 'default'
})

// 类型定义
interface Bounds {
    min: { x: number; y: number; z: number }
    max: { x: number; y: number; z: number }
}

interface GeometryData {
    type: string
    data: any
}

interface PathPoint {
    x: number
    y: number
    z: number
}

interface OctreeNode {
    is_leaf: boolean
    is_occupied: boolean
    bounds: Bounds
    children?: OctreeNode[]
}

interface OctreeData {
    root: OctreeNode
}

interface PathGraphNode {
    id: number
    center: { x: number; y: number; z: number }
    bounds: Bounds
}

interface PathGraphEdge {
    node_a_id: number
    node_b_id: number
}

interface PathGraphData {
    nodes: PathGraphNode[]
    edges: PathGraphEdge[]
}

interface PathResult {
    found: boolean
    path: PathPoint[]
    length?: number
    debug?: {
        stepSize: number
        agentRadius: number
        agentHeight: number
        startValidAgent?: boolean
        endValidAgent?: boolean
        startValid?: boolean
        endValid?: boolean
    }
}

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

let pathGraphData: PathGraphData | null = null

let pane: Pane
let octreeHelper: OctreeHelper
// 初始化场景
const initScene = () => {
    if (!canvasRef.value || !containerRef.value || !paneRef.value) return

    const containerRect = containerRef.value.getBoundingClientRect()
    const width = containerRect.width
    const height = containerRect.height

    // 创建场景
    scene = new THREE.Scene()
    scene.background = new THREE.Color(0x1a1a2e)
    scene.fog = new THREE.Fog(0x1a1a2e, 50, 200)

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
    octreeHelper = new OctreeHelper(props.id, scene, pane)
    octreeHelper.createPane()

    // 设置尺寸监听
    setupResizeObserver()

    // 开始渲染循环
    animate()
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

// 动画循环
const animate = () => {
    animationId = requestAnimationFrame(animate)

    // 更新控制器
    if (controls) {
        controls.update()
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
