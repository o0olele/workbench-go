import * as THREE from "three";
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
export interface PhysxStatic {
    id: number;
    element: Element;
}

export interface PhysxShape {
    id: number;
    element: Element;
}

export interface PhysxTriangleMesh {
    id: number;
    element: Element;
}

export interface PhysxConvexMesh {
    id: number;
    element: Element;
}

export class PhysxXmlData {
    private statics: Map<number, PhysxStatic> = new Map();
    private shapes: Map<number, PhysxShape> = new Map();
    private triangles: Map<number, PhysxTriangleMesh> = new Map();
    private convexes: Map<number, PhysxConvexMesh> = new Map();
    private firstId: number = 0;

    /**
     * 解析PhysX XML文件
     * @param text XML文本内容
     */
    parseXml(text: string): void {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(text, "text/xml");
        
        console.log(xmlDoc);
        
        // 解析静态刚体
        this.parseStatics(xmlDoc);
        
        // 解析形状
        this.parseShapes(xmlDoc);
        
        // 解析三角形网格
        this.parseTriangles(xmlDoc);
        
        // 解析凸包网格
        this.parseConvexes(xmlDoc);
    }

    /**
     * 解析静态刚体
     * @param xmlDoc XML文档
     */
    private parseStatics(xmlDoc: Document): void {
        const statics = xmlDoc.getElementsByTagName("PxRigidStatic");
        for (let i = 0; i < statics.length; i++) {
            const item = statics.item(i);
            if (!item) continue;
            
            const ids = item.getElementsByTagName("Id");
            if (ids.length <= 0) continue;
            
            const id = Number(ids.item(0)?.textContent);
            if (!isNaN(id)) {
                this.statics.set(id, { id, element: item });
            }
            if (this.firstId == 0) {
                this.firstId = id;
            }
        }
        console.log("Parsed statics:", this.statics);
    }

    /**
     * 解析形状
     * @param xmlDoc XML文档
     */
    private parseShapes(xmlDoc: Document): void {
        const shapes = xmlDoc.getElementsByTagName("PxShape");
        for (let i = 0; i < shapes.length; i++) {
            const item = shapes.item(i);
            if (!item) continue;
            
            const ids = item.getElementsByTagName("Id");
            if (ids.length <= 0) continue;
            
            const id = Number(ids.item(0)?.textContent);
            if (!isNaN(id)) {
                this.shapes.set(id, { id, element: item });
            }
        }
        console.log("Parsed shapes:", this.shapes);
    }

    /**
     * 解析三角形网格
     * @param xmlDoc XML文档
     */
    private parseTriangles(xmlDoc: Document): void {
        const triangles = xmlDoc.getElementsByTagName("PxTriangleMesh");
        for (let i = 0; i < triangles.length; i++) {
            const item = triangles.item(i);
            if (!item) continue;
            
            const ids = item.getElementsByTagName("Id");
            if (ids.length <= 0) continue;
            
            const id = Number(ids.item(0)?.textContent);
            if (!isNaN(id)) {
                this.triangles.set(id, { id, element: item });
            }
        }
        console.log("Parsed triangles:", this.triangles);
    }

    /**
     * 解析凸包网格
     * @param xmlDoc XML文档
     */
    private parseConvexes(xmlDoc: Document): void {
        const convexes = xmlDoc.getElementsByTagName("PxConvexMesh");
        for (let i = 0; i < convexes.length; i++) {
            const item = convexes.item(i);
            if (!item) continue;
            
            const ids = item.getElementsByTagName("Id");
            if (ids.length <= 0) continue;
            
            const id = Number(ids.item(0)?.textContent);
            if (!isNaN(id)) {
                this.convexes.set(id, { id, element: item });
            }
        }
        console.log("Parsed convexes:", this.convexes);
    }

    /**
     * 构建指定ID的静态刚体
     * @param id 静态刚体ID
     * @returns Three.js Group对象或null
     */
    build(id: number): THREE.Group | null {
        if (id == 0) {
            id = this.firstId;
        }

        const statics = this.statics.get(id);
        if (!statics) {
            return null;
        }

        const shapeRef = statics.element.getElementsByTagName("Shapes").item(0);
        if (!shapeRef) {
            return null;
        }

        const group = new THREE.Group();
        const shapeIds = shapeRef.getElementsByTagName("PxShapeRef");
        
        for (let i = 0; i < shapeIds.length; i++) {
            const shapeId = Number(shapeIds.item(i)?.textContent?.trim());
            if (shapeId <= 0) {
                continue;
            }

            const shape = this.shapes.get(shapeId);
            if (!shape) {
                continue;
            }

            const mesh = this.buildShape(shape);
            if (mesh) {
                group.add(mesh);
            }
        }

        return group;
    }

    /**
     * 构建形状
     * @param shape 形状元素
     * @returns Three.js Mesh对象或null
     */
    private buildShape(shape: PhysxShape): THREE.Mesh | null {
        const geo = this.getPxGeometry(shape.element);
        if (!geo || geo.children.length <= 0) {
            return null;
        }

        let mesh: THREE.Mesh | null = null;
        const [pos, rot] = this.getLocalPose(shape.element);
        const child = geo.children.item(0);
        
        if (!child) return null;

        switch (child.localName) {
            case "PxTriangleMeshGeometry":
                mesh = this.buildTriangle(child as Element);
                break;
            case "PxBoxGeometry":
                mesh = this.buildBox(child as Element);
                break;
            case "PxConvexMeshGeometry":
                mesh = this.buildConvex(child as Element);
                break;
            case "PxSphereGeometry":
                mesh = this.buildSphere(child as Element);
                break;
            case "PxCapsuleGeometry":
                mesh = this.buildCapsule(child as Element);
                break;
            default:
                break;
        }

        if (mesh) {
            mesh.position.copy(pos);
            mesh.quaternion.copy(rot);
        }

        return mesh;
    }

    /**
     * 获取PhysX几何体元素
     * @param shape 形状元素
     * @returns 几何体元素或null
     */
    private getPxGeometry(shape: Element): Element | null {
        const geos = shape.getElementsByTagName("Geometry");
        if (geos.length <= 0) {
            return null;
        }
        return geos.item(0);
    }

    /**
     * 获取文本内容
     * @param item DOM元素
     * @returns 清理后的文本内容
     */
    private getTextContent(item: Element | null): string {
        if (!item) return "";
        return item.textContent?.trim().replace(/\n\t\t\t/g, " ") || "";
    }

    /**
     * 获取局部姿态
     * @param shape 形状元素
     * @returns [位置, 旋转]元组
     */
    private getLocalPose(shape: Element): [THREE.Vector3, THREE.Quaternion] {
        const rot = new THREE.Quaternion();
        const pos = new THREE.Vector3();
        
        const poses = shape.getElementsByTagName("LocalPose");
        if (poses.length <= 0) {
            return [pos, rot];
        }

        const list = this.getTextContent(poses.item(0)).split(' ').map(Number);
        if (list.length >= 7) {
            rot.fromArray(list.slice(0, 4));
            pos.fromArray(list.slice(4, 7));
        }

        return [pos, rot];
    }

    /**
     * 获取PhysX缩放信息
     * @param geo 几何体元素
     * @returns [缩放, 旋转]元组
     */
    private getPxScale(geo: Element): [THREE.Vector3, THREE.Quaternion] {
        const scaleRef = geo.getElementsByTagName("Scale").item(0);
        if (!scaleRef) {
            return [new THREE.Vector3(1, 1, 1), new THREE.Quaternion()];
        }

        const scaleElement = scaleRef.getElementsByTagName("Scale").item(0);
        const rotateElement = scaleRef.getElementsByTagName("Rotation").item(0);

        const scale = new THREE.Vector3();
        const rotate = new THREE.Quaternion();

        if (scaleElement) {
            const scaleText = this.getTextContent(scaleElement);
            if (scaleText) {
                const scaleValues = scaleText.split(' ').map(Number);
                if (scaleValues.length >= 3) {
                    scale.fromArray(scaleValues);
                }
            }
        }

        if (rotateElement) {
            const rotateText = this.getTextContent(rotateElement);
            if (rotateText) {
                const rotateValues = rotateText.split(' ').map(Number);
                if (rotateValues.length >= 4) {
                    rotate.fromArray(rotateValues);
                }
            }
        }

        return [scale, rotate];
    }

    /**
     * 获取PhysX三角形网格数据
     * @param id 三角形网格ID
     * @returns [点数据, 三角形索引, 烹饪数据]元组
     */
    private getPxTriangleData(id: number): [number[] | null, number[] | null, number[] | null] {
        const pxTriMesh = this.triangles.get(id);
        if (!pxTriMesh) {
            console.log("Triangle mesh not found:", id);
            return [null, null, null];
        }

        const pointsElement = pxTriMesh.element.getElementsByTagName("Points").item(0);
        const trianglesElement = pxTriMesh.element.getElementsByTagName("Triangles").item(0);
        const cookedDataElement = pxTriMesh.element.getElementsByTagName("CookedData").item(0);

        const points = pointsElement ? this.getTextContent(pointsElement).split(' ').map(Number) : null;
        const triangles = trianglesElement ? this.getTextContent(trianglesElement).split(' ').map(Number) : null;
        const cookedData = cookedDataElement ? this.getTextContent(cookedDataElement).split(' ').map(Number) : null;

        return [points, triangles, cookedData];
    }

    /**
     * 构建三角形网格
     * @param geo 几何体元素
     * @returns Three.js Mesh对象或null
     */
    private buildTriangle(geo: Element): THREE.Mesh | null {
        const triMeshElement = geo.getElementsByTagName("TriangleMesh").item(0);
        if (!triMeshElement) return null;

        const triMeshId = Number(triMeshElement.textContent?.trim());
        const [scale, rotate] = this.getPxScale(geo);
        const [points, triangles, cookedData] = this.getPxTriangleData(triMeshId);
        
        if (!points) {
            return null;
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
        
        if (triangles) {
            geometry.setIndex(triangles);
        }

        const material = new THREE.MeshPhongMaterial({ 
            color: 0x60BF81, 
            emissive: 0x072534, 
            side: THREE.DoubleSide, 
            flatShading: true 
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.scale.copy(scale);
        mesh.quaternion.multiply(rotate);

        return mesh;
    }

    /**
     * 构建盒子几何体
     * @param geo 几何体元素
     * @returns Three.js Mesh对象
     */
    private buildBox(geo: Element): THREE.Mesh {
        const halfElement = geo.getElementsByTagName("HalfExtents").item(0);
        const half = this.getTextContent(halfElement).split(' ').map(Number);

        const geometry = new THREE.BoxGeometry(2 * half[0], 2 * half[1], 2 * half[2]);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0x347355, 
            emissive: 0x072534, 
            side: THREE.DoubleSide, 
            flatShading: true 
        });
        
        return new THREE.Mesh(geometry, material);
    }

    /**
     * 获取PhysX凸包网格数据
     * @param id 凸包网格ID
     * @returns 点数据数组或null
     */
    private getPxConvexData(id: number): number[] | null {
        const convex = this.convexes.get(id);
        if (!convex) {
            return null;
        }

        const pointsElement = convex.element.getElementsByTagName("points").item(0);
        if (!pointsElement) return null;

        const points = this.getTextContent(pointsElement).split(' ').map(Number);
        return points;
    }

    /**
     * 构建凸包几何体
     * @param geo 几何体元素
     * @returns Three.js Mesh对象或null
     */
    private buildConvex(geo: Element): THREE.Mesh | null {
        const convMeshElement = geo.getElementsByTagName("ConvexMesh").item(0);
        if (!convMeshElement) return null;

        const convMeshId = Number(convMeshElement.textContent?.trim());
        const [scale, rotate] = this.getPxScale(geo);
        const points = this.getPxConvexData(convMeshId);
        
        if (!points) {
            return null;
        }

        const pointList: THREE.Vector3[] = [];
        for (let i = 0; i < points.length; i += 3) {
            pointList.push(new THREE.Vector3(points[i], points[i + 1], points[i + 2]));
        }

        const geometry = new ConvexGeometry(pointList);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0x3B8C66, 
            emissive: 0x072534, 
            side: THREE.DoubleSide, 
            flatShading: true 
        });
        
        const mesh = new THREE.Mesh(geometry, material);
        mesh.scale.copy(scale);
        mesh.quaternion.multiply(rotate);

        return mesh;
    }

    /**
     * 构建球体几何体
     * @param geo 几何体元素
     * @returns Three.js Mesh对象
     */
    private buildSphere(geo: Element): THREE.Mesh {
        const radiusElement = geo.getElementsByTagName("Radius").item(0);
        const radius = Number(this.getTextContent(radiusElement));
        
        const geometry = new THREE.SphereGeometry(radius, 16, 16);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0x223240, 
            emissive: 0x072534, 
            side: THREE.DoubleSide, 
            flatShading: true 
        });
        
        return new THREE.Mesh(geometry, material);
    }

    /**
     * 构建胶囊几何体
     * @param geo 几何体元素
     * @returns Three.js Mesh对象
     */
    private buildCapsule(geo: Element): THREE.Mesh {
        const radiusElement = geo.getElementsByTagName("Radius").item(0);
        const halfHeightElement = geo.getElementsByTagName("HalfHeight").item(0);
        
        const radius = Number(this.getTextContent(radiusElement));
        const halfHeight = Number(this.getTextContent(halfHeightElement));

        const geometry = new THREE.CapsuleGeometry(radius, halfHeight, 4, 8);
        const material = new THREE.MeshPhongMaterial({ 
            color: 0x93D94E, 
            emissive: 0x072534, 
            side: THREE.DoubleSide, 
            flatShading: true 
        });
        
        return new THREE.Mesh(geometry, material);
    }

    /**
     * 获取静态刚体
     * @param id 刚体ID
     * @returns 静态刚体对象或undefined
     */
    getStatic(id: number): PhysxStatic | undefined {
        return this.statics.get(id);
    }

    /**
     * 获取形状
     * @param id 形状ID
     * @returns 形状对象或undefined
     */
    getShape(id: number): PhysxShape | undefined {
        return this.shapes.get(id);
    }

    /**
     * 获取三角形网格
     * @param id 网格ID
     * @returns 三角形网格对象或undefined
     */
    getTriangleMesh(id: number): PhysxTriangleMesh | undefined {
        return this.triangles.get(id);
    }

    /**
     * 获取凸包网格
     * @param id 网格ID
     * @returns 凸包网格对象或undefined
     */
    getConvexMesh(id: number): PhysxConvexMesh | undefined {
        return this.convexes.get(id);
    }

    /**
     * 获取所有静态刚体
     * @returns 静态刚体Map
     */
    getAllStatics(): Map<number, PhysxStatic> {
        return this.statics;
    }

    /**
     * 获取所有形状
     * @returns 形状Map
     */
    getAllShapes(): Map<number, PhysxShape> {
        return this.shapes;
    }

    /**
     * 获取所有三角形网格
     * @returns 三角形网格Map
     */
    getAllTriangleMeshes(): Map<number, PhysxTriangleMesh> {
        return this.triangles;
    }

    /**
     * 获取所有凸包网格
     * @returns 凸包网格Map
     */
    getAllConvexMeshes(): Map<number, PhysxConvexMesh> {
        return this.convexes;
    }

    /**
     * 清空所有数据
     */
    clear(): void {
        this.statics.clear();
        this.shapes.clear();
        this.triangles.clear();
        this.convexes.clear();
    }

    /**
     * 获取统计信息
     * @returns 包含各类型对象数量的对象
     */
    getStats(): { statics: number; shapes: number; triangles: number; convexes: number } {
        return {
            statics: this.statics.size,
            shapes: this.shapes.size,
            triangles: this.triangles.size,
            convexes: this.convexes.size
        };
    }
}