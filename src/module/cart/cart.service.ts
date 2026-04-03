import { ICartRepository } from "@/module/cart/cart.repository";
import { IProductRepository } from "@/module/product/product.repository";
import AppError from "@/utils/appError";
import { Cart, CartItem } from "@prisma/client";
import { getCache, setCache, deleteCache } from "@/utils/cache";

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
  private readonly CACHE_KEY = "cart";
  private readonly CACHE_TTL = 300; // 5 phút - giỏ hàng hay thay đổi, cần dữ liệu tương đối mới

  constructor(
    private readonly cartRepo: ICartRepository,
    private readonly productRepo: IProductRepository,
  ) {}

  // Lấy giỏ hàng người dùng
  async getCart(userId: string): Promise<any> {
    // Kiểm tra cache
    const cacheKey = `${this.CACHE_KEY}:${userId}`;
    const cachedCart = await getCache<any>(cacheKey);
    if (cachedCart) return cachedCart;

    const cart = await this.cartRepo.findByUserId(userId);
    const result = !cart ? { items: [], totalAmount: 0 } : cart;

    // Lưu vào cache (5 phút - giỏ hàng hay thay đổi, cần dữ liệu tương đối mới)
    await setCache(cacheKey, result, this.CACHE_TTL);

    return result;
  }

  // Thêm sản phẩm vào giỏ (xử lý cộng dồn số lượng)
  async addToCart(
    userId: string,
    productId: string,
    quantity: number,
  ): Promise<void> {
    // Kiểm tra sản phẩm tồn tại
    const product = await this.productRepo.findById(productId);
    if (!product) throw new AppError("Sản phẩm không tồn tại", 404);

    // Lấy hoặc tạo giỏ hàng
    const cart = await this.cartRepo.getOrCreateCart(userId);

    // Kiểm tra sản phẩm có trong giỏ
    const existingItem = await this.cartRepo.findItemInCart(cart.id, productId);

    if (existingItem) {
      // Update: increment quantity
      const newQuantity = existingItem.quantity + quantity;
      await this.cartRepo.updateQuantity(existingItem.id, newQuantity);
    } else {
      // Create: new item
      await this.cartRepo.addItem(cart.id, productId, quantity);
    }

    // Xóa cache (giỏ hàng đã thay đổi)
    await deleteCache(`${this.CACHE_KEY}:${userId}`);
  }

  // Cập nhật số lượng sản phẩm
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

    // Xóa cache (giỏ hàng đã thay đổi)
    await deleteCache(`${this.CACHE_KEY}:${userId}`);
  }

  // Xóa sản phẩm khỏi giỏ
  async removeItem(userId: string, productId: string): Promise<void> {
    const cart = await this.cartRepo.findByUserId(userId);
    if (!cart) return;

    const item = await this.cartRepo.findItemInCart(cart.id, productId);
    if (item) {
      await this.cartRepo.removeItem(item.id);

      // Xóa cache (giỏ hàng đã thay đổi)
      await deleteCache(`${this.CACHE_KEY}:${userId}`);
    }
  }

  // Làm trống giỏ hàng
  async clearCart(userId: string): Promise<void> {
    const cart = await this.cartRepo.findByUserId(userId);
    if (cart) {
      await this.cartRepo.clearCart(cart.id.toString());

      // Xóa cache (giỏ hàng đã trống)
      await deleteCache(`${this.CACHE_KEY}:${userId}`);
    }
  }
}
