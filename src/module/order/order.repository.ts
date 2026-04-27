import { PrismaClient, Order, Prisma } from "@prisma/client";
import { IPaginatedResult } from "@/utils/query"; // Giả định dùng chung util với Product
import { OrderQuery } from "./order.type";

export interface IOrderRepository {
  createOrder(data: any): Promise<Order>;
  findAll(query: OrderQuery): Promise<IPaginatedResult<Order>>;
  findById(id: string): Promise<Order | null>;
  findByUserId(
    userId: string,
    query: OrderQuery,
  ): Promise<IPaginatedResult<Order>>;
  updateStatus(id: string, status: string): Promise<Order | null>;
  updateOrderItemReviewStatus(
    orderId: string,
    productId: string,
    isReview: boolean,
  ): Promise<any | null>;
  findOrderItemByOrderAndProduct(
    orderId: string,
    productId: string,
  ): Promise<any | null>;
  findAllCustomers(
    query: any,
  ): Promise<IPaginatedResult<any> | { newCustomersThisMonth: number }>;
}

export class OrderRepository implements IOrderRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Tạo đơn hàng
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
      // Tạo order với nested write items
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


  // Lấy danh sách đơn hàng (admin) với phân trang và lọc
  async findAll(query: OrderQuery): Promise<IPaginatedResult<Order>> {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    // Lọc theo trạng thái
    if (query.status) {
      where.status = query.status;
    }

    // Lọc theo trạng thái thanh toán
    if (query.paymentStatus) {
      where.paymentStatus = query.paymentStatus;
    }

    // Lọc theo khoảng ngày
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

    const [data, total, statusCounts] = await Promise.all([
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
      this.getStatusCounts(), // Đếm đơn hàng theo trạng thái
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      statusCounts,
    };
  }

  // Chi tiết đơn hàng
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

  // Lịch sử đơn hàng của khách hàng
  async findByUserId(
    userId: string,
    query: OrderQuery,
  ): Promise<IPaginatedResult<Order>> {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(query.limit ?? 10, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = { userId };

    // Lọc theo trạng thái
    if (query.status) {
      where.status = query.status;
    }

    // Xây dựng sort
    let orderBy: any = { createdAt: "desc" };
    switch (query.sort) {
      case "oldest":
        orderBy = { createdAt: "asc" };
        break;
      case "price-asc":
        orderBy = { totalPrice: "asc" };
        break;
      case "price-desc":
        orderBy = { totalPrice: "desc" };
        break;
      default:
        orderBy = { createdAt: "desc" };
        break;
    }

    const [data, total, statusCounts] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          _count: { select: { items: true } },
        },
      }),
      this.prisma.order.count({ where }),
      this.getStatusCounts(), // Lấy đếm đơn hàng theo từng trạng thái
    ]);

    return {
      data,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      statusCounts,
    };
  }

  // Cập nhật trạng thái
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

  // Cập nhật trạng thái đã đánh giá của OrderItem
  async updateOrderItemReviewStatus(
    orderId: string,
    productId: string,
    isReview: boolean,
  ): Promise<any | null> {
    try {
      return await this.prisma.orderItem.update({
        where: {
          orderId_productId: {
            orderId,
            productId,
          },
        },
        data: { isReview },
      });
    } catch (error: any) {
      if (error.code === "P2025") return null;
      throw error;
    }
  }

  // Tìm OrderItem bằng orderId + productId
  async findOrderItemByOrderAndProduct(
    orderId: string,
    productId: string,
  ): Promise<any | null> {
    try {
      return await this.prisma.orderItem.findUnique({
        where: {
          orderId_productId: {
            orderId,
            productId,
          },
        },
      });
    } catch (error: any) {
      return null;
    }
  }

  // Đếm đơn hàng theo trạng thái
  private async getStatusCounts(): Promise<Record<string, number>> {
    const results = await this.prisma.order.groupBy({
      by: ["status"],
      _count: true,
    });

    const statusCounts: Record<string, number> = {};
    results.forEach((result) => {
      statusCounts[result.status] = result._count;
    });

    return statusCounts;
  }

  // Danh sách khách hàng
  async findAllCustomers(
    query: any,
  ): Promise<IPaginatedResult<any> | { newCustomersThisMonth: number }> {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(query.limit ?? 10, 100);

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      isActive: true,
      role: "CUSTOMER",
    };

    // Search by name or email
    if (query.search) {
      where.OR = [
        { fullName: { contains: query.search, mode: "insensitive" } },
        { email: { contains: query.search, mode: "insensitive" } },
      ];
    }

    // Get all customers (calculate stats before pagination)
    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        avatar: true,
        isActive: true,
        emailVerified: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Tính ngày đầu và cuối tháng hiện tại
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    // Tối ưu: lấy stats bằng 1 query aggregate thay vì N query song song
    const orderStats = await this.prisma.order.groupBy({
      by: ["userId"],
      where: { status: "completed", userId: { in: users.map((u) => u.id) } },
      _sum: { totalPrice: true },
      _max: { createdAt: true },
      _min: { createdAt: true },
    });

    const statsMap = new Map(
      orderStats.map((s) => [
        s.userId,
        {
          totalSpent: Number(s._sum.totalPrice || 0),
          lastOrderDate: s._max.createdAt,
          firstOrderDate: s._min.createdAt,
        },
      ]),
    );

    const customerStats = users
      .map((user) => {
        const stats = statsMap.get(user.id) ?? {
          totalSpent: 0,
          lastOrderDate: null,
          firstOrderDate: null,
        };

        return {
          ...user,
          ...stats,
        };
      })
      .filter((u) => u.totalSpent > 0);

    // Sắp xếp theo tham số query
    let sorted = customerStats;
    switch (query.sort) {
      case "oldest":
        sorted = customerStats.sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
        );
        break;
      case "name-asc":
        sorted = customerStats.sort((a, b) =>
          a.fullName.localeCompare(b.fullName),
        );
        break;
      case "name-desc":
        sorted = customerStats.sort((a, b) =>
          b.fullName.localeCompare(a.fullName),
        );
        break;
      case "spent-asc":
        sorted = customerStats.sort((a, b) => a.totalSpent - b.totalSpent);
        break;
      case "spent-desc":
        sorted = customerStats.sort((a, b) => b.totalSpent - a.totalSpent);
        break;
      case "lastorder-asc":
        sorted = customerStats.sort((a, b) => {
          if (!a.lastOrderDate && !b.lastOrderDate) return 0;
          if (!a.lastOrderDate) return 1;
          if (!b.lastOrderDate) return -1;
          return (
            new Date(a.lastOrderDate).getTime() -
            new Date(b.lastOrderDate).getTime()
          );
        });
        break;
      case "lastorder-desc":
        sorted = customerStats.sort((a, b) => {
          if (!a.lastOrderDate && !b.lastOrderDate) return 0;
          if (!a.lastOrderDate) return 1;
          if (!b.lastOrderDate) return -1;
          return (
            new Date(b.lastOrderDate).getTime() -
            new Date(a.lastOrderDate).getTime()
          );
        });
        break;
      default:
        sorted = customerStats.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        );
        break;
    }

    // Apply pagination
    const start = (page - 1) * limit;
    const paginatedData = sorted.slice(start, start + limit);

    // Đếm số khách hàng mới trong tháng hiện tại
    const newCustomersThisMonth = customerStats.filter((c) => {
      return (
        c.firstOrderDate &&
        c.firstOrderDate >= monthStart &&
        c.firstOrderDate <= monthEnd
      );
    }).length;

    return {
      data: paginatedData,
      total: customerStats.length,
      page,
      limit,
      totalPages: Math.ceil(customerStats.length / limit),
      newCustomersThisMonth,
    };
  }
}
