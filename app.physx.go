package main

import (
	"errors"
	"os"
	"workbench-go/physxgo"
)

func (a *App) InitPhysx(pvdAddr string, pvdPort int) {
	a.physxMgr = NewPhysxMgr(pvdAddr, pvdPort)
}

func (a *App) LoadPhysxXml(xmlPath string) error {
	if a.physxMgr == nil {
		return errors.New("PhysxMgr is not initialized")
	}
	w := a.physxMgr.world
	w.ClearCollections()

	data, err := os.ReadFile(xmlPath)
	if err != nil {
		return err
	}

	w.LoadCollectionFromXmlMemory(string(data))
	return nil
}

func (a *App) LoadPhysxXmlString(xml string) error {
	if a.physxMgr == nil {
		return errors.New("PhysxMgr is not initialized")
	}
	w := a.physxMgr.world
	w.ClearCollections()

	w.LoadCollectionFromXmlMemory(xml)
	return nil
}

func (a *App) LoadAndCreateRigidKinematic(xmlPath string, pos Vec3) error {
	if a.physxMgr == nil {
		return errors.New("PhysxMgr is not initialized")
	}
	w := a.physxMgr.world
	w.ClearCollections()

	data, err := os.ReadFile(xmlPath)
	if err != nil {
		return err
	}

	xmlString := string(data)

	actors, err := ParseRigidActors(xmlString)
	if err != nil || len(actors) <= 0 {
		return err
	}

	w.LoadCollectionFromXmlMemory(xmlString)

	return a.CreateRigidKinematic(actors[0].GetID(), pos)
}

func (a *App) CreateRigidKinematic(id uint32, pos Vec3) error {
	if a.physxMgr == nil {
		return errors.New("PhysxMgr is not initialized")
	}
	a.physxMgr.CreateRigidKinematic(id, pos)
	return nil
}

func (a *App) SetRigidKinematicPosition(id uint32, pos Vec3) error {
	if a.physxMgr == nil {
		return errors.New("PhysxMgr is not initialized")
	}
	if len(a.physxMgr.dynamics) <= 0 {
		return errors.New("RigidKinematic not found")
	}
	a.physxMgr.dynamics[id].SetPosition(physxgo.Vec3{
		X: float32(pos.X),
		Y: float32(pos.Y),
		Z: float32(pos.Z),
	})
	return nil
}

func (a *App) ReleasePhysx() {
	if a.physxMgr == nil {
		return
	}
	a.physxMgr.Release()
	a.physxMgr = nil
}

func (a *App) PhysxStep() {
	if a.physxMgr == nil {
		return
	}
	a.physxMgr.Step()
}
