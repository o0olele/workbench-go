package main

import (
	"context"
)

// App struct
type App struct {
	ctx       context.Context
	meshMgr   *NavMgr
	octreeMgr *OctreeMgr
	physxMgr  *PhysxMgr
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{
		meshMgr:   NewNavMgr(),
		octreeMgr: NewOctreeMgr(),
	}
}

// startup is called when the app starts. The context is saved
// so we can call the runtime methods
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}
