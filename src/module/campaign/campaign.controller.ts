import { Request, Response } from "express";
import { campaignService } from "@/config/container";
import { ApiResponse } from "@/utils/apiResponse";
import asyncHandler from "@/utils/asyncHandler";

// [POST] /api/v1/campaigns — Tạo chiến dịch mới (Admin)
export const createCampaign = asyncHandler(async (req: Request, res: Response) => {
  const campaign = await campaignService.createCampaign(req.body);
  return res.status(201).json(ApiResponse.success(campaign, "Tạo chiến dịch thành công"));
});

// [GET] /api/v1/campaigns — Lấy danh sách chiến dịch (Admin)
export const getCampaigns = asyncHandler(async (req: Request, res: Response) => {
  const campaigns = await campaignService.getCampaigns(req.query);
  return res.status(200).json(ApiResponse.success(campaigns));
});

// [GET] /api/v1/campaigns/active — Lấy chiến dịch đang active (Public)
export const getActiveCampaign = asyncHandler(async (_req: Request, res: Response) => {
  const active = await campaignService.getActiveCampaign();
  return res.status(200).json(ApiResponse.success(active));
});

// [GET] /api/v1/campaigns/active/items — Lấy sản phẩm trong campaign active (Public)
export const getActiveCampaignItems = asyncHandler(async (req: Request, res: Response) => {
  const page = Math.max(1, parseInt(String(req.query.page || "1"), 10));
  const limit = Math.min(40, Math.max(1, parseInt(String(req.query.limit || "8"), 10)));
  const result = await campaignService.getActiveCampaignItems(page, limit);
  return res.status(200).json({
    status: "success",
    data: result.items,
    campaign: result.campaign,
    meta: result.meta,
  });
});

// [GET] /api/v1/campaigns/:id — Lấy chi tiết chiến dịch (Admin)
export const getCampaignById = asyncHandler(async (req: Request, res: Response) => {
  const campaign = await campaignService.getCampaignById(req.params.id as string);
  return res.status(200).json(ApiResponse.success(campaign));
});

// [PUT] /api/v1/campaigns/:id — Cập nhật chiến dịch (Admin)
export const updateCampaign = asyncHandler(async (req: Request, res: Response) => {
  const campaign = await campaignService.updateCampaign(req.params.id as string, req.body);
  return res.status(200).json(ApiResponse.success(campaign, "Cập nhật chiến dịch thành công"));
});

// [DELETE] /api/v1/campaigns/:id — Xóa chiến dịch (Admin)
export const deleteCampaign = asyncHandler(async (req: Request, res: Response) => {
  await campaignService.deleteCampaign(req.params.id as string);
  return res.status(200).json(ApiResponse.success(null, "Xóa chiến dịch thành công"));
});
