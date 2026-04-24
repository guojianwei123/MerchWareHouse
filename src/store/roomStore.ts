import { create } from 'zustand';
import type { Showcase, SpatialNode } from '../types/models/spatial.schema';

interface RoomState {
  roomId: string | null;
  title: string;
  ownerId: string;
  isPublic: boolean;
  nodes: SpatialNode[];
  loadShowcase: (showcase: Showcase) => void;
  saveShowcase: () => Showcase;
  resetRoom: () => void;
  setTitle: (title: string) => void;
  setIsPublic: (isPublic: boolean) => void;
  setNodes: (nodes: SpatialNode[]) => void;
  addNode: (node: SpatialNode) => void;
  updateNode: (id: string, patch: Partial<SpatialNode>) => void;
  updateNodePosition: (id: string, x: number, y: number) => void;
  removeNode: (id: string) => void;
}

const createShowcaseId = (): string => `showcase_${Date.now()}`;

export const useRoomStore = create<RoomState>((set, get) => ({
  roomId: null,
  title: '默认展示柜',
  ownerId: 'local-user',
  isPublic: false,
  nodes: [],
  loadShowcase: (showcase) =>
    set({
      roomId: showcase.id,
      title: showcase.title,
      ownerId: showcase.ownerId,
      isPublic: showcase.isPublic,
      nodes: showcase.nodes,
    }),
  saveShowcase: () => {
    const state = get();
    const id = state.roomId ?? createShowcaseId();
    const showcase: Showcase = {
      id,
      title: state.title,
      ownerId: state.ownerId,
      isPublic: state.isPublic,
      nodes: state.nodes,
    };

    set({ roomId: id });
    return showcase;
  },
  resetRoom: () =>
    set({
      roomId: null,
      title: '默认展示柜',
      ownerId: 'local-user',
      isPublic: false,
      nodes: [],
    }),
  setTitle: (title) => set({ title }),
  setIsPublic: (isPublic) => set({ isPublic }),
  setNodes: (nodes) => set({ nodes }),
  addNode: (node) => set((state) => ({ nodes: [...state.nodes, node] })),
  updateNode: (id, patch) =>
    set((state) => ({
      nodes: state.nodes.map((node) => (node.id === id ? { ...node, ...patch, id } : node)),
    })),
  updateNodePosition: (id, x, y) =>
    set((state) => ({
      nodes: state.nodes.map((node) => (node.id === id ? { ...node, x, y } : node)),
    })),
  removeNode: (id) =>
    set((state) => ({ nodes: state.nodes.filter((node) => node.id !== id) })),
}));

export type { SpatialNode };
