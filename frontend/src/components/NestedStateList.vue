<template>
    <VueDraggable v-model="list" :group="{ name: 'state-tree', pull: true, put: true }" :animation="150"
        handle=".drag-handle" ghost-class="ghost" class="state-list relative min-h-[10px]" :class="{ 'dragging-mode': globalDragging }"
        :move="onMove"
        @start="onDragStart" @end="onDragEnd">
        
        <div v-for="(element, index) in list" :key="element.id" class="state-node-wrapper relative pl-6 py-1">
            <!-- 连接线: 水平线指向节点 -->
            <div class="absolute left-0 top-[18px] w-6 h-px bg-gray-600"></div>
            <!-- 连接线: 竖线连接兄弟节点 (如果不是最后一个) -->
            <div v-if="index !== list.length - 1" class="absolute left-0 top-[18px] bottom-0 w-px bg-gray-600"></div>
             <!-- 连接线: 竖线连接到这里 (如果是最后一个，只画上半部分) -->
            <div v-if="index === list.length - 1" class="absolute left-0 top-0 h-[18px] w-px bg-gray-600"></div>
            <!-- 连接线: 如果是中间节点，上半部分也需要 -->
            <div v-if="index !== list.length - 1" class="absolute left-0 top-0 h-[18px] w-px bg-gray-600"></div>


            <!-- 节点本身的内容 (Header) -->
            <div class="state-node-header group flex items-center bg-[#242424] border border-[#111] rounded-sm p-1 pr-2 cursor-pointer hover:bg-[#2a2a2a] transition-all relative overflow-hidden shadow-sm max-w-md"
                :class="{ 'ring-1 ring-[#007fd4] bg-[#2d2d2d]': selectedId === element.id }"
                @click.stop="selectNode(element)">
                
                <!-- Type Color Strip (Only if children exist) -->
                <div v-if="element.children && element.children.length > 0" class="absolute left-0 top-0 bottom-0 w-1 bg-cyan-600"></div>

                <div class="ml-2 flex items-center gap-2 w-full">
                     <!-- Toggle Icon -->
                    <span class="toggle-icon flex items-center justify-center w-4 h-4 transition-colors"
                        :class="[
                            element.children && element.children.length > 0 
                                ? 'text-gray-500 hover:text-white cursor-pointer' 
                                : 'text-gray-600 cursor-default'
                        ]"
                        @click.stop="element.children && element.children.length > 0 && toggleExpand(element)">
                        <ChevronDownIcon v-if="element.children && element.children.length > 0 && element.isExpanded" class="w-3 h-3" />
                        <ChevronRightIcon v-else-if="element.children && element.children.length > 0" class="w-3 h-3" />
                        <div v-else class="w-1 h-1 rounded-full bg-gray-600"></div>
                    </span>

                    <!-- Node Name Badge (Now Drag Handle) -->
                    <div class="flex items-center" :class="element.id === 'root' ? 'cursor-default' : 'drag-handle cursor-grab active:cursor-grabbing'">
                        <span class="text-xs font-bold text-cyan-400 bg-[#1a1a1a] px-2 py-0.5 rounded-sm border border-[#333] shadow-inner min-w-[60px] text-center select-none">{{ element.name }}</span>
                    </div>

                    <!-- Drag Handle Removed -->

                    <!-- Transitions Mock (Visual Decoration) -->
                    <div class="flex items-center text-[10px] text-gray-500 gap-1 ml-2 opacity-60">
                       <ArrowRightIcon class="w-3 h-3" />
                       <span class="text-gray-400">Root</span>
                       <span class="text-gray-600">?</span>
                       <ArrowRightIcon class="w-3 h-3" />
                       <span class="text-gray-400">End</span>
                    </div>

                    <div class="flex-1"></div>

                    <!-- Actions -->
                    <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button @click.stop="addChild(element)" class="p-1 hover:bg-[#444] rounded text-gray-400 hover:text-green-400 transition-colors" title="Add Child">
                           <PlusIcon class="w-3 h-3" />
                        </button>
                        <button @click.stop="removeNode(element.id)" class="p-1 hover:bg-[#444] rounded text-gray-400 hover:text-red-400 transition-colors" title="Remove">
                           <XIcon class="w-3 h-3" />
                        </button>
                    </div>
                </div>
            </div>

            <!-- 递归渲染子节点区域 -->
            <div v-if="element.children && element.isExpanded" class="state-children ml-0 pl-0 relative">
                <!-- Vertical line extension for children REMOVED -->
                
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
import { 
    ChevronDownIcon, 
    ChevronRightIcon, 
    PlusIcon, 
    XIcon,
    ArrowRightIcon 
} from 'lucide-vue-next';

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
    isRootList?: boolean;
}>();

const onMove = (evt: any) => {
    // Prevent moving the root node
    if (evt.draggedContext.element.id === 'root') return false;
    
    // If this is the root list, prevent any node from being dropped at index 0 (before Root)
    if (props.isRootList) {
        if (evt.draggedContext.futureIndex === 0) return false;
    }

    return true;
};

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
        name: 'State',
        isExpanded: true,
        children: [],
    };
    if (!parent.children) parent.children = [];
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
  /* min-height: 0;  Let Tailwind handle it */
  padding-bottom: 0;
  transition: min-height 0.2s, padding-bottom 0.2s;
}

.state-list.dragging-mode {
    min-height: 50px;
    padding-bottom: 50px;
}

/* Ghost styling for draggable */
.ghost {
    opacity: 0.5;
    background: #007fd4;
    border: 1px dashed yellow;
}
</style>