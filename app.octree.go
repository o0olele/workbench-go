package main

import "runtime"

func (a *App) AddOctreeItem(id string, octreeParam OctreeParam, agentParam AgentParam, triangles []Triangle) error {
	return a.octreeMgr.Add(id, octreeParam, agentParam, triangles)
}

func (a *App) GetOctreeData(id string) (*OctreeExport, error) {
	return a.octreeMgr.GetOctreeData(id)
}

func (a *App) ResetOctree(id string) error {
	a.octreeMgr.Remove(id)
	runtime.Gosched()
	// 等待垃圾回收
	runtime.GC()
	return nil
}

func (a *App) ExistOctree(id string) bool {
	return a.octreeMgr.Exist(id)
}

func (a *App) FindPathOctree(id string, start, end Vec3) []Vec3 {
	return a.octreeMgr.FindPath(id, start, end)
}
