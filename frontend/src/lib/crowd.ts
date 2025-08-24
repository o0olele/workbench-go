import { Vector3, MeshStandardMaterial, Mesh, CylinderGeometry, Group } from "three";
import { AddAgent, GetNavMeshInfo, SetAgentTarget, TeleportAgent, UpdateAgents } from "../../wailsjs/go/main/App";
import { Pane } from "tweakpane";

// Type definitions
interface Agent {
    id: number;
    pos: [number, number, number];
    radius: number;
    height: number;
}

interface CrowdParams {
    radius: number;
    height: number;
    max_acceleration: number;
    max_speed: number;
}

interface AgentMeshUserData {
    radius: number;
    height: number;
}

export class CrowdHelper extends Group {
    private agentMeshes: Map<number, Mesh>;
    private recastCrowd: DebugCrowd;
    private agentMaterial: MeshStandardMaterial;

    constructor(crowd: DebugCrowd) {
        super();

        this.agentMeshes = new Map<number, Mesh>();
        this.recastCrowd = crowd;

        this.agentMaterial = new MeshStandardMaterial({ color: 'red' });

        this.update();
    }

    /**
     * Update the three debug view of the crowd agents.
     *
     * This should be called after updating the crowd.
     */
    update(): void {
        const agents = this.recastCrowd.agents;
        if (agents == null || typeof agents === 'undefined' || agents.length <= 0) {
            return;
        }

        const unseen = new Set<number>(this.agentMeshes.keys());

        for (const agent of agents) {
            unseen.delete(agent.id);

            const position = agent.pos;
            // const velocity = agent.velocity();

            let agentMesh = this.agentMeshes.get(agent.id);

            if (agentMesh === undefined) {
                agentMesh = this.createAgentMesh(agent);

                this.add(agentMesh);
                this.agentMeshes.set(agent.id, agentMesh);
                console.log(this);
            } else {
                this.updateAgentGeometry(agentMesh, agent);
            }

            agentMesh.position.set(
                position[0],
                position[1] + this.recastCrowd.height / 2,
                position[2]
            );

            // agentMesh.lookAt(
            //   new Vector3().copy(agentMesh.position).add(velocity as Vector3)
            // );
        }

        for (const agentId of unseen) {
            const agentMesh = this.agentMeshes.get(agentId);

            if (agentMesh) {
                this.remove(agentMesh);
                this.agentMeshes.delete(agentId);
            }
        }
    }

    private createAgentMesh(agent: Agent): Mesh {
        const mesh = new Mesh();

        mesh.material = this.agentMaterial;

        this.updateAgentGeometry(mesh, agent);

        mesh.userData = {
            radius: agent.radius,
            height: agent.height,
        } as AgentMeshUserData;

        console.log(mesh)
        return mesh;
    }

    private updateAgentGeometry(agentMesh: Mesh, agent?: Agent): void {
        const userData = agentMesh.userData as AgentMeshUserData;

        if (
            userData.radius !== this.recastCrowd.radius ||
            userData.height !== this.recastCrowd.height
        ) {
            const geometry = new CylinderGeometry(
                this.recastCrowd.radius,
                this.recastCrowd.radius,
                this.recastCrowd.height
            );

            agentMesh.geometry.dispose();
            agentMesh.geometry = geometry;

            userData.radius = this.recastCrowd.radius;
            userData.height = this.recastCrowd.height;
        }
    }
}

const _vectors = new Vector3();

export class DebugCrowd {
    public radius: number;
    public height: number;
    public max_acceleration: number;
    public max_speed: number;
    public agents: Agent[];
    public agentTarget: Vector3;
    public tabId: string;
    public start: Vector3;
    public end: Vector3;
    public debugStatus: any;

    // Tweakpane 用的简单对象
    private paneRef: Pane | null = null;

    // 移动状态追踪
    private previousPositions: Map<number, [number, number, number]>;
    private isMoving: boolean;
    private movementThreshold: number;
    private stillFrameCount: number;
    private maxStillFrames: number;
    private needsUpdate: boolean;

    constructor(tabId: string) {
        this.radius = 0.5;
        this.height = 2;
        this.max_acceleration = 20;
        this.max_speed = 6;
        this.agents = [];
        this.agentTarget = new Vector3();
        this.tabId = tabId;
        this.start = new Vector3();
        this.end = new Vector3();
        this.debugStatus = {
            isMoving: false,
            stillFrames: 0,
            updating: false
        };

        // 初始化移动状态追踪
        this.previousPositions = new Map();
        this.isMoving = false;
        this.movementThreshold = 0.001; // 移动阈值，小于此值认为静止
        this.stillFrameCount = 0;
        this.maxStillFrames = 20; // 连续静止30帧后停止更新
        this.needsUpdate = false;
    }

    createAgentFolder(pane: Pane, callback: () => void) {
        this.paneRef = pane
        const folder = pane.addFolder({ title: "Test Agent" })
        folder.addBinding(this, 'radius', { label: 'Radius', min: 0.1, max: 2 })
        folder.addBinding(this, 'height', { label: 'Height', min: 0.1, max: 10 })
        folder.addBinding(this, 'max_acceleration', { label: 'MaxAcceleration', min: 0, max: 100 })
        folder.addBinding(this, 'max_speed', { label: 'MaxSpeed', min: 0, max: 100 })
        folder.addButton({ title: 'Add Agent' }).on('click', () => {
            this.addAgent(this.tabId)
            callback()
        })
    }

    createPathFolder(pane: Pane) {
        const folder = pane.addFolder({ title: "Test Path" })
        folder.addBinding(this, 'start', { label: 'Start' }).on('change', () => {
            this.teleportAgent(this.tabId, this.start)
        })
        folder.addBinding(this, 'end', { label: 'End' }).on('change', () => {
            this.moveAgent(this.tabId, this.end)
        })
    }

    createDebugFolder(pane: Pane) {
        // 添加移动状态调试信息
        const folder = pane.addFolder({ title: 'Debug Info' })
        folder.addBinding(this.debugStatus, 'isMoving', { readonly: true, label: 'Is Moving' })
        folder.addBinding(this.debugStatus, 'stillFrames', { readonly: true, label: 'Still Frames' })
        folder.addBinding(this.debugStatus, 'updating', { readonly: true, label: 'Updating' })
    }

    updateParams(param: Partial<CrowdParams> | null | undefined): void {
        if (param == null || typeof param === 'undefined') {
            return;
        }

        if (param.radius !== undefined) this.radius = param.radius;
        if (param.height !== undefined) this.height = param.height;
        if (param.max_acceleration !== undefined) this.max_acceleration = param.max_acceleration;
        if (param.max_speed !== undefined) this.max_speed = param.max_speed;
    }

    /**
     * 检测 agents 是否在移动
     */
    private detectMovement(): boolean {
        if (this.agents.length === 0) {
            return false;
        }

        let hasMovement = false;

        for (const agent of this.agents) {
            const currentPos = agent.pos;
            const previousPos = this.previousPositions.get(agent.id);

            if (previousPos) {
                // 计算位置变化距离
                const dx = currentPos[0] - previousPos[0];
                const dy = currentPos[1] - previousPos[1];
                const dz = currentPos[2] - previousPos[2];
                const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (distance > this.movementThreshold) {
                    hasMovement = true;
                }
            } else {
                // 首次检测，认为有移动
                hasMovement = true;
            }

            // 更新位置记录
            this.previousPositions.set(agent.id, [...currentPos]);
            if (hasMovement) {
                break;
            }
        }

        return hasMovement;
    }

    /**
     * 更新移动状态
     */
    private updateMovementState(): void {
        const hasMovement = this.detectMovement();

        if (hasMovement) {
            this.isMoving = true;
            this.stillFrameCount = 0;
        } else {
            this.stillFrameCount++;
            if (this.stillFrameCount >= this.maxStillFrames) {
                this.isMoving = false;
            }
        }

        this.updateTweakpanePositions()
    }

    /**
     * 强制开始更新 (设置新目标时调用)
     */
    public forceStartUpdate(): void {
        this.needsUpdate = true;
        this.isMoving = true;
        this.stillFrameCount = 0;
    }

    /**
     * 检查是否需要更新
     */
    public shouldUpdate(): boolean {
        return this.needsUpdate || this.isMoving;
    }

    async addAgent(tabId: string) {
        AddAgent(tabId, _vectors.x, _vectors.y, _vectors.z, this.radius, this.height, this.max_speed, this.max_acceleration)

        const info = GetNavMeshInfo(tabId, false)
        if (info) {
            this.agents = (await info).agents.map(agent => ({
                id: agent.id,
                pos: [agent.pos[0], agent.pos[1], agent.pos[2]] as [number, number, number],
                radius: this.radius,
                height: this.height
            }));
        }
    }

    async moveAgent(tabId: string, pos: Vector3): Promise<void> {
        SetAgentTarget(tabId, pos.x, pos.y, pos.z)
        this.agentTarget.set(pos.x, pos.y, pos.z)
        this.end.set(pos.x, pos.y, pos.z)
        this.updateTweakpanePositions()

        // 设置新目标时强制开始更新
        this.forceStartUpdate()

        const info = GetNavMeshInfo(tabId, false)
        if (info) {
            this.agents = (await info).agents.map(agent => ({
                id: agent.id,
                pos: [agent.pos[0], agent.pos[1], agent.pos[2]] as [number, number, number],
                radius: this.radius,
                height: this.height
            }));
        }
    }

    async teleportAgent(tabId: string, pos: Vector3): Promise<void> {
        TeleportAgent(tabId, pos.x, pos.y, pos.z)

        // 传送后强制开始更新
        this.forceStartUpdate()

        this.start.set(pos.x, pos.y, pos.z)
        this.updateTweakpanePositions()

        const info = GetNavMeshInfo(tabId, false)
        if (info) {
            this.agents = (await info).agents.map(agent => ({
                id: agent.id,
                pos: [agent.pos[0], agent.pos[1], agent.pos[2]] as [number, number, number],
                radius: this.radius,
                height: this.height
            }));
        }
    }

    async update(tabId: string): Promise<void> {
        if (this.agents.length <= 0) {
            return
        }

        // 检查是否需要更新
        if (!this.shouldUpdate()) {
            return;
        }

        // 执行后端更新
        UpdateAgents(tabId)
        const info = GetNavMeshInfo(tabId, false)
        if (info) {
            const newAgents = (await info).agents.map(agent => ({
                id: agent.id,
                pos: [agent.pos[0], agent.pos[1], agent.pos[2]] as [number, number, number],
                radius: this.radius,
                height: this.height
            }));

            this.agents = newAgents;

            // 更新移动状态
            this.updateMovementState();

            // 更新调试状态显示
            this.debugStatus.isMoving = this.isMoving;
            this.debugStatus.stillFrames = this.stillFrameCount;
            this.debugStatus.updating = this.shouldUpdate();

            // 如果强制更新标志已设置，现在清除它
            if (this.needsUpdate) {
                this.needsUpdate = false;
            }
        }
    }

    /**
     * 刷新 Tweakpane 显示
     */
    private refreshPane(): void {
        if (this.paneRef) {
            this.paneRef.refresh()
        }
    }

    /**
     * 手动更新 Tweakpane 中的位置显示
     */
    public updateTweakpanePositions(): void {
        // 手动触发 Tweakpane 更新
        if (this.paneRef) {
            this.paneRef.refresh()
        }
    }

    /**
     * 获取当前移动状态信息 (用于调试)
     */
    public getMovementStatus(): {
        isMoving: boolean;
        stillFrameCount: number;
        needsUpdate: boolean;
        shouldUpdate: boolean;
    } {
        return {
            isMoving: this.isMoving,
            stillFrameCount: this.stillFrameCount,
            needsUpdate: this.needsUpdate,
            shouldUpdate: this.shouldUpdate()
        };
    }
}
