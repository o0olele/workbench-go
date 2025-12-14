//go:build ignore
// +build ignore

package main

import (
	"fmt"
	"os"
)

func main() {
	config := GeneratorConfig{
		PackageName: "main",
		TreeName:    "MonsterTree",
		States: []GenStateDef{
			{
				ID:                "Root",
				SelectionBehavior: "SelectionChildrenInOrder",
				Children:          []string{"Idle"},
			},
			{
				ID:     "Idle",
				Parent: "Root",
				Tasks: []GenTaskDef{
					{InstanceCode: "&idleTask{}"},
				},
				Transitions: []GenTransitionDef{
					{
						Target:   "Patrol",
						Trigger:  "TriggerOnTick",
						Priority: "PriorityNormal",
					},
				},
			},
			{
				ID:     "Patrol",
				Parent: "Root",
				Tasks: []GenTaskDef{
					{InstanceCode: "&patrolTask{}"},
				},
				Transitions: []GenTransitionDef{
					{
						Target:   "Idle",
						Trigger:  "TriggerOnStateSucceeded",
						Priority: "PriorityNormal",
					},
					{
						Target:    "Chase",
						Trigger:   "TriggerOnEvent",
						EventName: "EnemySpotted",
						Priority:  "PriorityHigh",
						Conditions: []string{
							"&enemyNearbyCondition{}",
						},
					},
				},
			},
			{
				ID:     "Chase",
				Parent: "Root",
			},
		},
	}

	if err := Generate(config); err != nil {
		fmt.Printf("Error generating tree: %v\n", err)
		os.Exit(1)
	}
	fmt.Println("Successfully generated generated_tree.go")
}
