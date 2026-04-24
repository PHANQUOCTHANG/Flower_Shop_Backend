import { PrismaClient, Review } from "@prisma/client";

export interface IReviewRepository {
  create(userId: string, data: any): Promise<Review>;
  findByProductId(productId: string, query: any): Promise<any>;
  findByProductSlug(slug: string, query: any): Promise<any>;
  checkUserPurchased(userId: string, productId: string): Promise<boolean>;
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

    const [data, total] = await Promise.all([
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
    ]);

    return { data, total, page, limit };
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

    const [data, total] = await Promise.all([
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
    ]);

    return { data, total, page, limit };
  }

  // Kiểm tra user đã mua sản phẩm này chưa (chỉ cho phép đánh giá khi đã nhận hàng)
  async checkUserPurchased(userId: string, productId: string): Promise<boolean> {
    const order = await this.prisma.order.findFirst({
      where: {
        userId,
        status: "completed",
        items: { some: { productId } },
      },
    });
    return !!order;
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