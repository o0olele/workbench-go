// types.ts
export interface StateNode {
  id: string;
  name: string;
  description?: string;
  isExpanded: boolean; // 控制折叠/展开
  children: StateNode[];
  // 你可以在这里添加更多 UE5 风格的属性，比如 Tasks, Transitions 等
}