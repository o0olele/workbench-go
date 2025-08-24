import * as THREE from 'three';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineSegments2 } from 'three/examples/jsm/lines/LineSegments2.js';
import { LineSegmentsGeometry } from 'three/examples/jsm/lines/LineSegmentsGeometry.js';
import { main } from '../../wailsjs/go/models';


const _color = new THREE.Color();

export class DebugDrawer extends THREE.Group {
    private triMaterial: THREE.MeshBasicMaterial;
    private pointMaterial: THREE.MeshBasicMaterial;
    private lineMaterial: LineMaterial;
    private pointGeometry: THREE.SphereGeometry;

    constructor(
        triMaterial?: THREE.MeshBasicMaterial,
        pointMaterial?: THREE.MeshBasicMaterial,
        lineMaterial?: LineMaterial
    ) {
        super();

        this.triMaterial = triMaterial ?? new THREE.MeshBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.4,
            depthWrite: false,
        });

        this.pointMaterial = pointMaterial ?? new THREE.MeshBasicMaterial();

        this.lineMaterial =
            lineMaterial ??
            new LineMaterial({
                color: 0xffffff,
                linewidth: 2,
                vertexColors: true,
                polygonOffset: true,
                polygonOffsetFactor: -4,
                polygonOffsetUnits: -10,
            });

        this.pointGeometry = new THREE.SphereGeometry(0.02, 32, 32);
    }

    drawPrimitives(primitives: main.DebugDrawerPrimitive[]): void {
        for (const primitive of primitives) {
            switch (primitive.type) {
                case 0:
                    this.drawPoints(primitive);
                    break;
                case 1:
                    this.drawLines(primitive);
                    break;
                case 2:
                    this.drawTris(primitive);
                    break;
                case 3:
                    this.drawQuads(primitive);
                    break;
            }
        }
    }

    private drawPoints(primitive: main.DebugDrawerPrimitive): void {
        const geometry = this.pointGeometry;

        const instancedMesh = new THREE.InstancedMesh(
            geometry,
            this.pointMaterial,
            primitive.vertices.length / 3
        );

        for (let point = 0; point < primitive.vertices.length / 7; point++) {
            const vertex = primitive.vertices[point];
            const [x, y, z, r, g, b] = vertex;

            instancedMesh.setMatrixAt(
                point,
                new THREE.Matrix4().setPosition(x, y, z)
            );

            instancedMesh.setColorAt(point, _color.setRGB(r, g, b));
        }

        instancedMesh.instanceMatrix.needsUpdate = true;

        this.add(instancedMesh);
    }

    private drawLines(primitive: main.DebugDrawerPrimitive): void {
        const lineSegmentsGeometry = new LineSegmentsGeometry();

        const positions: number[] = [];
        const colors: number[] = [];

        for (let i = 0; i < primitive.vertices.length; i += 2) {
            const vertex1 = primitive.vertices[i];
            const vertex2 = primitive.vertices[i + 1];
            
            const [x1, y1, z1, r1, g1, b1] = vertex1;
            const [x2, y2, z2, r2, g2, b2] = vertex2;

            positions.push(x1, y1, z1);
            positions.push(x2, y2, z2);

            colors.push(r1, g1, b1);
            colors.push(r2, g2, b2);
        }

        lineSegmentsGeometry.setPositions(positions);
        lineSegmentsGeometry.setColors(colors);

        const lineSegments = new LineSegments2(
            lineSegmentsGeometry,
            this.lineMaterial
        );

        this.add(lineSegments);
    }

    private drawTris(primitive: main.DebugDrawerPrimitive): void {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(primitive.vertices.length * 3);
        const colors = new Float32Array(primitive.vertices.length * 3);

        for (let i = 0; i < primitive.vertices.length; i++) {
            const vertex = primitive.vertices[i];
            const [x, y, z, r, g, b] = vertex;

            positions[i * 3 + 0] = x;
            positions[i * 3 + 1] = y;
            positions[i * 3 + 2] = z;

            colors[i * 3 + 0] = r;
            colors[i * 3 + 1] = g;
            colors[i * 3 + 2] = b;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = this.triMaterial;
        const mesh = new THREE.Mesh(geometry, material);

        this.add(mesh);
    }

    private drawQuads(primitive: main.DebugDrawerPrimitive): void {
        const positions: number[] = [];
        const colors: number[] = [];

        for (let i = 0; i < primitive.vertices.length; i += 4) {
            const vertices = [
                primitive.vertices[i],
                primitive.vertices[i + 1],
                primitive.vertices[i + 2],
                primitive.vertices[i],
                primitive.vertices[i + 2],
                primitive.vertices[i + 3],
            ];

            for (const vertex of vertices) {
                const [x, y, z, r, g, b] = vertex;
                positions.push(x, y, z);
                colors.push(r, g, b);
            }
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute(
            'position',
            new THREE.BufferAttribute(new Float32Array(positions), 3)
        );
        geometry.setAttribute(
            'color',
            new THREE.BufferAttribute(new Float32Array(colors), 3)
        );

        const material = this.triMaterial;

        const mesh = new THREE.Mesh(geometry, material);

        this.add(mesh);
    }

    reset(): void {
        for (const child of this.children) {
            if (child instanceof THREE.Mesh || child instanceof LineSegments2) {
                child.geometry.dispose();
            }
        }

        this.clear();
    }

    dispose(): void {
        this.reset();

        this.pointGeometry.dispose();

        this.triMaterial.dispose();
        this.pointMaterial.dispose();
        this.lineMaterial.dispose();
    }
}
