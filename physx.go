package main

import (
	"encoding/xml"
	"strconv"
	"strings"
	"workbench-go/physxgo"
)

type PhysxMgr struct {
	world    *physxgo.PhysXWorld
	dynamics []*physxgo.RigidDynamic
}

func NewPhysxMgr(pvdAddr string, pvdPort int) *PhysxMgr {
	w := physxgo.NewPhysXWorld(pvdAddr, pvdPort)
	if w == nil {
		panic("Failed to create PhysX World")
	}
	w.CreateGroundPlane()
	return &PhysxMgr{
		world: w,
	}
}

func (p *PhysxMgr) CreateRigidKinematic(id uint32, pos Vec3) *physxgo.RigidDynamic {
	actor := p.world.CreateKinematicFromCollection(id, physxgo.Vec3{X: pos.X, Y: pos.Y, Z: pos.Z})
	if actor == nil {
		panic("Failed to create rigid kinematic")
	}
	p.dynamics = append(p.dynamics, actor)
	return actor
}

func (p *PhysxMgr) Release() {
	p.world.ReleaseScene()
	for _, actor := range p.dynamics {
		actor.Release()
	}
	p.world.Release()
	p.world = nil
}

func (p *PhysxMgr) Step() {
	if p.world == nil {
		return
	}
	p.world.Simulate(0.025)
}

type RigidActorXml struct {
	Type string // "PxRigidDynamic" or "PxRigidStatic"
	ID   string
}

func (x *RigidActorXml) GetID() uint32 {
	id, err := strconv.ParseInt(x.ID, 10, 32)
	if err != nil {
		panic(err)
	}
	return uint32(id)
}

func ParseRigidActors(xmlData string) ([]RigidActorXml, error) {
	decoder := xml.NewDecoder(strings.NewReader(xmlData))
	var actors []RigidActorXml
	var currentTag string
	var currentID string

	for {
		tok, err := decoder.Token()
		if err != nil {
			if err.Error() == "EOF" {
				break
			}
			return nil, err
		}

		switch se := tok.(type) {
		case xml.StartElement:
			switch se.Name.Local {
			case "PxRigidDynamic", "PxRigidStatic":
				currentTag = se.Name.Local
				currentID = ""
			case "Id":
				if currentTag != "" {
					var id string
					if err := decoder.DecodeElement(&id, &se); err != nil {
						return nil, err
					}
					currentID = id
				}
			}
		case xml.EndElement:
			if se.Name.Local == currentTag && currentTag != "" {
				actors = append(actors, RigidActorXml{
					Type: currentTag,
					ID:   currentID,
				})
				currentTag = ""
				currentID = ""
			}
		}
	}

	return actors, nil
}
