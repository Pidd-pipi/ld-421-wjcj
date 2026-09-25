import type { User } from "../types/interfaces.ts";
import { equipmentService } from "../services/equipment.service.ts";
import { auditLogMiddleware } from "../middlewares/auditLog.middleware.ts";
import { rbacMiddleware } from "../middlewares/rbac.middleware.ts";

export const equipmentController = {
  list(query: URLSearchParams) {
    return equipmentService.list(query.get("search") ?? "", query.get("categoryId") ?? "");
  },
  detail(id: string) {
    return equipmentService.detail(id);
  },
  create(user: User, body: Record<string, unknown>) {
    rbacMiddleware(user, ["Admin", "LabManager"]);
    const item = equipmentService.create(body);
    auditLogMiddleware(user, "CREATE_EQUIPMENT", "Equipment", item.id);
    return item;
  },
  retire(user: User, id: string, body: Record<string, unknown>) {
    rbacMiddleware(user, ["Admin", "LabManager"]);
    const result = equipmentService.retire(id, String(body.reason ?? ""));
    auditLogMiddleware(user, "RETIRE_EQUIPMENT", "Equipment", id);
    return result;
  }
};
