import { PrismaClient } from "@prisma/client";
import { CreateCampaignDto, UpdateCampaignDto } from "./campaign.request";

export interface ICampaignRepository {
  create(data: any): Promise<any>;
  findAll(query: any): Promise<any[]>;
  findById(id: string): Promise<any | null>;
  update(id: string, data: any): Promise<any>;
  delete(id: string): Promise<any>;
  findActiveCampaign(): Promise<any>;
  findActiveCampaignItems(page: number, limit: number): Promise<any>;
  // Tăng soldQuantity cho các sản phẩm trong campaign sau khi checkout
  incrementSoldQuantity(items: { campaignItemId: string; quantity: number }[]): Promise<void>;
}

export class CampaignRepository implements ICampaignRepository {
  constructor(private readonly prisma: PrismaClient) {}
  async create(data: CreateCampaignDto) {
    const { items, ...campaignData } = data;
    return await this.prisma.saleCampaign.create({
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

    return await this.prisma.saleCampaign.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });
  }

  async findById(id: string) {
    return await this.prisma.saleCampaign.findUnique({
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
    
    let itemsUpdate = undefined;
    if (items) {
      await this.prisma.saleCampaignItem.deleteMany({ where: { campaignId: id } });
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

    return await this.prisma.saleCampaign.update({
      where: { id },
      data: {
        ...campaignData,
        ...(itemsUpdate && { items: itemsUpdate }),
      },
      include: { items: true },
    });
  }

  async delete(id: string) {
    return await this.prisma.saleCampaign.delete({ where: { id } });
  }

  async findActiveCampaign() {
    const now = new Date();
    return await this.prisma.saleCampaign.findFirst({
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

    const campaign = await this.prisma.saleCampaign.findFirst({
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

  // Tăng soldQuantity cho các item campaign sau khi checkout thành công
  async incrementSoldQuantity(
    items: { campaignItemId: string; quantity: number }[],
  ): Promise<void> {
    // Chạy song song — mỗi item update 1 lần
    await Promise.all(
      items.map((item) =>
        this.prisma.saleCampaignItem.update({
          where: { id: item.campaignItemId },
          data: { soldQuantity: { increment: item.quantity } },
        }),
      ),
    );
  }
}
