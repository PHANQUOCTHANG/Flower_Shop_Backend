export class CartItemResponseDto {
  id: string;
  productId: string;
  quantity: number;

  constructor(item: any) {
    this.id = item.id;
    this.productId = item.productId;
    this.quantity = item.quantity;
  }
}

export class CartResponseDto {
  id: string;
  userId: string;
  items: CartItemResponseDto[];
  totalItems: number; // Tổng số lượng sản phẩm (ví dụ: 5 món)
  totalUniqueItems: number; // Tổng số loại sản phẩm (ví dụ: 2 loại)

  constructor(cart: any) {
    this.id = cart.id;
    this.userId = cart.userId;

    // Map danh sách items
    const rawItems = cart.items || [];
    this.items = rawItems.map((item: any) => new CartItemResponseDto(item));

    // Tính toán số liệu tổng quát
    this.totalUniqueItems = this.items.length;
    this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  static from(cart: any): CartResponseDto {
    return new CartResponseDto(cart);
  }
}
