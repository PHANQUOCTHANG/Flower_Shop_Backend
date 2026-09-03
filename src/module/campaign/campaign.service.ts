import AppError from "@/utils/appError";
import { ICampaignRepository, CampaignQuery } from "./campaign.repository";
import { CreateCampaignDto, UpdateCampaignDto } from "./campaign.request";
import { CampaignResponse } from "./campaign.response";
import { IPaginatedResult } from "@/utils/query";
import logger from "@/utils/logger";
import {
  getCache,
  setCache,
  deleteCache,
  deleteCacheByPattern,
  CACHE_NULL,
  isCacheNull,
} from "@/utils/cache";

// Trạng thái nào được phép chuyển sang trạng thái nào — chặn các thay đổi vô lý
// (vd hồi sinh campaign đã ENDED, hoặc kích hoạt khi ngày chưa/đã tới).
const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["SCHEDULED", "ACTIVE"],
  SCHEDULED: ["DRAFT", "ACTIVE", "ENDED"],
  ACTIVE: ["ENDED"],
  ENDED: [],
};

export interface ICampaignService {
  createCampaign(data: CreateCampaignDto): Promise<CampaignResponse>;
  getCampaigns(query: CampaignQuery): Promise<IPaginatedResult<CampaignResponse>>;
  getCampaignById(id: string): Promise<CampaignResponse>;
  updateCampaign(id: string, data: UpdateCampaignDto): Promise<CampaignResponse>;
  deleteCampaign(id: string): Promise<void>;
  restoreCampaign(id: string): Promise<CampaignResponse>;
  updateCampaignStatus(id: string, status: string): Promise<CampaignResponse>;
  getActiveCampaign(): Promise<CampaignResponse | null>;
  getActiveCampaignItems(page: number, limit: number): Promise<any>;
  syncCampaignStatuses(): Promise<void>;
}

export class CampaignService implements ICampaignService {
  private readonly CACHE_KEY = "campaigns";
  private readonly CACHE_TTL_LIST = 300; // 5 phút — danh sách campaign ít thay đổi
  private readonly CACHE_TTL_DETAIL = 300; // 5 phút
  private readonly CACHE_TTL_ACTIVE = 120; // 2 phút — campaign active cần fresh hơn

  constructor(private readonly campaignRepo: ICampaignRepository) {}

  // [POST] Tạo chiến dịch mới
  async createCampaign(data: CreateCampaignDto): Promise<CampaignResponse> {
    if (new Date(data.endDate) <= new Date(data.startDate)) {
      throw new AppError("Ngày kết thúc phải lớn hơn ngày bắt đầu", 400);
    }

    const campaign = await this.campaignRepo.create(data);

    await this._invalidateListCache();

    return new CampaignResponse(campaign);
  }

  // [GET] Danh sách tất cả chiến dịch (phân trang, search, filter)
  async getCampaigns(query: CampaignQuery): Promise<IPaginatedResult<CampaignResponse>> {
    const cacheKey = `${this.CACHE_KEY}:list:${JSON.stringify(query)}`;
    const cached = await getCache<IPaginatedResult<CampaignResponse>>(cacheKey);
    if (cached) return cached;

    const result = await this.campaignRepo.findAll(query);
    const response: IPaginatedResult<CampaignResponse> = {
      ...result,
      data: result.data.map((c) => new CampaignResponse(c)),
    };

    await setCache(cacheKey, response, this.CACHE_TTL_LIST);
    return response;
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

    // Luôn so sánh trên cặp ngày hiệu lực (mới nếu có, cũ nếu không) — validate
    // đúng ngay cả khi payload chỉ gửi 1 trong 2 field ngày.
    const effectiveStartDate = data.startDate ? new Date(data.startDate) : existing.startDate;
    const effectiveEndDate = data.endDate ? new Date(data.endDate) : existing.endDate;
    if (effectiveEndDate <= effectiveStartDate) {
      throw new AppError("Ngày kết thúc phải lớn hơn ngày bắt đầu", 400);
    }

    if (data.status && data.status !== existing.status) {
      this._validateStatusTransition(existing.status, data.status, effectiveStartDate, effectiveEndDate);
    }

    if (data.items) {
      this._validateItemsAgainstSold(existing.items, data.items);
    }

    const updated = await this.campaignRepo.update(id, data);

    await Promise.all([deleteCache(`${this.CACHE_KEY}:id:${id}`), this._invalidateListCache()]);

    return new CampaignResponse(updated);
  }

  // [PATCH] Đổi trạng thái nhanh (không cần gửi lại toàn bộ payload)
  async updateCampaignStatus(id: string, status: string): Promise<CampaignResponse> {
    const existing = await this.campaignRepo.findById(id);
    if (!existing) throw new AppError("Không tìm thấy chiến dịch", 404);

    if (status !== existing.status) {
      this._validateStatusTransition(existing.status, status, existing.startDate, existing.endDate);
    }

    const updated = await this.campaignRepo.update(id, { status } as UpdateCampaignDto);

    await Promise.all([deleteCache(`${this.CACHE_KEY}:id:${id}`), this._invalidateListCache()]);

    return new CampaignResponse(updated);
  }

  // [DELETE] Xóa (mềm) chiến dịch
  async deleteCampaign(id: string): Promise<void> {
    const existing = await this.campaignRepo.findById(id);
    if (!existing) throw new AppError("Không tìm thấy chiến dịch", 404);

    await this.campaignRepo.delete(id);

    await Promise.all([deleteCache(`${this.CACHE_KEY}:id:${id}`), this._invalidateListCache()]);
  }

  // [PATCH] Khôi phục chiến dịch đã xóa mềm
  async restoreCampaign(id: string): Promise<CampaignResponse> {
    const restored = await this.campaignRepo.restore(id);
    if (!restored) throw new AppError("Không tìm thấy chiến dịch", 404);

    await Promise.all([deleteCache(`${this.CACHE_KEY}:id:${id}`), this._invalidateListCache()]);

    return new CampaignResponse(restored);
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
      meta: { total: result.total, page: result.page, limit: result.limit, totalPages },
    };

    await setCache(cacheKey, response, this.CACHE_TTL_ACTIVE);
    return response;
  }

  // Cron (BullMQ repeatable job) — tự động chuyển SCHEDULED→ACTIVE→ENDED theo thời gian.
  // Không emit socket (không cần realtime) — client thấy thay đổi qua refetch/staleTime.
  async syncCampaignStatuses(): Promise<void> {
    const [activatedCount, endedCount] = await Promise.all([
      this.campaignRepo.activateDueCampaigns(),
      this.campaignRepo.endExpiredCampaigns(),
    ]);

    if (activatedCount > 0 || endedCount > 0) {
      logger.info(
        `[CampaignSync] Kích hoạt ${activatedCount} chiến dịch, kết thúc ${endedCount} chiến dịch`,
      );
      await this._invalidateListCache();
    }
  }

  // ─── Private helpers ─────────────────────────────────────────────────────────

  private _validateStatusTransition(
    currentStatus: string,
    newStatus: string,
    startDate: Date,
    endDate: Date,
  ): void {
    const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new AppError(
        `Không thể chuyển trạng thái từ ${currentStatus} sang ${newStatus}`,
        400,
      );
    }

    const now = new Date();
    if (newStatus === "ACTIVE" && (now < new Date(startDate) || now > new Date(endDate))) {
      throw new AppError(
        "Chỉ có thể kích hoạt chiến dịch khi thời gian hiện tại nằm trong khoảng bắt đầu - kết thúc",
        400,
      );
    }
    if (newStatus === "SCHEDULED" && new Date(startDate) <= now) {
      throw new AppError("Ngày bắt đầu phải ở tương lai để đặt lịch", 400);
    }
  }

  private _validateItemsAgainstSold(existingItems: any[], incomingItems: UpdateCampaignDto["items"]): void {
    if (!incomingItems) return;
    const existingByProductId = new Map(existingItems.map((item) => [item.productId, item]));

    for (const incoming of incomingItems) {
      const existing = existingByProductId.get(incoming.productId);
      if (
        existing &&
        existing.soldQuantity > 0 &&
        incoming.limitQuantity != null &&
        incoming.limitQuantity < existing.soldQuantity
      ) {
        throw new AppError(
          `Không thể đặt giới hạn thấp hơn số đã bán (${existing.soldQuantity}) của sản phẩm này`,
          400,
        );
      }
    }
  }

  private async _invalidateListCache(): Promise<void> {
    await Promise.all([
      deleteCacheByPattern(`${this.CACHE_KEY}:list:*`),
      deleteCache(`${this.CACHE_KEY}:active`),
      deleteCacheByPattern(`${this.CACHE_KEY}:active:items:*`),
      deleteCache(`orders:active_campaign`), // Xóa cache campaign trong order service
    ]);
  }
}
