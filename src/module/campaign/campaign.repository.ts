import prisma from "../../lib/prisma";
import { CreateCampaignDto, UpdateCampaignDto } from "./campaign.request";

export class CampaignRepository {
  async create(data: CreateCampaignDto) {
    const { items, ...campaignData } = data;
    return await prisma.saleCampaign.create({
      data: {
        ...campaignData,
        items: items ? {
          create: items.map((item) => ({
            productId: item.productId,
            discountValue: item.discountValue,
            discountType: item.discountType,
            salePrice: item.salePrice,
            limitQuantity: item.limitQuantity,
          })),
        } : undefined,
      },
      include: { items: true },
    });
  }

  async findAll(query: any = {}) {
    const where: any = {};
    if (query.status) where.status = query.status;
    if (query.isActive !== undefined) where.isActive = query.isActive;

    return await prisma.saleCampaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string) {
    return await prisma.saleCampaign.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              include: { images: { where: { isPrimary: true } } },
            },
          },
        },
      },
    });
  }

  async update(id: string, data: UpdateCampaignDto) {
    const { items, ...campaignData } = data;
    
    // Nếu có update items, ta xóa các item cũ và tạo mới để đơn giản, hoặc upsert
    // Trong thực tế cần xử lý kỹ hơn nếu update, ở đây xóa cũ tạo mới cho nhanh
    let itemsUpdate = undefined;
    if (items) {
      await prisma.saleCampaignItem.deleteMany({ where: { campaignId: id } });
      itemsUpdate = {
        create: items.map((item) => ({
          productId: item.productId,
          discountValue: item.discountValue,
          discountType: item.discountType,
          salePrice: item.salePrice,
          limitQuantity: item.limitQuantity,
        })),
      };
    }

    return await prisma.saleCampaign.update({
      where: { id },
      data: {
        ...campaignData,
        ...(itemsUpdate && { items: itemsUpdate }),
      },
      include: { items: true },
    });
  }

  async delete(id: string) {
    return await prisma.saleCampaign.delete({ where: { id } });
  }

  async findActiveCampaign() {
    const now = new Date();
    return await prisma.saleCampaign.findFirst({
      where: {
        isActive: true,
        status: "ACTIVE",
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        items: {
          include: {
            product: {
              include: { 
                images: { where: { isPrimary: true } },
                categories: { include: { category: true } }
              },
            },
          },
        },
      },
    });
  }

  async findActiveCampaignItems(page: number, limit: number) {
    const now = new Date();

    // Lấy campaign đang active
    const campaign = await prisma.saleCampaign.findFirst({
      where: {
        isActive: true,
        status: "ACTIVE",
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });

    if (!campaign) return { campaign: null, items: [], total: 0, page, limit };

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      prisma.saleCampaignItem.findMany({
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
      prisma.saleCampaignItem.count({ where: { campaignId: campaign.id } }),
    ]);

    return { campaign, items, total, page, limit };
  }
}
