import type { AssetStatus } from "./enums";
import type { BorrowRecord } from "./borrow";
import type { MaintenanceRecord } from "./maintenance";
import type { Reservation } from "./reservation";

export type Equipment = {
  id: string;
  name: string;
  equipmentNo: string;
  categoryId: string;
  brandModel: string;
  serialNumber: string;
  purchaseDate: string;
  purchasePrice: number;
  location: string;
  status: AssetStatus;
  ownerId: string;
  supplier: string;
  warrantyExpiresAt: string;
  imageUrl: string;
  retiredAt?: string;
  retireReason?: string;
};

export type EquipmentCategory = {
  id: string;
  name: string;
  parentId?: string;
  description: string;
  icon: string;
};

/** 报废交接前必须办结的冲突记录：未归还借用 + 未来已批准预约 */
export type RetireBlockers = {
  activeBorrows: BorrowRecord[];
  futureReservations: Reservation[];
};

export type EquipmentDetail = Equipment & {
  category?: EquipmentCategory;
  borrowHistory: BorrowRecord[];
  maintenanceHistory: MaintenanceRecord[];
  reservationCalendar: Reservation[];
  retireBlockers: RetireBlockers;
};

/** 报废成功后的交接结果：被驳回的待审批借用与预约 */
export type RetireResult = {
  equipment: Equipment;
  rejectedBorrows: BorrowRecord[];
  rejectedReservations: Reservation[];
};

/** 报废被拒绝时后端返回的冲突编号 */
export type RetireBlockerIds = {
  activeBorrows?: string[];
  futureReservations?: string[];
};
