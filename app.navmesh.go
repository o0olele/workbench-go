package main

import (
	"fmt"
	"os"

	"github.com/wailsapp/wails/v2/pkg/runtime"
)

func (a *App) LoadNavMeshLocal(id, name, navType, filename string) error {
	if a.meshMgr.IsItemExists(id) {
		return nil
	}

	data, err := os.ReadFile(filename)
	if err != nil {
		return err
	}

	return a.LoadNavMesh(id, name, navType, data)
}

func (a *App) LoadNavMesh(id, name, navType string, data []byte) error {
	return a.meshMgr.LoadItem(id, name, navType, data)
}

func (a *App) RemoveNavMesh(id string) {
	a.meshMgr.RemoveItem(id)
}

func (a *App) AddAgent(id string, x, y, z, r, h, speed, acc float32) error {
	return a.meshMgr.AddAgent(id, x, y, z, r, h, speed, acc)
}

func (a *App) UpdateAgents(id string) {
	a.meshMgr.UpdateAgents(id)
}

func (a *App) ClearAgent(id string) {
	a.meshMgr.ClearAgent(id)
}

func (a *App) SetAgentTarget(id string, x, y, z float32) {
	a.meshMgr.SetAgentTarget(id, x, y, z)
}

func (a *App) TeleportAgent(id string, x, y, z float32) bool {
	return a.meshMgr.TeleportAgent(id, x, y, z)
}

type NavInfo struct {
	Primitives []*DebugDrawerPrimitive `json:"primitives"`
	Agents     []*ServerAgent          `json:"agents"`
	Params     *ServerAgentParams      `json:"agent_params"`
}

type ServerAgent struct {
	Id  uint32     `json:"id"`
	Pos [3]float32 `json:"pos"`
}

type ServerAgentParams struct {
	Radius          float32 `json:"radius"`
	Height          float32 `json:"height"`
	MaxSpeed        float32 `json:"max_speed"`
	MaxAcceleration float32 `json:"max_acceleration"`
}

type DebugDrawerPrimitive struct {
	Type     int          `json:"type"`
	Vertices [][7]float32 `json:"vertices"`
}

// OpenFileDialog opens a file dialog and returns the selected file path
func (a *App) OpenFileDialog(title string, filters []runtime.FileFilter) (string, error) {
	return runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title:   title,
		Filters: filters,
	})
}

// ProcessSelectedFiles processes files selected through Go runtime
func (a *App) ProcessSelectedFiles(filePaths []string) error {
	for _, filePath := range filePaths {
		// Process each file here
		// For now, just log the file path
		fmt.Printf("Processing file: %s\n", filePath)

		// You can add specific file processing logic here
		// For example, check file extension and handle accordingly

		// Example: Read file and process based on extension
		data, err := os.ReadFile(filePath)
		if err != nil {
			return fmt.Errorf("failed to read file %s: %v", filePath, err)
		}

		fmt.Printf("Successfully read file %s, size: %d bytes\n", filePath, len(data))
	}

	return nil
}

func (a *App) GetNavMeshInfo(id string, addMesh bool) *NavInfo {
	info := a.meshMgr.GetInfo(id, addMesh)
	if info == nil {
		return nil
	}

	navInfo := &NavInfo{}
	if addMesh {
		navInfo.Primitives = make([]*DebugDrawerPrimitive, len(info.Primitives))
		for i, primitive := range info.Primitives {
			tmp := &DebugDrawerPrimitive{
				Type:     int(primitive.PrimitiveType),
				Vertices: make([][7]float32, len(primitive.Vertices)),
			}
			copy(tmp.Vertices, primitive.Vertices)
			navInfo.Primitives[i] = tmp
		}
	}

	navInfo.Agents = make([]*ServerAgent, len(info.Agents))
	for i, agent := range info.Agents {
		navInfo.Agents[i] = &ServerAgent{
			Id:  agent.Id,
			Pos: agent.Pos,
		}
	}
	navInfo.Params = &ServerAgentParams{
		Radius:          info.Params.Radius,
		Height:          info.Params.Height,
		MaxSpeed:        info.Params.MaxSpeed,
		MaxAcceleration: info.Params.MaxAcceleration,
	}

	return navInfo
}
