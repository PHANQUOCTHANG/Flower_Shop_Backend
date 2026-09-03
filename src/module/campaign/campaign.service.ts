import AppError from "@/utils/appError";
import { ICampaignRepository } from "./campaign.repository";
import { CreateCampaignDto, UpdateCampaignDto } from "./campaign.request";
import { CampaignResponse } from "./campaign.response";
import {
  getCache,
  setCache,
  deleteCache,
  deleteCacheByPattern,
  CACHE_NULL,
  isCacheNull,
} from "@/utils/cache";

export interface ICampaignService {
  createCampaign(data: CreateCampaignDto): Promise<CampaignResponse>;
  getCampaigns(query: any): Promise<CampaignResponse[]>;
  getCampaignById(id: string): Promise<CampaignResponse>;
  updateCampaign(id: string, data: UpdateCampaignDto): Promise<CampaignResponse>;
  deleteCampaign(id: string): Promise<void>;
  getActiveCampaign(): Promise<CampaignResponse | null>;
  getActiveCampaignItems(page: number, limit: number): Promise<any>;
}

export class CampaignService implements ICampaignService {
  private readonly CACHE_KEY = "campaigns";
  private readonly CACHE_TTL_LIST = 300;    // 5 phút — danh sách campaign ít thay đổi
  private readonly CACHE_TTL_DETAIL = 300;  // 5 phút
  private readonly CACHE_TTL_ACTIVE = 120;  // 2 phút — campaign active cần fresh hơn

  constructor(private readonly campaignRepo: ICampaignRepository) {}

  // [POST] Tạo chiến dịch mới
  async createCampaign(data: CreateCampaignDto): Promise<CampaignResponse> {
    if (new Date(data.endDate) <= new Date(data.startDate)) {
      throw new AppError("Ngày kết thúc phải lớn hơn ngày bắt đầu", 400);
    }

    const campaign = await this.campaignRepo.create(data);

    // Xóa cache danh sách và active
    await this._invalidateListCache();

    return new CampaignResponse(campaign);
  }

  // [GET] Danh sách tất cả chiến dịch
  async getCampaigns(query: any): Promise<CampaignResponse[]> {
    const cacheKey = `${this.CACHE_KEY}:list:${JSON.stringify(query)}`;
    const cached = await getCache<any[]>(cacheKey);
    if (cached) return cached;

    const campaigns = await this.campaignRepo.findAll(query);
    const result = campaigns.map((c) => new CampaignResponse(c));

    await setCache(cacheKey, result, this.CACHE_TTL_LIST);
    return result;
  }

  // [GET] Chi tiết chiến dịch theo ID
  async getCampaignById(id: string): Promise<CampaignResponse> {
    const cacheKey = `${this.CACHE_KEY}:id:${id}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) return cached;

    const campaign = await this.campaignRepo.findById(id);
    if (!campaign) throw new AppError("Không tìm thấy chiến dịch", 404);

    const result = new CampaignResponse(campaign);
    await setCache(cacheKey, result, this.CACHE_TTL_DETAIL);
    return result;
  }

  // [PUT] Cập nhật chiến dịch
  async updateCampaign(id: string, data: UpdateCampaignDto): Promise<CampaignResponse> {
    const existing = await this.campaignRepo.findById(id);
    if (!existing) throw new AppError("Không tìm thấy chiến dịch", 404);

    if (data.startDate && data.endDate) {
      if (new Date(data.endDate) <= new Date(data.startDate)) {
        throw new AppError("Ngày kết thúc phải lớn hơn ngày bắt đầu", 400);
      }
    }

    const updated = await this.campaignRepo.update(id, data);

    // Xóa cache detail + list + active
    await Promise.all([
      deleteCache(`${this.CACHE_KEY}:id:${id}`),
      this._invalidateListCache(),
    ]);

    return new CampaignResponse(updated);
  }

  // [DELETE] Xóa chiến dịch
  async deleteCampaign(id: string): Promise<void> {
    const existing = await this.campaignRepo.findById(id);
    if (!existing) throw new AppError("Không tìm thấy chiến dịch", 404);

    await this.campaignRepo.delete(id);

    // Xóa cache detail + list + active
    await Promise.all([
      deleteCache(`${this.CACHE_KEY}:id:${id}`),
      this._invalidateListCache(),
    ]);
  }

  // [GET] Campaign đang active (Public — dùng cho banner trang chủ)
  async getActiveCampaign(): Promise<CampaignResponse | null> {
    const cacheKey = `${this.CACHE_KEY}:active`;
    const cached = await getCache<any>(cacheKey);
    if (cached) return isCacheNull(cached) ? null : cached;

    const active = await this.campaignRepo.findActiveCampaign();
    if (!active) {
      await setCache(cacheKey, CACHE_NULL, this.CACHE_TTL_ACTIVE);
      return null;
    }

    const result = new CampaignResponse(active);
    await setCache(cacheKey, result, this.CACHE_TTL_ACTIVE);
    return result;
  }

  // [GET] Sản phẩm trong campaign active (Public — phân trang)
  async getActiveCampaignItems(page: number, limit: number): Promise<any> {
    const cacheKey = `${this.CACHE_KEY}:active:items:${page}:${limit}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) return cached;

    const result = await this.campaignRepo.findActiveCampaignItems(page, limit);
    const totalPages = Math.ceil(result.total / limit);

    const response = {
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

    await setCache(cacheKey, response, this.CACHE_TTL_ACTIVE);
    return response;
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private async _invalidateListCache(): Promise<void> {
    await Promise.all([
      deleteCacheByPattern(`${this.CACHE_KEY}:list:*`),
      deleteCache(`${this.CACHE_KEY}:active`),
      deleteCacheByPattern(`${this.CACHE_KEY}:active:items:*`),
      deleteCache(`orders:active_campaign`), // Xóa cache campaign trong order service
    ]);
  }
}
