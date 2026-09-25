import { borrowRecords, equipment } from "../database/seeds/seed.ts";
import { AssetStatus, BorrowStatus, ReturnCondition, type ReturnConditionValue } from "../types/enums.ts";
import type { BorrowRecord } from "../types/interfaces.ts";
import { ApiError } from "../utils/response.ts";

export const borrowService = {
  list(status = "") {
    return status ? borrowRecords.filter((record) => record.status === status) : borrowRecords;
  },
  create(input: Partial<BorrowRecord>) {
    if (!input.equipmentId) throw new ApiError(400, "EQUIPMENT_REQUIRED", "必须选择设备");
    const item = equipment.find((entry) => entry.id === input.equipmentId);
    if (!item) throw new ApiError(404, "EQUIPMENT_NOT_FOUND", "设备不存在");
    if (item.status === AssetStatus.Retired) throw new ApiError(409, "EQUIPMENT_RETIRED", "设备已报废，不能再借用");
    if (item.status === AssetStatus.Lost) throw new ApiError(409, "EQUIPMENT_LOST", "设备已遗失，不能借用");
    const record: BorrowRecord = {
      id: `br-${Date.now()}`,
      equipmentId: input.equipmentId,
      borrowerId: input.borrowerId ?? "u-student",
      borrowedAt: input.borrowedAt ?? new Date().toISOString().slice(0, 10),
      expectedReturnAt: input.expectedReturnAt ?? new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
      purpose: input.purpose ?? "临时实验任务",
      status: BorrowStatus.Pending
    };
    borrowRecords.unshift(record);
    return record;
  },
  approve(id: string, approverId: string, approved = true) {
    const record = borrowRecords.find((item) => item.id === id);
    if (!record) throw new ApiError(404, "BORROW_NOT_FOUND", "借用记录不存在");
    record.status = approved ? BorrowStatus.Approved : BorrowStatus.Rejected;
    record.approverId = approverId;
    const item = equipment.find((entry) => entry.id === record.equipmentId);
    if (approved && item) item.status = AssetStatus.InUse;
    return record;
  },
  confirmReturn(id: string, condition: ReturnConditionValue = ReturnCondition.Good) {
    const record = borrowRecords.find((item) => item.id === id);
    if (!record) throw new ApiError(404, "BORROW_NOT_FOUND", "借用记录不存在");
    record.status = BorrowStatus.Returned;
    record.actualReturnAt = new Date().toISOString().slice(0, 10);
    record.returnCondition = condition;
    const item = equipment.find((entry) => entry.id === record.equipmentId);
    if (item) item.status = condition === ReturnCondition.Lost ? AssetStatus.Lost : AssetStatus.Available;
    return record;
  }
};
