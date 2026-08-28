import { PrismaClient } from "@prisma/client";

export interface IWishlistRepository {
  findByUserId(userId: string, page: number, limit: number): Promise<{ items: any[], total: number, page: number, limit: number }>;
  findProductIds(userId: string): Promise<string[]>;
  toggle(userId: string, productId: string): Promise<{ added: boolean }>;
}

export class WishlistRepository implements IWishlistRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUserId(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    
    const [items, total] = await Promise.all([
      this.prisma.wishlist.findMany({
        where: { userId },
        skip,
        take: limit,
        include: {
          product: {
            include: {
              images: { where: { isPrimary: true } },
              categories: { include: { category: true } },
              saleItems: {
                where: {
                  campaign: {
                    isActive: true,
                    status: "ACTIVE",
                    startDate: { lte: new Date() },
                    endDate: { gte: new Date() },
                  }
                }
              }
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.wishlist.count({ where: { userId } }),
    ]);
    
    return { items, total, page, limit };
  }

  async findProductIds(userId: string) {
    const items = await this.prisma.wishlist.findMany({
      where: { userId },
      select: { productId: true },
    });
    return items.map((i) => i.productId);
  }

  async toggle(userId: string, productId: string) {
    const existing = await this.prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing) {
      await this.prisma.wishlist.delete({
        where: { id: existing.id },
      });
      return { added: false };
    } else {
      await this.prisma.wishlist.create({
        data: { userId, productId },
      });
      return { added: true };
    }
  }
}
