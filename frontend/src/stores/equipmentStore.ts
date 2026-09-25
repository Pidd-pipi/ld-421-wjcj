import { create } from "zustand";
import { equipmentApi } from "../api/equipment";
import { ApiRequestError } from "../utils/request";
import type { Equipment, EquipmentDetail, RetireResult } from "../types/equipment";

export type RetireFailure = {
  reason: string;
  borrowIds: string[];
  reservationIds: string[];
};

type State = {
  items: Equipment[];
  current: EquipmentDetail | null;
  retireFailure: RetireFailure | null;
  load: (search?: string) => Promise<void>;
  loadDetail: (id: string) => Promise<void>;
  retire: (id: string) => Promise<RetireResult | null>;
  clearRetireFailure: () => void;
};

export const useEquipmentStore = create<State>((set) => ({
  items: [],
  current: null,
  retireFailure: null,
  load: async (search = "") => set({ items: await equipmentApi.list(search) }),
  loadDetail: async (id: string) => set({ current: await equipmentApi.detail(id), retireFailure: null }),
  retire: async (id: string) => {
    try {
      const result = await equipmentApi.retire(id);
      set({ retireFailure: null, current: await equipmentApi.detail(id) });
      return result;
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === "RETIRE_BLOCKED") {
        const details = (error.details ?? {}) as { borrowIds?: string[]; reservationIds?: string[] };
        set({
          retireFailure: {
            reason: error.message,
            borrowIds: details.borrowIds ?? [],
            reservationIds: details.reservationIds ?? []
          }
        });
        return null;
      }
      throw error;
    }
  },
  clearRetireFailure: () => set({ retireFailure: null })
}));
