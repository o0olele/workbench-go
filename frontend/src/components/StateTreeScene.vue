<!-- views/StateTreeEditor.vue -->
<template>
  <div class="ue5-editor-container">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <h3>StateTree Editor</h3>
      <button @click="addRootState">Add Root State</button>
      <button @click="logData">Log JSON</button>
    </div>

    <div class="editor-body">
      <!-- 左侧：状态树 -->
      <div class="tree-panel">
        <NestedStateList 
          v-model="treeData" 
          :selected-id="selectedNode?.id || null"
          @select="handleSelect"
          @remove="handleRemove"
        />
      </div>

      <!-- 右侧：详情面板 -->
      <div class="details-panel" v-if="selectedNode">
        <div class="details-header">Details</div>
        <div class="form-group">
          <label>State Name</label>
          <input type="text" v-model="selectedNode.name" />
        </div>
        <div class="form-group">
          <label>ID</label>
          <input type="text" disabled :value="selectedNode.id" />
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea v-model="selectedNode.description"></textarea>
        </div>
      </div>
      <div class="details-panel empty" v-else>
        Select a state to edit details.
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { v4 as uuidv4 } from 'uuid';
import type { StateNode } from '../lib/types';
import NestedStateList from './NestedStateList.vue';

// 初始数据
const treeData = ref<StateNode[]>([
  {
    id: 'root-1',
    name: 'Root State',
    isExpanded: true,
    children: [
      {
        id: 'child-1',
        name: 'Idle',
        isExpanded: false,
        children: []
      },
      {
        id: 'child-2',
        name: 'Movement',
        isExpanded: true,
        children: [
          { id: 'sub-1', name: 'Walk', isExpanded: false, children: [] },
          { id: 'sub-2', name: 'Run', isExpanded: false, children: [] }
        ]
      }
    ]
  }
]);

const selectedNode = ref<StateNode | null>(null);

const handleSelect = (node: StateNode) => {
  selectedNode.value = node;
};

const addRootState = () => {
  treeData.value.push({
    id: uuidv4(),
    name: 'New Root',
    isExpanded: true,
    children: []
  });
  console.log(treeData.value);
};

// 递归查找并删除节点
const removeNodeRecursive = (nodes: StateNode[], id: string): boolean => {
  const index = nodes.findIndex(n => n.id === id);
  if (index !== -1) {
    nodes.splice(index, 1);
    return true;
  }
  for (const node of nodes) {
    if (removeNodeRecursive(node.children, id)) return true;
  }
  return false;
};

const handleRemove = (id: string) => {
  removeNodeRecursive(treeData.value, id);
  if (selectedNode.value?.id === id) {
    selectedNode.value = null;
  }
};

const logData = () => {
  console.log(JSON.stringify(treeData.value, null, 2));
};
</script>

<style scoped>
.ue5-editor-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #111;
  color: #eee;
  font-family: 'Segoe UI', sans-serif;
}

.toolbar {
  height: 40px;
  background-color: #222;
  border-bottom: 1px solid #333;
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 12px;
}

.toolbar button {
  background: #007fd4;
  color: white;
  border: none;
  padding: 4px 12px;
  border-radius: 4px;
  cursor: pointer;
}

.editor-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.tree-panel {
  width: 350px;
  background-color: #1a1a1a;
  border-right: 2px solid #000;
  padding: 10px;
  overflow-y: auto;
}

.details-panel {
  flex: 1;
  background-color: #242424;
  padding: 16px;
}

.details-header {
  font-weight: bold;
  border-bottom: 1px solid #444;
  padding-bottom: 8px;
  margin-bottom: 16px;
}

.form-group {
  margin-bottom: 12px;
}

.form-group label {
  display: block;
  font-size: 12px;
  color: #aaa;
  margin-bottom: 4px;
}

.form-group input, 
.form-group textarea {
  width: 100%;
  background-color: #111;
  border: 1px solid #333;
  color: white;
  padding: 6px;
  border-radius: 4px;
}

.form-group input:focus,
.form-group textarea:focus {
  border-color: #007fd4;
  outline: none;
}
</style>