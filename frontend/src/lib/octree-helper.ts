import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { Pane } from 'tweakpane';
import { nextTick } from 'vue'
import * as models from '../../wailsjs/go/models';
import { AddOctreeItem, ExistOctree, GetOctreeData, ResetOctree, FindPathOctree } from '../../wailsjs/go/main/App';

export class OctreeHelper {
    public min: { x: number, y: number, z: number } = { x: -1, y: -1, z: -1 }
    public max: { x: number, y: number, z: number } = { x: 1, y: 1, z: 1 }
    public maxDepth: number = 4
    public minStep: number = 0.1
    public stepSize: number = 0.1
    public hasGeometry: boolean = false
    public agentHeight: number = 1.2
    public agentRadius: number = 0.4
    public agentStart: { x: number, y: number, z: number } = { x: 0, y: 0, z: 0 }
    public agentEnd: { x: number, y: number, z: number } = { x: 0, y: 0, z: 0 }

    // 起点和终点标记
    private startMarker: THREE.Mesh | null = null
    private endMarker: THREE.Mesh | null = null

    // Octree 显示状态
    private showingOctree: boolean = false

    private id: string
    private scene: THREE.Scene
    private aabbHelper: THREE.Box3Helper | null
    private geometryGroup: THREE.Group
    private gltfGroup: THREE.Group
    private objGroup: THREE.Group
    private octreeGroup: THREE.Group
    private pane: Pane
    private loadedModels: THREE.Object3D[] = []
    private objLoader: OBJLoader
    private gltfLoader: GLTFLoader
    private showOctreeButton: any = null // 保存对 Show Octree 按钮的引用

    constructor(id: string, scene: THREE.Scene, pane: Pane) {
        this.id = id
        this.scene = scene
        this.pane = pane
        this.aabbHelper = null
        this.geometryGroup = new THREE.Group()
        this.gltfGroup = new THREE.Group()
        this.objGroup = new THREE.Group()
        this.octreeGroup = new THREE.Group()
        this.pathGroup = new THREE.Group()
        this.scene.add(this.geometryGroup)
        this.scene.add(this.gltfGroup)
        this.scene.add(this.objGroup)
        this.scene.add(this.octreeGroup)
        this.scene.add(this.pathGroup)
        this.objLoader = new OBJLoader()
        this.gltfLoader = new GLTFLoader()

        // 初始化起点和终点标记
        this.createMarkers()
    }

    updateAABBHelper() {
        // 移除旧的AABB辅助对象
        if (this.aabbHelper) {
            this.scene.remove(this.aabbHelper)
        }

        // 创建新的AABB辅助对象
        const box = new THREE.Box3(
            new THREE.Vector3(this.min.x, this.min.y, this.min.z),
            new THREE.Vector3(this.max.x, this.max.y, this.max.z)
        )
        this.aabbHelper = new THREE.Box3Helper(box, 0xffff00)
        this.scene.add(this.aabbHelper)
    }

    createPane() {
        const folder = this.pane.addFolder({ title: 'Octree', expanded: false })

        // 添加对min和max的绑定，并监听变化
        const minBinding = folder.addBinding(this, "min", { label: 'BoundsMin' })
        const maxBinding = folder.addBinding(this, "max", { label: 'BoundsMax' })

        // 监听min和max的变化，实时更新AABB
        minBinding.on('change', () => {
            this.updateAABBHelper()
        })

        maxBinding.on('change', () => {
            this.updateAABBHelper()
        })

        folder.addBinding(this, "maxDepth", { label: 'MaxDepth' })
        folder.addBinding(this, "minStep", { label: 'MinStep' })

        this.createAgentPane()
        this.createObstaclesPane()
        this.createBuildPane()

        nextTick(() => {
            // 初始化AABB辅助对象
            this.updateAABBHelper()
        })
    }

    createBuildPane() {
        const folder = this.pane.addFolder({ title: 'Build', disabled: false })
        const buildButton = folder.addButton({
            disabled: false,
            title: 'Build',
            label: 'Build Octree',
        })
        buildButton.on('click', () => {
            folder.disabled = true
            this.build().then(() => {
                folder.disabled = false
            })
        })
        this.showOctreeButton = folder.addButton({
            title: 'Show',
            label: 'Show Octree',
        })
        this.showOctreeButton.on('click', () => {
            if (!this.showingOctree) {
                // 显示 Octree
                this.showOctreeButton.disabled = true
                this.getOctreeData().then(() => {
                    this.showingOctree = true
                    this.showOctreeButton.title = 'Hide'
                    this.showOctreeButton.label = 'Hide Octree'
                    this.showOctreeButton.disabled = false
                })
            } else {
                // 隐藏 Octree
                this.octreeGroup.visible = false
                this.showingOctree = false
                this.showOctreeButton.title = 'Show'
                this.showOctreeButton.label = 'Show Octree'
            }
        })
        const resetButton = folder.addButton({
            title: 'Reset',
            label: 'Reset Octree',
        })
        resetButton.on('click', () => {
            this.reset()
        })
    }

    createAgentPane() {
        const folder = this.pane.addFolder({ title: 'Agent' })
        folder.addBinding(this, "agentHeight", { label: 'AgentHeight' })
        folder.addBinding(this, "agentRadius", { label: 'AgentRadius' })

        // 添加起点位置控制，并在变化时更新标记
        folder.addBinding(this, "agentStart", { label: 'Start Position' }).on('change', () => {
            this.updateStartMarker()
        })

        // 添加终点位置控制，并在变化时更新标记
        folder.addBinding(this, "agentEnd", { label: 'End Position' }).on('change', () => {
            this.updateEndMarker()
        })

        // 添加路径控制子文件夹
        const pathFolder = folder.addFolder({ title: 'Path Controls' })
        pathFolder.addButton({ title: 'Find Path', label: 'Find Path' }).on('click', () => {
            this.findPath()
        })
        pathFolder.addButton({ title: 'Clear Path', label: 'Clear Path' }).on('click', () => {
            this.clearPath()
        })
    }

    createObstaclesPane() {
        const folder = this.pane.addFolder({ title: 'Obstacles' })

        const tab = folder.addTab({
            pages: [
                { title: 'Cube' },
                { title: 'Triangle' },
                { title: 'Obj/Gltf' },
            ],
        })

        // 添加清除所有阻挡物的按钮
        folder.addButton({
            title: 'Clear',
            label: 'Clear All Obstacles'
        }).on('click', this.clearAllObstacles)

        // Cube 页签
        const cubeParams = {
            position: { x: 0, y: 0, z: 0 },
            size: { x: 1, y: 1, z: 1 }
        }

        tab.pages[0].addBinding(cubeParams, 'position', {
            label: 'Position',
        })

        tab.pages[0].addBinding(cubeParams, 'size', {
            label: 'Size',
            min: 0.1,
            max: 10
        })

        tab.pages[0].addButton({
            title: 'Add',
            label: 'Add Cube'
        }).on('click', () => {
            this.addCubeObstacle(
                new THREE.Vector3(cubeParams.position.x, cubeParams.position.y, cubeParams.position.z),
                new THREE.Vector3(cubeParams.size.x, cubeParams.size.y, cubeParams.size.z)
            )
        })

        // Triangle 页签
        const triangleParams = {
            p1: { x: 0, y: 0, z: 0 },
            p2: { x: 1, y: 0, z: 0 },
            p3: { x: 0.5, y: 1, z: 0 }
        }

        tab.pages[1].addBinding(triangleParams, 'p1', {
            label: 'Point 1',
        })

        tab.pages[1].addBinding(triangleParams, 'p2', {
            label: 'Point 2',
        })

        tab.pages[1].addBinding(triangleParams, 'p3', {
            label: 'Point 3',
        })

        tab.pages[1].addButton({
            title: 'Add',
            label: 'Add Triangle'
        }).on('click', () => {
            this.addTriangleObstacle(
                new THREE.Vector3(triangleParams.p1.x, triangleParams.p1.y, triangleParams.p1.z),
                new THREE.Vector3(triangleParams.p2.x, triangleParams.p2.y, triangleParams.p2.z),
                new THREE.Vector3(triangleParams.p3.x, triangleParams.p3.y, triangleParams.p3.z)
            )
        })

        // Obj/Gltf 页签
        const modelParams = {
            type: 'obj'
        }

        tab.pages[2].addBinding(modelParams, 'type', {
            label: 'File Type',
            options: {
                OBJ: 'obj',
                GLTF: 'gltf'
            }
        })

        tab.pages[2].addButton({
            title: 'Import',
            label: 'Import Model'
        }).on('click', () => {
            // 创建文件输入元素
            const fileInput = document.createElement('input')
            fileInput.type = 'file'
            fileInput.accept = modelParams.type === 'obj' ? '.obj' : '.gltf,.glb'
            fileInput.style.display = 'none'
            document.body.appendChild(fileInput)

            // 监听文件选择
            fileInput.onchange = (event) => {
                const files = (event.target as HTMLInputElement).files
                if (files && files.length > 0) {
                    this.importModel(files[0], modelParams.type as 'obj' | 'gltf')
                }
                document.body.removeChild(fileInput)
            }

            // 触发文件选择对话框
            fileInput.click()
        })
    }

    addCubeObstacle(position: THREE.Vector3, size: THREE.Vector3) {
        const geometry = new THREE.BoxGeometry(size.x, size.y, size.z)
        const material = new THREE.MeshStandardMaterial({ color: 0x6688cc })
        const cube = new THREE.Mesh(geometry, material)
        cube.position.copy(position)
        cube.castShadow = true
        cube.receiveShadow = true
        this.geometryGroup.add(cube)

        // 更新场景边界
        this.calculateSceneBounds()
        return cube
    }

    addTriangleObstacle(p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3) {
        const geometry = new THREE.BufferGeometry()
        const vertices = new Float32Array([
            p1.x, p1.y, p1.z,
            p2.x, p2.y, p2.z,
            p3.x, p3.y, p3.z
        ])
        geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3))
        geometry.computeVertexNormals()

        const material = new THREE.MeshStandardMaterial({
            color: 0xcc8866,
            side: THREE.DoubleSide
        })
        const triangle = new THREE.Mesh(geometry, material)
        triangle.castShadow = true
        triangle.receiveShadow = true
        this.geometryGroup.add(triangle)

        // 更新场景边界
        this.calculateSceneBounds()
        return triangle
    }

    importModel(file: File, type: 'obj' | 'gltf') {
        const reader = new FileReader()
        reader.onload = (event) => {
            if (!event.target || !event.target.result) return

            const url = URL.createObjectURL(file)

            if (type === 'obj') {
                this.objLoader.load(url, (object) => {
                    object.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            child.castShadow = true
                            child.receiveShadow = true
                            child.material = new THREE.MeshStandardMaterial({ color: 0xaaaaaa })
                        }
                    })
                    this.objGroup.add(object)
                    this.loadedModels.push(object)

                    // 更新场景边界
                    this.calculateSceneBounds()
                })
            } else if (type === 'gltf') {
                this.gltfLoader.load(url, (gltf) => {
                    const model = gltf.scene
                    model.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            child.castShadow = true
                            child.receiveShadow = true
                        }
                    })
                    this.gltfGroup.add(model)
                    this.loadedModels.push(model)

                    // 更新场景边界
                    this.calculateSceneBounds()
                })
            }
        }
        reader.readAsArrayBuffer(file)
    }

    clearAllObstacles = () => {
        // 清除几何体组中的所有对象
        while (this.geometryGroup.children.length > 0) {
            const object = this.geometryGroup.children[0]
            this.geometryGroup.remove(object)
            if (object instanceof THREE.Mesh && object.geometry) {
                object.geometry.dispose()
            }
            if (object instanceof THREE.Mesh && object.material) {
                if (Array.isArray(object.material)) {
                    object.material.forEach(material => material.dispose())
                } else {
                    object.material.dispose()
                }
            }
        }

        // 清除OBJ模型组
        while (this.objGroup.children.length > 0) {
            const object = this.objGroup.children[0]
            this.objGroup.remove(object)
        }

        // 清除GLTF模型组
        while (this.gltfGroup.children.length > 0) {
            const object = this.gltfGroup.children[0]
            this.gltfGroup.remove(object)
        }

        // 清空已加载模型数组
        this.loadedModels = []

        // 重置场景边界
        this.calculateSceneBounds()
    }

    calculateSceneBounds() {
        let minX = Infinity, minY = Infinity, minZ = Infinity
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity
        let hasGeometry = false

        // 检查GLTF模型
        this.gltfGroup.traverse((child) => {
            if (child instanceof THREE.Mesh && child.geometry) {
                const box = new THREE.Box3().setFromObject(child)
                if (!box.isEmpty()) {
                    minX = Math.min(minX, box.min.x)
                    minY = Math.min(minY, box.min.y)
                    minZ = Math.min(minZ, box.min.z)
                    maxX = Math.max(maxX, box.max.x)
                    maxY = Math.max(maxY, box.max.y)
                    maxZ = Math.max(maxZ, box.max.z)
                    hasGeometry = true
                }
            }
        })

        // 检查OBJ模型
        this.objGroup.traverse((child) => {
            if (child instanceof THREE.Mesh && child.geometry) {
                const box = new THREE.Box3().setFromObject(child)
                if (!box.isEmpty()) {
                    minX = Math.min(minX, box.min.x)
                    minY = Math.min(minY, box.min.y)
                    minZ = Math.min(minZ, box.min.z)
                    maxX = Math.max(maxX, box.max.x)
                    maxY = Math.max(maxY, box.max.y)
                    maxZ = Math.max(maxZ, box.max.z)
                    hasGeometry = true
                }
            }
        })

        // 检查其他几何体
        this.geometryGroup.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                const box = new THREE.Box3().setFromObject(child)
                if (!box.isEmpty()) {
                    minX = Math.min(minX, box.min.x)
                    minY = Math.min(minY, box.min.y)
                    minZ = Math.min(minZ, box.min.z)
                    maxX = Math.max(maxX, box.max.x)
                    maxY = Math.max(maxY, box.max.y)
                    maxZ = Math.max(maxZ, box.max.z)
                    hasGeometry = true
                }
            }
        })

        // 如果没有几何体，使用默认边界
        if (!hasGeometry) {
            const size = 1
            minX = -size
            minY = -size
            minZ = -size
            maxX = size
            maxY = size
            maxZ = size
        }

        // 使用Vue的响应式API更新对象，确保tweakpane能检测到变化
        // 创建新对象并一次性赋值，这样能触发Vue的响应式系统
        this.min = { x: minX, y: minY, z: minZ }
        this.max = { x: maxX, y: maxY, z: maxZ }
        this.hasGeometry = hasGeometry
        this.calculateMaxDepth()
        this.pane.refresh()

        // 如果已经创建了AABB辅助对象，更新它
        if (this.aabbHelper) {
            this.updateAABBHelper()
        }
    }

    calculateMaxDepth() {
        const sceneSize = {
            x: this.max.x - this.min.x,
            y: this.max.y - this.min.y,
            z: this.max.z - this.min.z
        }
        const maxDimension = Math.max(sceneSize.x, sceneSize.y, sceneSize.z)

        let optimalMinSize = 1.0
        let suggestedStepSize = 0.5
        let suggestedMaxDepth = 5

        if (maxDimension > 50) {
            optimalMinSize = Math.max(1.0, maxDimension / 100)
            suggestedStepSize = Math.max(0.2, maxDimension / 200)
            suggestedMaxDepth = Math.min(10, Math.ceil(Math.log2(maxDimension / optimalMinSize)))
        } else if (maxDimension > 10) {
            suggestedStepSize = Math.max(0.1, maxDimension / 100)
            suggestedMaxDepth = Math.min(8, 6 + Math.ceil(maxDimension / 20))
            optimalMinSize = Math.max(0.5, maxDimension / 50)
        }

        this.maxDepth = suggestedMaxDepth
        this.minStep = optimalMinSize
        this.stepSize = suggestedStepSize
    }

    extractTrianglesFromGeometry(scene: THREE.Object3D, scale = 1.0) {
        const triangles = [] as models.main.Triangle[];

        scene.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                const geometry = child.geometry
                if (geometry instanceof THREE.BufferGeometry) {
                    const matrix = child.matrixWorld;

                    // Get position attribute
                    const positions = geometry.attributes.position;
                    if (!positions) return;

                    // Get indices if available
                    const indices = geometry.index;

                    if (indices) {
                        // Indexed geometry
                        for (let i = 0; i < indices.count; i += 3) {
                            const a = indices.getX(i);
                            const b = indices.getX(i + 1);
                            const c = indices.getX(i + 2);

                            const triangle = this.createTriangleFromIndices(positions, matrix, a, b, c, scale);
                            if (triangle) triangles.push(triangle);
                        }
                    } else {
                        // Non-indexed geometry
                        for (let i = 0; i < positions.count; i += 3) {
                            const triangle = this.createTriangleFromIndices(positions, matrix, i, i + 1, i + 2, scale);
                            if (triangle) triangles.push(triangle);
                        }
                    }
                }
            }
        });

        return triangles;
    }

    createTriangleFromIndices(positions: THREE.BufferAttribute,
        matrix: THREE.Matrix4, indexA: number, indexB: number, indexC: number, scale: number) {
        try {
            const vectorA = new THREE.Vector3();
            const vectorB = new THREE.Vector3();
            const vectorC = new THREE.Vector3();

            vectorA.fromBufferAttribute(positions, indexA).applyMatrix4(matrix);
            vectorB.fromBufferAttribute(positions, indexB).applyMatrix4(matrix);
            vectorC.fromBufferAttribute(positions, indexC).applyMatrix4(matrix);

            // Apply additional scaling if needed
            vectorA.multiplyScalar(scale);
            vectorB.multiplyScalar(scale);
            vectorC.multiplyScalar(scale);

            return models.main.Triangle.createFrom({
                A: { X: vectorA.x, Y: vectorA.y, Z: vectorA.z },
                B: { X: vectorB.x, Y: vectorB.y, Z: vectorB.z },
                C: { X: vectorC.x, Y: vectorC.y, Z: vectorC.z }
            });
        } catch (error) {
            console.warn('Error creating triangle:', error);
            return null;
        }
    }

    extractTriangles() {
        const triangles: models.main.Triangle[] = []
        const trianglesFromGltf = this.extractTrianglesFromGeometry(this.gltfGroup)
        triangles.push(...trianglesFromGltf)
        const trianglesFromObj = this.extractTrianglesFromGeometry(this.objGroup)
        triangles.push(...trianglesFromObj)
        const trianglesFromGeometry = this.extractTrianglesFromGeometry(this.geometryGroup)
        triangles.push(...trianglesFromGeometry)

        return triangles
    }

    async build(): Promise<void> {
        const triangles = this.extractTriangles()
        const octreeParam = models.main.OctreeParam.createFrom({
            Bounds: {
                Min: { X: this.min.x, Y: this.min.y, Z: this.min.z },
                Max: { X: this.max.x, Y: this.max.y, Z: this.max.z },
            },
            MaxDepth: this.maxDepth,
            MinSize: this.minStep,
            StepSize: this.stepSize,
        },)
        const agentParam = models.main.AgentParam.createFrom({
            Height: this.agentHeight,
            Radius: this.agentRadius,
        })

        await AddOctreeItem(this.id, octreeParam, agentParam, triangles)
    }

    visualizeOctree(octreeData: models.main.OctreeExport) {
        this.octreeGroup.clear()

        const traverseNode = (node: models.main.OctreeNodeExport) => {
            if (node.is_leaf && node.is_occupied) {
                const size = {
                    x: node.bounds.max.x - node.bounds.min.x,
                    y: node.bounds.max.y - node.bounds.min.y,
                    z: node.bounds.max.z - node.bounds.min.z,
                }
                const center = {
                    x: (node.bounds.min.x + node.bounds.max.x) / 2,
                    y: (node.bounds.min.y + node.bounds.max.y) / 2,
                    z: (node.bounds.min.z + node.bounds.max.z) / 2,
                }

                const geometry = new THREE.BoxGeometry(size.x, size.y, size.z)
                const material = new THREE.MeshBasicMaterial({
                    color: 0xff6b6b,
                    wireframe: true,
                    transparent: true,
                    opacity: 0.3
                });

                const cube = new THREE.Mesh(geometry, material);
                cube.position.copy(center);
                this.octreeGroup.add(cube);
            }

            if (node.children) {
                node.children.forEach(child => traverseNode(child))
            }
        }

        if (octreeData.root) {
            traverseNode(octreeData.root)
        }
    }

    async getOctreeData(): Promise<void> {
        const octreeData = await GetOctreeData(this.id)
        if (octreeData) {
            // 清除之前的 Octree 可视化
            this.octreeGroup.clear()
            // 确保 octreeGroup 可见
            this.octreeGroup.visible = true
            // 可视化 Octree
            this.visualizeOctree(octreeData)
        }
    }

    async reset() {
        await ResetOctree(this.id)
        this.showingOctree = false

        // 重置按钮文本
        if (this.showOctreeButton) {
            this.showOctreeButton.title = 'Show'
            this.showOctreeButton.label = 'Show Octree'
        }

        this.clear()
    }
    // 路径相关变量
    private pathGroup: THREE.Group
    private agentMesh: THREE.Object3D | null = null
    private currentPath: { x: number, y: number, z: number }[] | null = null
    private animationProgress = 0
    private animationDuration = 5000 // 毫秒
    private animationStartTime = 0
    private animationId: number | null = null

    async findPath() {
        // 清除之前的路径和代理
        this.clearPath()

        // 调用后端API获取路径
        const path = await FindPathOctree(this.id,
            { X: this.agentStart.x, Y: this.agentStart.y, Z: this.agentStart.z },
            { X: this.agentEnd.x, Y: this.agentEnd.y, Z: this.agentEnd.z },
        )

        // 如果没有找到路径
        if (!path || path.length === 0) {
            console.log('No path found')
            return
        }

        // 保存当前路径
        this.currentPath = path.map(p => ({ x: p.X, y: p.Y, z: p.Z }))

        // 创建路径可视化
        this.visualizePath()

        // 创建并启动代理动画
        this.createAgent()
        this.startAgentAnimation()
    }

    // 可视化路径
    private visualizePath() {
        if (!this.currentPath || this.currentPath.length < 2) return

        // 如果路径组不存在，创建它
        if (!this.pathGroup) {
            this.pathGroup = new THREE.Group()
            this.scene.add(this.pathGroup)
        } else {
            this.pathGroup.clear()
        }

        // 创建路径线
        const points = this.currentPath.map(p => new THREE.Vector3(p.x, p.y, p.z))
        const geometry = new THREE.BufferGeometry().setFromPoints(points)
        const material = new THREE.LineBasicMaterial({ color: 0x00ffff, linewidth: 2 })
        const line = new THREE.Line(geometry, material)
        this.pathGroup.add(line)

        // 在路径点上添加小球标记
        const sphereGeometry = new THREE.SphereGeometry(0.1, 8, 8)
        const sphereMaterial = new THREE.MeshBasicMaterial({ color: 0xffff00 })

        this.currentPath.forEach((point, index) => {
            // 起点和终点使用不同颜色
            let material = sphereMaterial
            if (index === 0) {
                material = new THREE.MeshBasicMaterial({ color: 0x00ff00 }) // 绿色起点
            } else if (index === this.currentPath!.length - 1) {
                material = new THREE.MeshBasicMaterial({ color: 0xff0000 }) // 红色终点
            }

            const sphere = new THREE.Mesh(sphereGeometry, material)
            sphere.position.set(point.x, point.y, point.z)
            this.pathGroup.add(sphere)
        })
    }

    // 创建代理
    private createAgent() {
        // 如果已存在代理，先移除
        if (this.agentMesh && this.scene.getObjectById(this.agentMesh.id)) {
            this.scene.remove(this.agentMesh)
        }

        // 创建代理几何体
        const geometry = new THREE.CapsuleGeometry(this.agentRadius, this.agentHeight, 8, 8)
        const material = new THREE.MeshBasicMaterial({ color: 0x0088ff })
        this.agentMesh = new THREE.Mesh(geometry, material)

        // 设置代理初始位置
        if (this.currentPath && this.currentPath.length > 0) {
            const startPoint = this.currentPath[0]
            this.agentMesh.position.set(startPoint.x, startPoint.y + this.agentRadius + this.agentHeight / 2, startPoint.z)
        }

        // 添加到场景
        this.scene.add(this.agentMesh)
    }

    // 开始代理动画
    private startAgentAnimation() {
        if (!this.currentPath || this.currentPath.length < 2 || !this.agentMesh) return

        this.animationProgress = 0
        this.animationStartTime = Date.now()

        // 设置动画更新函数
        const animate = () => {
            const elapsed = Date.now() - this.animationStartTime
            this.animationProgress = Math.min(elapsed / this.animationDuration, 1)

            const position = this.getPositionAlongPath(this.animationProgress)
            if (this.agentMesh) {
                this.agentMesh.position.copy(position)
                this.agentMesh.position.y += this.agentRadius + this.agentHeight / 2
            }

            if (this.animationProgress < 1) {
                this.animationId = requestAnimationFrame(animate)
            } else {
                // 动画完成
                this.animationId = null
            }
        }

        // 启动动画
        this.animationId = requestAnimationFrame(animate)
    }

    // 获取路径上的位置
    private getPositionAlongPath(progress: number): THREE.Vector3 {
        if (!this.currentPath || this.currentPath.length < 2) {
            return new THREE.Vector3(0, 0, 0)
        }

        let totalLength = 0
        const segmentLengths: number[] = []

        // 计算路径总长度和每段长度
        for (let i = 0; i < this.currentPath.length - 1; i++) {
            const start = new THREE.Vector3(this.currentPath[i].x, this.currentPath[i].y, this.currentPath[i].z)
            const end = new THREE.Vector3(this.currentPath[i + 1].x, this.currentPath[i + 1].y, this.currentPath[i + 1].z)
            const length = start.distanceTo(end)
            segmentLengths.push(length)
            totalLength += length
        }

        const targetDistance = progress * totalLength
        let currentDistance = 0

        // 找到当前所在路径段并计算插值位置
        for (let i = 0; i < segmentLengths.length; i++) {
            const segmentEnd = currentDistance + segmentLengths[i]

            if (targetDistance <= segmentEnd) {
                const segmentProgress = (targetDistance - currentDistance) / segmentLengths[i]
                const start = new THREE.Vector3(
                    this.currentPath[i].x,
                    this.currentPath[i].y,
                    this.currentPath[i].z
                )
                const end = new THREE.Vector3(
                    this.currentPath[i + 1].x,
                    this.currentPath[i + 1].y,
                    this.currentPath[i + 1].z
                )

                return start.lerp(end, segmentProgress)
            }

            currentDistance = segmentEnd
        }

        // 如果超出路径范围，返回最后一点
        const lastPoint = this.currentPath[this.currentPath.length - 1]
        return new THREE.Vector3(lastPoint.x, lastPoint.y, lastPoint.z)
    }

    // 清除路径和代理
    clearPath() {
        // 停止动画
        if (this.animationId !== null) {
            cancelAnimationFrame(this.animationId)
            this.animationId = null
        }

        // 清除路径可视化
        if (this.pathGroup) {
            this.pathGroup.clear()
        }

        // 移除代理
        if (this.agentMesh && this.scene.getObjectById(this.agentMesh.id)) {
            this.scene.remove(this.agentMesh)
            this.agentMesh = null
        }

        this.currentPath = null
        this.animationProgress = 0
    }

    // 创建起点和终点标记
    private createMarkers() {
        // 创建起点标记（绿色）
        const startGeometry = new THREE.CapsuleGeometry(this.agentRadius, this.agentHeight, 8, 8)
        const startMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 })
        this.startMarker = new THREE.Mesh(startGeometry, startMaterial)
        this.startMarker.position.set(this.agentStart.x, this.agentStart.y + this.agentRadius + this.agentHeight / 2, this.agentStart.z)
        this.scene.add(this.startMarker)

        // 创建终点标记（红色）
        const endGeometry = new THREE.SphereGeometry(0.2, 16, 16)
        const endMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 })
        this.endMarker = new THREE.Mesh(endGeometry, endMaterial)
        this.endMarker.position.set(this.agentEnd.x, this.agentEnd.y, this.agentEnd.z)
        this.scene.add(this.endMarker)
    }

    // 更新起点标记位置
    private updateStartMarker() {
        if (this.startMarker) {
            this.startMarker.position.set(this.agentStart.x, this.agentStart.y + this.agentRadius + this.agentHeight / 2, this.agentStart.z)
        }
    }

    // 更新终点标记位置
    private updateEndMarker() {
        if (this.endMarker) {
            this.endMarker.position.set(this.agentEnd.x, this.agentEnd.y, this.agentEnd.z)
        }
    }

    // 清除标记
    private clearMarkers() {
        if (this.startMarker && this.scene.getObjectById(this.startMarker.id)) {
            this.scene.remove(this.startMarker)
            this.startMarker = null
        }

        if (this.endMarker && this.scene.getObjectById(this.endMarker.id)) {
            this.scene.remove(this.endMarker)
            this.endMarker = null
        }
    }

    clear() {
        this.clearAllObstacles()
        this.loadedModels = []
        this.geometryGroup.clear()
        this.gltfGroup.clear()
        this.objGroup.clear()
        this.octreeGroup.clear()
        // 确保 octreeGroup 可见性与显示状态一致
        this.octreeGroup.visible = this.showingOctree
        this.clearPath()
        this.clearMarkers()
        this.createMarkers()
        this.calculateSceneBounds()
    }
}