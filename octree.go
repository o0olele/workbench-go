package main

import (
	"errors"
	"fmt"
	"sync"

	"github.com/o0olele/octree-go/builder"
	"github.com/o0olele/octree-go/geometry"
	"github.com/o0olele/octree-go/math32"
	"github.com/o0olele/octree-go/octree"
	"github.com/o0olele/octree-go/query"
)

type OctreeItem struct {
	builder *builder.Builder
	query   *query.NavigationQuery
	agent   *octree.Agent
}

type OctreeMgr struct {
	items map[string]*OctreeItem
	mutex sync.Mutex
}

func NewOctreeMgr() *OctreeMgr {
	return &OctreeMgr{
		items: make(map[string]*OctreeItem),
	}
}

type Vec3 struct {
	X float32
	Y float32
	Z float32
}

type Triangle struct {
	A Vec3
	B Vec3
	C Vec3
}

type Bounds struct {
	Min Vec3
	Max Vec3
}

type OctreeParam struct {
	Bounds   Bounds
	MaxDepth uint8
	MinSize  float32
	StepSize float32
}

type AgentParam struct {
	Height float32
	Radius float32
}

func (m *OctreeMgr) Add(id string, octreeParam OctreeParam, agentParam AgentParam, triangles []Triangle) error {

	m.mutex.Lock()
	if _, ok := m.items[id]; ok {
		m.mutex.Unlock()
		return nil
	}
	m.mutex.Unlock()

	builder := builder.NewBuilder(geometry.AABB{Min: math32.Vector3(octreeParam.Bounds.Min), Max: math32.Vector3(octreeParam.Bounds.Max)}, octreeParam.MaxDepth, octreeParam.MinSize, octreeParam.StepSize)
	for _, tri := range triangles {
		builder.AddTriangle(geometry.Triangle{A: math32.Vector3(tri.A), B: math32.Vector3(tri.B), C: math32.Vector3(tri.C)})
	}
	builder.SetUseVoxel(true)

	agent := octree.NewAgent(agentParam.Radius, agentParam.Height)

	navData, err := builder.Build(agent)
	if err != nil {
		return err
	}

	query, err := query.NewNavigationQuery(navData)
	if err != nil {
		return err
	}
	query.SetAgent(agent)

	item := &OctreeItem{
		builder: builder,
		query:   query,
		agent:   agent,
	}
	m.mutex.Lock()
	defer m.mutex.Unlock()
	m.items[id] = item

	fmt.Println("AddOctreeItem", id, agentParam)
	return nil
}

// OctreeExport is the simplified structure for JSON serialization
type OctreeExport struct {
	Root     *OctreeNodeExport `json:"root"`
	MaxDepth uint8             `json:"max_depth"`
	MinSize  float32           `json:"min_size"`
}

// OctreeNodeExport is the simplified structure for JSON serialization
type OctreeNodeExport struct {
	Bounds     geometry.AABB       `json:"bounds"`
	Children   []*OctreeNodeExport `json:"children,omitempty"`
	IsLeaf     bool                `json:"is_leaf"`
	IsOccupied bool                `json:"is_occupied"`
	Depth      uint8               `json:"depth"`
}

// ToJSON exports the octree to JSON
func OctreeToExport(o *octree.Octree) *OctreeExport {
	export := &OctreeExport{
		Root:     OctreeNodeToExport(o, o.Root),
		MaxDepth: o.MaxDepth,
		MinSize:  o.MinSize,
	}
	return export
}

// nodeToExport converts a node to an export
func OctreeNodeToExport(o *octree.Octree, node *octree.OctreeNode) *OctreeNodeExport {
	if node == nil {
		return nil
	}

	export := &OctreeNodeExport{
		Bounds:     node.Bounds,
		IsLeaf:     node.IsLeaf(),
		IsOccupied: node.IsOccupied(),
		Depth:      node.Depth,
	}

	if !node.IsLeaf() {
		for _, child := range node.Children {
			export.Children = append(export.Children, OctreeNodeToExport(o, child))
		}
	}

	return export
}

func (m *OctreeMgr) GetOctreeData(id string) (*OctreeExport, error) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	fmt.Println("GetOctreeData", id)

	item, ok := m.items[id]
	if !ok {
		return nil, errors.New("octree not found")
	}

	export := OctreeToExport(item.builder.GetOctree())
	return export, nil
}

func (m *OctreeMgr) Remove(id string) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	delete(m.items, id)
}

func (m *OctreeMgr) Exist(id string) bool {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	_, ok := m.items[id]
	return ok
}

func (m *OctreeMgr) FindPath(id string, start, end Vec3) []Vec3 {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	item, ok := m.items[id]
	if !ok {
		return nil
	}

	path := item.query.FindPath(math32.Vector3(start), math32.Vector3(end))
	if path == nil {
		return nil
	}

	var vec3Path []Vec3
	for _, v := range path {
		vec3Path = append(vec3Path, Vec3{X: v.X, Y: v.Y, Z: v.Z})
	}
	return vec3Path
}
