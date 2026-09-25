import { equipment, categories, borrowRecords, maintenanceRecords, reservations } from "../database/seeds/seed.ts";
import { AssetStatus, BorrowStatus } from "../types/enums.ts";
import type { Equipment } from "../types/interfaces.ts";
import { ApiError } from "../utils/response.ts";

export const equipmentService = {
  list(search = "", categoryId = "") {
    const keyword = search.toLowerCase();
    return equipment.filter((item) => {
      const matchesSearch = !keyword || [item.name, item.equipmentNo, item.brandModel, item.location].some((value) => value.toLowerCase().includes(keyword));
      const matchesCategory = !categoryId || item.categoryId === categoryId;
      return matchesSearch && matchesCategory;
    });
  },
  findById(id: string) {
    return equipment.find((entry) => entry.id === id);
  },
  retireBlockers(id: string) {
    const now = new Date().toISOString();
    const unreturnedBorrows = borrowRecords.filter(
      (record) => record.equipmentId === id && (record.status === BorrowStatus.Approved || record.status === BorrowStatus.Overdue)
    );
    const upcomingReservations = reservations.filter(
      (record) => record.equipmentId === id && record.status === "Approved" && record.endsAt >= now
    );
    return { unreturnedBorrows, upcomingReservations };
  },
  detail(id: string) {
    const item = equipment.find((entry) => entry.id === id);
    if (!item) throw new ApiError(404, "EQUIPMENT_NOT_FOUND", "设备不存在");
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
  retire(id: string) {
    const item = equipment.find((entry) => entry.id === id);
    if (!item) throw new ApiError(404, "EQUIPMENT_NOT_FOUND", "设备不存在");
    if (item.status === AssetStatus.Retired) throw new ApiError(409, "ALREADY_RETIRED", "设备已报废，请勿重复操作");
    const { unreturnedBorrows, upcomingReservations } = this.retireBlockers(id);
    if (unreturnedBorrows.length > 0 || upcomingReservations.length > 0) {
      const borrowIds = unreturnedBorrows.map((record) => record.id);
      const reservationIds = upcomingReservations.map((record) => record.id);
      const parts: string[] = [];
      if (borrowIds.length > 0) parts.push(`未归还借用（${borrowIds.join("、")}）`);
      if (reservationIds.length > 0) parts.push(`未来已批准预约（${reservationIds.join("、")}）`);
      throw new ApiError(409, "RETIRE_BLOCKED", `报废被拒绝：存在${parts.join("和")}，请先结清手续`, { borrowIds, reservationIds });
    }
    item.status = AssetStatus.Retired;
    const rejectedBorrowIds: string[] = [];
    for (const record of borrowRecords) {
      if (record.equipmentId === id && record.status === BorrowStatus.Pending) {
        record.status = BorrowStatus.Rejected;
        rejectedBorrowIds.push(record.id);
      }
    }
    const rejectedReservationIds: string[] = [];
    for (const record of reservations) {
      if (record.equipmentId === id && record.status === "Pending") {
        record.status = "Rejected";
        rejectedReservationIds.push(record.id);
      }
    }
    return { equipment: item, rejectedBorrowIds, rejectedReservationIds };
  },
  transferOwner(id: string, ownerId: string) {
    const item = equipment.find((entry) => entry.id === id);
    if (!item) throw new ApiError(404, "EQUIPMENT_NOT_FOUND", "设备不存在");
    item.ownerId = ownerId;
    return item;
  }
};
