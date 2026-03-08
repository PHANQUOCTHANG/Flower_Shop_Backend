import { PrismaClient, Cart, CartItem } from "@prisma/client";

export interface ICartRepository {
  findByUserId(userId: string): Promise<any>;
  getOrCreateCart(userId: string): Promise<Cart>;
  findItemInCart(cartId: string, productId: string): Promise<CartItem | null>;
  addItem(
    cartId: string,
    productId: string,
    quantity: number,
  ): Promise<CartItem>;
  updateQuantity(itemId: string, quantity: number): Promise<void>;
  removeItem(itemId: string): Promise<void>;
  clearCart(cartId: string): Promise<void>;
}

export class CartRepository implements ICartRepository {
  constructor(private readonly prisma: PrismaClient) {}

  // Lấy giỏ hàng kèm theo thông tin chi tiết sản phẩm
  async findByUserId(userId: string) {
    return this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: { product: true }, // Lấy thêm thông line sản phẩm để hiển thị
        },
      },
    });
  }

  // Lấy giỏ hàng hiện tại, nếu chưa có thì tạo mới (Upsert logic)
  async getOrCreateCart(userId: string): Promise<Cart> {
    let cart = await this.prisma.cart.findUnique({ where: { userId } });

    if (!cart) {
      cart = await this.prisma.cart.create({ data: { userId } });
    }
    return cart;
  }

  async findItemInCart(
    cartId: string,
    productId: string,
  ): Promise<CartItem | null> {
    return this.prisma.cartItem.findFirst({
      where: {
        cartId,
        productId,
      },
    });
  }

  // Thêm sản phẩm vào giỏ hoặc cập nhật nếu đã tồn tại
  async addItem(cartId: string, data: any): Promise<CartItem> {
    return this.prisma.cartItem.create({
      data: {
        cartId,
        productId: data.productId,
        quantity: data.quantity,
      },
    });
  }

  // Cập nhật số lượng của một item trong giỏ
  async updateQuantity(itemId: string, quantity: number): Promise<void> {
    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
    });
  }

  // Xóa một sản phẩm khỏi giỏ hàng
  async removeItem(itemId: string): Promise<void> {
    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });
  }

  // Xóa toàn bộ sản phẩm trong giỏ (sau khi thanh toán)
  async clearCart(cartId: string): Promise<void> {
    await this.prisma.cartItem.deleteMany({
      where: { cartId },
    });
  }
}
