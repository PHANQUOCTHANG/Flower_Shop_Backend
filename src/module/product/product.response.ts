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
  sku: string | null;
  thumbnailUrl: string | null;
  thumbnailPublicId: string | null;
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

    // Ép kiểu Decimal từ DB sang Number
    this.price = Number(product.price);
    this.comparePrice = product.comparePrice
      ? Number(product.comparePrice)
      : null;

    this.sku = product.sku;
    this.thumbnailUrl = product.thumbnailUrl;
    this.thumbnailPublicId = product.thumbnailPublicId || null;
    this.status = product.status;
    this.createdAt = product.createdAt.toISOString();
    this.updatedAt = product.updatedAt.toISOString();
    this.deletedAt = product.deletedAt ? product.deletedAt.toISOString() : null;

    // Map danh sách hình ảnh
    this.images =
      product.images?.map((img: ProductImage) => ({
        id: img.id,
        url: img.imageUrl,
        isPrimary: img.isPrimary,
        publicId: img.publicId,
      })) || [];

    // Map danh mục liên quan
    this.categories =
      product.categories?.map(
        (c: ProductCategory & { category?: Category }) => ({
          id: c.categoryId,
          name: c.category?.name || "",
          slug: c.category?.slug || "",
        }),
      ) || [];
  }

  // Tạo DTO từ một sản phẩm
  static from(p: Product): ProductResponseDto {
    return new ProductResponseDto(p);
  }

  // Tạo DTO từ danh sách sản phẩm
  static fromList(ps: Product[]): ProductResponseDto[] {
    return ps.map((p) => new ProductResponseDto(p));
  }
}
