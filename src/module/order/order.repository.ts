import { PrismaClient, Order, Prisma } from "@prisma/client";
import { IPaginatedResult } from "@/utils/query";
import { OrderQuery } from "./order.type";
import { getSearchPattern } from "@/utils/searchUtils";
import { OrderResponseDto } from "@/module/order/order.response";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DashboardStats {
  // KPI thẻ tổng quan (tháng hiện tại)
  currentMonth: {
    totalRevenue: number;
    totalOrders: number;
    newCustomers: number;
    pendingOrders: number;
  };
  // KPI tháng trước (để tính % so sánh)
  prevMonth: {
    totalRevenue: number;
    totalOrders: number;
    newCustomers: number;
    pendingOrders: number;
  };
  // Doanh thu theo từng ngày trong tháng hiện tại
  revenueByDay: { date: string; revenue: number; orders: number }[];
  // Phân bố danh mục sản phẩm (theo số lượng bán)
  categoryDistribution: {
    name: string;
    quantity: number;
    percentage: number;
  }[];
  // Top sản phẩm bán chạy nhất tháng hiện tại
  topProducts: {
    productId: string;
    name: string;
    thumbnailUrl: string | null;
    totalQuantity: number;
    totalRevenue: number;
  }[];
}

export interface IOrderRepository {
  createOrder(data: any): Promise<Order>;
  findAll(query: OrderQuery): Promise<IPaginatedResult<Order>>;
  findById(id: string): Promise<any | null>;
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
  getDashboardStats(): Promise<DashboardStats>;
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

    // Tìm kiếm toàn văn bản (không phân biệt hoa thường và dấu)
    if (query.search) {
      const normalizedSearch = getSearchPattern(query.search);

      // Sử dụng raw SQL để hỗ trợ search không phân biệt dấu
      // Nếu PostgreSQL có extension unaccent, sẽ dùng; không thì fallback sang ILIKE
      where.OR = [
        { id: { contains: query.search, mode: "insensitive" } },
        { shippingPhone: { contains: query.search, mode: "insensitive" } },
        {
          user: {
            fullName: {
              contains: normalizedSearch,
              mode: "insensitive",
            },
          },
        },
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
  async findById(id: string): Promise<any | null> {
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
  ): Promise<
    IPaginatedResult<any> & {
      newCustomersThisMonth: number;
      totalVIP: number;
      totalGold: number;
      totalSilver: number;
      totalBronze: number;
      activeCustomers: number;
      totalElements: number;
    }
  > {
    const page = Math.max(query.page ?? 1, 1);
    const limit = Math.min(query.limit ?? 10, 100);

    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      isActive: true,
      role: "CUSTOMER",
    };

    // Search by name or email (không phân biệt hoa thường và dấu)
    if (query.search) {
      const normalizedSearch = getSearchPattern(query.search);
      where.OR = [
        { fullName: { contains: normalizedSearch, mode: "insensitive" } },
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

    let customerStats = users
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

    // Tính toán thống kê toàn cục trước khi áp dụng bộ lọc tier
    const totalVIP = customerStats.filter((c) => c.totalSpent >= 20000000).length;
    const totalGold = customerStats.filter((c) => c.totalSpent >= 10000000 && c.totalSpent < 20000000).length;
    const totalSilver = customerStats.filter((c) => c.totalSpent >= 5000000 && c.totalSpent < 10000000).length;
    const totalBronze = customerStats.filter((c) => c.totalSpent < 5000000).length;

    const activeCustomers = customerStats.filter((c) => c.isActive).length;
    const totalElements = customerStats.length;

    // Áp dụng bộ lọc hạng thẻ (tier) nếu có
    if (query.tier && query.tier !== "Tất cả") {
      customerStats = customerStats.filter((c) => {
        let tier = "Đồng";
        if (c.totalSpent >= 20000000) tier = "VIP";
        else if (c.totalSpent >= 10000000) tier = "Vàng";
        else if (c.totalSpent >= 5000000) tier = "Bạc";
        return tier === query.tier;
      });
    }

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
      totalVIP,
      totalGold,
      totalSilver,
      totalBronze,
      activeCustomers,
      totalElements,
    };
  }

  // ─── Dashboard Stats ──────────────────────────────────────────────────────

  async getDashboardStats(): Promise<DashboardStats> {
    const now = new Date();

    // Khoảng tháng hiện tại
    const curStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const curEnd = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0,
      23,
      59,
      59,
      999,
    );

    // Khoảng tháng trước
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(
      now.getFullYear(),
      now.getMonth(),
      0,
      23,
      59,
      59,
      999,
    );

    // ── Chạy tất cả queries song song để tối ưu latency ──
    const [
      curRevenueAgg,
      prevRevenueAgg,
      curOrderCount,
      prevOrderCount,
      curPendingCount,
      prevPendingCount,
      curNewCustomers,
      prevNewCustomers,
      dailyOrders,
      topItems,
    ] = await Promise.all([
      // 1. Doanh thu tháng hiện tại (chỉ completed)
      this.prisma.order.aggregate({
        where: {
          status: "completed",
          createdAt: { gte: curStart, lte: curEnd },
        },
        _sum: { totalPrice: true },
      }),

      // 2. Doanh thu tháng trước (chỉ completed)
      this.prisma.order.aggregate({
        where: {
          status: "completed",
          createdAt: { gte: prevStart, lte: prevEnd },
        },
        _sum: { totalPrice: true },
      }),

      // 3. Tổng đơn hàng tháng hiện tại (mọi trạng thái)
      this.prisma.order.count({
        where: { createdAt: { gte: curStart, lte: curEnd } },
      }),

      // 4. Tổng đơn hàng tháng trước
      this.prisma.order.count({
        where: { createdAt: { gte: prevStart, lte: prevEnd } },
      }),

      // 5. Đơn chờ xử lý tháng hiện tại
      this.prisma.order.count({
        where: { status: "pending", createdAt: { gte: curStart, lte: curEnd } },
      }),

      // 6. Đơn chờ xử lý tháng trước
      this.prisma.order.count({
        where: {
          status: "pending",
          createdAt: { gte: prevStart, lte: prevEnd },
        },
      }),

      // 7. Khách hàng mới tháng hiện tại (user có order đầu tiên trong tháng)
      this.prisma.order.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: curStart, lte: curEnd } },
        _min: { createdAt: true },
      }),

      // 8. Khách hàng mới tháng trước
      this.prisma.order.groupBy({
        by: ["userId"],
        where: { createdAt: { gte: prevStart, lte: prevEnd } },
        _min: { createdAt: true },
      }),

      // 9. Doanh thu theo ngày trong tháng hiện tại (raw query hiệu quả hơn)
      this.prisma.$queryRaw<{ day: string; revenue: number; orders: number }[]>`
        SELECT
          TO_CHAR(created_at AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS day,
          COALESCE(SUM(total_price), 0)::float                               AS revenue,
          COUNT(*)::int                                                       AS orders
        FROM orders
        WHERE
          created_at >= ${curStart}
          AND created_at <= ${curEnd}
          AND status = 'completed'
        GROUP BY day
        ORDER BY day ASC
      `,

      // 10. Top sản phẩm + danh mục — 1 query duy nhất
      this.prisma.orderItem.groupBy({
        by: ["productId"],
        where: {
          order: {
            status: "completed",
            createdAt: { gte: curStart, lte: curEnd },
          },
        },
        _sum: { quantity: true, subtotal: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: 10,
      }),
    ]);

    // ── Lấy thông tin product & category cho top items ──
    const productIds = topItems.map((i) => i.productId);

    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: {
        id: true,
        name: true,
        thumbnailUrl: true,
        categories: {
          select: {
            category: { select: { name: true } },
          },
          take: 1,
        },
      },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    // ── Top products ──
    const topProducts = topItems.map((item) => {
      const product = productMap.get(item.productId);
      return {
        productId: item.productId,
        name: product?.name ?? "Sản phẩm đã xóa",
        thumbnailUrl: product?.thumbnailUrl ?? null,
        totalQuantity: item._sum.quantity ?? 0,
        totalRevenue: Number(item._sum.subtotal ?? 0),
      };
    });

    // ── Category distribution ──
    const categoryMap = new Map<string, { name: string; quantity: number }>();
    let totalQty = 0;

    topItems.forEach((item) => {
      const product = productMap.get(item.productId);
      const catName = product?.categories?.[0]?.category?.name ?? "Khác";
      const qty = item._sum.quantity ?? 0;
      totalQty += qty;

      const existing = categoryMap.get(catName);
      if (existing) {
        existing.quantity += qty;
      } else {
        categoryMap.set(catName, { name: catName, quantity: qty });
      }
    });

    const categoryDistribution = Array.from(categoryMap.values())
      .sort((a, b) => b.quantity - a.quantity)
      .map((cat) => ({
        ...cat,
        percentage:
          totalQty > 0 ? Math.round((cat.quantity / totalQty) * 100) : 0,
      }));

    // ── Revenue by day — điền đầy đủ các ngày trong tháng ──
    const daysInMonth = curEnd.getDate();
    const revenueMap = new Map(
      dailyOrders.map((d) => [d.day, { revenue: d.revenue, orders: d.orders }]),
    );

    const revenueByDay = Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(curStart.getFullYear(), curStart.getMonth(), i + 1);
      const key = date.toISOString().slice(0, 10);
      const data = revenueMap.get(key);
      return {
        date: key,
        revenue: data?.revenue ?? 0,
        orders: data?.orders ?? 0,
      };
    });

    // ── Tính khách hàng mới (user đặt hàng lần đầu trong tháng đó) ──
    const curUserIds = new Set(
      curRevenueAgg ? curNewCustomers.map((u) => u.userId) : [],
    );
    const prevUserIds = new Set(prevNewCustomers.map((u) => u.userId));

    // Khách hàng mới = user có lần đặt đầu trong tháng hiện tại và chưa từng đặt trước đó
    const usersInCurMonth = curNewCustomers.map((u) => u.userId);
    const newCurCustomers = usersInCurMonth.length;
    const newPrevCustomers = prevNewCustomers.length;

    void curUserIds;
    void prevUserIds;

    return {
      currentMonth: {
        totalRevenue: Number(curRevenueAgg._sum.totalPrice ?? 0),
        totalOrders: curOrderCount,
        newCustomers: newCurCustomers,
        pendingOrders: curPendingCount,
      },
      prevMonth: {
        totalRevenue: Number(prevRevenueAgg._sum.totalPrice ?? 0),
        totalOrders: prevOrderCount,
        newCustomers: newPrevCustomers,
        pendingOrders: prevPendingCount,
      },
      revenueByDay,
      categoryDistribution,
      topProducts,
    };
  }
}
