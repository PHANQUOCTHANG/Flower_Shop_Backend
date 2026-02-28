import AppError from "@/utils/appError";
import { ICartRepository } from "@/repositories/cart.repository";
import {
  AddToCartRequestDto,
  UpdateCartItemDto,
} from "@/dto/request/cart.request";
import { ICartDocument } from "@/interface/cart.interface";

export interface ICartService {
  findByUserId(userId: string): Promise<any>;
  add(userId: string, dto: AddToCartRequestDto): Promise<any>;
  update(userId: string, dto: UpdateCartItemDto): Promise<any>;
  remove(
    userId: string,
    productId: string,
    color: string,
    size: string,
  ): Promise<any>;
}

export class CartService implements ICartService {
  constructor(private readonly cartRepo: ICartRepository) {}

  // Lấy giỏ hàng của người dùng, tự động tạo nếu chưa có
  async findByUserId(userId: string): Promise<any> {
    let cart = await this.cartRepo.findByUserId(userId);
    if (!cart) cart = await this.cartRepo.create(userId);

    return this.mapToResponse(cart);
  }

  // Thêm sản phẩm vào giỏ hàng (cộng dồn nếu đã tồn tại cùng thuộc tính)
  async add(userId: string, dto: AddToCartRequestDto): Promise<any> {
    let cart = await this.cartRepo.findByUserId(userId);
    if (!cart) cart = await this.cartRepo.create(userId);

    const existingIndex = cart.products.findIndex(
      (p) =>
        p.productId.toString() === dto.productId &&
        p.color === dto.color &&
        p.size === dto.size,
    );

    if (existingIndex > -1) {
      cart.products[existingIndex].quantity += dto.quantity;
    } else {
      cart.products.push(dto as any);
    }

    const updated = await this.cartRepo.update(cart);
    return this.mapToResponse(updated);
  }

  // Cập nhật số lượng sản phẩm cụ thể trong giỏ
  async update(userId: string, dto: UpdateCartItemDto): Promise<any> {
    let cart = await this.cartRepo.findByUserId(userId);
    if (!cart) cart = await this.cartRepo.create(userId);

    const item = cart.products.find(
      (p) =>
        p.productId.toString() === dto.productId &&
        p.color === dto.color &&
        p.size === dto.size,
    );

    if (!item) throw new AppError("Sản phẩm không có trong giỏ hàng", 404);

    item.quantity = dto.quantity || 1;
    const updated = await this.cartRepo.update(cart);
    return this.mapToResponse(updated);
  }

  // Xóa sản phẩm khỏi giỏ hàng theo ID và thuộc tính (màu, size)
  async remove(
    userId: string,
    productId: string,
    color: string,
    size: string,
  ): Promise<any> {
    let cart = await this.cartRepo.findByUserId(userId);
    if (!cart) cart = await this.cartRepo.create(userId);

    cart.products = cart.products.filter(
      (p) =>
        !(
          p.productId.toString() === productId &&
          p.color === color &&
          p.size === size
        ),
    );

    const updated = await this.cartRepo.update(cart);
    return this.mapToResponse(updated);
  }

  // Ánh xạ dữ liệu trả về sạch sẽ
  private mapToResponse(cart: ICartDocument): any {
    return {
      id: cart._id || cart.id,
      userId: cart.userId,
      products: cart.products,
      totalItems: cart.products.length,
      updatedAt: cart.updatedAt,
    };
  }
}
