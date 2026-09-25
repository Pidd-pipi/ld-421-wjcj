import { create } from "zustand";
import { equipmentApi } from "../api/equipment";
import type { Equipment, EquipmentDetail, RetireResult } from "../types/equipment";

type State = {
  items: Equipment[];
  current: EquipmentDetail | null;
  load: (search?: string) => Promise<void>;
  loadDetail: (id: string) => Promise<void>;
  retire: (id: string, reason: string) => Promise<RetireResult>;
};

export const useEquipmentStore = create<State>((set) => ({
  items: [],
  current: null,
  load: async (search = "") => set({ items: await equipmentApi.list(search) }),
  loadDetail: async (id: string) => set({ current: await equipmentApi.detail(id) }),
  retire: async (id: string, reason: string) => {
    const result = await equipmentApi.retire(id, reason);
    set((state) => ({ items: state.items.map((item) => (item.id === id ? result.equipment : item)) }));
    return result;
  }
}));
