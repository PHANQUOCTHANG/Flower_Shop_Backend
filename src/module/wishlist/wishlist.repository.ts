import prisma from "../../lib/prisma";

export class WishlistRepository {
  async findByUserId(userId: string, page: number, limit: number) {
    const skip = (page - 1) * limit;
    
    const [items, total] = await Promise.all([
      prisma.wishlist.findMany({
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
      prisma.wishlist.count({ where: { userId } }),
    ]);
    
    return { items, total, page, limit };
  }

  async findProductIds(userId: string) {
    const items = await prisma.wishlist.findMany({
      where: { userId },
      select: { productId: true },
    });
    return items.map((i) => i.productId);
  }

  async toggle(userId: string, productId: string) {
    const existing = await prisma.wishlist.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing) {
      await prisma.wishlist.delete({
        where: { id: existing.id },
      });
      return { added: false };
    } else {
      await prisma.wishlist.create({
        data: { userId, productId },
      });
      return { added: true };
    }
  }
}
