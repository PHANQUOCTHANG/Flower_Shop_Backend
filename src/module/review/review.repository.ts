import { PrismaClient, Review, OrderStatus } from "@prisma/client";

export interface IReviewRepository {
  create(userId: string, data: any): Promise<Review>;
  findByProductId(productId: string, query: any): Promise<any>;
  findByProductSlug(slug: string, query: any): Promise<any>;
  checkUserPurchased(userId: string, productId: string): Promise<boolean>;
  checkUserAlreadyReviewed(userId: string, productId: string): Promise<boolean>;
  findById(id: string): Promise<Review | null>;
  softDelete(id: string): Promise<void>;
}

export class ReviewRepository implements IReviewRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Tạo Review kèm Media (Prisma nested write)
  async create(userId: string, data: any): Promise<Review> {
    return this.prisma.review.create({
      data: {
        rating: data.rating,
        content: data.content,
        productId: data.productId,
        orderId: data.orderId,
        userId,
        media: { create: data.media ?? [] },
      },
      include: {
        media: true,
        user: { select: { fullName: true, avatar: true } },
      },
    });
  }

  // Lấy danh sách Review theo productId (phân trang)
  async findByProductId(productId: string, query: any) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Number(query.limit) || 10, 50);
    const where = { productId, isVisible: true, deletedAt: null };

    const [data, total, aggregate, starGroups] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          user: { select: { fullName: true, avatar: true } },
          media: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.aggregate({
        where,
        _avg: { rating: true },
      }),
      this.prisma.review.groupBy({
        by: ["rating"],
        where,
        _count: { rating: true },
      }),
    ]);

    const starCounts = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: starGroups.find((g) => g.rating === star)?._count.rating ?? 0,
    }));

    const stats = {
      avgRating: aggregate._avg.rating ?? 0,
      starCounts,
    };

    return { data, total, page, limit, stats };
  }

  // Lấy danh sách Review theo slug của sản phẩm (resolve slug → productId qua join)
  async findByProductSlug(slug: string, query: any) {
    const page = Math.max(Number(query.page) || 1, 1);
    const limit = Math.min(Number(query.limit) || 10, 50);
    const where = {
      product: { slug },
      isVisible: true,
      deletedAt: null,
    };

    const [data, total, aggregate, starGroups] = await Promise.all([
      this.prisma.review.findMany({
        where,
        include: {
          user: { select: { fullName: true, avatar: true } },
          media: true,
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.review.count({ where }),
      this.prisma.review.aggregate({
        where,
        _avg: { rating: true },
      }),
      this.prisma.review.groupBy({
        by: ["rating"],
        where,
        _count: { rating: true },
      }),
    ]);

    const starCounts = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: starGroups.find((g) => g.rating === star)?._count.rating ?? 0,
    }));

    const stats = {
      avgRating: aggregate._avg.rating ?? 0,
      starCounts,
    };

    return { data, total, page, limit, stats };
  }

  // Kiểm tra user đã mua sản phẩm này chưa (chỉ cho phép đánh giá khi đã nhận hàng)
  async checkUserPurchased(userId: string, productId: string): Promise<boolean> {
    const order = await this.prisma.order.findFirst({
      where: {
        userId,
        status: OrderStatus.COMPLETED,
        items: { some: { productId } },
      },
    });
    return !!order;
  }

  // Kiểm tra user đã review sản phẩm này chưa (chỉ tính active review, bỏ qua đã soft-delete)
  async checkUserAlreadyReviewed(userId: string, productId: string): Promise<boolean> {
    const existing = await this.prisma.review.findFirst({
      where: { userId, productId, deletedAt: null },
      select: { id: true },
    });
    return !!existing;
  }

  async findById(id: string): Promise<Review | null> {
    return this.prisma.review.findFirst({
      where: { id, deletedAt: null }
    });
  }

  async softDelete(id: string): Promise<void> {
    await this.prisma.review.update({
      where: { id },
      data: { 
        deletedAt: new Date(),
        isVisible: false 
      }
    });
  }
}