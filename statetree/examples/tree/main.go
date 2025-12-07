// Package statetree provides a UE5-inspired state tree implementation for Go.
//
// Example usage:
//
//	tree := statetree.New()
//	builder := tree.NewStateBuilder(StateIdle)
//	builder.
//		AddTask(task.NewIdle()).
//		AddTransition(StatePatrol, transition.OnTick(), transition.WithPriority(PriorityNormal))
//	builder.Build()
//
//	tree.Start(StateRoot)
//	tree.Tick(deltaTime)
package main

import (
	"fmt"
	"sync"
)

// ============================================================================
// Core Types
// ============================================================================

// StateID uniquely identifies a state in the tree.
type StateID string

// Common state IDs
const (
	StateUnset StateID = ""
)

// Status represents the execution status of tasks and states.
type Status int

const (
	StatusRunning Status = iota
	StatusSucceeded
	StatusFailed
)

func (s Status) String() string {
	return [...]string{"Running", "Succeeded", "Failed"}[s]
}

// ============================================================================
// Context
// ============================================================================

// Context provides state execution context with access to the tree and data.
type Context struct {
	tree  *Tree
	data  map[string]interface{}
	mutex sync.RWMutex
}

// newContext creates a new execution context.
func newContext(tree *Tree) *Context {
	return &Context{
		tree: tree,
		data: make(map[string]interface{}),
	}
}

// Set stores a value in the context.
func (c *Context) Set(key string, value interface{}) {
	c.mutex.Lock()
	defer c.mutex.Unlock()
	c.data[key] = value
}

// Get retrieves a value from the context.
func (c *Context) Get(key string) (interface{}, bool) {
	c.mutex.RLock()
	defer c.mutex.RUnlock()
	val, ok := c.data[key]
	return val, ok
}

// GetString retrieves a string value from the context.
func (c *Context) GetString(key string) (string, bool) {
	if val, ok := c.Get(key); ok {
		if str, ok := val.(string); ok {
			return str, true
		}
	}
	return "", false
}

// GetFloat64 retrieves a float64 value from the context.
func (c *Context) GetFloat64(key string) (float64, bool) {
	if val, ok := c.Get(key); ok {
		if f, ok := val.(float64); ok {
			return f, true
		}
	}
	return 0, false
}

// SendEvent sends an event to the tree.
func (c *Context) SendEvent(eventName string) {
	c.tree.SendEvent(eventName)
}

// ============================================================================
// Interfaces
// ============================================================================

// Task defines the interface for executable tasks.
type Task interface {
	// EnterState is called when the task becomes active.
	EnterState(ctx *Context) Status

	// Tick is called each frame while the task is active.
	Tick(ctx *Context, deltaTime float64) Status

	// ExitState is called when the task becomes inactive.
	ExitState(ctx *Context)
}

// Condition defines the interface for transition conditions.
type Condition interface {
	// Test evaluates the condition.
	Test(ctx *Context) bool
}

// ============================================================================
// Transition
// ============================================================================

// TriggerType defines when a transition should be evaluated.
type TriggerType int

const (
	TriggerOnTick TriggerType = iota
	TriggerOnEvent
	TriggerOnStateCompleted
	TriggerOnStateSucceeded
	TriggerOnStateFailed
)

// Priority defines the priority of a transition.
type Priority int

const (
	PriorityLow Priority = iota
	PriorityNormal
	PriorityHigh
	PriorityCritical
)

// Transition represents a state transition.
type Transition struct {
	target     StateID
	trigger    TriggerType
	priority   Priority
	conditions []Condition
	eventName  string
}

// ============================================================================
// Transition Builder
// ============================================================================

// TransitionBuilder builds transitions fluently.
type TransitionBuilder struct {
	transition *Transition
}

// NewTransition creates a new transition to the target state.
func NewTransition(target StateID) *TransitionBuilder {
	return &TransitionBuilder{
		transition: &Transition{
			target:   target,
			trigger:  TriggerOnTick,
			priority: PriorityNormal,
		},
	}
}

// OnTick sets the transition to trigger on tick.
func (tb *TransitionBuilder) OnTick() *TransitionBuilder {
	tb.transition.trigger = TriggerOnTick
	return tb
}

// OnEvent sets the transition to trigger on a specific event.
func (tb *TransitionBuilder) OnEvent(eventName string) *TransitionBuilder {
	tb.transition.trigger = TriggerOnEvent
	tb.transition.eventName = eventName
	return tb
}

// OnStateCompleted sets the transition to trigger when state completes.
func (tb *TransitionBuilder) OnStateCompleted() *TransitionBuilder {
	tb.transition.trigger = TriggerOnStateCompleted
	return tb
}

// OnStateSucceeded sets the transition to trigger when state succeeds.
func (tb *TransitionBuilder) OnStateSucceeded() *TransitionBuilder {
	tb.transition.trigger = TriggerOnStateSucceeded
	return tb
}

// OnStateFailed sets the transition to trigger when state fails.
func (tb *TransitionBuilder) OnStateFailed() *TransitionBuilder {
	tb.transition.trigger = TriggerOnStateFailed
	return tb
}

// WithPriority sets the transition priority.
func (tb *TransitionBuilder) WithPriority(priority Priority) *TransitionBuilder {
	tb.transition.priority = priority
	return tb
}

// AddCondition adds a condition to the transition.
func (tb *TransitionBuilder) AddCondition(condition Condition) *TransitionBuilder {
	tb.transition.conditions = append(tb.transition.conditions, condition)
	return tb
}

// Build returns the built transition.
func (tb *TransitionBuilder) Build() *Transition {
	return tb.transition
}

// ============================================================================
// State Definition
// ============================================================================

// SelectionBehavior defines how child states are selected.
type SelectionBehavior int

const (
	SelectionEnterState SelectionBehavior = iota
	SelectionChildrenInOrder
	SelectionChildrenRandom
)

// stateDefinition holds the definition of a state.
type stateDefinition struct {
	id                StateID
	parent            StateID
	tasks             []Task
	transitions       []*Transition
	children          []StateID
	enterConditions   []Condition
	selectionBehavior SelectionBehavior
}

// ============================================================================
// State Builder
// ============================================================================

// StateBuilder builds states fluently.
type StateBuilder struct {
	tree *Tree
	def  *stateDefinition
}

// SetParent sets the parent state.
func (sb *StateBuilder) SetParent(parent StateID) *StateBuilder {
	sb.def.parent = parent
	return sb
}

// AddTask adds a task to the state.
func (sb *StateBuilder) AddTask(task Task) *StateBuilder {
	sb.def.tasks = append(sb.def.tasks, task)
	return sb
}

// AddTransition adds a transition to the state.
func (sb *StateBuilder) AddTransition(transition *Transition) *StateBuilder {
	sb.def.transitions = append(sb.def.transitions, transition)
	return sb
}

// AddChild adds a child state.
func (sb *StateBuilder) AddChild(child StateID) *StateBuilder {
	sb.def.children = append(sb.def.children, child)
	return sb
}

// AddEnterCondition adds an enter condition.
func (sb *StateBuilder) AddEnterCondition(condition Condition) *StateBuilder {
	sb.def.enterConditions = append(sb.def.enterConditions, condition)
	return sb
}

// SetSelectionBehavior sets how child states are selected.
func (sb *StateBuilder) SetSelectionBehavior(behavior SelectionBehavior) *StateBuilder {
	sb.def.selectionBehavior = behavior
	return sb
}

// Build registers the state with the tree.
func (sb *StateBuilder) Build() {
	sb.tree.addState(sb.def)
}

// ============================================================================
// Active State
// ============================================================================

// activeState represents a currently active state.
type activeState struct {
	id         StateID
	taskStatus []Status
	def        *stateDefinition
}

// ============================================================================
// Tree
// ============================================================================

// Tree represents a state tree instance.
type Tree struct {
	states             map[StateID]*stateDefinition
	activeStates       []activeState
	context            *Context
	currentState       StateID
	nextTransition     *Transition
	pendingEvent       string
	lastCompletedState StateID
	lastStatus         Status
	mutex              sync.RWMutex
	logger             Logger
}

// Logger defines the logging interface.
type Logger interface {
	Printf(format string, v ...interface{})
}

type defaultLogger struct{}

func (l *defaultLogger) Printf(format string, v ...interface{}) {
	fmt.Printf(format+"\n", v...)
}

// New creates a new state tree.
func New() *Tree {
	tree := &Tree{
		states:       make(map[StateID]*stateDefinition),
		activeStates: make([]activeState, 0),
		logger:       &defaultLogger{},
	}
	tree.context = newContext(tree)
	return tree
}

// SetLogger sets a custom logger for the tree.
func (t *Tree) SetLogger(logger Logger) {
	t.logger = logger
}

// NewStateBuilder creates a new state builder.
func (t *Tree) NewStateBuilder(id StateID) *StateBuilder {
	return &StateBuilder{
		tree: t,
		def: &stateDefinition{
			id:                id,
			selectionBehavior: SelectionEnterState,
		},
	}
}

// addState adds a state definition to the tree.
func (t *Tree) addState(def *stateDefinition) {
	t.mutex.Lock()
	defer t.mutex.Unlock()
	t.states[def.id] = def
}

// Context returns the execution context.
func (t *Tree) Context() *Context {
	return t.context
}

// CurrentState returns the current leaf state ID.
func (t *Tree) CurrentState() StateID {
	t.mutex.RLock()
	defer t.mutex.RUnlock()
	return t.currentState
}

// SendEvent sends an event to trigger transitions.
func (t *Tree) SendEvent(eventName string) {
	t.mutex.Lock()
	defer t.mutex.Unlock()
	t.pendingEvent = eventName
}

// Start initializes the tree with a root state.
func (t *Tree) Start(rootState StateID) error {
	t.logger.Printf("=== StateTree Starting ===")

	if !t.selectState(rootState) {
		return fmt.Errorf("failed to select root state: %s", rootState)
	}

	t.enterState(rootState)
	return nil
}

// Tick updates the tree for one frame.
func (t *Tree) Tick(deltaTime float64) {
	t.mutex.Lock()
	defer t.mutex.Unlock()

	t.logger.Printf("\n--- Tick (dt=%.3f) ---", deltaTime)
	t.tickTasks(deltaTime)
	t.tickTransitions(deltaTime)
}

// tickTasks executes all active tasks.
func (t *Tree) tickTasks(deltaTime float64) {
	t.logger.Printf("• Ticking Tasks")

	shouldContinue := true
	for i := range t.activeStates {
		if !shouldContinue {
			break
		}

		activeState := &t.activeStates[i]
		t.logger.Printf("  State [%s] with %d tasks", activeState.id, len(activeState.def.tasks))

		for j, task := range activeState.def.tasks {
			status := task.Tick(t.context, deltaTime)
			activeState.taskStatus[j] = status

			if status == StatusFailed {
				shouldContinue = false
				t.lastStatus = StatusFailed
				break
			}
		}
	}

	// Check for empty states (instant success)
	if len(t.activeStates) > 0 {
		leafState := &t.activeStates[len(t.activeStates)-1]
		if len(leafState.def.tasks) == 0 {
			t.lastStatus = StatusSucceeded
			t.lastCompletedState = leafState.id
			t.logger.Printf("  Empty state [%s] marked as Succeeded", leafState.id)
		}
	}
}

// tickTransitions evaluates and executes transitions.
func (t *Tree) tickTransitions(deltaTime float64) {
	t.logger.Printf("• Checking Transitions")

	maxIterations := 10
	for i := 0; i < maxIterations; i++ {
		if !t.triggerTransitions() {
			break
		}

		if t.nextTransition != nil {
			t.logger.Printf("  → Transition to [%s]", t.nextTransition.target)

			t.exitState()

			if t.selectState(t.nextTransition.target) {
				t.enterState(t.nextTransition.target)
			}

			t.nextTransition = nil
			t.lastCompletedState = StateUnset
			t.lastStatus = StatusRunning
		}
	}

	t.pendingEvent = ""
}

// triggerTransitions finds and sets the next transition to execute.
func (t *Tree) triggerTransitions() bool {
	var bestTransition *Transition
	bestPriority := PriorityLow - 1

	// Iterate from leaf to root (child states have priority)
	for i := len(t.activeStates) - 1; i >= 0; i-- {
		activeState := &t.activeStates[i]

		for _, trans := range activeState.def.transitions {
			if trans.priority < Priority(bestPriority) {
				continue
			}

			if !t.isTransitionTriggered(trans, activeState.id) {
				continue
			}

			if !t.testConditions(trans.conditions) {
				continue
			}

			if !t.canSelectState(trans.target) {
				continue
			}

			if trans.priority > Priority(bestPriority) {
				bestPriority = trans.priority
				bestTransition = trans
				t.logger.Printf("    Found: [%s] -> [%s] (priority: %d)",
					activeState.id, trans.target, trans.priority)
			}
		}
	}

	if bestTransition != nil {
		t.nextTransition = bestTransition
		return true
	}

	return false
}

// isTransitionTriggered checks if a transition's trigger condition is met.
func (t *Tree) isTransitionTriggered(trans *Transition, stateID StateID) bool {
	switch trans.trigger {
	case TriggerOnTick:
		return true
	case TriggerOnEvent:
		return t.pendingEvent == trans.eventName
	case TriggerOnStateCompleted:
		return t.lastCompletedState == stateID
	case TriggerOnStateSucceeded:
		return t.lastCompletedState == stateID && t.lastStatus == StatusSucceeded
	case TriggerOnStateFailed:
		return t.lastCompletedState == stateID && t.lastStatus == StatusFailed
	}
	return false
}

// testConditions tests all conditions.
func (t *Tree) testConditions(conditions []Condition) bool {
	for _, cond := range conditions {
		if !cond.Test(t.context) {
			return false
		}
	}
	return true
}

// canSelectState checks if a state can be selected.
func (t *Tree) canSelectState(target StateID) bool {
	def, exists := t.states[target]
	if !exists {
		return false
	}
	return t.testConditions(def.enterConditions)
}

// selectState activates a state and its path from root.
func (t *Tree) selectState(target StateID) bool {
	t.logger.Printf("  Selecting state [%s]", target)

	t.activeStates = t.activeStates[:0]

	path := t.buildPath(target)
	if len(path) == 0 {
		return false
	}

	for _, stateID := range path {
		def := t.states[stateID]

		if !t.testConditions(def.enterConditions) {
			t.logger.Printf("    Enter conditions failed for [%s]", stateID)
			return false
		}

		active := activeState{
			id:         stateID,
			taskStatus: make([]Status, len(def.tasks)),
			def:        def,
		}

		for i := range active.taskStatus {
			active.taskStatus[i] = StatusRunning
		}

		t.activeStates = append(t.activeStates, active)

		if stateID == target && len(def.children) > 0 {
			switch def.selectionBehavior {
			case SelectionChildrenInOrder:
				return t.selectChildInOrder(def)
			case SelectionChildrenRandom:
				return t.selectChildRandom(def)
			}
		}
	}

	t.currentState = target
	return true
}

// buildPath builds the path from root to target.
func (t *Tree) buildPath(target StateID) []StateID {
	path := []StateID{}
	current := target

	for current != StateUnset {
		path = append([]StateID{current}, path...)
		def, exists := t.states[current]
		if !exists {
			return nil
		}
		if def.parent == StateUnset {
			break
		}
		current = def.parent
	}

	return path
}

// selectChildInOrder selects the first valid child in order.
func (t *Tree) selectChildInOrder(def *stateDefinition) bool {
	for _, child := range def.children {
		if t.canSelectState(child) && t.selectState(child) {
			return true
		}
	}
	return false
}

// selectChildRandom selects a random valid child.
func (t *Tree) selectChildRandom(def *stateDefinition) bool {
	// Simplified: just use in-order for now
	return t.selectChildInOrder(def)
}

// enterState calls EnterState on all tasks.
func (t *Tree) enterState(newState StateID) {
	t.logger.Printf("• Entering state [%s]", newState)

	for i := range t.activeStates {
		activeState := &t.activeStates[i]

		for j, task := range activeState.def.tasks {
			status := task.EnterState(t.context)
			activeState.taskStatus[j] = status

			if status == StatusFailed {
				t.lastStatus = StatusFailed
				return
			}
		}
	}
}

// exitState calls ExitState on all tasks in reverse order.
func (t *Tree) exitState() {
	t.logger.Printf("• Exiting current states")

	for i := len(t.activeStates) - 1; i >= 0; i-- {
		activeState := &t.activeStates[i]
		t.logger.Printf("  Exiting state [%s]", activeState.id)

		for j := len(activeState.def.tasks) - 1; j >= 0; j-- {
			task := activeState.def.tasks[j]
			task.ExitState(t.context)
		}
	}
}

// ============================================================================
// Example Usage
// ============================================================================

// Example task implementations
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
type enemyNearbyCondition struct{ nearby bool }

func (c *enemyNearbyCondition) Test(ctx *Context) bool {
	return c.nearby
}

// Example usage
func main() {
	// State IDs
	const (
		StateRoot   StateID = "Root"
		StateIdle   StateID = "Idle"
		StatePatrol StateID = "Patrol"
		StateChase  StateID = "Chase"
	)

	// Create tree
	tree := New()

	// Build Root state
	tree.NewStateBuilder(StateRoot).
		SetSelectionBehavior(SelectionChildrenInOrder).
		AddChild(StateIdle).
		Build()

	// Build Idle state
	tree.NewStateBuilder(StateIdle).
		SetParent(StateRoot).
		AddTask(&idleTask{}).
		AddTransition(
			NewTransition(StatePatrol).
				OnTick().
				WithPriority(PriorityNormal).
				Build(),
		).
		Build()

	// Build Patrol state
	enemyCond := &enemyNearbyCondition{nearby: false}
	tree.NewStateBuilder(StatePatrol).
		SetParent(StateRoot).
		AddTask(&patrolTask{}).
		AddTransition(
			NewTransition(StateIdle).
				OnStateSucceeded().
				WithPriority(PriorityNormal).
				Build(),
		).
		AddTransition(
			NewTransition(StateChase).
				OnEvent("EnemySpotted").
				WithPriority(PriorityHigh).
				AddCondition(enemyCond).
				Build(),
		).
		Build()

	// Build Chase state
	tree.NewStateBuilder(StateChase).
		SetParent(StateRoot).
		Build()

	// Start and run
	fmt.Println("========== SIMULATION START ==========\n")
	tree.Start(StateRoot)

	for i := 0; i < 5; i++ {
		tree.Tick(0.016)
	}

	// Trigger event
	enemyCond.nearby = true
	tree.SendEvent("EnemySpotted")
	tree.Tick(0.016)

	fmt.Println("\n========== SIMULATION END ==========")
}
