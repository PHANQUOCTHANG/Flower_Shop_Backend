import { Order, OrderItem, Product, User } from "@prisma/client";

export class OrderResponseDto {
  id: string;
  totalPrice: number;
  status: string;
  name: string | null;
  shippingAddress: string | null;
  shippingPhone: string | null;
  paymentMethod: string | null;
  paymentStatus: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;

  // Quan hệ được định nghĩa rõ ràng hơn
  items: OrderItemDetailDto[];
  user?: UserBriefDto;

  constructor(order: any) {
    this.id = order.id;
    this.totalPrice = Number(order.totalPrice);
    this.status = order.status;
    this.name = order.name;
    this.shippingAddress = order.shippingAddress;
    this.shippingPhone = order.shippingPhone;
    this.paymentMethod = order.paymentMethod;
    this.paymentStatus = order.paymentStatus;
    this.note = order.note;
    this.createdAt = order.createdAt.toISOString();
    this.updatedAt = order.updatedAt.toISOString();

    // Map danh sách sản phẩm trong đơn
    this.items = order.items 
      ? order.items.map((item: any) => new OrderItemDetailDto(item)) 
      : [];

    // Map thông tin user (thường cho Admin)
    if (order.user) {
      this.user = {
        id: order.user.id,
        fullName: order.user.fullName,
        email: order.user.email,
      };
    }
  }

  static from(order: any) {
    return new OrderResponseDto(order);
  }

  static fromList(orders: any[]) {
    return orders.map((order) => new OrderResponseDto(order));
  }
}

/**
 * DTO phụ cho chi tiết từng sản phẩm trong đơn hàng
 */
class OrderItemDetailDto {
  id: string;
  productId: string;
  productName: string;
  thumbnail: string | null;
  quantity: number;
  price: number;
  subtotal: number;

  constructor(item: any) {
    this.id = item.id;
    this.productId = item.productId;
    // Lấy thông tin từ snapshot hoặc relation
    this.productName = item.product?.name || "Sản phẩm không còn tồn tại";
    this.thumbnail = item.product?.thumbnailUrl || null;
    this.quantity = item.quantity;
    this.price = Number(item.price);
    this.subtotal = Number(item.subtotal);
  }
}

/**
 * DTO phụ cho thông tin User rút gọn
 */
interface UserBriefDto {
  id: string;
  fullName: string;
  email: string;
}