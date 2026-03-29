import { PrismaClient, Order, Prisma } from "@prisma/client";
import { IPaginatedResult } from "@/utils/query"; // Giả định dùng chung util với Product

export interface IOrderRepository {
  createOrder(data: any): Promise<Order>;
  findAll(query: any): Promise<IPaginatedResult<Order>>;
  findById(id: string): Promise<Order | null>;
  findByUserId(userId: string, query: any): Promise<IPaginatedResult<Order>>;
  updateStatus(id: string, status: string): Promise<Order | null>;
}

export class OrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Tạo đơn hàng kèm OrderItems (Transaction)
  // Lưu ý: Schema Product mới không quản lý tồn kho nên không cần update stockQuantity
  async createOrder(data: {
    userId: string;
    totalPrice: number;
    shippingAddress: string;
    shippingPhone: string;
    paymentMethod: string;
    items: {
      productId: string;
      quantity: number;
      price: number;
      subtotal: number;
    }[];
  }): Promise<Order> {
    return this.prisma.$transaction(async (tx) => {
      // Tạo Order và OrderItems (nested write)
      const order = await tx.order.create({
        data: {
          userId: data.userId,
          totalPrice: data.totalPrice,
          shippingAddress: data.shippingAddress,
          shippingPhone: data.shippingPhone,
          paymentMethod: data.paymentMethod,
          items: {
            create: data.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price,
              subtotal: item.subtotal,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      return order;
    });
  }

  // Lấy danh sách tất cả đơn hàng (Admin) kèm phân trang và lọc đầy đủ
  async findAll(query: any): Promise<IPaginatedResult<Order>> {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    // Lọc theo trạng thái đơn hàng
    if (query.status) {
      where.status = query.status;
    }

    // Lọc theo trạng thái thanh toán
    if (query.paymentStatus) {
      where.paymentStatus = query.paymentStatus;
    }

    // Lọc theo khoảng thời gian
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) {
        where.createdAt.gte = new Date(query.dateFrom);
      }
      if (query.dateTo) {
        // Tính đến hết ngày (23:59:59)
        const endDate = new Date(query.dateTo);
        endDate.setHours(23, 59, 59, 999);
        where.createdAt.lte = endDate;
      }
    }

    // Tìm kiếm toàn văn bản
    if (query.search) {
      where.OR = [
        { id: { contains: query.search, mode: "insensitive" } },
        { shippingPhone: { contains: query.search } },
        { user: { fullName: { contains: query.search, mode: "insensitive" } } },
      ];
    }

    // Xây dựng orderBy từ sort query
    let orderBy: any = { createdAt: "desc" };
    switch (query.sort) {
      case "oldest":
        orderBy = { createdAt: "asc" };
        break;
      case "price-asc":
        orderBy = { price: "asc" };
        break;
      case "price-desc":
        orderBy = { price: "desc" };
        break;
      default:
        orderBy = { createdAt: "desc" };
        break;
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: {
          user: { select: { fullName: true, email: true } },
          _count: { select: { items: true } },
        },
        orderBy,
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Chi tiết đơn hàng (Dùng findUnique để tối ưu vì ID là UUID)
  async findById(id: string): Promise<Order | null> {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: {
            product: {
              select: { name: true, thumbnailUrl: true, slug: true },
            },
          },
        },
        user: {
          select: { fullName: true, email: true, phone: true },
        },
      },
    });
  }

  // Lấy lịch sử mua hàng của một User cụ thể
  async findByUserId(
    userId: string,
    query: any,
  ): Promise<IPaginatedResult<Order>> {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(query.limit ?? 10, 100);

    const where: Prisma.OrderWhereInput = { userId };

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          _count: { select: { items: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Cập nhật trạng thái đơn hàng
  async updateStatus(id: string, status: string): Promise<Order | null> {
    try {
      return await this.prisma.order.update({
        where: { id },
        data: { status },
      });
    } catch (error: any) {
      if (error.code === "P2025") return null;
      throw error;
    }
  }
}
