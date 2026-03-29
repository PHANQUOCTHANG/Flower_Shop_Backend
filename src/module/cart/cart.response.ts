export class ProductItem {
  id: string;
  name: string;
  price: number;
  thumbnailUrl: string;

  constructor(item: any) {
    this.id = item.id;
    this.price = item.price;
    this.name = item.name;
    this.thumbnailUrl = item.thumbnailUrl;
  }
}

export class CartItemResponse {
  id: string;
  product: ProductItem;
  quantity: number;

  constructor(item: any) {
    this.id = item.id;
    this.product = item.product;
    this.quantity = item.quantity;
  }
}

export class CartResponse {
  id: string;
  userId: string;
  items: CartItemResponse[];
  totalItems: number; // Tổng số lượng sản phẩm (ví dụ: 5 món)
  totalUniqueItems: number; // Tổng số loại sản phẩm (ví dụ: 2 loại)

  constructor(cart: any) {
    this.id = cart.id;
    this.userId = cart.userId;

    // Map danh sách items
    const rawItems = cart.items || [];
    this.items = rawItems.map((item: any) => new CartItemResponse(item));

    // Tính toán số liệu tổng quát
    this.totalUniqueItems = this.items.length;
    this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
  }

  static from(cart: any): CartResponse {
    return new CartResponse(cart);
  }
}
