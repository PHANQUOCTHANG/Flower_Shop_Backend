import { Router } from "express";
import { ActivityLogController } from "./activity-log.controller";
import { activityLogService } from "@/config/container";
import { requireRole } from "@/middleware/auth.middleware";

const router = Router();
const controller = new ActivityLogController(activityLogService);

// Chỉ ADMIN và STAFF mới có quyền xem activity log
router.use(requireRole("ADMIN", "STAFF"));

router.get("/", controller.getAll);
router.get("/unread-count", controller.getUnreadCount);
router.patch("/read-all", controller.markAllAsRead);
router.patch("/:id/read", controller.markAsRead);

export default router;
