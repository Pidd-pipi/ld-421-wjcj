import { strict as assert } from "node:assert";
import { dashboardService } from "../src/services/dashboard.service.ts";
import { equipmentRoutes } from "../src/routes/equipment.routes.ts";
import { borrowRoutes } from "../src/routes/borrow.routes.ts";
import { reservationRoutes } from "../src/routes/reservation.routes.ts";
import { maintenanceRoutes } from "../src/routes/maintenance.routes.ts";
import { categoryRoutes } from "../src/routes/category.routes.ts";
import { auditLogs } from "../src/database/seeds/seed.ts";

const manager = { id: "u-manager", name: "实验室经理 林", role: "LabManager" };
const query = new URLSearchParams();

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

// 报废交接：存在未归还借用时应拒绝并返回编号
const targetId = equipment[0].id; // eq-hplc-01，存在 Approved 借用 br-001 与 Pending 预约 rs-002
let blocked;
try {
  equipmentRoutes("PATCH", `/api/equipment/${targetId}/retire`, query, manager, {});
} catch (error) {
  blocked = error;
}
assert.equal(blocked.code, "RETIRE_BLOCKED");
assert.equal(blocked.details.borrowIds.includes("br-001"), true);

// 设备详情应携带需优先处理的记录
const detail = equipmentRoutes("GET", `/api/equipment/${targetId}`, query, manager, {});
assert.equal(detail.retireBlockers.unreturnedBorrows.some((record) => record.id === "br-001"), true);

// 结清借用后报废成功，待审批预约被驳回
borrowRoutes("PATCH", "/api/borrow/br-001/return", query, manager, { condition: "Good" });
const retired = equipmentRoutes("PATCH", `/api/equipment/${targetId}/retire`, query, manager, {});
assert.equal(retired.equipment.status, "Retired");
assert.equal(retired.rejectedReservationIds.includes("rs-002"), true);

// 报废后不能再借用或预约
let retiredBorrow;
try {
  borrowRoutes("POST", "/api/borrow", query, manager, { equipmentId: targetId, purpose: "should fail" });
} catch (error) {
  retiredBorrow = error;
}
assert.equal(retiredBorrow.code, "EQUIPMENT_RETIRED");

let retiredReservation;
try {
  reservationRoutes("POST", "/api/reservations", query, manager, {
    equipmentId: targetId,
    startsAt: "2026-06-20T09:00:00+08:00",
    endsAt: "2026-06-20T11:00:00+08:00"
  });
} catch (error) {
  retiredReservation = error;
}
assert.equal(retiredReservation.code, "EQUIPMENT_RETIRED");

// 未来已批准预约同样阻止报废
const futureReservation = reservationRoutes("POST", "/api/reservations", query, manager, {
  equipmentId: "eq-micro-02",
  startsAt: "2099-01-01T09:00:00+08:00",
  endsAt: "2099-01-01T11:00:00+08:00"
});
reservationRoutes("PATCH", `/api/reservations/${futureReservation.id}/approve`, query, manager, { approved: true });
let blockedByReservation;
try {
  equipmentRoutes("PATCH", "/api/equipment/eq-micro-02/retire", query, manager, {});
} catch (error) {
  blockedByReservation = error;
}
assert.equal(blockedByReservation.code, "RETIRE_BLOCKED");
assert.equal(blockedByReservation.details.reservationIds.includes(futureReservation.id), true);

console.log("ld-421 backend route smoke passed");
