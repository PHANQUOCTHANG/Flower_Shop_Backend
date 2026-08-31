

// Ánh xạ DTO đơn hàng
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

  // Thông tin chi tiết
  items: OrderItemDetailDto[];
  user?: UserBriefDto;

  constructor(order: any) {
    this.id = order.id;
    this.totalPrice = Number(order.totalPrice);
    // Prisma enum trả về UPPERCASE ở tầng JS (VD: "PENDING"), nhưng toàn bộ
    // frontend (so sánh string, ORDER_STATUS_MAP, v.v.) đang quy ước lowercase
    // giống giá trị DB (@map) — chuẩn hoá tại DTO để giữ nguyên hợp đồng API cũ.
    this.status = order.status?.toLowerCase?.() ?? order.status;
    this.name = order.name;
    this.shippingAddress = order.shippingAddress;
    this.shippingPhone = order.shippingPhone;
    this.paymentMethod = order.paymentMethod;
    this.paymentStatus = order.paymentStatus?.toLowerCase?.() ?? order.paymentStatus;
    this.note = order.note;
    this.createdAt = order.createdAt.toISOString();
    this.updatedAt = order.updatedAt.toISOString();

    // Ánh xạ danh sách items
    this.items = order.items
      ? order.items.map((item: any) => new OrderItemDetailDto(item))
      : [];

    // Thông tin khách hàng (admin)
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

// DTO chi tiết item
class OrderItemDetailDto {
  id: string;
  productId: string;
  productName: string;
  thumbnail: string | null;
  productSlug: string; // Renamed from slug → productSlug
  quantity: number;
  price: number;
  subtotal: number;
  isReview: boolean;

  constructor(item: any) {
    this.id = item.id;
    this.productId = item.productId;
    this.productName = item.product?.name || "Sản phẩm không còn tồn tại";
    this.thumbnail = item.product?.thumbnailUrl || null;
    this.productSlug = item.product?.slug || ""; // Lấy từ product nested object
    this.quantity = item.quantity;
    this.price = Number(item.price);
    this.subtotal = Number(item.subtotal);
    this.isReview = item.isReview;
  }
}

// User brief info DTO
interface UserBriefDto {
  id: string;
  fullName: string;
  email: string;
}
