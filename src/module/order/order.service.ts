import AppError from "@/utils/appError";
import { IOrderRepository } from "./order.repository";
import { ICartRepository } from "../cart/cart.repository";
import { OrderResponseDto } from "./order.response";
import { CheckoutDto } from "@/module/order/order.request";
import {
  getCache,
  setCache,
  deleteCache,
  deleteCacheByPattern,
} from "@/utils/cache";
import { IUserRepository } from "@/module/user/user.repository";
import { OrderQuery } from "./order.type";
import { IActivityLogService } from "@/module/activity-log/activity-log.service";
import { IEmailService } from "@/module/auth/email/email.service";
import { getIO } from "@/config/socket";
import { DashboardStats } from "./order.repository";

export interface IOrderService {
  checkout(userId: string, dto: CheckoutDto): Promise<OrderResponseDto>;
  findAll(query: OrderQuery): Promise<any>;
  findByUserId(userId: string, query: OrderQuery): Promise<any>;
  findById(orderId: string, userId: string): Promise<OrderResponseDto>;
  updateStatus(orderId: string, status: string): Promise<OrderResponseDto>;
  cancelOrder(orderId: string, userId: string): Promise<OrderResponseDto>;
  updateOrderItemReviewStatus(
    orderId: string,
    productId: string,
    isReview: boolean,
  ): Promise<any>;
  findAllCustomers(query: any): Promise<any>;
  getDashboardStats(): Promise<DashboardStats>;
}

export class OrderService implements IOrderService {
  private readonly CACHE_KEY = "orders";
  private readonly PRODUCT_CACHE_KEY = "products";
  private readonly CART_CACHE_KEY = "cart";
  private readonly CACHE_TTL_USER_LIST = 600; // 10 phút
  private readonly CACHE_TTL_DETAIL = 900; // 15 phút
  private readonly CACHE_TTL_ADMIN_LIST = 120; // 2 phút
  private readonly CACHE_TTL_CUSTOMER_LIST = 300; // 5 phút
  private readonly CACHE_TTL_DASHBOARD = 300; // 5 phút - dashboard (refresh mỗi 5 phút)

  constructor(
    private readonly orderRepo: IOrderRepository,
    private readonly cartRepo: ICartRepository,
    private readonly userRepo: IUserRepository,
    private readonly activityLogService: IActivityLogService,
    private readonly emailService: IEmailService,
  ) {}

  // Quy trình checkout: Kiểm tra giỏ -> Khóa giá -> Tạo đơn -> Làm trống giỏ
  async checkout(userId: string, dto: CheckoutDto): Promise<OrderResponseDto> {
    // Lấy giỏ hàng của khách
    const cart = await this.cartRepo.findByUserId(userId);
    if (!cart || cart.items.length === 0) {
      throw new AppError("Giỏ hàng của bạn đang trống", 400);
    }

    let totalPrice = 0;
    const orderItems = [];

    // Tính giá sản phẩm (snapshot)
    for (const item of cart.items) {
      const product = item.product;

      const itemPrice = Number(product.price);
      const subtotal = itemPrice * item.quantity;
      totalPrice += subtotal;

      // Chuẩn bị item cho order
      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: itemPrice,
        subtotal: subtotal,
      });
    }

    // Tạo order via repository transaction
    const order = await this.orderRepo.createOrder({
      userId,
      totalPrice,
      shippingAddress: dto.shippingAddress,
      shippingPhone: dto.shippingPhone,
      paymentMethod: dto.paymentMethod,
      items: orderItems,
    });

    // Làm trống giỏ hàng
    await this.cartRepo.clearCart(cart.id);

    // Ghi log + thông báo realtime cho Admin
    const message = `Có đơn hàng mới vừa được đặt với giá trị ${totalPrice.toLocaleString("vi-VN")}đ`;

    await this.activityLogService.create({
      type: "ORDER_CREATED",
      message,
      data: { orderId: order.id, totalPrice },
    });

    getIO().to("chat:admin").emit("order:new", {
      orderId: order.id,
      totalPrice,
      message,
      createdAt: order.createdAt,
    });

    // Xóa cache
    await Promise.all([
      deleteCache(`${this.CART_CACHE_KEY}:${userId}`),
      deleteCache(`${this.PRODUCT_CACHE_KEY}:all`),
      deleteCacheByPattern(`${this.CACHE_KEY}:list:${userId}:*`),
      deleteCacheByPattern(`${this.CACHE_KEY}:admin:all:*`),
      deleteCache(`${this.CACHE_KEY}:dashboard:stats`),
      ...orderItems.map((item) =>
        deleteCache(`${this.PRODUCT_CACHE_KEY}:id:${item.productId}`),
      ),
    ]);

    // Gửi email xác nhận đơn hàng cho khách hàng
    const user = await this.userRepo.findById(userId);
    console.log("User email for order confirmation:", user?.email); // Log email để debug
    if (user?.email) {
      try {
        // Fetch order với đầy đủ thông tin sản phẩm để gửi email
        const fullOrder = await this.orderRepo.findById(order.id);
        if (fullOrder) {
          await this.emailService.sendOrderConfirmation(user.email, {
            orderId: fullOrder.id,
            customerName: user.fullName || "Khách hàng",
            totalPrice: fullOrder.totalPrice,
            shippingAddress: fullOrder.shippingAddress,
            shippingPhone: fullOrder.shippingPhone,
            items: fullOrder.items || [],
            createdAt: fullOrder.createdAt,
          });
        }
      } catch (error) {
        // Log lỗi email nhưng không fail order
        console.error("Failed to send order confirmation email:", error);
      }
    }

    return OrderResponseDto.from(order);
  }

  // Lấy danh sách đơn hàng khách hàng
  async findByUserId(userId: string, query: OrderQuery): Promise<any> {
    // Kiểm tra cache
    const cacheKey = `${this.CACHE_KEY}:list:${userId}:${JSON.stringify(query)}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) return cached;

    const result = await this.orderRepo.findByUserId(userId, query);

    const response = {
      ...result,
      data: OrderResponseDto.fromList(result.data),
    };

    // Cache 10 phút (lịch sử đơn hàng - read thường xuyên, không cần quá mới)
    await setCache(cacheKey, response, this.CACHE_TTL_USER_LIST);

    return response;
  }

  // Chi tiết đơn hàng (có kiểm tra bảo mật)
  async findById(orderId: string, userId: string): Promise<OrderResponseDto> {
    // Kiểm tra cache
    const cacheKey = `${this.CACHE_KEY}:id:${orderId}`;
    const cached = await getCache<OrderResponseDto>(cacheKey);
    if (cached) return cached;

    const order = await this.orderRepo.findById(orderId);
    const user = await this.userRepo.findById(userId);

    // Kiểm tra quyền truy cập
    if (!order || (order.userId !== userId && user?.role === "CUSTOMER")) {
      throw new AppError("Không tìm thấy đơn hàng", 404);
    }

    const response = new OrderResponseDto(order);

    // Cache 15 phút (chi tiết đơn - read nhiều lần, ít thay đổi)
    await setCache(cacheKey, response, this.CACHE_TTL_DETAIL);

    return response;
  }

  // Danh sách đơn hàng (admin)
  async findAll(query: OrderQuery): Promise<any> {
    // Cache 2 phút (admin list - cần dữ liệu tương đối mới)
    const cacheKey = `${this.CACHE_KEY}:admin:all:${JSON.stringify(query)}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) return cached;

    const result = await this.orderRepo.findAll(query);

    const response = {
      ...result,
      data: OrderResponseDto.fromList(result.data),
    };

    await setCache(cacheKey, response, this.CACHE_TTL_ADMIN_LIST);

    return response;
  }

  // Cập nhật trạng thái đơn hàng (admin)
  async updateStatus(
    orderId: string,
    status: string,
  ): Promise<OrderResponseDto> {
    const order = await this.orderRepo.updateStatus(orderId, status);
    if (!order) {
      throw new AppError("Không tìm thấy đơn hàng để cập nhật", 404);
    }

    const response = OrderResponseDto.from(order);

    // Xóa cache liên quan
    await Promise.all([
      deleteCache(`${this.CACHE_KEY}:id:${orderId}`),
      deleteCacheByPattern(`${this.CACHE_KEY}:list:${order.userId}:*`),
      deleteCacheByPattern(`${this.CACHE_KEY}:admin:all:*`),
      deleteCacheByPattern(`${this.CACHE_KEY}:customers:*`),
      deleteCache(`${this.CACHE_KEY}:dashboard:stats`),
    ]);

    // Bắn socket realtime cho user
    getIO().to(`user:${order.userId}`).emit("order:status_updated", {
      orderId: order.id,
      status: order.status,
    });

    return response;
  }

  // Khách hàng tự hủy đơn hàng
  async cancelOrder(
    orderId: string,
    userId: string,
  ): Promise<OrderResponseDto> {
    const order = await this.orderRepo.findById(orderId);
    if (!order || order.userId !== userId) {
      throw new AppError("Không tìm thấy đơn hàng", 404);
    }

    if (order.status !== "pending") {
      throw new AppError(
        "Chỉ có thể hủy đơn hàng khi ở trạng thái chờ xử lý",
        400,
      );
    }

    const updatedOrder = await this.orderRepo.updateStatus(
      orderId,
      "cancelled",
    );
    if (!updatedOrder) {
      throw new AppError("Không thể hủy đơn hàng", 500);
    }

    const response = OrderResponseDto.from(updatedOrder);

    // Ghi log hoạt động
    const message = `Khách hàng vừa hủy đơn hàng #${updatedOrder.id.split("-")[0].toUpperCase()}`;
    await this.activityLogService.create({
      type: "ORDER_CANCELLED",
      message,
      data: { orderId: updatedOrder.id, totalPrice: updatedOrder.totalPrice },
    });

    // Thông báo cho Admin
    getIO().to("chat:admin").emit("order:cancelled", {
      orderId: updatedOrder.id,
      totalPrice: updatedOrder.totalPrice,
      message,
      createdAt: updatedOrder.updatedAt,
    });

    // Bắn event cập nhật realtime cho chính user đó (để update danh sách ở tab khác nếu có)
    getIO().to(`user:${userId}`).emit("order:status_updated", {
      orderId: updatedOrder.id,
      status: updatedOrder.status,
    });

    // Xóa cache
    await Promise.all([
      deleteCache(`${this.CACHE_KEY}:id:${orderId}`),
      deleteCacheByPattern(`${this.CACHE_KEY}:list:${userId}:*`),
      deleteCacheByPattern(`${this.CACHE_KEY}:admin:all:*`),
      deleteCacheByPattern(`${this.CACHE_KEY}:customers:*`),
      deleteCache(`${this.CACHE_KEY}:dashboard:stats`),
    ]);

    return response;
  }

  // Danh sách khách hàng (admin)
  async findAllCustomers(query: any): Promise<any> {
    // Kiểm tra cache
    const cacheKey = `${this.CACHE_KEY}:customers:${JSON.stringify(query)}`;
    const cached = await getCache<any>(cacheKey);
    if (cached) return cached;

    const result = await this.orderRepo.findAllCustomers(query);

    // Cache 5 phút (danh sách khách - read thường, không cần quá mới)
    await setCache(cacheKey, result, this.CACHE_TTL_CUSTOMER_LIST);

    return result;
  }

  // Cập nhật trạng thái đã đánh giá của OrderItem
  async updateOrderItemReviewStatus(
    orderId: string,
    productId: string,
    isReview: boolean,
  ): Promise<any> {
    const updated = await this.orderRepo.updateOrderItemReviewStatus(
      orderId,
      productId,
      isReview,
    );
    if (!updated) {
      throw new AppError("OrderItem không tồn tại", 404);
    }

    // Invalidate cache
    await Promise.all([
      deleteCache(`${this.CACHE_KEY}:id:${orderId}`),
      deleteCacheByPattern(`${this.CACHE_KEY}:list:*`),
    ]);

    return updated;
  }

  // Dashboard stats (admin) — cache 5 phút
  async getDashboardStats(): Promise<DashboardStats> {
    const cacheKey = `${this.CACHE_KEY}:dashboard:stats`;
    const cached = await getCache<DashboardStats>(cacheKey);
    if (cached) return cached;

    const stats = await this.orderRepo.getDashboardStats();
    await setCache(cacheKey, stats, this.CACHE_TTL_DASHBOARD);

    return stats;
  }
}
