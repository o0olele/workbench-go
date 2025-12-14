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
	// tree is removed here as it will be injected or accessed via interface in generated code
	// or we can keep it as interface{} or specific generated interface
	Data  map[string]interface{}
	Mutex sync.RWMutex
	// Helper to send events, will be linked to the generated tree instance
	OnSendEvent func(eventName string)
}

// NewContext creates a new execution context.
func NewContext() *Context {
	return &Context{
		Data: make(map[string]interface{}),
	}
}

// Set stores a value in the context.
func (c *Context) Set(key string, value interface{}) {
	c.Mutex.Lock()
	defer c.Mutex.Unlock()
	c.Data[key] = value
}

// Get retrieves a value from the context.
func (c *Context) Get(key string) (interface{}, bool) {
	c.Mutex.RLock()
	defer c.Mutex.RUnlock()
	val, ok := c.Data[key]
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
	if c.OnSendEvent != nil {
		c.OnSendEvent(eventName)
	}
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

// Logger defines the logging interface.
type Logger interface {
	Printf(format string, v ...any)
}

type DefaultLogger struct{}

func (l *DefaultLogger) Printf(format string, v ...any) {
	fmt.Printf(format+"\n", v...)
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
