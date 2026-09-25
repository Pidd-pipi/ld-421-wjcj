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
};

export type EquipmentCategory = {
  id: string;
  name: string;
  parentId?: string;
  description: string;
  icon: string;
};

export type RetireBlockers = {
  unreturnedBorrows: BorrowRecord[];
  upcomingReservations: Reservation[];
};

export type EquipmentDetail = Equipment & {
  category?: EquipmentCategory;
  borrowHistory: BorrowRecord[];
  maintenanceHistory: MaintenanceRecord[];
  reservationCalendar: Reservation[];
  retireBlockers: RetireBlockers;
};

export type RetireResult = {
  equipment: Equipment;
  rejectedBorrowIds: string[];
  rejectedReservationIds: string[];
};
