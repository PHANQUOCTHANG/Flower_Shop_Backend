import { Order, OrderItem, Product, User } from "@prisma/client";

export class OrderResponseDto {
  id: string;
  totalPrice: number;
  status: string;
  shippingAddress: string | null;
  shippingPhone: string | null;
  paymentMethod: string | null;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;

  // Quan hệ
  items: any[];
  user?: any;

  constructor(
    order: Order & {
      items?: (OrderItem & { product?: Product })[];
      user?: Partial<User>;
    },
  ) {
    this.id = order.id;
    this.totalPrice = Number(order.totalPrice);
    this.status = order.status;
    this.shippingAddress = order.shippingAddress;
    this.shippingPhone = order.shippingPhone;
    this.paymentMethod = order.paymentMethod;
    this.paymentStatus = order.paymentStatus;
    
    // Map danh sách món hàng trong đơn
    this.items =
      order.items?.map((item: OrderItem & { product?: Product }) => ({
        id: item.id,
        productId: item.productId,
        productName: item.product?.name || "Sản phẩm không còn tồn tại",
        thumbnail: item.product?.thumbnailUrl || null,
        quantity: item.quantity,
        price: Number(item.price), // Giá lúc chốt đơn
        subtotal: Number(item.subtotal),
      })) || [];

    // Map thông tin user nếu cần (thường dùng cho Admin)
    if (order.user) {
      this.user = {
        fullName: order.user.fullName,
        email: order.user.email,
      };
    }

    this.createdAt = order.createdAt.toISOString();
    this.updatedAt = order.updatedAt.toISOString();
  }

  static from(o: Order) {
    return new OrderResponseDto(o);
  }

  static fromList(os: Order[]) {
    return os.map((o) => new OrderResponseDto(o));
  }
}