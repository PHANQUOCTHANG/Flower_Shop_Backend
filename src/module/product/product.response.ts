import {
  Product,
  ProductImage,
  ProductCategory,
  Category,
} from "@prisma/client";

export class ProductResponseDto {
  id: string;
  name: string;
  slug: string;
  shortDescription: string | null;
  description: string | null;
  price: number;
  comparePrice: number | null;
  costPrice: number | null;
  sku: string | null;
  stockQuantity: number;
  lowStockThreshold: number | null;
  thumbnailUrl: string | null;
  metaTitle: string | null;
  metaDescription: string | null;
  metaKeywords: string | null ;
  status: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;

  images: any[];
  categories: any[];

  constructor(
    product: Product & {
      images?: ProductImage[];
      categories?: (ProductCategory & { category?: Category })[];
    },
  ) {
    this.id = product.id;
    this.name = product.name;
    this.slug = product.slug;
    this.shortDescription = product.shortDescription || null;
    this.description = product.description || null;
    this.price = Number(product.price); // Decimal -> Number
    this.comparePrice = product.comparePrice
      ? Number(product.comparePrice)
      : null;
    this.costPrice = product.costPrice ? Number(product.costPrice) : null;
    this.sku = product.sku;
    this.stockQuantity = product.stockQuantity;
    this.lowStockThreshold = product.lowStockThreshold || null;
    this.thumbnailUrl = product.thumbnailUrl;
    this.metaTitle = product.metaTitle || null;
    this.metaDescription = product.metaDescription || null;
    this.metaKeywords = product.metaKeywords || null ;
    this.status = product.status;
    this.createdAt = product.createdAt.toISOString();
    this.updatedAt = product.updatedAt.toISOString();
    this.deletedAt = product.deletedAt ? product.deletedAt.toISOString() : null;

    // Map danh sách ảnh
    this.images =
      product.images?.map((img: ProductImage) => ({
        id: img.id,
        url: img.imageUrl,
        isPrimary: img.isPrimary,
      })) || [];

    // Map chi tiết danh mục
    this.categories =
      product.categories?.map(
        (c: ProductCategory & { category?: Category }) => ({
          id: c.categoryId,
          name: c.category?.name || "",
          slug: c.category?.slug || "",
        }),
      ) || [];
  }

  static from(p: Product) {
    return new ProductResponseDto(p);
  }

  static fromList(ps: Product[]) {
    return ps.map((p) => new ProductResponseDto(p));
  }
}
