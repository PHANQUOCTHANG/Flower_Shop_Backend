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
  private readonly CACHE_TTL = 1800; // 30 phút (Giỏ hàng nên cache ngắn hơn sản phẩm)

  constructor(
    private readonly cartRepo: ICartRepository,
    private readonly productRepo: IProductRepository,
  ) {}

  // Lấy chi tiết giỏ hàng của người dùng
  async getCart(userId: string): Promise<any> {
    // [Cache] Kiểm tra giỏ hàng trong cache trước
    const cacheKey = `${this.CACHE_KEY}:${userId}`;
    const cachedCart = await getCache<any>(cacheKey);
    if (cachedCart) return cachedCart;

    const cart = await this.cartRepo.findByUserId(userId);

    const result = !cart ? { items: [], totalAmount: 0 } : cart;

    // [Cache] Lưu vào redis
    await setCache(cacheKey, result, this.CACHE_TTL);

    return result;
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
      console.log("Cart", { cartId: cart.id, productId, quantity });
      await this.cartRepo.addItem(cart.id, productId, quantity);
    }

    // [Cache] Xóa cache giỏ hàng để lần sau lấy dữ liệu mới nhất
    await deleteCache(`${this.CACHE_KEY}:${userId}`);
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

    // [Cache] Invalidate cache
    await deleteCache(`${this.CACHE_KEY}:${userId}`);
  }

  // Xóa một sản phẩm khỏi giỏ
  async removeItem(userId: string, productId: string): Promise<void> {
    const cart = await this.cartRepo.findByUserId(userId);
    if (!cart) return;

    const item = await this.cartRepo.findItemInCart(cart.id, productId);
    if (item) {
      await this.cartRepo.removeItem(item.id);

      // [Cache] Cập nhật lại cache sau khi xóa item
      await deleteCache(`${this.CACHE_KEY}:${userId}`);
    }
  }

  // Xóa sạch giỏ hàng
  async clearCart(userId: string): Promise<void> {
    const cart = await this.cartRepo.findByUserId(userId);
    if (cart) {
      await this.cartRepo.clearCart(cart.id.toString());

      // [Cache] Xóa cache hoàn toàn
      await deleteCache(`${this.CACHE_KEY}:${userId}`);
    }
  }
}
