import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

export interface CameraControlsOptions {
  moveSpeed?: number
  rotateSpeed?: number
  shiftSpeedMultiplier?: number
}

export class CameraControls {
  private camera: THREE.PerspectiveCamera
  private orbitControls: OrbitControls
  private canvas: HTMLCanvasElement
  
  // 键盘状态
  private keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    q: false,
    e: false,
    shift: false
  }
  
  // 控制参数
  private moveSpeed: number
  private rotateSpeed: number
  private shiftSpeedMultiplier: number
  
  constructor(
    camera: THREE.PerspectiveCamera,
    orbitControls: OrbitControls,
    canvas: HTMLCanvasElement,
    options: CameraControlsOptions = {}
  ) {
    this.camera = camera
    this.orbitControls = orbitControls
    this.canvas = canvas
    
    // 设置默认参数
    this.moveSpeed = options.moveSpeed ?? 0.1
    this.rotateSpeed = options.rotateSpeed ?? 0.002
    this.shiftSpeedMultiplier = options.shiftSpeedMultiplier ?? 3
    
    this.setupEventListeners()
  }
  
  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 键盘事件
    window.addEventListener('keydown', this.handleKeyDown)
    window.addEventListener('keyup', this.handleKeyUp)
  }
  
  /**
   * 键盘按下事件处理
   */
  private handleKeyDown = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase()
    if (key in this.keys) {
      this.keys[key as keyof typeof this.keys] = true
    }
    if (event.key === 'Shift') {
      this.keys.shift = true
    }
  }
  
  /**
   * 键盘释放事件处理
   */
  private handleKeyUp = (event: KeyboardEvent): void => {
    const key = event.key.toLowerCase()
    if (key in this.keys) {
      this.keys[key as keyof typeof this.keys] = false
    }
    if (event.key === 'Shift') {
      this.keys.shift = false
    }
  }
  
  /**
   * 更新相机移动（在动画循环中调用）
   */
  public update(): void {
    this.updateCameraMovement()
  }
  
  /**
   * 处理相机移动
   */
  private updateCameraMovement(): void {
    const forward = new THREE.Vector3()
    const right = new THREE.Vector3()
    const up = new THREE.Vector3(0, 1, 0)
    
    // 获取相机的前向和右向向量
    this.camera.getWorldDirection(forward)
    right.crossVectors(forward, up).normalize()
    
    // 计算移动速度（按住Shift加速）
    const currentSpeed = this.keys.shift ? this.moveSpeed * this.shiftSpeedMultiplier : this.moveSpeed
    
    const movement = new THREE.Vector3()
    
    // WASD移动
    if (this.keys.w) movement.add(forward.clone().multiplyScalar(currentSpeed))
    if (this.keys.s) movement.add(forward.clone().multiplyScalar(-currentSpeed))
    if (this.keys.a) movement.add(right.clone().multiplyScalar(-currentSpeed))
    if (this.keys.d) movement.add(right.clone().multiplyScalar(currentSpeed))
    
    // QE上下移动
    if (this.keys.q) movement.add(up.clone().multiplyScalar(-currentSpeed))
    if (this.keys.e) movement.add(up.clone().multiplyScalar(currentSpeed))
    
    // 应用移动
    if (movement.length() > 0) {
      this.camera.position.add(movement)
      this.orbitControls.target.add(movement)
    }
  }
  
  /**
   * 设置移动速度
   */
  public setMoveSpeed(speed: number): void {
    this.moveSpeed = speed
  }
  
  /**
   * 设置旋转速度
   */
  public setRotateSpeed(speed: number): void {
    this.rotateSpeed = speed
  }
  
  /**
   * 获取当前移动速度
   */
  public getMoveSpeed(): number {
    return this.moveSpeed
  }
  
  /**
   * 获取当前旋转速度
   */
  public getRotateSpeed(): number {
    return this.rotateSpeed
  }
  
  /**
   * 销毁控制器，清理事件监听器
   */
  public dispose(): void {
    // 清理键盘事件监听器
    window.removeEventListener('keydown', this.handleKeyDown)
    window.removeEventListener('keyup', this.handleKeyUp)
  }
}