import AppError from "@/utils/appError";
import { IOrderRepository } from "./order.repository";
import { ICampaignRepository } from "../campaign/campaign.repository";
import { ICartRepository } from "../cart/cart.repository";
import { OrderResponseDto } from "./order.response";
import { CheckoutDto } from "@/module/order/order.request";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import {
  getCache,
  setCache,
  deleteCache,
  deleteCacheByPattern,
} from "@/utils/cache";
import { IUserRepository } from "@/module/user/user.repository";
import { OrderQuery, OnlinePaymentGateway } from "./order.type";
import { IActivityLogService } from "@/module/activity-log/activity-log.service";
import { IEmailService } from "@/module/auth/email/email.service";
import { getIO } from "@/config/socket";
import { DashboardStats } from "./order.repository";
import { vnpayCleanupQueue, zalopayCleanupQueue } from "@/config/queue";

// Nhãn hiển thị + queue dọn dẹp tương ứng cho từng cổng thanh toán online
const GATEWAY_LABELS: Record<OnlinePaymentGateway, string> = {
  vnpay: "VNPay",
  zalopay: "ZaloPay",
};
const CLEANUP_QUEUES: Record<OnlinePaymentGateway, typeof vnpayCleanupQueue> = {
  vnpay: vnpayCleanupQueue,
  zalopay: zalopayCleanupQueue,
};

// ─── State Machine: Các transition trạng thái hợp lệ ────────────────────────
// Key: trạng thái hiện tại → Value: danh sách trạng thái có thể chuyển sang
// LƯU Ý: OrderStatus là Prisma enum — giá trị ở tầng JS luôn UPPERCASE
// (chỉ giá trị lưu trong DB mới lowercase qua @map), nên các key/value ở đây
// phải khớp OrderStatus.* chứ không phải chuỗi lowercase.
// Thanh toán online (VNPay/ZaloPay) (PENDING_PAYMENT → PENDING) được xác nhận qua
// confirmOnlinePayment(), không đi qua state machine này.
const ORDER_STATUS_TRANSITIONS: Record<string, string[]> = {
  [OrderStatus.PENDING_PAYMENT]: [OrderStatus.CANCELLED],                     // Chờ TT VNPay → Hủy (hết hạn/khách hủy)
  [OrderStatus.PENDING]:         [OrderStatus.PROCESSING, OrderStatus.CANCELLED], // Chờ xử lý → Đang xử lý | Hủy
  [OrderStatus.PROCESSING]:      [OrderStatus.SHIPPING, OrderStatus.CANCELLED],   // Đang xử lý → Đang giao | Hủy
  [OrderStatus.SHIPPING]:        [OrderStatus.COMPLETED, OrderStatus.CANCELLED],  // Đang giao → Hoàn tất | Hủy
  [OrderStatus.COMPLETED]:       [],                                           // Hoàn tất — không thể thay đổi
  [OrderStatus.CANCELLED]:       [],                                           // Đã hủy — không thể thay đổi
};

export interface IOrderService {
  checkout(userId: string, dto: CheckoutDto): Promise<OrderResponseDto>;
  createPendingOnlinePaymentOrder(
    userId: string,
    dto: CheckoutDto,
    gateway: OnlinePaymentGateway,
  ): Promise<OrderResponseDto>;
  confirmOnlinePayment(
    gateway: OnlinePaymentGateway,
    orderId: string,
    paidAmount?: number,
  ): Promise<OrderResponseDto>;
  findAll(query: OrderQuery): Promise<any>;
  findByUserId(userId: string, query: OrderQuery): Promise<any>;
  findById(orderId: string, userId: string): Promise<OrderResponseDto>;
  updateStatus(orderId: string, status: OrderStatus): Promise<OrderResponseDto>;
  cancelOrder(orderId: string, userId: string): Promise<OrderResponseDto>;
  cancelExpiredOnlinePaymentOrder(orderId: string, gateway: OnlinePaymentGateway): Promise<void>;
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
  private readonly CART_CACHE_KEY = "cart";
  private readonly CACHE_TTL_USER_LIST = 180; // 3 phút — đơn hàng thay đổi trạng thái thường xuyên
  private readonly CACHE_TTL_DETAIL = 120; // 2 phút — detail đơn hàng cần phản ánh trạng thái mới nhanh
  private readonly CACHE_TTL_ADMIN_LIST = 120; // 2 phút
  private readonly CACHE_TTL_CUSTOMER_LIST = 300; // 5 phút
  private readonly CACHE_TTL_DASHBOARD = 300; // 5 phút - dashboard (refresh mỗi 5 phút)

  constructor(
    private readonly orderRepo: IOrderRepository,
    private readonly cartRepo: ICartRepository,
    private readonly userRepo: IUserRepository,
    private readonly activityLogService: IActivityLogService,
    private readonly emailService: IEmailService,
    private readonly campaignRepo: ICampaignRepository,
  ) {}

  // Quy trình checkout: Kiểm tra giỏ -> Khóa giá -> Tạo đơn -> Làm trống giỏ
  async checkout(userId: string, dto: CheckoutDto): Promise<OrderResponseDto> {
    // 1. Kiểm tra xem có đơn hàng thanh toán online nào đang chờ không (Fix bug trùng đơn)
    const pendingOnlinePaymentOrder = await this.orderRepo.findFirst({
      where: { userId, status: OrderStatus.PENDING_PAYMENT },
    });
    if (pendingOnlinePaymentOrder) {
      // Tự động hủy đơn hàng cũ đang chờ thanh toán
      await this.orderRepo.updateStatus(pendingOnlinePaymentOrder.id, OrderStatus.CANCELLED);
    }

    // Lấy giỏ hàng của khách
    const cart = await this.cartRepo.findByUserId(userId);
    if (!cart || cart.items.length === 0) {
      throw new AppError("Giỏ hàng của bạn đang trống", 400);
    }

    let totalPrice = 0;
    const orderItems = [];

    // Cache campaign 60s — hot path (mỗi checkout đều gọi), giảm tải DB
    const CAMPAIGN_CACHE_KEY = `${this.CACHE_KEY}:active_campaign`;
    let activeCampaign = await getCache<any>(CAMPAIGN_CACHE_KEY);
    if (!activeCampaign) {
      activeCampaign = await this.campaignRepo.findActiveCampaign();
      if (activeCampaign) await setCache(CAMPAIGN_CACHE_KEY, activeCampaign, 60);
    }

    // Tính giá sản phẩm (snapshot) + thu thập campaign items cần tăng soldQuantity
    const campaignItemsToIncrement: { campaignItemId: string; quantity: number }[] = [];
    for (const item of cart.items) {
      const product = item.product;

      let itemPrice = Number(product.price);
      if (activeCampaign) {
        const saleItem = activeCampaign.items.find((i: any) => i.productId === product.id);
        if (saleItem) {
          itemPrice = Number(saleItem.salePrice);
          // Thu thập để increment sau khi order tạo thành công
          campaignItemsToIncrement.push({ campaignItemId: saleItem.id, quantity: item.quantity });
        }
      }
      const subtotal = itemPrice * item.quantity;
      totalPrice += subtotal;

      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: itemPrice,
        subtotal: subtotal,
      });
    }

    // Tạo order + xóa cart trong cùng 1 transaction (atomic)
    const order = await this.orderRepo.createOrder(
      {
        userId,
        totalPrice,
        shippingAddress: dto.shippingAddress,
        shippingPhone: dto.shippingPhone,
        paymentMethod: dto.paymentMethod,
        items: orderItems,
      },
      cart.id, // Truyền cartId để clearCart nằm trong cùng transaction
    );

    // Tăng soldQuantity cho các sản phẩm campaign (fire-and-forget, không block response)
    if (campaignItemsToIncrement.length > 0) {
      this.campaignRepo.incrementSoldQuantity(campaignItemsToIncrement).catch((err) =>
        console.error("[Campaign] Không thể cập nhật soldQuantity:", err),
      );
    }

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
    // NOTE: Không xóa products cache vì shop hoa không quản lý stock —
    //       thông tin sản phẩm không thay đổi khi checkout.
    await Promise.all([
      deleteCache(`${this.CART_CACHE_KEY}:${userId}`),             // Giỏ hàng vừa được làm trống
      deleteCacheByPattern(`${this.CACHE_KEY}:list:${userId}:*`), // Đơn hàng mới của user
      deleteCacheByPattern(`${this.CACHE_KEY}:admin:all:*`),      // Danh sách đơn admin
      deleteCache(`${this.CACHE_KEY}:dashboard:stats`),           // Thống kê dashboard
    ]);

    // Gửi email xác nhận đơn hàng cho khách hàng
    const user = await this.userRepo.findById(userId);
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
      } catch (error: any) {
        // Không fail order khi gửi email lỗi — chỉ log qua logger (không dùng console)
        // logger.warn(`[Order] Failed to send confirmation email: ${error.message}`);
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

    // Cache 3 phút (lịch sử đơn hàng - read thường xuyên, không cần quá mới)
    await setCache(cacheKey, response, this.CACHE_TTL_USER_LIST);

    return response;
  }

  // Chi tiết đơn hàng (có kiểm tra bảo mật)
  async findById(orderId: string, userId: string): Promise<OrderResponseDto> {
    // Cache key tách biệt: admin dùng key riêng, customer dùng key riêng
    const cacheKey = `${this.CACHE_KEY}:id:${orderId}:user:${userId}`;
    const cached = await getCache<OrderResponseDto>(cacheKey);
    if (cached) return cached;

    // Cache miss → lấy từ DB
    const order = await this.orderRepo.findById(orderId);
    const user = await this.userRepo.findById(userId);

    // Kiểm tra quyền truy cập TRƯỚC khi ghi cache
    // SECURITY FIX: Cache key phải gắn với userId để Admin và Customer không share cache
    if (!order || (order.userId !== userId && user?.role === "CUSTOMER")) {
      throw new AppError("Không tìm thấy đơn hàng", 404);
    }

    const response = new OrderResponseDto(order);

    // Cache 2 phút (chi tiết đơn - read nhiều lần, ít thay đổi)
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
    status: OrderStatus,
  ): Promise<OrderResponseDto> {
    // Lấy order hiện tại để kiểm tra trạng thái
    const currentOrder = await this.orderRepo.findById(orderId);
    if (!currentOrder) {
      throw new AppError("Không tìm thấy đơn hàng", 404);
    }

    // Validate state machine transition
    const allowedNextStatuses = ORDER_STATUS_TRANSITIONS[currentOrder.status] ?? [];
    if (!allowedNextStatuses.includes(status)) {
      throw new AppError(
        `Không thể chuyển đơn hàng từ "${currentOrder.status}" sang "${status}". ` +
        `Các trạng thái hợp lệ: ${allowedNextStatuses.length > 0 ? allowedNextStatuses.join(", ") : "(không có)"}`,
        400,
      );
    }

    const order = await this.orderRepo.updateStatus(orderId, status);
    if (!order) {
      throw new AppError("Không tìm thấy đơn hàng để cập nhật", 404);
    }

    const response = OrderResponseDto.from(order);

    // Xóa cache liên quan
    await Promise.all([
      // Xóa tất cả cache detail của orderId này (cả key admin + customer)
      deleteCacheByPattern(`${this.CACHE_KEY}:id:${orderId}:user:*`),
      deleteCacheByPattern(`${this.CACHE_KEY}:list:${order.userId}:*`),
      deleteCacheByPattern(`${this.CACHE_KEY}:admin:all:*`),
      deleteCacheByPattern(`${this.CACHE_KEY}:customers:*`),
      deleteCache(`${this.CACHE_KEY}:dashboard:stats`),
    ]);

    // Bắn socket realtime cho user
    getIO().to(`user:${order.userId}`).emit("order:status_updated", {
      orderId: order.id,
      status: response.status,
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

    // Đơn thanh toán online chỉ được hủy nếu đang pending_payment, đơn khác phải pending
    if (order.status === OrderStatus.PENDING_PAYMENT) {
      // Hợp lệ, tiếp tục hủy
    } else if (order.status !== OrderStatus.PENDING) {
      throw new AppError("Không thể hủy đơn hàng này", 400);
    }

    const updatedOrder = await this.orderRepo.updateStatus(
      orderId,
      OrderStatus.CANCELLED,
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
      status: response.status,
    });

    // Xóa cache
    await Promise.all([
      deleteCacheByPattern(`${this.CACHE_KEY}:id:${orderId}:user:*`),
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

    // Invalidate cache — xóa đúng user thay vì wildcard toàn bộ
    // Lấy userId từ order để xóa đúng cache của user sở hữu
    const orderForCache = await this.orderRepo.findById(orderId);
    await Promise.all([
      deleteCacheByPattern(`${this.CACHE_KEY}:id:${orderId}:user:*`),
      orderForCache?.userId
        ? deleteCacheByPattern(`${this.CACHE_KEY}:list:${orderForCache.userId}:*`)
        : deleteCacheByPattern(`${this.CACHE_KEY}:list:*`), // fallback an toàn
    ]);

    return updated;
  }

  // ─── Cổng thanh toán online (VNPay/ZaloPay): Tạo đơn hàng chờ thanh toán ─────
  // Chỉ tạo order với status="pending_payment"
  // KHÔNG xóa giỏ hàng, KHÔNG gửi email, KHÔNG thông báo admin
  async createPendingOnlinePaymentOrder(
    userId: string,
    dto: CheckoutDto,
    gateway: OnlinePaymentGateway,
  ): Promise<OrderResponseDto> {
    // Kiểm tra xem có đơn hàng chờ thanh toán online nào đang chờ không (dù VNPay hay ZaloPay)
    const existingPendingOrder = await this.orderRepo.findFirst({
      where: { userId, status: OrderStatus.PENDING_PAYMENT },
    });
    if (existingPendingOrder) {
      // Tự động hủy đơn hàng cũ đang chờ thanh toán
      await this.orderRepo.updateStatus(existingPendingOrder.id, OrderStatus.CANCELLED);
    }

    const cart = await this.cartRepo.findByUserId(userId);
    if (!cart || cart.items.length === 0) {
      throw new AppError("Giỏ hàng của bạn đang trống", 400);
    }

    let totalPrice = 0;

    // Cache campaign 60s — dùng chung cache key với checkout thường
    const CAMPAIGN_CACHE_KEY = `${this.CACHE_KEY}:active_campaign`;
    let activeCampaign = await getCache<any>(CAMPAIGN_CACHE_KEY);
    if (!activeCampaign) {
      activeCampaign = await this.campaignRepo.findActiveCampaign();
      if (activeCampaign) await setCache(CAMPAIGN_CACHE_KEY, activeCampaign, 60);
    }

    const campaignItemsToIncrement: { campaignItemId: string; quantity: number }[] = [];
    const orderItems = [];

    for (const item of cart.items) {
      const product = item.product;
      let itemPrice = Number(product.price);
      if (activeCampaign) {
        const saleItem = activeCampaign.items.find((i: any) => i.productId === product.id);
        if (saleItem) {
          itemPrice = Number(saleItem.salePrice);
          campaignItemsToIncrement.push({ campaignItemId: saleItem.id, quantity: item.quantity });
        }
      }
      const subtotal = itemPrice * item.quantity;
      totalPrice += subtotal;
      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: itemPrice,
        subtotal,
      });
    }

    // Tạo order với status="pending_payment" — chưa xác nhận thanh toán
    const order = await this.orderRepo.createOrder({
      userId,
      totalPrice,
      shippingAddress: dto.shippingAddress,
      shippingPhone: dto.shippingPhone,
      paymentMethod: dto.paymentMethod,
      status: OrderStatus.PENDING_PAYMENT,
      items: orderItems,
    });

    // Chỉ invalidate cache đơn hàng (giỏ hàng giữ nguyên)
    await Promise.all([
      deleteCacheByPattern(`${this.CACHE_KEY}:list:${userId}:*`),
      deleteCacheByPattern(`${this.CACHE_KEY}:admin:all:*`),
    ]);

    // Schedule cleanup job sau 15 phút — hủy nếu vẫn pending_payment
    await CLEANUP_QUEUES[gateway].add(
      `cleanup-${gateway}-order`,
      { orderId: order.id },
      {
        delay: 15 * 60 * 1000, // 15 phút
        jobId: `${gateway}:cleanup:${order.id}`, // Dedup — mỗi order chỉ 1 job cleanup
      },
    );

    return OrderResponseDto.from(order);
  }

  // ─── Cổng thanh toán online (VNPay/ZaloPay): Xác nhận thanh toán thành công ─
  // Gọi khi IPN/callback xác nhận thanh toán OK
  // Lúc này mới: cập nhật status, xóa giỏ hàng, gửi email, thông báo admin
  async confirmOnlinePayment(
    gateway: OnlinePaymentGateway,
    orderId: string,
    paidAmount?: number,
  ): Promise<OrderResponseDto> {
    const gatewayLabel = GATEWAY_LABELS[gateway];

    // 1. Lấy order từ DB
    const order = await this.orderRepo.findById(orderId);
    if (!order) {
      throw new AppError("Không tìm thấy đơn hàng", 404);
    }

    // Tránh xử lý trùng (IPN/callback có thể gọi nhiều lần)
    if (order.paymentStatus === PaymentStatus.PAID) {
      return OrderResponseDto.from(order);
    }

    // Defense-in-depth: số tiền cổng thanh toán báo về (đã ký HMAC, khó giả mạo) phải khớp
    // với giá trị đơn hàng lưu trong DB — phòng trường hợp orderId bị đoán/dò và
    // logic tạo URL thanh toán ở nơi khác vô tình gửi sai amount.
    if (paidAmount !== undefined && Math.round(paidAmount) !== Math.round(Number(order.totalPrice))) {
      throw new AppError(
        `Số tiền thanh toán ${gatewayLabel} (${paidAmount}) không khớp với giá trị đơn hàng (${order.totalPrice})`,
        400,
      );
    }

    // Chặn hồi sinh đơn đã bị hủy: nếu user mở 2 lần checkout online,
    // đơn cũ đang PENDING_PAYMENT sẽ tự bị hủy (xem checkout()/createPendingOnlinePaymentOrder()).
    // Nếu IPN/callback của đơn cũ đó vẫn tới sau khi đã bị hủy, không được phép "hồi sinh" nó.
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      throw new AppError(
        `Đơn hàng #${order.id} không còn ở trạng thái chờ thanh toán (hiện tại: ${order.status}), bỏ qua xác nhận ${gatewayLabel}`,
        409,
      );
    }

    // 2. Cập nhật paymentStatus = "paid" và status = "pending" (chuyển sang luồng bình thường)
    await this.orderRepo.updatePaymentStatus(orderId, PaymentStatus.PAID);
    const updatedOrder = await this.orderRepo.updateStatus(orderId, OrderStatus.PENDING);
    if (!updatedOrder) {
      throw new AppError("Không thể cập nhật đơn hàng", 500);
    }

    // 3. Xóa giỏ hàng
    const cart = await this.cartRepo.findByUserId(order.userId);
    if (cart) {
      await this.cartRepo.clearCart(cart.id);
    }

    // 4. Ghi log + thông báo admin
    const totalPrice = Number(order.totalPrice);
    const message = `Có đơn hàng mới thanh toán ${gatewayLabel} thành công với giá trị ${totalPrice.toLocaleString("vi-VN")}đ`;

    await this.activityLogService.create({
      type: "ORDER_CREATED",
      message,
      data: { orderId: order.id, totalPrice, paymentMethod: gateway },
    });

    getIO().to("chat:admin").emit("order:new", {
      orderId: order.id,
      totalPrice,
      message,
      createdAt: order.createdAt,
    });

    // 5. Gửi email xác nhận
    const user = await this.userRepo.findById(order.userId);
    if (user?.email) {
      try {
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
      } catch (error: any) {
        // Không fail khi gửi email lỗi
      }
    }

    // 6. Thông báo realtime cho user
    getIO().to(`user:${order.userId}`).emit("order:payment_updated", {
      orderId: order.id,
      paymentStatus: "paid",
    });

    // 7. Xóa cache
    await Promise.all([
      deleteCache(`${this.CART_CACHE_KEY}:${order.userId}`),
      deleteCacheByPattern(`${this.CACHE_KEY}:id:${orderId}:user:*`),
      deleteCacheByPattern(`${this.CACHE_KEY}:list:${order.userId}:*`),
      deleteCacheByPattern(`${this.CACHE_KEY}:admin:all:*`),
      deleteCache(`${this.CACHE_KEY}:dashboard:stats`),
    ]);

    return OrderResponseDto.from(updatedOrder);
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

  // ─── Cổng thanh toán online: Hủy đơn hàng hết hạn (gọi bởi BullMQ delayed job) ─
  async cancelExpiredOnlinePaymentOrder(orderId: string, gateway: OnlinePaymentGateway): Promise<void> {
    const gatewayLabel = GATEWAY_LABELS[gateway];
    const order = await this.orderRepo.findById(orderId);
    // Đơn đã thanh toán hoặc không tồn tại → bỏ qua, không làm gì
    if (!order || order.status !== OrderStatus.PENDING_PAYMENT) return;

    // Hủy đơn do quá hạn (không cần cập nhật kho vì createPendingOnlinePaymentOrder chưa trừ kho)
    const updatedOrder = await this.orderRepo.updateStatus(orderId, OrderStatus.CANCELLED);
    if (!updatedOrder) return;

    // Ghi log để Admin biết
    const shortId = updatedOrder.id.split("-")[0].toUpperCase();
    await this.activityLogService.create({
      type: "ORDER_CANCELLED",
      message: `Hệ thống tự động hủy đơn ${gatewayLabel} #${shortId} do quá hạn 15 phút`,
      data: { orderId: updatedOrder.id, totalPrice: updatedOrder.totalPrice },
    });

    // Xóa cache liên quan
    await Promise.all([
      deleteCacheByPattern(`${this.CACHE_KEY}:id:${orderId}:user:*`),
      deleteCacheByPattern(`${this.CACHE_KEY}:list:${updatedOrder.userId}:*`),
      deleteCacheByPattern(`${this.CACHE_KEY}:admin:all:*`),
      deleteCacheByPattern(`${this.CACHE_KEY}:customers:*`),
      deleteCache(`${this.CACHE_KEY}:dashboard:stats`),
    ]);

    // Thông báo realtime cho user (nếu đang online)
    getIO().to(`user:${updatedOrder.userId}`).emit("order:status_updated", {
      orderId: updatedOrder.id,
      status: "cancelled",
      message: `Đơn hàng ${gatewayLabel} đã bị hủy do quá hạn thanh toán (15 phút)`,
    });
  }
}
