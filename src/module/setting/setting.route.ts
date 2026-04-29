import { Router } from "express";
import settingController from "./setting.controller";
import asyncHandler from "@/utils/asyncHandler";
import { requireAuth, requireRole } from "@/middleware/auth.middleware";

const router = Router();

// Public route to get all settings (used by storefront client)
router.get("/", asyncHandler(settingController.getAllSettings));

// Admin routes
router.use(requireAuth, requireRole("ADMIN"));
router.put("/:key", asyncHandler(settingController.updateSetting));

export default router;
