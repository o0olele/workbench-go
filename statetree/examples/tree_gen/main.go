package main

import (
	"fmt"
)

// ============================================================================
// Example Task Implementations
// ============================================================================

type idleTask struct{}

func (t *idleTask) EnterState(ctx *Context) Status {
	fmt.Println("      [IdleTask] Started")
	return StatusRunning
}

func (t *idleTask) Tick(ctx *Context, dt float64) Status {
	fmt.Println("      [IdleTask] Idling...")
	return StatusRunning
}

func (t *idleTask) ExitState(ctx *Context) {
	fmt.Println("      [IdleTask] Stopped")
}

type patrolTask struct{ counter int }

func (t *patrolTask) EnterState(ctx *Context) Status {
	t.counter = 0
	fmt.Println("      [PatrolTask] Started")
	return StatusRunning
}

func (t *patrolTask) Tick(ctx *Context, dt float64) Status {
	t.counter++
	fmt.Printf("      [PatrolTask] Tick %d\n", t.counter)
	if t.counter >= 3 {
		return StatusSucceeded
	}
	return StatusRunning
}

func (t *patrolTask) ExitState(ctx *Context) {
	fmt.Println("      [PatrolTask] Stopped")
}

// Example condition
type enemyNearbyCondition struct{}

func (c *enemyNearbyCondition) Test(ctx *Context) bool {
	val, ok := ctx.Get("EnemyNearby")
	if !ok {
		return false
	}
	return val.(bool)
}

// ============================================================================
// Main Simulation
// ============================================================================

//go:generate go run make_tree.go generator.go

func main() {
	// State IDs (Must match those in make_tree.go)
	const (
		StateRoot   StateID = "Root"
		StateIdle   StateID = "Idle"
		StatePatrol StateID = "Patrol"
		StateChase  StateID = "Chase"
	)

	fmt.Println("========== STATE TREE GENERATION DEMO ==========")
	fmt.Println("Note: If 'generated_tree.go' is missing, run 'go generate' or 'go run make_tree.go generator.go'")

	// Create generated tree
	// This function is defined in generated_tree.go
	tree := NewMonsterTree()

	// Start and run
	fmt.Println("\n========== SIMULATION START ==========")
	if err := tree.Start(StateRoot); err != nil {
		fmt.Printf("Error starting tree: %v\n", err)
		return
	}

	for i := 0; i < 5; i++ {
		tree.Tick(0.016)
	}

	// Trigger event
	fmt.Println("\n--- Triggering Event: EnemySpotted ---")
	tree.Context.Set("EnemyNearby", true)
	tree.SendEvent("EnemySpotted")
	tree.Tick(0.016)

	fmt.Println("\n========== SIMULATION END ==========")
}
