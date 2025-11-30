package main

import (
	"fmt"
	"os"
	"workbench-go/statetree"
)

func main() {
	// 1. Define Root
	root := &statetree.StateNode{Name: "Root", Type: statetree.StateRoot}

	// 2. Patrol Group
	patrol := &statetree.StateNode{
		Name:        "Patrol",
		Type:        statetree.StateGroup,
		Parent:      root,
		Description: "Patrol Logic Group",
		Transitions: []statetree.Transition{
			{TargetState: "Observe", Trigger: statetree.TriggerOnTick, Condition: "st.Context.CheckPerception_HasEnemy()"},
		},
	}
	root.Children = append(root.Children, patrol)

	// 2.1 Patrol_Move
	patrolMove := &statetree.StateNode{
		Name:        "Patrol_Move",
		Type:        statetree.StateLeaf,
		Parent:      patrol,
		Description: "Move along path",
		Tasks:       []statetree.Task{{Name: "MoveToTask"}},
		Transitions: []statetree.Transition{
			{TargetState: "Patrol_Idle", Trigger: statetree.TriggerOnTick, Condition: "st.Context.IsAtPoint() && st.Context.RandomChance(0.2)"},
		},
	}
	patrol.Children = append(patrol.Children, patrolMove)

	// 2.2 Patrol_Idle
	patrolIdle := &statetree.StateNode{
		Name:        "Patrol_Idle",
		Type:        statetree.StateLeaf,
		Parent:      patrol,
		Description: "Smash ground idle",
		Tasks:       []statetree.Task{{Name: "PlayAnimTask"}},
		Transitions: []statetree.Transition{
			{TargetState: "Patrol_Move", Trigger: statetree.TriggerOnTick, Condition: "st.Context.IsAnimFinished()"},
		},
	}
	patrol.Children = append(patrol.Children, patrolIdle)

	// 3. Observe
	observe := &statetree.StateNode{
		Name:        "Observe",
		Type:        statetree.StateLeaf,
		Parent:      root,
		Description: "Look at player",
		Transitions: []statetree.Transition{
			{TargetState: "Chase", Trigger: statetree.TriggerOnTick, Condition: "st.Context.IsTargetVisible() && st.Context.GetObserveTime() > 1.8"},
			{TargetState: "Patrol_Move", Trigger: statetree.TriggerOnTick, Condition: "!st.Context.IsTargetVisible() && st.Context.GetLostTime() > 6.0"},
		},
	}
	root.Children = append(root.Children, observe)

	// 4. Chase
	chase := &statetree.StateNode{
		Name:        "Chase",
		Type:        statetree.StateLeaf,
		Parent:      root,
		Description: "Chase player",
	}
	root.Children = append(root.Children, chase)

	// Define Tree
	def := &statetree.StateTreeDefinition{
		PackageName: "monster_ai",
		StructName:  "MonsterAI",
		ContextType: "*MonsterContext",
		Root:        root,
	}

	// Generate Code
	gen := statetree.NewGenerator(def)
	code, err := gen.Generate()
	if err != nil {
		fmt.Fprintf(os.Stderr, "Error: %v\n", err)
		os.Exit(1)
	}

	fmt.Println(string(code))
}
