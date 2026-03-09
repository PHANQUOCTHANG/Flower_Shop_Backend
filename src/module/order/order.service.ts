import AppError from "@/utils/appError";
import { IOrderRepository } from "./order.repository";
import { ICartRepository } from "../cart/cart.repository";
import { OrderResponseDto } from "./order.response";
import { CheckoutDto } from "@/module/order/order.request";

export interface IOrderService {
  checkout(userId: string, dto: CheckoutDto): Promise<OrderResponseDto>;
  findAll(query: any): Promise<any>;
  findByUserId(userId: string, query: any): Promise<any>;
  findById(orderId: string, userId: string): Promise<OrderResponseDto>;
  updateStatus(orderId: string, status: string): Promise<OrderResponseDto>;
}

export class OrderService implements IOrderService {
  constructor(
    private readonly orderRepo: IOrderRepository,
    private readonly cartRepo: ICartRepository
  ) {}

  /**
   * Quy trình đặt hàng: Validate giỏ hàng -> Check kho -> Chốt giá -> Create Order & Trừ kho -> Clear Cart
   */
  async checkout(userId: string, dto: CheckoutDto): Promise<OrderResponseDto> {
    // 1. Lấy giỏ hàng hiện tại của User
    const cart = await this.cartRepo.findByUserId(userId);
    if (!cart || cart.items.length === 0) {
      throw new AppError("Giỏ hàng của bạn đang trống", 400);
    }

    let totalPrice = 0;
    const orderItems = [];

    // 2. Duyệt sản phẩm để tính giá và kiểm tra tồn kho (Snapshot)
    for (const item of cart.items) {
      const product = item.product;

      // Kiểm tra tồn kho
      if (product.stockQuantity < item.quantity) {
        throw new AppError(
          `Sản phẩm "${product.name}" không đủ số lượng tồn kho (Còn: ${product.stockQuantity})`,
          400
        );
      }

      const itemPrice = Number(product.price);
      const subtotal = itemPrice * item.quantity;
      totalPrice += subtotal;

      // Chuẩn bị dữ liệu Item để lưu vào Order (Snapshot giá tại thời điểm mua)
      orderItems.push({
        productId: product.id,
        quantity: item.quantity,
        price: itemPrice,
        subtotal: subtotal,
      });
    }

    // 3. Gọi Repo thực hiện Transaction: Tạo Order + OrderItems + Trừ kho Product
    // Vì Repo đã dùng $transaction, nên nếu trừ kho lỗi thì Order sẽ không được tạo
    const order = await this.orderRepo.createOrder({
      userId,
      totalPrice,
      shippingAddress: dto.shippingAddress,
      shippingPhone: dto.shippingPhone,
      paymentMethod: dto.paymentMethod,
      items: orderItems,
    });

    // 4. Làm trống giỏ hàng sau khi đặt thành công
    await this.cartRepo.clearCart(cart.id);

    return OrderResponseDto.from(order);
  }

  /**
   * Lấy danh sách đơn hàng của người dùng (Customer)
   */
  async findByUserId(userId: string, query: any): Promise<any> {
    const result = await this.orderRepo.findByUserId(userId, query);
    
    return {
      ...result,
      data: OrderResponseDto.fromList(result.data),
    };
  }

  /**
   * Xem chi tiết đơn hàng (kèm bảo mật userId)
   */
  async findById(orderId: string, userId: string): Promise<OrderResponseDto> {
    const order = await this.orderRepo.findById(orderId);

    // Đảm bảo đơn hàng tồn tại và thuộc về chính User đó (trừ ADMIN)
    if (!order || order.userId !== userId) {
      throw new AppError("Không tìm thấy đơn hàng", 404);
    }

    return new OrderResponseDto(order);
  }

  /**
   * ADMIN: Lấy tất cả đơn hàng hệ thống
   */
  async findAll(query: any): Promise<any> {
    const result = await this.orderRepo.findAll(query);
    
    return {
      ...result,
      data: OrderResponseDto.fromList(result.data),
    };
  }

  /**
   * (ADMIN) : Cập nhật trạng thái đơn hàng
   */
  async updateStatus(orderId: string, status: string): Promise<OrderResponseDto> {
    const order = await this.orderRepo.updateStatus(orderId, status);
    if (!order) {
      throw new AppError("Không tìm thấy đơn hàng để cập nhật", 404);
    }
    return OrderResponseDto.from(order);
  }
}