import { PrismaClient, Prisma } from "@prisma/client";
import { CreateCampaignDto, UpdateCampaignDto } from "./campaign.request";
import { IPaginatedResult } from "@/utils/query";
import { getSearchPattern } from "@/utils/searchUtils";

export interface CampaignQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  type?: string;
  isActive?: boolean;
}

export interface ICampaignRepository {
  create(data: any): Promise<any>;
  findAll(query: CampaignQuery): Promise<IPaginatedResult<any>>;
  findById(id: string): Promise<any | null>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<any>;
  restore(id: string): Promise<any>;
  findActiveCampaign(): Promise<any>;
  findActiveCampaignItems(page: number, limit: number): Promise<any>;
  // Tăng soldQuantity cho các sản phẩm trong campaign sau khi checkout
  incrementSoldQuantity(
    items: { campaignItemId: string; quantity: number }[],
  ): Promise<{ campaignItemId: string; applied: boolean }[]>;
  // Cron: tự động chuyển trạng thái theo thời gian
  activateDueCampaigns(): Promise<number>;
  endExpiredCampaigns(): Promise<number>;
}

const itemDetailInclude = {
  items: {
    include: {
      product: {
        include: { images: { where: { isPrimary: true } } },
      },
    },
  },
};

export class CampaignRepository implements ICampaignRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(data: CreateCampaignDto) {
    const { items, ...campaignData } = data;
    return await this.prisma.saleCampaign.create({
      data: {
        ...campaignData,
        items: items
          ? {
              create: items.map((item) => ({
                productId: item.productId,
                discountValue: item.discountValue,
                discountType: item.discountType,
                salePrice: item.salePrice,
                limitQuantity: item.limitQuantity,
              })),
            }
          : undefined,
      },
      include: { items: true },
    });
  }

  async findAll(query: CampaignQuery = {}): Promise<IPaginatedResult<any>> {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(query.limit ?? 10, 100);

    const where: Prisma.SaleCampaignWhereInput = {
      deletedAt: null,
      ...(query.status && { status: query.status }),
      ...(query.type && { type: query.type }),
      ...(query.isActive !== undefined && { isActive: query.isActive }),
      ...(query.search && {
        name: { contains: getSearchPattern(query.search), mode: "insensitive" },
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.saleCampaign.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: { items: true },
      }),
      this.prisma.saleCampaign.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    return await this.prisma.saleCampaign.findFirst({
      where: { id, deletedAt: null },
      include: itemDetailInclude,
    });
  }

  async update(id: string, data: UpdateCampaignDto) {
    const { items, ...campaignData } = data;

    if (!items) {
      return await this.prisma.saleCampaign.update({
        where: { id },
        data: campaignData,
        include: { items: true },
      });
    }

    // Upsert items theo productId — KHÔNG xóa-tạo-lại toàn bộ để giữ soldQuantity
    // của các item không đổi (xóa-tạo-lại sẽ reset soldQuantity về 0, làm sai lệch
    // số liệu đã bán mỗi khi admin chỉ sửa 1 field không liên quan đến items).
    return await this.prisma.$transaction(async (tx) => {
      const existingItems = await tx.saleCampaignItem.findMany({
        where: { campaignId: id },
        select: { id: true, productId: true },
      });
      const existingByProductId = new Map(
        existingItems.map((item) => [item.productId, item]),
      );
      const incomingProductIds = new Set(items.map((item) => item.productId));

      const idsToRemove = existingItems
        .filter((item) => !incomingProductIds.has(item.productId))
        .map((item) => item.id);
      if (idsToRemove.length > 0) {
        await tx.saleCampaignItem.deleteMany({ where: { id: { in: idsToRemove } } });
      }

      for (const item of items) {
        const existing = existingByProductId.get(item.productId);
        if (existing) {
          await tx.saleCampaignItem.update({
            where: { id: existing.id },
            data: {
              discountValue: item.discountValue,
              discountType: item.discountType,
              salePrice: item.salePrice,
              limitQuantity: item.limitQuantity,
            },
          });
        } else {
          await tx.saleCampaignItem.create({
            data: {
              campaignId: id,
              productId: item.productId,
              discountValue: item.discountValue,
              discountType: item.discountType,
              salePrice: item.salePrice,
              limitQuantity: item.limitQuantity,
            },
          });
        }
      }

      return await tx.saleCampaign.update({
        where: { id },
        data: campaignData,
        include: { items: true },
      });
    });
  }

  // Soft-delete — giữ bản ghi để không mất lịch sử soldQuantity/đơn hàng liên quan
  async delete(id: string) {
    return await this.prisma.saleCampaign.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false },
    });
  }

  async restore(id: string) {
    return await this.prisma.saleCampaign.update({
      where: { id },
      data: { deletedAt: null },
    });
  }

  async findActiveCampaign() {
    const now = new Date();
    return await this.prisma.saleCampaign.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
        status: "ACTIVE",
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { startDate: "desc" },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { where: { isPrimary: true } },
                categories: { include: { category: true } },
              },
            },
          },
        },
      },
    });
  }

  async findActiveCampaignItems(page: number, limit: number) {
    const now = new Date();

    const campaign = await this.prisma.saleCampaign.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
        status: "ACTIVE",
        startDate: { lte: now },
        endDate: { gte: now },
      },
      orderBy: { startDate: "desc" },
    });

    if (!campaign) return { campaign: null, items: [], total: 0, page, limit };

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.saleCampaignItem.findMany({
        where: { campaignId: campaign.id },
        skip,
        take: limit,
        include: {
          product: {
            include: {
              images: { where: { isPrimary: true } },
              categories: { include: { category: true } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.saleCampaignItem.count({ where: { campaignId: campaign.id } }),
    ]);

    return { campaign, items, total, page, limit };
  }

  // Tăng soldQuantity cho các item campaign sau khi checkout thành công.
  // Atomic ở tầng câu lệnh UPDATE (điều kiện soldQuantity <= limit - quantity nằm
  // trong chính WHERE của updateMany) — Postgres serialize UPDATE trên cùng 1 row
  // nên 2 checkout đồng thời không thể cùng vượt limitQuantity, dù không có
  // transaction bao ngoài. Không throw khi không áp dụng được — chỉ báo lại cho
  // service log cảnh báo, không được chặn đơn hàng đã tạo (fire-and-forget).
  async incrementSoldQuantity(
    items: { campaignItemId: string; quantity: number }[],
  ): Promise<{ campaignItemId: string; applied: boolean }[]> {
    return await Promise.all(
      items.map(async (item) => {
        const current = await this.prisma.saleCampaignItem.findUnique({
          where: { id: item.campaignItemId },
          select: { limitQuantity: true },
        });
        if (!current) return { campaignItemId: item.campaignItemId, applied: false };

        if (current.limitQuantity === null) {
          await this.prisma.saleCampaignItem.update({
            where: { id: item.campaignItemId },
            data: { soldQuantity: { increment: item.quantity } },
          });
          return { campaignItemId: item.campaignItemId, applied: true };
        }

        const result = await this.prisma.saleCampaignItem.updateMany({
          where: {
            id: item.campaignItemId,
            soldQuantity: { lte: current.limitQuantity - item.quantity },
          },
          data: { soldQuantity: { increment: item.quantity } },
        });
        return { campaignItemId: item.campaignItemId, applied: result.count > 0 };
      }),
    );
  }

  async activateDueCampaigns(): Promise<number> {
    const now = new Date();
    const result = await this.prisma.saleCampaign.updateMany({
      where: { deletedAt: null, status: "SCHEDULED", startDate: { lte: now } },
      data: { status: "ACTIVE" },
    });
    return result.count;
  }

  async endExpiredCampaigns(): Promise<number> {
    const now = new Date();
    const result = await this.prisma.saleCampaign.updateMany({
      where: { deletedAt: null, status: "ACTIVE", endDate: { lte: now } },
      data: { status: "ENDED" },
    });
    return result.count;
  }
}
