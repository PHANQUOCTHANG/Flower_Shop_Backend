import { NextFunction, Request, Response } from "express";
import { CampaignService } from "./campaign.service";
import { CreateCampaignSchema, UpdateCampaignSchema, CampaignIdParamSchema } from "./campaign.request";
import { ApiResponse } from "@/utils/apiResponse";

export class CampaignController {
  private campaignService = new CampaignService();

  createCampaign = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const data = CreateCampaignSchema.parse(req.body);
      const campaign = await this.campaignService.createCampaign(data);
      res.status(201).json(ApiResponse.success(campaign, "Tạo chiến dịch thành công"));
    } catch (error) {
      next(error);
    }
  };

  getCampaigns = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const campaigns = await this.campaignService.getCampaigns(req.query);
      res.status(200).json(ApiResponse.success(campaigns));
    } catch (error) {
      next(error);
    }
  };

  getCampaignById = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = CampaignIdParamSchema.parse(req.params);
      const campaign = await this.campaignService.getCampaignById(id);
      res.status(200).json(ApiResponse.success(campaign));
    } catch (error) {
      next(error);
    }
  };

  updateCampaign = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = CampaignIdParamSchema.parse(req.params);
      const data = UpdateCampaignSchema.parse(req.body);
      const campaign = await this.campaignService.updateCampaign(id, data);
      res.status(200).json(ApiResponse.success(campaign, "Cập nhật chiến dịch thành công"));
    } catch (error) {
      next(error);
    }
  };

  deleteCampaign = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = CampaignIdParamSchema.parse(req.params);
      await this.campaignService.deleteCampaign(id);
      res.status(200).json(ApiResponse.success(null, "Xóa chiến dịch thành công"));
    } catch (error) {
      next(error);
    }
  };

  getActiveCampaign = async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const active = await this.campaignService.getActiveCampaign();
      res.status(200).json(ApiResponse.success(active));
    } catch (error) {
      next(error);
    }
  };

  getActiveCampaignItems = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
      const limit = Math.min(40, Math.max(1, parseInt(String(req.query.limit || "8"), 10)));
      const result = await this.campaignService.getActiveCampaignItems(page, limit);
      res.status(200).json({
        status: "success",
        data: result.items,
        campaign: result.campaign,
        meta: result.meta,
      });
    } catch (error) {
      next(error);
    }
  };
}
