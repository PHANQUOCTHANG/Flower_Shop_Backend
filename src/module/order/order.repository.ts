import { PrismaClient, Order, Prisma } from "@prisma/client";
import { IPaginatedResult } from "@/utils/query"; // Giả định dùng chung util với Product

export interface IOrderRepository {
  createOrder(data: any): Promise<Order>;
  findAll(query: any): Promise<IPaginatedResult<Order>>;
  findById(id: string): Promise<Order | null>;
  findByUserId(userId: string, query: any): Promise<IPaginatedResult<Order>>;
  updateStatus(id: string, status: string): Promise<Order | null>;
  findAllCustomers(query: any): Promise<IPaginatedResult<any>>;
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
  async findAll(query: any): Promise<IPaginatedResult<Order>> {
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
    query: any,
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
  async findAllCustomers(query: any): Promise<IPaginatedResult<any>> {
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

    // Calculate total spent and last order date
    const customerStats = await Promise.all(
      users.map(async (user) => {
        const [totalSpent, lastOrderDate] = await Promise.all([
          this.prisma.order.aggregate({
            where: {
              userId: user.id,
              status: "completed",
            },
            _sum: {
              totalPrice: true,
            },
          }),
          this.prisma.order.findFirst({
            where: {
              userId: user.id,
            },
            orderBy: {
              createdAt: "desc",
            },
            select: {
              createdAt: true,
            },
          }),
        ]);

        return {
          ...user,
          totalSpent: Number(totalSpent._sum.totalPrice || 0),
          lastOrderDate: lastOrderDate?.createdAt || null,
        };
      }),
    );

    // Filter: only customers with at least 1 completed order
    const filteredStats = customerStats.filter((stat) => stat.totalSpent > 0);

    // Sort by parameter
    let sorted = filteredStats;
    switch (query.sort) {
      case "oldest":
        sorted = filteredStats.sort(
          (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
        );
        break;
      case "name-asc":
        sorted = filteredStats.sort((a, b) =>
          a.fullName.localeCompare(b.fullName),
        );
        break;
      case "name-desc":
        sorted = filteredStats.sort((a, b) =>
          b.fullName.localeCompare(a.fullName),
        );
        break;
      case "spent-asc":
        sorted = filteredStats.sort((a, b) => a.totalSpent - b.totalSpent);
        break;
      case "spent-desc":
        sorted = filteredStats.sort((a, b) => b.totalSpent - a.totalSpent);
        break;
      case "lastorder-asc":
        sorted = filteredStats.sort((a, b) => {
          if (!a.lastOrderDate && !b.lastOrderDate) return 0;
          if (!a.lastOrderDate) return 1;
          if (!b.lastOrderDate) return -1;
          return a.lastOrderDate.getTime() - b.lastOrderDate.getTime();
        });
        break;
      case "lastorder-desc":
        sorted = filteredStats.sort((a, b) => {
          if (!a.lastOrderDate && !b.lastOrderDate) return 0;
          if (!a.lastOrderDate) return 1;
          if (!b.lastOrderDate) return -1;
          return b.lastOrderDate.getTime() - a.lastOrderDate.getTime();
        });
        break;
      default:
        sorted = filteredStats.sort(
          (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        );
        break;
    }

    // Apply pagination
    const start = (page - 1) * limit;
    const paginatedData = sorted.slice(start, start + limit);

    return {
      data: paginatedData,
      total: filteredStats.length,
      page,
      limit,
      totalPages: Math.ceil(filteredStats.length / limit),
    };
  }
}
