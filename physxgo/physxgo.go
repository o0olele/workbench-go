package physxgo

/*
#cgo LDFLAGS: -L. -lwrapper -lpthread
#include "wrapper.h"
#include <stdlib.h>
*/
import "C"
import (
	"fmt"
	"unsafe"
)

const (
	PX_PHYSICS_VERSION    = 0x03040200
	PX_FOUNDATION_VERSION = 0x01000000
)

type Vec3 struct {
	X, Y, Z float32
}

type Quat struct {
	X, Y, Z, W float32
}

type Transform struct {
	Position Vec3
	Rotation Quat
}

type PhysXWorld struct {
	foundation  C.PxGoFoundationHandle
	physics     C.PxGoPhysicsHandle
	scene       C.PxGoSceneHandle
	cooking     C.PxGoCookingHandle
	pvd         C.PxGoPvdHandle
	collections []C.PxGoCollectionHandle
}

func NewPhysXWorld(pvdAddr string, pvdPort int) *PhysXWorld {
	world := &PhysXWorld{}

	// 创建 Foundation
	world.foundation = C.PxGoCreateFoundation(C.uint32_t(PX_FOUNDATION_VERSION), C.CString("DefaultAllocator"))
	if world.foundation == nil {
		panic("Failed to create PhysX Foundation")
	}

	// 创建并连接 PVD
	world.pvd = C.PxGoCreatePvd(world.foundation)
	if C.PxGoConnectPvd(world.pvd, C.CString(pvdAddr), C.int32_t(pvdPort)) {
		println("PVD connected")
	} else {
		println("PVD not connected")
	}

	// 创建 Physics
	world.physics = C.PxGoCreatePhysics(C.uint32_t(PX_PHYSICS_VERSION), world.foundation, 1.0, world.pvd)
	if world.physics == nil {
		panic("Failed to create PhysX Physics")
	}

	// 创建 Cooking
	world.cooking = C.PxGoCreateCooking(C.uint32_t(PX_PHYSICS_VERSION), world.foundation)

	// 创建场景
	sceneDesc := C.PxGoSceneDesc{
		gravity:   C.PxGoVec3{x: 0.0, y: -9.81, z: 0.0},
		maxActors: 1000,
		enableCCD: false,
	}
	world.scene = C.PxGoCreateScene(world.physics, &sceneDesc)
	if world.scene == nil {
		panic("Failed to create PhysX Scene")
	}

	return world
}

func (w *PhysXWorld) LoadCollectionFromXmlFile(path string) {
	cpath := C.CString(path)
	defer C.free(unsafe.Pointer(cpath))
	collection := C.PxGoLoadCollectionFromXmlFile(cpath, w.physics, w.cooking)
	fmt.Println("Loaded collection: ", collection)
	w.collections = append(w.collections, collection)
}

func (w *PhysXWorld) LoadCollectionFromXmlMemory(xml string) {
	data := C.CString(xml)
	defer C.free(unsafe.Pointer(data))
	collection := C.PxGoLoadCollectionFromXmlMemory(data, C.size_t(len(xml)), w.physics, w.cooking)
	fmt.Println("Loaded collection: ", collection)
	w.collections = append(w.collections, collection)
}

func (w *PhysXWorld) CreateRigidFromCollection(id uint32, position Vec3) *RigidDynamic {
	if len(w.collections) == 0 {
		panic("No collection loaded")
	}
	transform := C.PxGoTransform{
		p: C.PxGoVec3{x: C.float(position.X), y: C.float(position.Y), z: C.float(position.Z)},
		q: C.PxGoQuat{x: 0, y: 0, z: 0, w: 1},
	}
	actor := C.PxGoSceneCreateDynamicActorFromCollection(w.scene, w.collections[0], C.uint32_t(id), &transform)
	fmt.Println("Created actor: ", actor)
	return &RigidDynamic{handle: actor, world: w}
}

func (w *PhysXWorld) CreateStaticFromCollection(id uint32, position Vec3) *RigidStatic {
	if len(w.collections) == 0 {
		panic("No collection loaded")
	}
	transform := C.PxGoTransform{
		p: C.PxGoVec3{x: C.float(position.X), y: C.float(position.Y), z: C.float(position.Z)},
		q: C.PxGoQuat{x: 0, y: 0, z: 0, w: 1},
	}
	actor := C.PxGoSceneCreateStaticActorFromCollection(w.scene, w.collections[0], C.uint32_t(id), &transform)
	fmt.Println("Created actor: ", actor)
	return &RigidStatic{handle: actor, world: w}
}

func (w *PhysXWorld) CreateKinematicFromCollection(id uint32, position Vec3) *RigidDynamic {
	if len(w.collections) == 0 {
		panic("No collection loaded")
	}
	transform := C.PxGoTransform{
		p: C.PxGoVec3{x: C.float(position.X), y: C.float(position.Y), z: C.float(position.Z)},
		q: C.PxGoQuat{x: 0, y: 0, z: 0, w: 1},
	}
	actor := C.PxGoSceneCreateKinematicActorFromCollection(w.scene, w.collections[0], C.uint32_t(id), &transform)
	fmt.Println("Created actor: ", actor)
	return &RigidDynamic{handle: actor, world: w}
}

func (w *PhysXWorld) ReleaseScene() {
	if w.scene != nil {
		C.PxGoReleaseScene(w.scene)
		w.scene = nil
	}
}

func (w *PhysXWorld) Release() {

	for _, collection := range w.collections {
		C.PxGoReleaseCollection(collection)
	}
	w.collections = nil
	if w.cooking != nil {
		C.PxGoReleaseCooking(w.cooking)
		w.cooking = nil
	}
	if w.physics != nil {
		C.PxGoReleasePhysics(w.physics)
		w.physics = nil
	}
	if w.pvd != nil {
		C.PxGoReleasePvd(w.pvd)
		w.pvd = nil
	}
	if w.foundation != nil {
		C.PxGoReleaseFoundation(w.foundation)
		w.foundation = nil
	}
}

func (w *PhysXWorld) Simulate(dt float32) {
	C.PxGoSceneSimulate(w.scene, C.float(dt))
	C.PxGoSceneFetchResults(w.scene, true)
}

func (w *PhysXWorld) ClearCollections() {
	for _, collection := range w.collections {
		C.PxGoReleaseCollection(collection)
	}
	w.collections = nil
}

type RigidDynamic struct {
	handle C.PxGoRigidDynamicHandle
	world  *PhysXWorld
}

func (w *PhysXWorld) CreateSphere(position Vec3, radius, mass float32) *RigidDynamic {
	// 创建材质
	material := C.PxGoCreateMaterial(w.physics, 0.5, 0.5, 0.6)

	// 创建球形形状
	sphereGeom := C.PxGoSphereGeometry{radius: C.float(radius)}
	shape := C.PxGoCreateShapeSphere(w.physics, &sphereGeom, material, false)

	// 创建动态刚体
	transform := C.PxGoTransform{
		p: C.PxGoVec3{x: C.float(position.X), y: C.float(position.Y), z: C.float(position.Z)},
		q: C.PxGoQuat{x: 0, y: 0, z: 0, w: 1},
	}
	actor := C.PxGoCreateRigidDynamic(w.physics, &transform)

	// 附加形状并设置质量
	C.PxGoRigidDynamicAttachShape(actor, shape)
	C.PxGoRigidDynamicSetMass(actor, C.float(mass))

	// 添加到场景
	C.PxGoSceneAddActor(w.scene, actor)

	// 释放形状引用（actor 保留了引用）
	C.PxGoReleaseShape(shape)
	C.PxGoReleaseMaterial(material)

	return &RigidDynamic{handle: actor, world: w}
}

func (w *PhysXWorld) CreateBox(position, halfExtents Vec3, mass float32) *RigidDynamic {
	material := C.PxGoCreateMaterial(w.physics, 0.5, 0.5, 0.6)

	boxGeom := C.PxGoBoxGeometry{
		halfExtents: C.PxGoVec3{
			x: C.float(halfExtents.X),
			y: C.float(halfExtents.Y),
			z: C.float(halfExtents.Z),
		},
	}
	shape := C.PxGoCreateShapeBox(w.physics, &boxGeom, material, false)

	transform := C.PxGoTransform{
		p: C.PxGoVec3{x: C.float(position.X), y: C.float(position.Y), z: C.float(position.Z)},
		q: C.PxGoQuat{x: 0, y: 0, z: 0, w: 1},
	}
	actor := C.PxGoCreateRigidDynamic(w.physics, &transform)

	C.PxGoRigidDynamicAttachShape(actor, shape)
	C.PxGoRigidDynamicSetMass(actor, C.float(mass))
	C.PxGoSceneAddActor(w.scene, actor)

	C.PxGoReleaseShape(shape)
	C.PxGoReleaseMaterial(material)

	return &RigidDynamic{handle: actor, world: w}
}

func (w *PhysXWorld) CreateGroundPlane() {
	material := C.PxGoCreateMaterial(w.physics, 0.5, 0.5, 0.6)

	// 创建一个大的薄盒子作为地面
	boxGeom := C.PxGoBoxGeometry{
		halfExtents: C.PxGoVec3{x: 100.0, y: 0.1, z: 100.0},
	}
	shape := C.PxGoCreateShapeBox(w.physics, &boxGeom, material, false)

	transform := C.PxGoTransform{
		p: C.PxGoVec3{x: 0, y: 0, z: 0},
		q: C.PxGoQuat{x: 0, y: 0, z: 0, w: 1},
	}
	actor := C.PxGoCreateRigidStatic(w.physics, &transform)

	C.PxGoRigidStaticAttachShape(actor, shape)
	C.PxGoSceneAddStaticActor(w.scene, actor)

	C.PxGoReleaseShape(shape)
	C.PxGoReleaseMaterial(material)
}

func (rd *RigidDynamic) GetPosition() Vec3 {
	var transform C.PxGoTransform
	C.PxGoRigidDynamicGetGlobalPose(rd.handle, &transform)
	return Vec3{
		X: float32(transform.p.x),
		Y: float32(transform.p.y),
		Z: float32(transform.p.z),
	}
}

func (rd *RigidDynamic) SetPosition(pos Vec3) {
	var transform C.PxGoTransform
	C.PxGoRigidDynamicGetGlobalPose(rd.handle, &transform)
	transform.p.x = C.float(pos.X)
	transform.p.y = C.float(pos.Y)
	transform.p.z = C.float(pos.Z)
	C.PxGoRigidDynamicSetGlobalPose(rd.handle, &transform)
}

func (rd *RigidDynamic) SetLinearVelocity(v Vec3) {
	vel := C.PxGoVec3{x: C.float(v.X), y: C.float(v.Y), z: C.float(v.Z)}
	C.PxGoRigidDynamicSetLinearVelocity(rd.handle, &vel)
}

func (rd *RigidDynamic) GetLinearVelocity() Vec3 {
	var vel C.PxGoVec3
	C.PxGoRigidDynamicGetLinearVelocity(rd.handle, &vel)
	return Vec3{
		X: float32(vel.x),
		Y: float32(vel.y),
		Z: float32(vel.z),
	}
}

func (rd *RigidDynamic) AddForce(f Vec3) {
	force := C.PxGoVec3{x: C.float(f.X), y: C.float(f.Y), z: C.float(f.Z)}
	C.PxGoRigidDynamicAddForce(rd.handle, &force, 0) // 0 = eFORCE
}

func (rd *RigidDynamic) Release() {
	if rd.handle != nil {
		C.PxGoSceneRemoveActor(rd.world.scene, rd.handle)
		C.PxGoReleaseRigidDynamic(rd.handle)
	}
}

func (rd *RigidDynamic) SetKinematicTarget(pos Vec3) {
	var transform C.PxGoTransform
	C.PxGoRigidDynamicGetGlobalPose(rd.handle, &transform)
	transform.p.x = C.float(pos.X)
	transform.p.y = C.float(pos.Y)
	transform.p.z = C.float(pos.Z)
	C.PxGoRigidDynamicSetKinematicTarget(rd.handle, &transform)
}

type RigidStatic struct {
	handle C.PxGoRigidStaticHandle
	world  *PhysXWorld
}

func (rs *RigidStatic) Release() {
	if rs.handle != nil {
		C.PxGoSceneRemoveStaticActor(rs.world.scene, rs.handle)
		C.PxGoReleaseRigidStatic(rs.handle)
	}
}

func (rs *RigidStatic) GetPosition() Vec3 {
	var transform C.PxGoTransform
	C.PxGoRigidStaticGetGlobalPose(rs.handle, &transform)
	return Vec3{
		X: float32(transform.p.x),
		Y: float32(transform.p.y),
		Z: float32(transform.p.z),
	}
}
