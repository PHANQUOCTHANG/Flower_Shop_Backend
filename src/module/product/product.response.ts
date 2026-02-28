import { Product } from "@prisma/client";

export class ProductResponseDto {
  id: string;
  name: string;
  slug: string;
  price: number;
  comparePrice: number | null;
  stockQuantity: number;
  thumbnailUrl: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;

  constructor(product: Product) {
    this.id = product.id.toString(); // BigInt -> String
    this.name = product.name;
    this.slug = product.slug;
    this.price = Number(product.price); // Decimal -> Number
    this.comparePrice = product.comparePrice ? Number(product.comparePrice) : null;
    this.stockQuantity = product.stockQuantity;
    this.thumbnailUrl = product.thumbnailUrl;
    this.status = product.status;
    this.createdAt = product.createdAt.toISOString();
    this.updatedAt = product.updatedAt.toISOString();
  }

  static from(p: Product) {
    return new ProductResponseDto(p);
  }

  static fromList(ps: Product[]) {
    return ps.map((p) => new ProductResponseDto(p));
  }
}