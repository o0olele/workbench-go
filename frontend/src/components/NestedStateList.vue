<template>
    <VueDraggable v-model="list" :group="{ name: 'state-tree', pull: true, put: true }" :animation="150"
        handle=".drag-handle" ghost-class="ghost" class="state-list" :class="{ 'dragging-mode': globalDragging }"
        @start="onDragStart" @end="onDragEnd">
        <!-- 修改点：不再使用 #item 插槽，而是直接使用 v-for -->
        <div v-for="element in list" :key="element.id" class="state-node-wrapper">
            <!-- 节点本身的内容 (Header) -->
            <div class="state-node-header" :class="{ 'is-selected': selectedId === element.id }"
                @click.stop="selectNode(element)">
                <div class="node-controls">
                    <!-- 修改前: v-if="element.children && element.children.length > 0" -->
                    <!-- 修改后: 始终渲染，但如果没有子节点，可以加个样式变淡 -->
                    <span class="toggle-icon"
                        :class="{ 'is-empty': !element.children || element.children.length === 0 }"
                        @click.stop="toggleExpand(element)">
                        <!-- 只有当有子节点时才显示实心箭头，否则显示一个占位符或空心圆，或者保持箭头但变灰 -->
                        {{ element.isExpanded ? '▼' : '▶' }}
                    </span>
                </div>

                <!-- 拖拽手柄 -->
                <div class="drag-handle">
                    ⠿
                </div>

                <!-- 节点名称 -->
                <div class="node-info">
                    <span class="node-name">{{ element.name }}</span>
                </div>

                <!-- 操作按钮 -->
                <div class="node-actions">
                    <button @click.stop="addChild(element)">+</button>
                    <button @click.stop="removeNode(element.id)" class="btn-del">×</button>
                </div>
            </div>

            <!-- 递归渲染子节点区域 -->
            <!-- 注意：这里增加了 v-show 也可以，或者 v-if -->
            <div v-if="element.children && element.isExpanded" class="state-children">
                <NestedStateList v-model="element.children" :selected-id="selectedId" @select="emitSelect"
                    @remove="emitRemove" />
            </div>
        </div>
    </VueDraggable>
</template>

<script lang="ts">
import { ref } from 'vue';

// 全局共享的拖拽状态，所有 NestedStateList 实例共用
const isDraggingGlobal = ref(false);

// 确保显式命名，这对递归组件至关重要
export default {
    name: 'NestedStateList'
}
</script>

<script setup lang="ts">
import { computed } from 'vue';
import { VueDraggable } from 'vue-draggable-plus';
import type { StateNode } from '../lib/types'; // 确保路径对
import { v4 as uuidv4 } from 'uuid';

// 暴露给模板使用
const globalDragging = isDraggingGlobal;

const onDragStart = () => {
    isDraggingGlobal.value = true;
};

const onDragEnd = () => {
    isDraggingGlobal.value = false;
};

const props = defineProps<{
    modelValue: StateNode[];
    selectedId: string | null;
}>();

const emits = defineEmits<{
    (e: 'update:modelValue', value: StateNode[]): void;
    (e: 'select', node: StateNode): void;
    (e: 'remove', id: string): void;
}>();

const list = computed({
    get: () => props.modelValue,
    set: (val) => emits('update:modelValue', val),
});

const toggleExpand = (node: StateNode) => {
    node.isExpanded = !node.isExpanded;
};

const selectNode = (node: StateNode) => {
    emits('select', node);
};

const emitSelect = (node: StateNode) => {
    emits('select', node);
};

const addChild = (parent: StateNode) => {
    const newChild: StateNode = {
        id: uuidv4(),
        name: 'New State',
        isExpanded: true,
        children: [],
    };
    parent.children.push(newChild);
    // 强制更新父节点展开状态，确保能看到新子节点
    parent.isExpanded = true;
};

const removeNode = (id: string) => {
    emits('remove', id);
};

const emitRemove = (id: string) => {
    emits('remove', id);
};
</script>

<style scoped>
.state-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-bottom: 0;
  
  /* 默认最小高度设为 0，保持紧凑 */
  min-height: 0; 
  transition: min-height 0.2s, padding-bottom 0.2s;
}

/* 当处于拖拽模式时，增加最小高度和底部内边距，方便放入 */
.state-list.dragging-mode {
    min-height: 10px;
    padding-bottom: 10px;
    /* 可选：增加一个轻微的背景色或边框提示 drop area */
    /* background-color: rgba(255, 255, 255, 0.02); */
}

.state-node-wrapper {
    /* 去掉 margin-top，改用父级的 gap 控制 */
    margin-top: 0;
}

/* 其他样式保持不变 */
.state-node-header {
    display: flex;
    align-items: center;
    background-color: #2f2f2f;
    color: #e0e0e0;
    padding: 4px 8px;
    border-radius: 3px;
    cursor: pointer;
    border: 1px solid transparent;
    user-select: none;
    font-family: 'Segoe UI', sans-serif;
    font-size: 13px;
}

.state-node-header:hover {
    background-color: #3a3a3a;
}

.state-node-header.is-selected {
    background-color: #007fd4;
    border-color: #55aaff;
}

.node-controls {
    width: 20px;
    display: flex;
    justify-content: center;
}

.drag-handle {
    cursor: grab;
    margin-right: 8px;
    color: #888;
    font-size: 12px;
}

.node-info {
    flex: 1;
}

.state-children {
  padding-left: 16px;
  border-left: 1px solid #444;
  margin-left: 9px;
  
  /* [关键修改] 移除 margin-top，消除父子之间的垂直空隙 */
  margin-top: 0; 
}

/* [新增] 配合上面 template 的修改，给空节点的箭头设为半透明 */
.toggle-icon.is-empty {
  opacity: 0.3;
  /* 如果你不希望空节点能被折叠/展开，可以在这里加 pointer-events: none; */
  /* 但建议保留交互，方便用户手动关闭空文件夹 */
}

.node-actions {
    display: flex;
    gap: 4px;
}

.node-actions button {
    background: #444;
    color: #fff;
    border: none;
    cursor: pointer;
}

/* 拖拽时的占位样式 */
.ghost {
    opacity: 0.5;
    background: #007fd4;
    border: 1px dashed yellow;
}
</style>