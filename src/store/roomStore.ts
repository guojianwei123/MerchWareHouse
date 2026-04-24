import { create } from 'zustand';

export interface SpatialNode {
  id: string;
  x: number;
  y: number;
  z?: number;
  width: number;
  height: number;
  depth?: number;
}

interface RoomState {
  roomId: string | null;
  nodes: SpatialNode[];
  addNode: (node: SpatialNode) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;
  removeNode: (id: string) => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  roomId: null,
  nodes: [],
  addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),
  updateNodePosition: (id, x, y) =>
    set((state) => ({
      nodes: state.nodes.map((node) =>
        node.id === id ? { ...node, x, y } : node
      ),
    })),
  removeNode: (id) =>
    set((state) => ({ nodes: state.nodes.filter((node) => node.id !== id) })),
}));
