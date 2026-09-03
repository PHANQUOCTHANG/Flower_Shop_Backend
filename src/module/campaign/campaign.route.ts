import { Router } from "express";
import * as campaignController from "./campaign.controller";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import validationMiddleware from "@/middleware/validate.middleware";
import {
  CreateCampaignSchema,
  UpdateCampaignSchema,
  CampaignIdParamSchema,
  CampaignQuerySchema,
  UpdateCampaignStatusSchema,
} from "./campaign.request";

const router = Router();

// ─── Public Routes ──────────────────────────────────────────────────────────

// GET /campaigns/active — Lấy campaign đang chạy (phải đặt TRƯỚC /:id)
router.get("/active", campaignController.getActiveCampaign);

// GET /campaigns/active/items — Lấy sản phẩm trong campaign active
router.get("/active/items", campaignController.getActiveCampaignItems);

// ─── Admin Routes (Cần auth + role ADMIN) ───────────────────────────────────
router.use(requireAuth, requireRole("ADMIN"));

// GET /campaigns — Danh sách tất cả chiến dịch (phân trang/search/filter)
router.get(
  "/",
  validationMiddleware(CampaignQuerySchema, "query"),
  campaignController.getCampaigns,
);

// POST /campaigns — Tạo chiến dịch mới
router.post(
  "/",
  validationMiddleware(CreateCampaignSchema),
  campaignController.createCampaign,
);

// GET /campaigns/:id — Chi tiết chiến dịch
router.get(
  "/:id",
  validationMiddleware(CampaignIdParamSchema, "params"),
  campaignController.getCampaignById,
);

// PUT /campaigns/:id — Cập nhật chiến dịch
router.put(
  "/:id",
  validationMiddleware(CampaignIdParamSchema, "params"),
  validationMiddleware(UpdateCampaignSchema),
  campaignController.updateCampaign,
);

// PATCH /campaigns/:id/status — Đổi trạng thái nhanh
router.patch(
  "/:id/status",
  validationMiddleware(CampaignIdParamSchema, "params"),
  validationMiddleware(UpdateCampaignStatusSchema),
  campaignController.updateCampaignStatus,
);

// PATCH /campaigns/:id/restore — Khôi phục chiến dịch đã xóa mềm
router.patch(
  "/:id/restore",
  validationMiddleware(CampaignIdParamSchema, "params"),
  campaignController.restoreCampaign,
);

// DELETE /campaigns/:id — Xóa (mềm) chiến dịch
router.delete(
  "/:id",
  validationMiddleware(CampaignIdParamSchema, "params"),
  campaignController.deleteCampaign,
);

export default router;
