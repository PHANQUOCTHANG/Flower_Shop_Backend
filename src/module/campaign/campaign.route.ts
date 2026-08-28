import { Router } from "express";
import * as campaignController from "./campaign.controller";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";
import validationMiddleware from "@/middleware/validate.middleware";
import { CreateCampaignSchema, UpdateCampaignSchema, CampaignIdParamSchema } from "./campaign.request";

const router = Router();

// ─── Public Routes ──────────────────────────────────────────────────────────

// GET /campaigns/active — Lấy campaign đang chạy (phải đặt TRƯỚC /:id)
router.get("/active", campaignController.getActiveCampaign);

// GET /campaigns/active/items — Lấy sản phẩm trong campaign active
router.get("/active/items", campaignController.getActiveCampaignItems);

// ─── Admin Routes (Cần auth + role ADMIN) ───────────────────────────────────
router.use(requireAuth, requireRole("ADMIN"));

// GET /campaigns — Danh sách tất cả chiến dịch
router.get("/", campaignController.getCampaigns);

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

// DELETE /campaigns/:id — Xóa chiến dịch
router.delete(
  "/:id",
  validationMiddleware(CampaignIdParamSchema, "params"),
  campaignController.deleteCampaign,
);

export default router;
