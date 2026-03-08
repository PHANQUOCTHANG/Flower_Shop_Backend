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

  // Tạo đơn hàng kèm OrderItems và trừ tồn kho (Transaction)
  async createOrder(data: {
    userId: string;
    totalPrice: number;
    shippingAddress: string;
    shippingPhone: string;
    paymentMethod: string;
    items: { productId: string; quantity: number; price: number; subtotal: number }[];
  }): Promise<Order> {
    return this.prisma.$transaction(async (tx) => {
      // 1. Tạo Order và OrderItems (Nested Write giống Product)
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

      // 2. Cập nhật Stock cho từng sản phẩm (Decrement)
      for (const item of data.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockQuantity: { decrement: item.quantity },
          },
        });
      }

      return order;
    });
  }

  // Lấy danh sách tất cả đơn hàng (Admin) kèm phân trang và lọc
  async findAll(query: any): Promise<IPaginatedResult<Order>> {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.search) {
      where.OR = [
        { id: { contains: query.search, mode: "insensitive" } },
        { shippingPhone: { contains: query.search } },
        { user: { fullName: { contains: query.search, mode: "insensitive" } } }
      ];
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
        orderBy: { createdAt: "desc" },
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
  async findByUserId(userId: string, query: any): Promise<IPaginatedResult<Order>> {
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
          _count: { select: { items: true } }
        }
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