import AppError from "@/utils/appError";
import { CampaignRepository } from "./campaign.repository";
import { CreateCampaignDto, UpdateCampaignDto } from "./campaign.request";
import { CampaignResponse } from "./campaign.response";

export class CampaignService {
  private campaignRepo = new CampaignRepository();

  async createCampaign(data: CreateCampaignDto) {
    // Validate endDate > startDate
    if (new Date(data.endDate) <= new Date(data.startDate)) {
      throw new AppError("Ngày kết thúc phải lớn hơn ngày bắt đầu", 400);
    }

    const campaign = await this.campaignRepo.create(data);
    return new CampaignResponse(campaign);
  }

  async getCampaigns(query: any) {
    const campaigns = await this.campaignRepo.findAll(query);
    return campaigns.map((c) => new CampaignResponse(c));
  }

  async getCampaignById(id: string) {
    const campaign = await this.campaignRepo.findById(id);
    if (!campaign) throw new AppError("Không tìm thấy chiến dịch", 404);
    return new CampaignResponse(campaign);
  }

  async updateCampaign(id: string, data: UpdateCampaignDto) {
    const existing = await this.campaignRepo.findById(id);
    if (!existing) throw new AppError("Không tìm thấy chiến dịch", 404);

    if (data.startDate && data.endDate) {
      if (new Date(data.endDate) <= new Date(data.startDate)) {
        throw new AppError("Ngày kết thúc phải lớn hơn ngày bắt đầu", 400);
      }
    }

    const updated = await this.campaignRepo.update(id, data);
    return new CampaignResponse(updated);
  }

  async deleteCampaign(id: string) {
    const existing = await this.campaignRepo.findById(id);
    if (!existing) throw new AppError("Không tìm thấy chiến dịch", 404);
    await this.campaignRepo.delete(id);
  }

  async getActiveCampaign() {
    const active = await this.campaignRepo.findActiveCampaign();
    if (!active) return null;
    return new CampaignResponse(active);
  }

  async getActiveCampaignItems(page: number, limit: number) {
    const result = await this.campaignRepo.findActiveCampaignItems(page, limit);
    const totalPages = Math.ceil(result.total / limit);
    return {
      campaign: result.campaign ? new CampaignResponse(result.campaign) : null,
      items: result.items.map((i: any) => ({
        id: i.id,
        productId: i.productId,
        discountValue: Number(i.discountValue),
        discountType: i.discountType,
        salePrice: Number(i.salePrice),
        limitQuantity: i.limitQuantity,
        soldQuantity: i.soldQuantity,
        product: i.product,
      })),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages,
      },
    };
  }
}
