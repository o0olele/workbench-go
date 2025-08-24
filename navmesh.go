package main

import (
	"errors"
	"fmt"
	"sync"

	"github.com/o0olele/detour-go/debugger"
)

type NavMgr struct {
	mutex    sync.Mutex
	navItems map[string]*debugger.NavItem
}

func NewNavMgr() *NavMgr {
	return &NavMgr{
		navItems: make(map[string]*debugger.NavItem),
	}
}

func (m *NavMgr) IsItemExists(id string) bool {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	_, ok := m.navItems[id]
	return ok
}

func (m *NavMgr) LoadItem(id, name, navType string, data []byte) error {
	if m.IsItemExists(id) {
		return nil
	}
	m.mutex.Lock()
	defer m.mutex.Unlock()

	item := debugger.NewNavItem(name)

	err := item.Load(navType, data)
	if err != nil {
		return err
	}
	m.navItems[id] = item

	return nil
}

func (m *NavMgr) RemoveItem(id string) {
	m.mutex.Lock()
	defer m.mutex.Unlock()
	delete(m.navItems, id)
	fmt.Println("remove item", id)

}

func (m *NavMgr) AddAgent(id string, x, y, z, r, h, speed, acc float32) error {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	item, ok := m.navItems[id]
	if !ok {
		return errors.New("nav item not found")
	}
	agentId := item.AddAgent(x, y, z, r, h, speed, acc)
	if agentId < 0 {
		return errors.New("add agent failed")
	}
	return nil
}

func (m *NavMgr) UpdateAgents(id string) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	item, ok := m.navItems[id]
	if !ok {
		return
	}
	item.UpdateAgents()
}

func (m *NavMgr) ClearAgent(id string) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	item, ok := m.navItems[id]
	if !ok {
		return
	}
	item.ClearAgent()
}

func (m *NavMgr) SetAgentTarget(id string, x, y, z float32) {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	item, ok := m.navItems[id]
	if !ok {
		return
	}
	item.SetAgentTarget(x, y, z)
}

func (m *NavMgr) TeleportAgent(id string, x, y, z float32) bool {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	item, ok := m.navItems[id]
	if !ok {
		return false
	}
	return item.TeleportAgent(x, y, z)
}

func (m *NavMgr) GetInfo(id string, addMesh bool) *debugger.NavInfo {
	m.mutex.Lock()
	defer m.mutex.Unlock()

	item, ok := m.navItems[id]
	if !ok {
		return nil
	}
	return item.GetInfo(addMesh)
}
