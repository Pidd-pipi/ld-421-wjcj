import { API_PATHS } from "../constants/apiPaths";
import { request } from "../utils/request";
import type { Equipment, EquipmentDetail, RetireResult } from "../types/equipment";

export const equipmentApi = {
  list: (search = "") => request<Equipment[]>(`${API_PATHS.equipment}?search=${encodeURIComponent(search)}`),
  create: (payload: Partial<Equipment>) => request<Equipment>(API_PATHS.equipment, { method: "POST", body: JSON.stringify(payload) }),
  detail: (id: string) => request<EquipmentDetail>(`${API_PATHS.equipment}/${id}`),
  retire: (id: string, reason: string) =>
    request<RetireResult>(`${API_PATHS.equipment}/${id}/retire`, { method: "POST", body: JSON.stringify({ reason }) })
};
