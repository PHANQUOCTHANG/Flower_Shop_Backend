// Giả định bạn đã có
import { ICartRepository } from "@/module/cart/cart.repository";
import { IProductRepository } from "@/module/product/product.repository";
import AppError from "@/utils/appError";
import { Cart, CartItem } from "@prisma/client";

export interface ICartService {
  getCart(userId: string): Promise<any>;
  addToCart(userId: string, productId: string, quantity: number): Promise<void>;
  updateQuantity(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<void>;
  removeItem(userId: string, productId: string): Promise<void>;
  clearCart(userId: string): Promise<void>;
}

export class CartService implements ICartService {
  constructor(
    private readonly cartRepo: ICartRepository,
    private readonly productRepo: IProductRepository,
  ) {}

  // Lấy chi tiết giỏ hàng của người dùng
  async getCart(userId: string): Promise<any> {
    const cart = await this.cartRepo.findByUserId(userId);
    if (!cart) return { items: [], totalAmount: 0 };
    return cart;
  }

  // Thêm sản phẩm vào giỏ hàng (Xử lý cộng dồn số lượng)
  async addToCart(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<void> {
    // 1. Kiểm tra sản phẩm có tồn tại và còn hàng không
    const product = await this.productRepo.findById(productId);
    if (!product) throw new AppError("Sản phẩm không tồn tại", 404);

    // 2. Lấy hoặc tạo giỏ hàng mới cho User
    const cart = await this.cartRepo.getOrCreateCart(userId);

    // 3. Kiểm tra sản phẩm đã có trong giỏ chưa
    const existingItem = await this.cartRepo.findItemInCart(cart.id, productId);

    if (existingItem) {
      // Nếu đã có: Cập nhật cộng thêm số lượng
      const newQuantity = existingItem.quantity + quantity;
      await this.cartRepo.updateQuantity(existingItem.id, newQuantity);
    } else {
      // Nếu chưa có: Tạo mới CartItem với giá hiện tại của sản phẩm
      await this.cartRepo.addItem(cart.id, productId, quantity);
    }
  }

  // Cập nhật số lượng trực tiếp (ví dụ: thay đổi ở input số lượng)
  async updateQuantity(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<void> {
    if (quantity <= 0) return this.removeItem(userId, productId);

    const cart = await this.cartRepo.findByUserId(userId);
    if (!cart) throw new AppError("Giỏ hàng không tồn tại", 404);

    const item = await this.cartRepo.findItemInCart(cart.id, productId);
    if (!item) throw new AppError("Sản phẩm không có trong giỏ hàng", 404);

    await this.cartRepo.updateQuantity(item.id, quantity);
  }

  // Xóa một sản phẩm khỏi giỏ
  async removeItem(userId: string, productId: string): Promise<void> {
    const cart = await this.cartRepo.findByUserId(userId);
    if (!cart) return;

    const item = await this.cartRepo.findItemInCart(cart.id, productId);
    if (item) {
      await this.cartRepo.removeItem(item.id);
    }
  }

  // Xóa sạch giỏ hàng
  async clearCart(userId: string): Promise<void> {
    const cart = await this.cartRepo.findByUserId(userId);
    if (cart) {
      await this.cartRepo.clearCart(cart.id.toString());
    }
  }
}
