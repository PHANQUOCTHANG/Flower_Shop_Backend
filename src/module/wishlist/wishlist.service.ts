import AppError from "@/utils/appError";
import { IWishlistRepository } from "./wishlist.repository";

export interface IWishlistService {
  getWishlist(userId: string, page: number, limit: number): Promise<any>;
  getWishlistProductIds(userId: string): Promise<string[]>;
  toggleWishlist(userId: string, productId: string): Promise<{ added: boolean }>;
}

export class WishlistService implements IWishlistService {
  constructor(private readonly repo: IWishlistRepository) {}

  async getWishlist(userId: string, page: number, limit: number) {
    const result = await this.repo.findByUserId(userId, page, limit);
    const totalPages = Math.ceil(result.total / limit);

    return {
      items: result.items.map((i: any) => {
        const p = i.product;
        const activeSale = p.saleItems?.[0];
        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          price: activeSale ? Number(activeSale.salePrice) : Number(p.price),
          comparePrice: activeSale ? Number(p.price) : (p.comparePrice ? Number(p.comparePrice) : null),
          thumbnailUrl: p.images?.[0]?.imageUrl || p.thumbnailUrl,
          category: p.categories?.[0]?.category?.name || "Sản phẩm",
          stockQuantity: 99, // Có thể điều chỉnh tuỳ theo logic kho hàng thực tế
          sku: p.sku,
        };
      }),
      meta: {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages,
      }
    };
  }

  async getWishlistProductIds(userId: string) {
    return await this.repo.findProductIds(userId);
  }

  async toggleWishlist(userId: string, productId: string) {
    if (!productId) {
      throw new AppError("Thiếu productId", 400);
    }
    return await this.repo.toggle(userId, productId);
  }
}
