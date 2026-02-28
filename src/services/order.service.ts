import AppError from "@/utils/appError";
import { IOrderRepository } from "@/repositories/order.repository";
import { ICartRepository } from "@/repositories/cart.repository";
import { IProductRepository } from "@/repositories/product.repository";
import { CreateOrderRequestDto } from "@/dto/request/order.request";
import { EOrderStatus } from "@/interface/order.interface";
import { normalizeQuery } from "@/utils/query";

export interface IOrderService {
  create(userId: string, dto: CreateOrderRequestDto): Promise<any>;
  findAll(userId: string, query: any): Promise<any>;
  findById(orderId: string, userId: string): Promise<any>;
}

export class OrderService implements IOrderService {
  constructor(
    private readonly orderRepo: IOrderRepository,
    private readonly cartRepo: ICartRepository,
    private readonly productRepo: IProductRepository,
  ) {}

  // Quy trình đặt hàng: Validate giỏ hàng -> Check kho -> Snapshot -> Trừ kho -> Xóa giỏ
  async create(userId: string, dto: CreateOrderRequestDto): Promise<any> {
    // Lấy giỏ hàng hiện tại (Populate sản phẩm để lấy giá và tồn kho mới nhất)
    const cart = await this.cartRepo.findByUserId(userId);
    if (!cart || cart.products.length === 0) {
      throw new AppError("Giỏ hàng của bạn đang trống", 400);
    }

    let totalAmount = 0;
    const orderItems = [];

    // Duyệt sản phẩm để tính giá và kiểm tra tồn kho
    for (const item of cart.products) {
      const product = item.productId as any;

      if (product.quantity < item.quantity) {
        throw new AppError(
          `Sản phẩm ${product.name} không đủ số lượng tồn kho`,
          400,
        );
      }

      const subTotal = product.price * item.quantity;
      totalAmount += subTotal;

      // Lưu Snapshot thông tin tại thời điểm mua (Giá và tên không đổi kể cả khi shop cập nhật Product)
      orderItems.push({
        productId: product._id,
        productName: product.name,
        size: item.size,
        color: item.color,
        price: product.price,
        quantity: item.quantity,
        totalPrice: subTotal,
      });
    }

    // Khởi tạo bản ghi đơn hàng
    const order = await this.orderRepo.create({
      orderCode: `ORD-${Date.now()}`,
      userId,
      items: orderItems,
      totalAmount,
      paymentMethod: dto.paymentMethod,
      status: EOrderStatus.PENDING,
    });

    // Cập nhật giảm tồn kho an toàn (Atomic update)
    for (const item of orderItems) {
      await this.productRepo.updateById(item.productId.toString(), {
        $inc: { quantity: -item.quantity },
      });
    }

    // Làm trống giỏ hàng sau khi đặt thành công
    await this.cartRepo.clear(userId);

    return this.mapToResponse(order);
  }

  // Lấy danh sách đơn hàng của người dùng hiện tại
  async findAll(userId: string, query: any): Promise<any> {
    const normalizedQuery = normalizeQuery(query);
    const result = await this.orderRepo.findAll(normalizedQuery, { userId });

    return {
      ...result,
      data: result.data.map((order: any) => this.mapToResponse(order)),
    };
  }

  // Xem chi tiết đơn hàng (kèm bảo mật userId)
  async findById(orderId: string, userId: string): Promise<any> {
    const order = await this.orderRepo.findById(orderId);

    // Đảm bảo người dùng chỉ có thể xem đơn hàng của chính mình
    if (!order || order.userId.toString() !== userId) {
      throw new AppError("Không tìm thấy đơn hàng", 404);
    }

    return this.mapToResponse(order);
  }

  // Chuyển đổi sang định dạng Response sạch
  private mapToResponse(order: any): any {
    return {
      id: order._id || order.id,
      orderCode: order.orderCode,
      userId: order.userId,
      items: order.items,
      totalAmount: order.totalAmount,
      paymentMethod: order.paymentMethod,
      status: order.status,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }
}
