import { strict as assert } from "node:assert";
import { dashboardService } from "../src/services/dashboard.service.ts";
import { equipmentRoutes } from "../src/routes/equipment.routes.ts";
import { borrowRoutes } from "../src/routes/borrow.routes.ts";
import { reservationRoutes } from "../src/routes/reservation.routes.ts";
import { maintenanceRoutes } from "../src/routes/maintenance.routes.ts";
import { categoryRoutes } from "../src/routes/category.routes.ts";
import { auditLogs } from "../src/database/seeds/seed.ts";

const manager = { id: "u-manager", name: "实验室经理 林", role: "LabManager" };
const student = { id: "u-student", name: "学生 陈", role: "Student" };
const query = new URLSearchParams();

function capture(fn) {
  try {
    return { value: fn() };
  } catch (error) {
    return { error };
  }
}

const dashboard = dashboardService.summary();
assert.equal(dashboard.stats.totalEquipment >= 3, true);

const categories = categoryRoutes("GET", "/api/categories");
assert.equal(Array.isArray(categories), true);

const equipment = equipmentRoutes("GET", "/api/equipment", query, manager, {});
assert.equal(equipment.length >= 3, true);

const newEquipment = equipmentRoutes("POST", "/api/equipment", query, manager, {
  name: "烟雾测试设备",
  equipmentNo: "LAB-SMOKE-001",
  purchasePrice: 1000
});
assert.equal(newEquipment.name, "烟雾测试设备");

const borrow = borrowRoutes("POST", "/api/borrow", query, manager, {
  equipmentId: equipment[0].id,
  purpose: "smoke borrow"
});
assert.equal(borrow.status, "Pending");

const approvedBorrow = borrowRoutes("PATCH", `/api/borrow/${borrow.id}/approve`, query, manager, { approved: true });
assert.equal(approvedBorrow.status, "Approved");

const returnedBorrow = borrowRoutes("PATCH", `/api/borrow/${borrow.id}/return`, query, manager, { condition: "Good" });
assert.equal(returnedBorrow.status, "Returned");

const reservation = reservationRoutes("POST", "/api/reservations", query, manager, {
  equipmentId: equipment[0].id,
  startsAt: "2026-06-16T09:00:00+08:00",
  endsAt: "2026-06-16T11:00:00+08:00"
});
assert.equal(reservation.status, "Pending");

const maintenance = maintenanceRoutes("POST", "/api/maintenance", query, manager, {
  equipmentId: equipment[0].id,
  type: "Cleaning",
  content: "smoke maintenance"
});
assert.equal(maintenance.result, "Pass");
assert.equal(auditLogs.length >= 5, true);

// ===== 报废交接流程 =====
// 1. 已报废设备禁止再次借用、预约
const retiredBorrow = capture(() => borrowRoutes("POST", "/api/borrow", query, manager, { equipmentId: "eq-centrifuge-04" }));
assert.equal(retiredBorrow.error?.status, 409);
assert.equal(retiredBorrow.error?.code, "EQUIPMENT_RETIRED");
const retiredReservation = capture(() => reservationRoutes("POST", "/api/reservations", query, manager, {
  equipmentId: "eq-centrifuge-04",
  startsAt: "2026-10-20T09:00:00+08:00",
  endsAt: "2026-10-20T11:00:00+08:00"
}));
assert.equal(retiredReservation.error?.status, 409);
assert.equal(retiredReservation.error?.code, "EQUIPMENT_RETIRED");

// 2. 存在未归还借用时报废被拒绝，并返回借用编号（eq-hplc-01 有 br-001 已批准未归还）
const hplcDetail = equipmentRoutes("GET", "/api/equipment/eq-hplc-01", query, manager, {});
assert.equal(hplcDetail.retireBlockers.activeBorrows.some((record) => record.id === "br-001"), true);
const blockedByBorrow = capture(() => equipmentRoutes("POST", "/api/equipment/eq-hplc-01/retire", query, manager, { reason: "老化报废" }));
assert.equal(blockedByBorrow.error?.status, 409);
assert.equal(blockedByBorrow.error?.code, "EQUIPMENT_RETIRE_BLOCKED");
assert.equal(blockedByBorrow.error.details.activeBorrows.includes("br-001"), true);
assert.equal(equipment.find((item) => item.id === "eq-hplc-01").status !== "Retired", true);

// 3. 存在未来已批准预约时报废被拒绝，并返回预约编号（eq-micro-02 有 rs-001 未来已批准）
const blockedByReservation = capture(() => equipmentRoutes("POST", "/api/equipment/eq-micro-02/retire", query, manager, {}));
assert.equal(blockedByReservation.error?.status, 409);
assert.equal(blockedByReservation.error?.code, "EQUIPMENT_RETIRE_BLOCKED");
assert.equal(blockedByReservation.error.details.futureReservations.includes("rs-001"), true);
assert.equal(equipment.find((item) => item.id === "eq-micro-02").status, "Available");

// 4. 待审批借用/预约不拦截报废，但报废成功时自动驳回（eq-sterile-03 有 br-004 待审批、rs-003 待审批）
const retireResult = equipmentRoutes("POST", "/api/equipment/eq-sterile-03/retire", query, manager, { reason: "腔体变形无法校准" });
assert.equal(retireResult.equipment.status, "Retired");
assert.equal(retireResult.equipment.retireReason, "腔体变形无法校准");
assert.equal(retireResult.rejectedBorrows.map((record) => record.id).includes("br-004"), true);
assert.equal(retireResult.rejectedBorrows[0].status, "Rejected");
assert.equal(retireResult.rejectedReservations.map((record) => record.id).includes("rs-003"), true);
assert.equal(retireResult.rejectedReservations[0].status, "Rejected");

// 5. 报废后不能再借用或预约，也不能重复报废
const borrowAfterRetire = capture(() => borrowRoutes("POST", "/api/borrow", query, manager, { equipmentId: "eq-sterile-03" }));
assert.equal(borrowAfterRetire.error?.code, "EQUIPMENT_RETIRED");
const reserveAfterRetire = capture(() => reservationRoutes("POST", "/api/reservations", query, manager, {
  equipmentId: "eq-sterile-03",
  startsAt: "2026-10-22T09:00:00+08:00",
  endsAt: "2026-10-22T11:00:00+08:00"
}));
assert.equal(reserveAfterRetire.error?.code, "EQUIPMENT_RETIRED");
const retireTwice = capture(() => equipmentRoutes("POST", "/api/equipment/eq-sterile-03/retire", query, manager, {}));
assert.equal(retireTwice.error?.code, "EQUIPMENT_ALREADY_RETIRED");

// 6. RBAC：Student 无权发起报废
const forbidden = capture(() => equipmentRoutes("POST", "/api/equipment/eq-micro-02/retire", query, student, {}));
assert.equal(forbidden.error?.status, 403);

// 7. 报废操作记录审计日志
assert.equal(auditLogs.some((log) => log.action === "RETIRE_EQUIPMENT" && log.entityId === "eq-sterile-03"), true);

console.log("ld-421 backend route smoke passed");
