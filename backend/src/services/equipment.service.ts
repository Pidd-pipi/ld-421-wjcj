import { equipment, categories, borrowRecords, maintenanceRecords, reservations } from "../database/seeds/seed.ts";
import { AssetStatus, BorrowStatus } from "../types/enums.ts";
import type { Equipment, EquipmentDetail, RetireBlockers, RetireResult } from "../types/interfaces.ts";
import { ApiError } from "../utils/response.ts";

function findEquipment(id: string) {
  const item = equipment.find((entry) => entry.id === id);
  if (!item) throw new ApiError(404, "EQUIPMENT_NOT_FOUND", "设备不存在");
  return item;
}

export const equipmentService = {
  list(search = "", categoryId = "") {
    const keyword = search.toLowerCase();
    return equipment.filter((item) => {
      const matchesSearch = !keyword || [item.name, item.equipmentNo, item.brandModel, item.location].some((value) => value.toLowerCase().includes(keyword));
      const matchesCategory = !categoryId || item.categoryId === categoryId;
      return matchesSearch && matchesCategory;
    });
  },
  /** 报废交接前必须办结的记录：未归还借用（已批准/逾期）+ 未来已批准预约 */
  retireBlockers(id: string): RetireBlockers {
    const now = Date.now();
    return {
      activeBorrows: borrowRecords.filter((record) => record.equipmentId === id && (record.status === BorrowStatus.Approved || record.status === BorrowStatus.Overdue)),
      futureReservations: reservations.filter((record) => record.equipmentId === id && record.status === "Approved" && new Date(record.endsAt).getTime() >= now)
    };
  },
  detail(id: string): EquipmentDetail {
    const item = findEquipment(id);
    return {
      ...item,
      category: categories.find((category) => category.id === item.categoryId),
      borrowHistory: borrowRecords.filter((record) => record.equipmentId === id),
      maintenanceHistory: maintenanceRecords.filter((record) => record.equipmentId === id),
      reservationCalendar: reservations.filter((record) => record.equipmentId === id),
      retireBlockers: this.retireBlockers(id)
    };
  },
  create(input: Partial<Equipment>) {
    const item: Equipment = {
      id: `eq-${Date.now()}`,
      name: input.name ?? "新设备",
      equipmentNo: input.equipmentNo ?? `LAB-${Date.now()}`,
      categoryId: input.categoryId ?? categories[0].id,
      brandModel: input.brandModel ?? "待补充",
      serialNumber: input.serialNumber ?? "待登记",
      purchaseDate: input.purchaseDate ?? new Date().toISOString().slice(0, 10),
      purchasePrice: Number(input.purchasePrice ?? 0),
      location: input.location ?? "未分配",
      status: input.status ?? AssetStatus.Available,
      ownerId: input.ownerId ?? "u-manager",
      supplier: input.supplier ?? "待补充",
      warrantyExpiresAt: input.warrantyExpiresAt ?? "2027-12-31",
      imageUrl: input.imageUrl ?? ""
    };
    equipment.unshift(item);
    return item;
  },
  /**
   * 报废交接：存在未归还借用或未来已批准预约时拒绝并返回记录编号；
   * 无冲突才标记已报废，同时驳回待审批的借用和预约。
   */
  retire(id: string, reason = ""): RetireResult {
    const item = findEquipment(id);
    if (item.status === AssetStatus.Retired) throw new ApiError(409, "EQUIPMENT_ALREADY_RETIRED", "设备已报废，请勿重复提交");
    const blockers = this.retireBlockers(id);
    if (blockers.activeBorrows.length > 0 || blockers.futureReservations.length > 0) {
      throw new ApiError(409, "EQUIPMENT_RETIRE_BLOCKED", "设备存在未归还借用或未来已批准预约，请先办结对应记录后再报废", {
        activeBorrows: blockers.activeBorrows.map((record) => record.id),
        futureReservations: blockers.futureReservations.map((record) => record.id)
      });
    }
    item.status = AssetStatus.Retired;
    item.retiredAt = new Date().toISOString();
    item.retireReason = reason || "到达使用年限，按规定报废";
    const rejectedBorrows = borrowRecords.filter((record) => record.equipmentId === id && record.status === BorrowStatus.Pending);
    for (const record of rejectedBorrows) record.status = BorrowStatus.Rejected;
    const rejectedReservations = reservations.filter((record) => record.equipmentId === id && record.status === "Pending");
    for (const record of rejectedReservations) record.status = "Rejected";
    return { equipment: item, rejectedBorrows, rejectedReservations };
  },
  transferOwner(id: string, ownerId: string) {
    const item = findEquipment(id);
    item.ownerId = ownerId;
    return item;
  }
};
