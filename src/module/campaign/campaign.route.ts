import { Router } from "express";
import { CampaignController } from "./campaign.controller";
import { requireAuth, requireRole } from "../../middleware/auth.middleware";

const router = Router();
const campaignController = new CampaignController();

// Public routes
router.get("/active", campaignController.getActiveCampaign);
router.get("/active/items", campaignController.getActiveCampaignItems);

// Admin routes
router.use(requireAuth);
router.use(requireRole("ADMIN"));

router.post("/", campaignController.createCampaign);
router.get("/", campaignController.getCampaigns);
router.get("/:id", campaignController.getCampaignById);
router.put("/:id", campaignController.updateCampaign);
router.delete("/:id", campaignController.deleteCampaign);

export default router;
