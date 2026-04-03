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
import { getAllCustomers } from "@/module/order/order.controller";

export interface IOrderService {
  checkout(userId: string, dto: CheckoutDto): Promise<OrderResponseDto>;
  findAll(query: any): Promise<any>;
  findByUserId(userId: string, query: any): Promise<any>;
  findById(orderId: string, userId: string): Promise<OrderResponseDto>;
  updateStatus(orderId: string, status: string): Promise<OrderResponseDto>;
  findAllCustomers(query: any): Promise<any>;
}

export class OrderService implements IOrderService {
  private readonly CACHE_KEY = "orders";
  private readonly PRODUCT_CACHE_KEY = "products";
  private readonly CART_CACHE_KEY = "cart";
  private readonly CACHE_TTL_USER_LIST = 600; // 10 phút - lịch sử đơn khách (read thường)
  private readonly CACHE_TTL_DETAIL = 900; // 15 phút - chi tiết đơn (read nhiều lần)
  private readonly CACHE_TTL_ADMIN_LIST = 120; // 2 phút - danh sách admin (cần dữ liệu tương đối mới)
  private readonly CACHE_TTL_CUSTOMER_LIST = 300; // 5 phút - danh sách khách hàng (read thường)

  constructor(
    private readonly orderRepo: IOrderRepository,
    private readonly cartRepo: ICartRepository,
    private readonly userRepo: IUserRepository,
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

    // Xóa cache
    await Promise.all([
      deleteCache(`${this.CART_CACHE_KEY}:${userId}`),
      deleteCache(`${this.PRODUCT_CACHE_KEY}:all`),
      deleteCacheByPattern(`${this.CACHE_KEY}:list:${userId}:*`),
      ...orderItems.map((item) =>
        deleteCache(`${this.PRODUCT_CACHE_KEY}:id:${item.productId}`),
      ),
    ]);

    return OrderResponseDto.from(order);
  }

  // Lấy danh sách đơn hàng khách hàng
  async findByUserId(userId: string, query: any): Promise<any> {
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
  async findAll(query: any): Promise<any> {
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
      deleteCache(`${this.CACHE_KEY}:id:${orderId}`), // Cache chi tiết đơn
      deleteCacheByPattern(`${this.CACHE_KEY}:list:${order.userId}:*`), // Cache lịch sử đơn khách
      deleteCacheByPattern(`${this.CACHE_KEY}:admin:all:*`), // Cache danh sách admin
      deleteCacheByPattern(`${this.CACHE_KEY}:customers:*`), // Cache danh sách khách hàng
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
}
