<template>
  <div class="flex flex-col h-full bg-[#1a1a1a] text-gray-200 font-sans text-sm select-none overflow-hidden">
    <!-- Toolbar -->
    <div class="h-10 bg-[#242424] border-b border-[#111] flex items-center px-4 gap-2 shrink-0">
      <div class="flex items-center gap-2 text-gray-400">
        <GitBranchIcon class="w-4 h-4" />
        <span class="font-bold">StateTree Editor</span>
      </div>
      <div class="h-4 w-[1px] bg-gray-600 mx-2"></div>
      <button 
        class="flex items-center gap-1 px-3 py-1 bg-[#007fd4] hover:bg-[#0063a5] text-white rounded-sm text-xs transition-colors" 
        @click="addRootState"
      >
        <PlusIcon class="w-3.5 h-3.5" />
        <span>Add State</span>
      </button>
      <button 
        class="flex items-center gap-1 px-3 py-1 bg-[#333] hover:bg-[#444] text-gray-200 rounded-sm text-xs transition-colors border border-[#444]" 
        @click="logData"
      >
        <FileJsonIcon class="w-3.5 h-3.5" />
        <span>Log JSON</span>
      </button>
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Left Panel: Assets/Settings -->
      <div class="w-80 bg-[#1e1e1e] border-r border-[#111] flex flex-col shrink-0">
        <div class="h-8 px-2 border-b border-[#111] flex items-center justify-between bg-[#242424]">
          <span class="font-bold text-xs text-gray-300">Asset Details</span>
          <div class="flex gap-1">
             <SettingsIcon class="w-3 h-3 text-gray-500 hover:text-white cursor-pointer" />
          </div>
        </div>
        
        <!-- Search -->
        <div class="p-2 border-b border-[#111] bg-[#1e1e1e]">
           <div class="relative">
             <SearchIcon class="absolute left-2 top-1.5 w-3.5 h-3.5 text-gray-500" />
             <input type="text" placeholder="Search Details" class="w-full bg-[#111] border border-[#333] rounded-sm px-2 py-1 pl-8 text-xs focus:border-[#007fd4] outline-none transition-colors placeholder-gray-600 text-gray-300" />
             
           </div>
        </div>

        <!-- Properties List (Mock) -->
        <div class="flex-1 overflow-y-auto p-0 custom-scrollbar">

            <!-- Section: Evaluators -->
           <div class="border-b border-[#111]">
              <div class="flex items-center justify-between px-2 py-1 bg-[#2a2a2a] hover:bg-[#333] cursor-pointer select-none group" @click="toggleSection('evaluators')">
                 <div class="flex items-center gap-1">
                    <ChevronRightIcon class="w-3 h-3 text-gray-400" v-if="!sections.evaluators" />
                    <ChevronDownIcon class="w-3 h-3 text-gray-400" v-else />
                    <span class="font-bold text-xs text-gray-300">Evaluators</span>
                 </div>
                 <PlusCircleIcon class="w-3 h-3 text-gray-500 hover:text-green-400 opacity-0 group-hover:opacity-100" />
              </div>
           </div>

           <!-- Section: Global Tasks -->
           <div class="border-b border-[#111]">
              <div class="flex items-center justify-between px-2 py-1 bg-[#2a2a2a] hover:bg-[#333] cursor-pointer select-none group" @click="toggleSection('globalTasks')">
                 <div class="flex items-center gap-1">
                    <ChevronDownIcon class="w-3 h-3 text-gray-400" v-if="sections.globalTasks" />
                    <ChevronRightIcon class="w-3 h-3 text-gray-400" v-else />
                    <span class="font-bold text-xs text-gray-300">Global Tasks</span>
                 </div>
                 <div class="flex gap-1 opacity-0 group-hover:opacity-100 items-center">
                    <span class="text-[10px] bg-[#333] px-1 rounded text-gray-400 border border-[#444]">Any</span>
                    <PlusCircleIcon class="w-3 h-3 text-gray-500 hover:text-green-400" />
                 </div>
              </div>
               <div class="bg-[#1e1e1e] py-1" v-if="sections.globalTasks">
                    <div class="text-center text-[10px] text-gray-500 py-2 italic">No Global Tasks</div>
               </div>
           </div>
        </div>
      </div>

      <!-- Middle Panel: State Tree -->
      <div class="flex-1 bg-[#111] relative flex flex-col min-w-0 border-r border-[#111]">
         <!-- Tab Header -->
         <div class="h-8 bg-[#1e1e1e] flex items-center border-b border-[#111] px-1 gap-1">
            <div class="px-3 py-1 bg-[#2d2d2d] text-white text-xs border-t-2 border-t-[#007fd4] rounded-t-sm flex items-center gap-2">
               <span>State</span>
               <XIcon class="w-3 h-3 text-gray-500 hover:text-white cursor-pointer" />
            </div>
            <div class="px-2 py-1 text-gray-500 hover:bg-[#2a2a2a] rounded-sm cursor-pointer">
                <PlusIcon class="w-3 h-3" />
            </div>
         </div>
         
         <!-- Tree Canvas -->
         <div class="flex-1 overflow-auto p-6 custom-scrollbar bg-[#111] shadow-inner">
            <NestedStateList 
              v-model="treeData" 
              :selected-id="selectedNode?.id || null"
              :is-root-list="true"
              @select="handleSelect"
              @remove="handleRemove"
            />
         </div>
      </div>

      <!-- Right Panel: Details -->
      <div class="w-80 bg-[#1e1e1e] flex flex-col shrink-0 border-l border-[#111]" v-if="selectedNode">
         <div class="h-8 px-2 border-b border-[#111] flex items-center justify-between bg-[#242424]">
          <span class="font-bold text-xs text-gray-300">Details</span>
          <div class="flex gap-1">
             <SettingsIcon class="w-3 h-3 text-gray-500 hover:text-white cursor-pointer" />
             <XIcon class="w-3 h-3 text-gray-500 hover:text-white cursor-pointer" />
          </div>
        </div>
        
        <div class="flex-1 overflow-y-auto p-0 custom-scrollbar">
           <!-- Header Info -->
           <div class="p-3 border-b border-[#333] bg-[#2a2a2a]">
              <div class="flex items-start gap-3">
                 <div class="w-10 h-10 bg-gradient-to-br from-cyan-800 to-cyan-600 rounded flex items-center justify-center border border-cyan-500 shadow-lg">
                    <GitBranchIcon class="w-6 h-6 text-white" />
                 </div>
                 <div>
                    <div class="text-sm font-bold text-white tracking-wide">{{ selectedNode.name }}</div>
                    <div class="text-[10px] text-cyan-400 uppercase font-bold tracking-wider mt-0.5">State Node</div>
                 </div>
              </div>
           </div>

           <!-- Properties -->
           <div class="p-0">
               <div class="group">
                  <div class="flex items-center gap-1 px-2 py-1.5 bg-[#2a2a2a] border-b border-[#333] cursor-pointer">
                     <ChevronDownIcon class="w-3 h-3 text-gray-400" />
                     <span class="text-xs font-bold text-gray-300">Settings</span>
                  </div>
                  
                  <div class="p-3 space-y-4 bg-[#1e1e1e]">
                      <!-- Name Field -->
                      <div class="space-y-1.5">
                        <label class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">State Name</label>
                        <div class="relative">
                             <input v-model="selectedNode.name" class="w-full bg-[#111] border border-[#333] rounded-sm px-2 py-1.5 text-xs focus:border-[#007fd4] outline-none text-white transition-colors" />
                             <div class="absolute right-2 top-1.5 w-2 h-2 rounded-full bg-green-500" title="Valid"></div>
                        </div>
                      </div>

                      <!-- Linked State -->
                      <div class="space-y-1.5">
                        <label class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Linked State</label>
                        <div class="bg-[#111] border border-[#333] rounded-sm px-2 py-1.5 text-xs flex items-center justify-between cursor-pointer hover:border-gray-500 transition-colors group/input">
                           <span class="text-gray-500 italic">None</span>
                           <div class="flex gap-1">
                                <CornerUpLeftIcon class="w-3 h-3 text-gray-600 hover:text-white opacity-0 group-hover/input:opacity-100" />
                                <ChevronDownIcon class="w-3 h-3 text-gray-500" />
                           </div>
                        </div>
                      </div>

                      <!-- Transitions -->
                      <div class="space-y-1.5">
                         <div class="flex items-center justify-between">
                             <label class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Transitions</label>
                             <button class="text-[10px] text-[#007fd4] hover:underline">+ Add</button>
                         </div>
                         
                         <div class="border border-[#333] rounded-sm bg-[#111] overflow-hidden">
                            <div class="p-2 text-center">
                                <span class="text-[10px] text-gray-600 italic">No transitions defined</span>
                            </div>
                         </div>
                      </div>
                      
                      <!-- Tasks -->
                      <div class="space-y-1.5">
                         <div class="flex items-center justify-between">
                             <label class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Tasks</label>
                             <button class="text-[10px] text-[#007fd4] hover:underline">+ Add</button>
                         </div>
                         
                         <div class="border border-[#333] rounded-sm bg-[#111] overflow-hidden">
                            <div class="p-2 text-center">
                                <span class="text-[10px] text-gray-600 italic">No tasks</span>
                            </div>
                         </div>
                      </div>
                  </div>
               </div>
           </div>
        </div>
      </div>
      <div v-else class="w-80 bg-[#1e1e1e] flex flex-col shrink-0 border-l border-[#111] items-center justify-center text-gray-600">
          <GitBranchIcon class="w-12 h-12 mb-2 opacity-20" />
          <span class="text-xs">Select a state to view details</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue';
import { 
  GitBranchIcon, 
  PlusIcon, 
  FileJsonIcon, 
  SettingsIcon, 
  XIcon, 
  SearchIcon, 
  ChevronDownIcon, 
  ChevronRightIcon,
  BoxIcon,
  CornerUpLeftIcon,
  PlusCircleIcon,
  Trash2Icon,
  UserIcon,
  FilterIcon,
  Settings2Icon,
  GlobeIcon
} from 'lucide-vue-next';
import NestedStateList from './NestedStateList.vue';
import type { StateNode } from '../lib/types';
import { v4 as uuidv4 } from 'uuid';

const treeData = ref<StateNode[]>([
  {
    id: 'root',
    name: 'Root',
    isExpanded: true,
    children: [
      {
        id: '1',
        name: 'Idle',
        isExpanded: true,
        children: []
      },
      {
        id: '2',
        name: 'Dead',
        isExpanded: true,
        children: [
            {
                id: '3',
                name: 'None',
                isExpanded: true,
                children: []
            }
        ]
      }
    ]
  }
]);

const selectedNode = ref<StateNode | null>(null);

const sections = reactive({
    general: true,
    context: true,
    parameters: false,
    evaluators: false,
    globalTasks: true
});

const toggleSection = (section: keyof typeof sections) => {
    sections[section] = !sections[section];
};

const addRootState = () => {
  treeData.value.push({
    id: uuidv4(),
    name: 'New State',
    isExpanded: true,
    children: []
  });
};

const handleSelect = (node: StateNode) => {
  selectedNode.value = node;
};

const handleRemove = (id: string) => {
  const removeRecursive = (nodes: StateNode[]): boolean => {
    const index = nodes.findIndex(n => n.id === id);
    if (index !== -1) {
      nodes.splice(index, 1);
      return true;
    }
    for (const node of nodes) {
      if (node.children && removeRecursive(node.children)) {
        return true;
      }
    }
    return false;
  };

  removeRecursive(treeData.value);
  if (selectedNode.value?.id === id) {
    selectedNode.value = null;
  }
};

const logData = () => {
  console.log(JSON.stringify(treeData.value, null, 2));
};
</script>

<style scoped>
/* Custom scrollbar for Webkit */
.custom-scrollbar::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: #1a1a1a;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #333;
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #444;
}
</style>