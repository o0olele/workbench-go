<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as THREE from 'three'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { PhysxXmlData } from '@/lib/physx/serialization'
import { CameraControls } from '@/lib/camera-controls'
import { Pane } from 'tweakpane'

interface Props {
  files?: File[]
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
let cameraControls: CameraControls
let animationId: number
let resizeObserver: ResizeObserver | null = null
let themeObserver: MutationObserver | null = null
let isSceneInitialized = false
let pendingFiles: File[] = []
let pane: Pane

const isZReversed = ref(false)
const isXReversed = ref(false)

const toggleCoordinateSystem = (axis: 'x' | 'z') => {
  if (!camera || !controls) return
  if (axis === 'x') {
    isXReversed.value = !isXReversed.value
  } else if (axis === 'z') {
    isZReversed.value = !isZReversed.value
  }

  // By default, three.js uses a right-handed coordinate system.
  // To switch to a left-handed system view, we can effectively mirror the world
  // along one axis. The most common convention change is the Z-axis direction.
  // We do this by negating the camera's Z position and re-orienting it.
  if (axis === 'x') {
    camera.position.x *= -1
  } else if (axis === 'z') {
    camera.position.z *= -1
  }
  camera.lookAt(controls.target)
  controls.update()
}

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

// 初始化Three.js场景
const initScene = () => {
  if (!canvasRef.value || !containerRef.value || !paneRef.value) return

  // 获取容器尺寸
  const containerRect = containerRef.value.getBoundingClientRect()
  const width = containerRect.width
  const height = containerRect.height

  // 创建场景
  scene = new THREE.Scene()
  updateSceneBackground() // 使用主题相关的背景色

  // 创建相机
  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 10000)
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

  // 添加网格地面
  const gridHelper = new THREE.GridHelper(20, 20)
  gridHelper.userData.isUserObject = false
  scene.add(gridHelper)

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
  controls.maxDistance = 10000

  // 创建相机控制器
  cameraControls = new CameraControls(camera, controls, canvasRef.value)

  // 设置尺寸监听
  setupResizeObserver()

  // 标记场景已初始化
  isSceneInitialized = true

  // 如果有等待加载的文件，现在加载它们
  if (pendingFiles.length > 0) {
    console.log(`加载等待中的${pendingFiles.length}个文件`)
    loadFiles([...pendingFiles])
    pendingFiles = []
  }

  pane = new Pane({
    container: paneRef.value
  })
  const folder = pane.addFolder({ title: 'Scene' })
  const params = {
    background: { r: 18, g: 18, b: 18 },
    isXReversed: isXReversed.value,
    isZReversed: isZReversed.value
  }
  folder.addBinding(params, 'background', { label: 'Background Color' }).on('change', e => {
    scene.background = new THREE.Color(e.value.r / 255, e.value.g / 255, e.value.b / 255)
  })
  
  folder.addBinding(params, 'isXReversed', { label: 'X轴反转' }).on('change', e => {
    if (isXReversed.value !== e.value) {
      toggleCoordinateSystem('x')
    }
  })
  folder.addBinding(params, 'isZReversed', { label: 'Z轴反转' }).on('change', e => {
    if (isZReversed.value !== e.value) {
      toggleCoordinateSystem('z')
    }
  })

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

  // 更新相机控制
  if (cameraControls) {
    cameraControls.update()
  }

  // 更新轨道控制器
  if (controls) {
    controls.update()
  }

  renderer.render(scene, camera)
}

// 加载OBJ文件
const loadOBJFile = async (file: File) => {
  const loader = new OBJLoader()

  try {
    console.log(`开始加载OBJ文件: ${file.name}`)
    const text = await file.text()
    console.log(`文件内容长度: ${text.length}`)

    const object = loader.parse(text)
    console.log(`解析的对象:`, object)
    console.log(`对象子元素数量:`, object.children.length)

    // 设置材质
    let meshCount = 0
    object.traverse((child: THREE.Object3D) => {
      if (child instanceof THREE.Mesh) {
        meshCount++
        child.material = new THREE.MeshLambertMaterial({
          color: 0x00ff00,
          wireframe: false
        })
        child.castShadow = true
        child.receiveShadow = true
        console.log(`设置材质给mesh ${meshCount}:`, child)
      }
    })
    console.log(`找到${meshCount}个mesh对象`)

    // 计算边界盒以居中对象
    const box = new THREE.Box3().setFromObject(object)
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    console.log(`对象边界盒:`, { center, size })

    // 如果对象有内容才进行位置和缩放调整
    if (size.x > 0 || size.y > 0 || size.z > 0) {
      object.position.sub(center)
    }

    scene.add(object)
    console.log(`已成功加载OBJ文件到场景: ${file.name}`)
    console.log(`当前场景子对象数量:`, scene.children.length)
  } catch (error) {
    console.error(`加载OBJ文件失败: ${file.name}`, error)
  }
}

// 加载XML文件（物理碰撞数据）
const loadXMLFile = async (file: File) => {
  try {
    const text = await file.text()
    const physxXmlData = new PhysxXmlData()
    physxXmlData.parseXml(text)
    const mesh = physxXmlData.build(0)
    if (mesh == null) {
      console.error(`构建物理碰撞数据失败: ${file.name}`)
      return
    }

    scene.add(mesh)
    console.log(`已加载XML文件: ${file.name}`)
  } catch (error) {
    console.error(`加载XML文件失败: ${file.name}`, error)
  }
}

// 处理文件加载
const loadFiles = async (files: File[]) => {
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
    const extension = file.name.toLowerCase().split('.').pop()
    console.log(`处理文件: ${file.name}, 扩展名: ${extension}`)

    switch (extension) {
      case 'obj':
        await loadOBJFile(file)
        break
      case 'xml':
        await loadXMLFile(file)
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

  // 清理相机控制器
  if (cameraControls) {
    cameraControls.dispose()
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

  window.removeEventListener('resize', handleWindowResize)
})
</script>

<template>
  <div ref="containerRef" class="threejs-container">
    <div ref="paneRef" class="debug-container"></div>
    <canvas ref="canvasRef" class="threejs-canvas" />
  </div>
</template>

<style scoped>
.threejs-container {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: hidden;
}

.threejs-canvas {
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
